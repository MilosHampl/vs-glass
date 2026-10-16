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
export const HOOK_VERSION = 'VS-GLASS-HOOK-V10';
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

/**
 * True when the VS Glass hook block inside `text` compiles as JavaScript.
 *
 * The hook is appended to VS Code's main-process bundle: a hook that does not parse takes the whole main process down
 * with "A JavaScript error occurred in the main process", and VS Code then cannot start to repair itself. So nothing
 * writes main.js without passing this first. `new Function` compiles the body without running any of it.
 */
export function hookParses(text: string): boolean {
  const i = text.indexOf(WIN_START);
  if (i < 0) return true; // no hook to break
  const j = text.indexOf(WIN_END, i);
  if (j < 0) return false; // truncated block
  const body = text.slice(i + WIN_START.length, j);
  try { new Function(body); return true; } catch { return false; }
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
 * that replaced main.js refreshes it — and never overwritten with a patched file. The copy is written from `text`, the
 * content that was checked: copying the file itself could pick up a hook another window's extension host wrote in
 * between. Returns false when no usable backup exists.
 */
export function ensureBackup(file: string, text: string): boolean {
  const b = file + BACKUP_SUFFIX;
  if (!hasHook(text) && !hasSplice(text)) { writeAtomic(b, text); return true; }
  return fs.existsSync(b);
}

/**
 * Restore main.js. Stripping is the byte-exact inverse of applying, so it is the first choice; the backup is the way
 * back only when the hook block is damaged and cannot be stripped cleanly. Nothing of ours in main.js means there is
 * nothing to restore — and a backup left next to it then predates a VS Code update: copying it back would put the OLD
 * build's main process into the new VS Code, so it is deleted instead. The backup is dropped in every case.
 */
export function restoreMain(main: string): 'restored' | 'stripped' | 'clean' {
  const b = main + BACKUP_SUFFIX;
  const cur = fs.readFileSync(main, 'utf8');
  const backup = fs.existsSync(b) ? fs.readFileSync(b, 'utf8') : null;
  const drop = () => { if (backup !== null) { try { fs.unlinkSync(b); } catch { /* already gone */ } } };
  if (!hasHook(cur) && !hasSplice(cur)) { drop(); return 'clean'; }
  const next = stripHook(cur);
  if (!hasHook(next) && !hasSplice(next)) { writeAtomic(main, next); drop(); return next === backup ? 'restored' : 'stripped'; }
  if (backup !== null && !hasHook(backup) && !hasSplice(backup)) { writeAtomic(main, backup); drop(); return 'restored'; }
  drop();
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
 *   - in every webview frame (`vscode-webview://…`, e.g. the Claude Code chat) it adopts `webview.css` as a constructed
 *     stylesheet (CSSOM, so the webview's CSP does not apply);
 *   - it watches the folder and re-applies live whenever the extension rewrites the files — only what changed: the
 *     560 KB-class workbench sheet is re-inserted only when glass.css itself changed, the material only when it did.
 * Everything here must be cheap when nothing changed: the frame sweep runs every few seconds for the life of VS Code.
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
      var stateFile = path.join(dir, 'state.json'), cssFile = path.join(dir, 'glass.css'), wvFile = path.join(dir, 'webview.css');
      var CLEAR = '#00000000';
      var read = function (file) { try { return fs.readFileSync(file, 'utf8'); } catch (err) { return ''; } };
      var readState = function () { try { return JSON.parse(read(stateFile) || 'null'); } catch (err) { return null; } };
      // visualEffectState 'active': macOS would otherwise switch the vibrancy view to its flat inactive fill the instant
      // the window loses focus — a snap from glass to opaque. The hook fades to the inactive look itself (below). It is
      // creation-time only, so an opaque window gets it too (harmless without a vibrancy view) in case glass is
      // switched on live later.
      globalThis.__vsGlassWindowOptions = function () {
        try {
          var st = readState();
          if (!st) return {};
          var o = {};
          if (process.platform === 'darwin') o.visualEffectState = 'active';
          if (st.transparent) { o.transparent = true; o.backgroundColor = CLEAR; }
          return o;
        } catch (err) { return {}; }
      };
      var isWorkbench = function (win) {
        try { var u = String(win.webContents.getURL() || ''); return u.indexOf('workbench.html') >= 0; } catch (err) { return false; }
      };
      var stateOf = function (win) {
        if (!win.__vsGlass) {
          win.__vsGlass = { setBackgroundColor: win.setBackgroundColor.bind(win), transparent: null, look: null, queue: Promise.resolve(), key: null, css: null, parked: false, parkT: null };
          win.setBackgroundColor = function (c) { win.__vsGlass.setBackgroundColor(win.__vsGlass.transparent ? CLEAR : c); };
        }
        return win.__vsGlass;
      };
      // force: a fresh document or a finished load (VS Code may have reset the background); otherwise only a change in
      // state.json touches the window — re-applying the same vibrancy material rebuilds the OS view and flickers.
      // Returns whether it applied anything (the focus veil then follows the new look).
      var applyWindow = function (win, force) {
        try {
          if (!win || win.isDestroyed() || !isWorkbench(win)) return false;
          var st = readState();
          var s = stateOf(win);
          var transparent = !!(st && st.transparent);
          var material = st && /^[a-z-]+$/.test(String(st.material || '')) ? st.material : 'hud';
          var look = (transparent ? 'clear:' + material : 'opaque:' + ((st && st.background) || '#1f1f1f'));
          if (!force && s.look === look) return false;
          var changed = s.transparent !== transparent;
          s.transparent = transparent; s.look = look;
          var mac = process.platform === 'darwin' && typeof win.setVibrancy === 'function';
          if (transparent) {
            s.setBackgroundColor(CLEAR);
            // an unfocused window whose vibrancy is parked (see focusFade) keeps it parked; focus brings the new material
            if (mac && !s.parked) {
              // 'none' = no vibrancy view at all: the transparent window shows the desktop unblurred and untinted,
              // which is as see-through as a window can be. Any other value is a macOS material.
              if (material === 'none') { try { win.setVibrancy(null); } catch (err) { /* ignore */ } }
              else { try { win.setVibrancy(material); } catch (err) { try { win.setVibrancy('hud'); } catch (err2) { /* ignore */ } } }
            }
          } else {
            if (mac) { try { win.setVibrancy(null); } catch (err) { /* ignore */ } }
            s.parked = false;
            s.setBackgroundColor((st && st.background) || '#1f1f1f');
          }
          if (changed && mac && !win.isMaximized() && !win.isFullScreen()) {
            try { var b = win.getBounds(); win.setBounds({ width: b.width + 1 }); win.setBounds({ width: b.width }); } catch (err) { /* recomposite nudge */ }
          }
          return true;
        } catch (err) { return false; /* never break VS Code */ }
      };
      // Focus. The window keeps its vibrancy view active (creation option above), so losing focus no longer snaps to the
      // OS's flat inactive fill. Instead the page fades a veil in behind all its content (glass.css, .vs-glass-inactive,
      // an opacity transition); once that is opaque the vibrancy view is removed — an unfocused window then costs the
      // window server no live blur at all, cheaper than the OS's own inactive state. Focus restores the view under the
      // still-opaque veil, and the veil fades out over it. Nothing of this runs without a vibrancy material. It is also
      // the reconciler after a live change of look (applyAll): it only ever moves the window to the state its focus and
      // the current material call for.
      var FADE_MS = 1600;
      var markInactive = function (win, on) {
        try {
          var wc = win.webContents;
          if (!wc || wc.isDestroyed()) return;
          var p = wc.executeJavaScript('(function(){var w=document.querySelector(".monaco-workbench");if(w){w.classList.toggle("vs-glass-inactive",' + (on ? 'true' : 'false') + ');}})()', true);
          if (p && p.catch) p.catch(function () { /* ignore */ });
        } catch (err) { /* ignore */ }
      };
      var focusFade = function (win, unfocused) {
        try {
          if (!win || win.isDestroyed() || !isWorkbench(win)) return;
          var s = stateOf(win);
          var st = readState();
          var material = st && /^[a-z-]+$/.test(String(st.material || '')) ? st.material : 'hud';
          var vibrant = !!(st && st.transparent) && process.platform === 'darwin' && typeof win.setVibrancy === 'function' && material !== 'none';
          clearTimeout(s.parkT); s.parkT = null;
          markInactive(win, unfocused && vibrant);
          // no vibrancy wanted: nothing is parked any more (applyWindow already set the view the look calls for)
          if (!vibrant) { s.parked = false; return; }
          if (unfocused) {
            s.parkT = setTimeout(function () {
              try { if (!win.isDestroyed() && !win.isFocused()) { win.setVibrancy(null); s.parked = true; } } catch (err) { /* ignore */ }
            }, FADE_MS);
          } else if (s.parked) {
            s.parked = false;
            try { win.setVibrancy(material); } catch (err) { try { win.setVibrancy('hud'); } catch (err2) { /* ignore */ } }
          }
        } catch (err) { /* ignore */ }
      };
      // the sheet goes in once per document and again only when glass.css changed (it is the whole workbench sheet:
      // re-inserting it restyles every element of the window)
      var applyCss = function (win, freshDocument) {
        try {
          if (!win || win.isDestroyed() || !isWorkbench(win)) return;
          var s = stateOf(win);
          if (freshDocument) { s.key = null; s.css = null; }
          s.queue = s.queue.then(function () {
            var wc = win.webContents;
            if (!wc || wc.isDestroyed()) return;
            var css = read(cssFile);
            if (s.key && s.css === css) return;
            var prev = s.key;
            var insert = function () {
              if (!css) { s.key = null; s.css = null; return; }
              return wc.insertCSS(css, { cssOrigin: 'author' }).then(function (k) { s.key = k; s.css = css; }, function () { s.key = null; s.css = null; });
            };
            if (prev) return wc.removeInsertedCSS(prev).then(insert, insert);
            return insert();
          }).catch(function () { /* ignore */ });
        } catch (err) { /* ignore */ }
      };
      // The script the hook runs inside webview frames (the Claude Code chat, previews): it adopts webview.css as a
      // constructed stylesheet — CSSOM, which a page's CSP does not govern — once the document holds a surface the
      // sheet knows, so other webviews stay untouched. It must cost nothing when nothing changed: the sweep below
      // re-runs it, and a chat that streams text mutates constantly.
      //   - same document and same CSS → at most one cheap check for a surface that appeared since, then return;
      //   - a new document (VS Code writes webview HTML with document.open(), which swaps the root element) or new CSS →
      //     adopt, polling briefly (10 s) while the app renders into it;
      //   - no layout measuring, no ResizeObserver: the sheet is purely visual.
      var wvScript = function (css) {
        return '(function(){try{var d=document,w=window;var css=' + JSON.stringify(css || '') + ';' +
          'var g=w.__vsGlassWV||(w.__vsGlassWV={});' +
          'var known=function(){return !!d.querySelector(\\'[class*="chatContainer_"],[class*="inputContainer_"]\\');};' +
          'var adopt=function(){try{if(!known()){return false;}if(!g.sheet){g.sheet=new CSSStyleSheet();}if(g.applied!==g.css){g.sheet.replaceSync(g.css);g.applied=g.css;}if(d.adoptedStyleSheets.indexOf(g.sheet)<0){d.adoptedStyleSheets=d.adoptedStyleSheets.concat([g.sheet]);}g.adopted=true;return true;}catch(e){return false;}};' +
          'var poll=function(){if(g.pollT){return;}var n=0;g.pollT=setInterval(function(){if(adopt()||++n>40){clearInterval(g.pollT);g.pollT=0;}},250);};' +
          'var fresh=g.doc!==d.documentElement;' +
          'if(!fresh&&g.css===css){if(!g.adopted){adopt();}return;}' +
          'g.doc=d.documentElement;g.css=css;g.adopted=false;' +
          'if(!adopt()){poll();}' +
          'if(!g.obs){g.obs=new MutationObserver(function(){if(g.doc!==d.documentElement){g.doc=d.documentElement;g.adopted=false;if(!adopt()){poll();}}});g.obs.observe(d,{childList:true});}' +
          '}catch(e){}})();';
      };
      var isWebviewFrame = function (f) {
        try {
          if (!f) return false;
          var u = String(f.url || '');
          if (u.indexOf('vscode-webview://') === 0) return true;
          // VS Code builds webview content by document.write-ing into a child frame, which can report about:blank;
          // accept those when an ancestor is a webview host. The injected script styles nothing it does not recognise.
          if (u === '' || u === 'about:blank') { var p = f.parent; for (var i = 0; i < 4 && p; i++) { if (String(p.url || '').indexOf('vscode-webview://') === 0) return true; p = p.parent; } }
          return false;
        } catch (err) { return false; }
      };
      // webview.css is read once and cached until the watcher sees it change; each frame gets the script once per
      // version of the sheet (frame load events re-inject on their own: a new document needs it again)
      var wvCss = null, wvRev = 0, injected = {};
      var wvText = function () { if (wvCss === null) { wvCss = read(wvFile); wvRev++; } return wvCss; };
      var frameKey = function (f) { try { return f.processId + ':' + f.routingId; } catch (err) { return ''; } };
      var injectFrame = function (f, always) {
        try {
          if (!isWebviewFrame(f)) return;
          var css = wvText(), key = frameKey(f);
          if (!always && key && injected[key] === wvRev) return;
          if (key) injected[key] = wvRev;
          var p = f.executeJavaScript(wvScript(css), true);
          if (p && p.catch) p.catch(function () { if (key) delete injected[key]; });
        } catch (err) { /* ignore */ }
      };
      var started = new Date().toISOString();
      var wvSeen = [];
      // hook.json says "this VS Code runs the hook" (the extension compares its pid with its own parent's). Only a process
      // that owns a window may write it: \`code <path>\` from a terminal starts a second VS Code that loads this file,
      // runs the hook, finds the running instance and exits — and its hook.json, written at startup, made the real
      // window's extension take the hook for not running (webview sheet withheld, a quit prompt on every apply).
      var owner = false;
      var claim = function () { if (!owner && BrowserWindow.getAllWindows().length) { owner = true; writeHookJson(); } };
      var writeHookJson = function () {
        var file = path.join(dir, 'hook.json');
        var body = JSON.stringify({ pid: process.pid, version: 10, sync: true, started: started, webviews: wvSeen.length, webviewUrls: wvSeen });
        try { fs.writeFileSync(file, body); }
        catch (err) { try { fs.chmodSync(file, 420); fs.writeFileSync(file, body); } catch (err2) { /* a read-only folder: the extension reports the hook as not running */ } }
      };
      // one pass over the frames of every window: inject where needed, forget frames that are gone, and report the set
      // of webviews in hook.json only when it changed
      var applyWebviews = function () {
        try {
          var hit = [], live = {};
          BrowserWindow.getAllWindows().forEach(function (win) {
            try {
              if (!win || win.isDestroyed() || !isWorkbench(win)) return;
              var main = win.webContents.mainFrame;
              var frames = (main && main.framesInSubtree) ? main.framesInSubtree : [];
              frames.forEach(function (f) {
                if (!isWebviewFrame(f)) return;
                hit.push(String(f.url || '').slice(0, 120));
                var key = frameKey(f);
                if (key) live[key] = injected[key];
                injectFrame(f, false);
                if (key) live[key] = injected[key];
              });
            } catch (err) { /* ignore */ }
          });
          injected = live;
          hit.sort();
          var changed = hit.length !== wvSeen.length || hit.some(function (u, i) { return u !== wvSeen[i]; });
          wvSeen = hit;
          if (changed && owner) writeHookJson();
        } catch (err) { /* ignore */ }
      };
      var applyAll = function (names) {
        if (!names || names['webview.css']) wvCss = null;
        BrowserWindow.getAllWindows().forEach(function (win) {
          if ((!names || names['state.json']) && applyWindow(win, false)) focusFade(win, !win.isFocused());
          if (!names || names['glass.css']) applyCss(win, false);
        });
        applyWebviews();
      };
      var attach = function (win) {
        try {
          var wc = win.webContents;
          wc.on('dom-ready', function () { applyWindow(win, true); applyCss(win, true); focusFade(win, !win.isFocused()); });
          win.on('blur', function () { focusFade(win, true); });
          win.on('focus', function () { focusFade(win, false); });
          wc.on('did-finish-load', function () { applyWindow(win, true); });
          wc.on('frame-created', function (_e, details) {
            try { var f = details && details.frame; if (f && f.on) f.on('dom-ready', function () { injectFrame(f, true); }); } catch (err) { /* ignore */ }
          });
          wc.on('did-frame-finish-load', function (_e, isMainFrame, pid, rid) {
            try { if (isMainFrame) return; var f = electron.webFrameMain.fromId(pid, rid); setTimeout(function () { injectFrame(f, true); }, 50); } catch (err) { /* ignore */ }
          });
        } catch (err) { /* ignore */ }
      };
      try { fs.mkdirSync(dir, { recursive: true }); } catch (err) { /* ignore */ }
      app.on('browser-window-created', function (_e, win) { attach(win); claim(); });
      BrowserWindow.getAllWindows().forEach(function (win) { attach(win); applyWindow(win, true); applyCss(win, false); });
      claim();
      applyWebviews();
      var timer = null, watcher = null, watchedIno = 0, pending = {}, everything = false;
      var watch = function () {
        try {
          // Only the three files the extension writes for us matter. The folder also holds hook.json (written by THIS
          // hook), and the slab helper's log, pid and lock: reacting to those re-inserted the whole workbench
          // stylesheet on every write — with the V6 frame sweep that was every three seconds, in every window.
          var relevant = { 'glass.css': 1, 'state.json': 1, 'webview.css': 1 };
          watchedIno = fs.statSync(dir).ino;
          watcher = fs.watch(dir, { persistent: false }, function (_ev, name) {
            try {
              var n = name ? String(name) : '';
              if (n && !relevant[n]) return;
              if (n) pending[n] = 1; else everything = true; // no file name: re-apply everything
              clearTimeout(timer);
              timer = setTimeout(function () { var names = everything ? null : pending; pending = {}; everything = false; applyAll(names); }, 120);
            } catch (err) { /* never throw into the main process */ }
          });
          watcher.on('error', function () { try { watcher.close(); } catch (err) { /* ignore */ } watcher = null; setTimeout(rewatch, 2000); });
        } catch (err) { watcher = null; setTimeout(rewatch, 2000); }
      };
      var rewatch = function () { try { if (!fs.existsSync(dir)) { setTimeout(rewatch, 2000); return; } } catch (err) { /* ignore */ } if (!watcher) watch(); };
      watch();
      // A webview can open long after its window did, and frame events are not guaranteed to reach us for every one of
      // them, so sweep the frame tree on a slow timer as well (already injected frames cost a lookup). The sweep also
      // notices a state folder that was deleted and recreated ("VS Glass: Remove", then Apply): fs.watch on macOS can go
      // quiet on a deleted directory without an error, so it is re-watched and everything re-applied.
      var sweep = setInterval(function () {
        try {
          var ino = 0; try { ino = fs.statSync(dir).ino; } catch (err) { ino = 0; }
          if (ino && ino !== watchedIno) { try { if (watcher) watcher.close(); } catch (err) { /* ignore */ } watcher = null; watch(); if (owner) writeHookJson(); applyAll(null); return; }
          applyWebviews();
        } catch (err) { /* ignore */ }
      }, 5000);
      if (sweep.unref) sweep.unref();
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
