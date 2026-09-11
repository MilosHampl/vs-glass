/**
 * VS Glass — file patching, shared by the extension host (extension.ts), the `vscode:uninstall` hook (uninstall.ts)
 * and scripts/verify-release.sh. No VS Code API in here, so it runs under plain Node as well.
 *
 * Everything VS Glass writes into VS Code's own installation lives in ONE file, `out/main.js` (the main-process
 * bundle, the one bootstrap file VS Code does not checksum):
 *   1. a marker-delimited hook block appended at the end (see hookText below);
 *   2. one spread spliced into the object VS Code passes to `new BrowserWindow(...)`, so windows are created transparent
 *      when the user asked for transparency (`OPTIONS_ANCHOR` → `OPTIONS_PATCH`).
 * `stripHook` is the byte-exact inverse of `applyHook`, and a pristine backup (`main.js.vs-glass-backup`) is kept as well.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export const WIN_START = '/* VS-GLASS-WINDOW-START */';
export const WIN_END = '/* VS-GLASS-WINDOW-END */';
export const HOOK_VERSION = 'VS-GLASS-HOOK-V5';
export const BACKUP_SUFFIX = '.vs-glass-backup';
/** VS Code 1.136 builds its window options as `{backgroundColor:…, …, experimentalDarkMode:!0}`; this is the tail of that object. */
export const OPTIONS_ANCHOR = ',experimentalDarkMode:!0}';
export const OPTIONS_PATCH = ',...(globalThis.__vsGlassWindowOptions?globalThis.__vsGlassWindowOptions():{}),experimentalDarkMode:!0}';
/** 1.1.0 previews wrote the CSS into the workbench stylesheet; the extension restores that. */
export const LEGACY_CSS_START = '/* VS-GLASS-START */';
export const LEGACY_CSS_END = '/* VS-GLASS-END */';
export const LEGACY_CSS_KEY = 'vs/workbench/workbench.desktop.main.css';

export const hasHook = (text: string) => text.includes(WIN_START);
export const hasSplice = (text: string) => text.includes(OPTIONS_PATCH);
export const hookVersionOf = (text: string) => text.match(/VS-GLASS-HOOK-V(\d+)/)?.[0] ?? null;
/** How many times the window-options anchor occurs once any splice is undone (1 = patchable). */
export const anchorCount = (text: string) => stripHook(text).split(OPTIONS_ANCHOR).length - 1;

/** Remove every hook block (with the newline the extension added before it) and the options splice. Inverse of applyHook. */
export function stripHook(text: string): string {
  let out = text;
  for (;;) {
    const i = out.indexOf(WIN_START);
    if (i < 0) break;
    const j = out.indexOf(WIN_END, i);
    if (j < 0) break;
    let before = out.slice(0, i), after = out.slice(j + WIN_END.length);
    if (after.startsWith('\n')) after = after.slice(1);
    if (before.endsWith('\n')) before = before.slice(0, -1);
    out = before + after;
  }
  return out.split(OPTIONS_PATCH).join(OPTIONS_ANCHOR);
}

/** Patched text: the clean original, the options splice (when the anchor occurs exactly once) and one hook block. */
export function applyHook(text: string, hook: string): { text: string; spliced: boolean; anchors: number } {
  const clean = stripHook(text);
  const anchors = clean.split(OPTIONS_ANCHOR).length - 1;
  const spliced = anchors === 1;
  const body = spliced ? clean.replace(OPTIONS_ANCHOR, OPTIONS_PATCH) : clean;
  return { text: `${body}\n${hook}`, spliced, anchors };
}

/** VS Code's main.js has been an ES module since 1.94; the hook needs that (and refuses older builds rather than break them). */
export function isEsmApp(appRoot: string): boolean {
  try { return JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')).type === 'module'; } catch { return false; }
}

/** Write via a temp file + rename, so a crash or a second writer never leaves a truncated main.js. */
export function writeAtomic(file: string, content: string) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

/**
 * Keep a pristine backup next to the file. (Re)taken whenever the file carries no VS Glass markers — so a VS Code update
 * that replaced main.js refreshes it — and never overwritten with a patched file. Returns false when no usable backup exists.
 */
export function ensureBackup(file: string, text: string): boolean {
  const b = file + BACKUP_SUFFIX;
  if (!hasHook(text) && !hasSplice(text)) { fs.copyFileSync(file, b); return true; }
  return fs.existsSync(b);
}

/** Restore main.js: from the pristine backup when there is one (then drop the backup), otherwise by stripping. */
export function restoreMain(main: string): 'restored' | 'stripped' | 'clean' {
  const b = main + BACKUP_SUFFIX;
  if (fs.existsSync(b)) {
    const pristine = fs.readFileSync(b, 'utf8');
    if (!hasHook(pristine) && !hasSplice(pristine)) { fs.copyFileSync(b, main); fs.unlinkSync(b); return 'restored'; }
    fs.unlinkSync(b); // a poisoned backup (patched content) is worthless; fall through to stripping
  }
  const cur = fs.readFileSync(main, 'utf8');
  const next = stripHook(cur);
  if (next !== cur) { writeAtomic(main, next); return 'stripped'; }
  return 'clean';
}

/** Undo the 1.1.0 preview's CSS patch: restore the workbench stylesheet + product.json from their backups, or strip the block. */
export function cleanupLegacyCss(appRoot: string, checksum: (buf: Buffer) => string): boolean {
  const css = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css');
  const product = path.join(appRoot, 'product.json');
  let changed = false;
  for (const file of [css, product]) {
    const b = file + BACKUP_SUFFIX;
    if (fs.existsSync(b)) { fs.copyFileSync(b, file); fs.unlinkSync(b); changed = true; }
  }
  if (!changed && fs.existsSync(css)) {
    const cur = fs.readFileSync(css, 'utf8');
    const i = cur.indexOf(LEGACY_CSS_START), j = cur.indexOf(LEGACY_CSS_END);
    if (i >= 0 && j > i) {
      writeAtomic(css, cur.slice(0, i).replace(/\n+$/, '\n') + cur.slice(j + LEGACY_CSS_END.length).replace(/^\n+/, ''));
      const p = JSON.parse(fs.readFileSync(product, 'utf8'));
      if (p.checksums && p.checksums[LEGACY_CSS_KEY]) { p.checksums[LEGACY_CSS_KEY] = checksum(fs.readFileSync(css)); writeAtomic(product, JSON.stringify(p, null, '\t') + '\n'); }
      changed = true;
    }
  }
  return changed;
}

/**
 * The hook. Plain JavaScript for Electron's main process; parses as ES module AND CommonJS (no import.meta, no
 * top-level await), never throws into VS Code's startup. It reads `<user-data>/vs-glass/state.json` and `glass.css`:
 *   - `globalThis.__vsGlassWindowOptions()` (called from the spliced spread) returns creation-time options —
 *     `transparent: true` + a clear background — when state.json asks for transparency;
 *   - on each workbench window's `dom-ready` it applies the vibrancy material and inserts the glass CSS;
 *   - it watches the folder and re-applies live whenever the extension rewrites the files.
 */
export function hookText(_version?: string): string {
  return `${WIN_START}
/* VS Glass — ${HOOK_VERSION}. See-through window + live glass CSS, installed by the VS Glass extension; "VS Glass: Remove" restores this file byte-exact. */
;(function () {
  var modules = null;
  try {
    var req = process.getBuiltinModule('node:module').createRequire(process.execPath);
    modules = { electron: req('electron'), fs: req('node:fs'), path: req('node:path') };
  } catch (err) { modules = null; }
  var setup = function (electron, fs, path) {
    try {
      var app = electron.app, BrowserWindow = electron.BrowserWindow;
      var dir = path.join(app.getPath('userData'), 'vs-glass');
      var stateFile = path.join(dir, 'state.json'), cssFile = path.join(dir, 'glass.css');
      var CLEAR = '#00000000';
      var read = function (file) { try { return fs.readFileSync(file, 'utf8'); } catch (err) { return ''; } };
      var readState = function () { try { return JSON.parse(read(stateFile) || 'null'); } catch (err) { return null; } };
      globalThis.__vsGlassWindowOptions = function () {
        try { var st = readState(); return st && st.transparent ? { transparent: true, backgroundColor: CLEAR } : {}; } catch (err) { return {}; }
      };
      var isWorkbench = function (win) {
        try { var u = String(win.webContents.getURL() || ''); return u.indexOf('workbench.html') >= 0; } catch (err) { return false; }
      };
      var applyWindow = function (win) {
        try {
          if (!win || win.isDestroyed() || !isWorkbench(win)) return;
          var st = readState();
          var transparent = !!(st && st.transparent);
          if (!win.__vsGlass) {
            win.__vsGlass = { setBackgroundColor: win.setBackgroundColor.bind(win), transparent: null, queue: Promise.resolve(), key: null };
            win.setBackgroundColor = function (c) { win.__vsGlass.setBackgroundColor(win.__vsGlass.transparent ? CLEAR : c); };
          }
          var changed = win.__vsGlass.transparent !== transparent;
          win.__vsGlass.transparent = transparent;
          var mac = process.platform === 'darwin' && typeof win.setVibrancy === 'function';
          if (transparent) {
            win.__vsGlass.setBackgroundColor(CLEAR);
            if (mac) {
              var material = st && /^[a-z-]+$/.test(String(st.material || '')) ? st.material : 'hud';
              // 'none' = no vibrancy view at all: the transparent window shows the desktop unblurred and untinted,
              // which is as see-through as a window can be. Any other value is a macOS material.
              if (material === 'none') { try { win.setVibrancy(null); } catch (err) { /* ignore */ } }
              else { try { win.setVibrancy(material); } catch (err) { try { win.setVibrancy('hud'); } catch (err2) { /* ignore */ } } }
            }
          } else {
            if (mac) { try { win.setVibrancy(null); } catch (err) { /* ignore */ } }
            win.__vsGlass.setBackgroundColor((st && st.background) || '#1f1f1f');
          }
          if (changed && mac && !win.isMaximized() && !win.isFullScreen()) {
            try { var b = win.getBounds(); win.setBounds({ width: b.width + 1 }); win.setBounds({ width: b.width }); } catch (err) { /* recomposite nudge */ }
          }
        } catch (err) { /* never break VS Code */ }
      };
      var applyCss = function (win, freshDocument) {
        try {
          if (!win || win.isDestroyed() || !isWorkbench(win)) return;
          var s = win.__vsGlass || (win.__vsGlass = { setBackgroundColor: win.setBackgroundColor.bind(win), transparent: null, queue: Promise.resolve(), key: null });
          if (freshDocument) s.key = null;
          s.queue = s.queue.then(function () {
            var wc = win.webContents;
            if (!wc || wc.isDestroyed()) return;
            var css = read(cssFile);
            var prev = s.key;
            var insert = function () {
              if (!css) { s.key = null; return; }
              return wc.insertCSS(css, { cssOrigin: 'author' }).then(function (k) { s.key = k; }, function () { s.key = null; });
            };
            if (prev) return wc.removeInsertedCSS(prev).then(insert, insert);
            return insert();
          }).catch(function () { /* ignore */ });
        } catch (err) { /* ignore */ }
      };
      var applyAll = function () { BrowserWindow.getAllWindows().forEach(function (win) { applyWindow(win); applyCss(win, false); }); };
      var attach = function (win) {
        try {
          win.webContents.on('dom-ready', function () { applyWindow(win); applyCss(win, true); });
          win.webContents.on('did-finish-load', function () { applyWindow(win); });
        } catch (err) { /* ignore */ }
      };
      app.on('browser-window-created', function (_e, win) { attach(win); });
      BrowserWindow.getAllWindows().forEach(function (win) { attach(win); applyWindow(win); applyCss(win, false); });
      try { fs.mkdirSync(dir, { recursive: true }); } catch (err) { /* ignore */ }
      try { fs.writeFileSync(path.join(dir, 'hook.json'), JSON.stringify({ pid: process.pid, version: 5, sync: true, started: new Date().toISOString() })); } catch (err) { /* ignore */ }
      var timer = null, watcher = null;
      var watch = function () {
        try {
          watcher = fs.watch(dir, { persistent: false }, function () { clearTimeout(timer); timer = setTimeout(applyAll, 120); });
          watcher.on('error', function () { try { watcher.close(); } catch (err) { /* ignore */ } watcher = null; setTimeout(rewatch, 2000); });
        } catch (err) { watcher = null; setTimeout(rewatch, 2000); }
      };
      var rewatch = function () { try { if (!fs.existsSync(dir)) { setTimeout(rewatch, 2000); return; } } catch (err) { /* ignore */ } if (!watcher) watch(); };
      watch();
    } catch (err) { /* never break VS Code startup */ }
  };
  try {
    if (modules) setup(modules.electron, modules.fs, modules.path);
    else Promise.all([import('electron'), import('node:fs'), import('node:path')]).then(function (m) { setup(m[0].default || m[0], m[1].default || m[1], m[2].default || m[2]); }).catch(function () { /* ignore */ });
  } catch (err) { /* ignore */ }
})();
${WIN_END}
`;
}
