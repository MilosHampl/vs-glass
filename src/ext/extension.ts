/**
 * VS Glass — extension host side.
 *
 * The theme (Layer 1) needs nothing from this file. This is Layer 2's installer. VS Code has no extension point for a
 * see-through window or for workbench CSS, so VS Glass patches ONE file inside VS Code, `out/main.js` (the main-process
 * bundle, the one bootstrap file VS Code does not checksum) — see patch.ts for exactly what goes in there. The hook in
 * that file creates every workbench window transparent (macOS vibrancy material), inserts the glass CSS with Electron's
 * `insertCSS` (VS Code's own stylesheets are never edited), and watches `<user-data>/vs-glass/{glass.css,state.json}` so
 * every VS Glass setting takes effect the moment it changes — no reload.
 *
 * This file composes glass.css from the shipped glass files and the user's settings, writes state.json (window material,
 * transparency), keeps the hook current, and keeps theme-scoped `[Glass …]` colour blocks in `workbench.colorCustomizations`
 * so webviews match. "VS Glass: Remove" restores main.js byte-exact from its pristine backup and undoes the rest.
 */
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { BACKUP_SUFFIX, HOOK_VERSION, LEGACY_CSS_START, anchorCount, applyHook, cleanupLegacyCss, ensureBackup, hasHook, hasSplice, hookText, hookVersionOf, isEsmApp, restoreMain, writeAtomic } from './patch';

const GUARD = '.monaco-workbench[class*="-vs-glass-themes-glass-"]:not([class*="glass-opaque"]):not(.vs-glass-off)';
const VIBRANCY_MARKER = 'VSCODE-VIBRANCY-START';
const MATERIALS = ['hud', 'fullscreen-ui', 'popover', 'menu', 'sidebar', 'selection', 'titlebar', 'header', 'sheet', 'window', 'tooltip', 'content', 'under-window', 'under-page', 'appearance-based', 'light', 'dark', 'medium-light', 'ultra-dark'];
/** Written into the extension folder on every apply so the `vscode:uninstall` hook (uninstall.ts) knows what to undo. */
const PATHS_FILE = '.vs-glass-paths.json';

type Tri = 'auto' | 'on' | 'off';
interface Cfg {
  effects: boolean;
  windowTransparency: Tri;
  windowMaterial: string;
  density: number;
  widgetDensity: number;
  tint: string;
  lens: string;
  aberration: string;
  wallpaper: Tri;
  autoApply: boolean;
}

interface Files {
  root: string; main: string; legacyCss: string; legacyProduct: string;
  stateDir: string | null; glassCss: string | null; stateJson: string | null; hookJson: string | null;
}

interface State { transparent: boolean; material: string; background: string; version: string }

let out: vscode.OutputChannel;
let logFile = '';
/** Log to the "VS Glass" output channel and, durably, to the extension's log folder (survives a quit before the channel flushes). */
const log = (m: string) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`;
  out?.appendLine(line);
  if (logFile) { try { fs.appendFileSync(logFile, `${new Date().toISOString()} ${m}\n`); } catch { /* logging must never break the extension */ } }
};

function readCfg(): Cfg {
  const c = vscode.workspace.getConfiguration('vsGlass');
  const num = (k: string, d: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(c.get<number>(k, d)) || 0));
  const material = String(c.get<string>('windowMaterial', 'hud'));
  return {
    effects: c.get<boolean>('effects', true),
    windowTransparency: c.get<Tri>('windowTransparency', 'auto'),
    windowMaterial: MATERIALS.includes(material) ? material : 'hud',
    density: num('density', 100, 0, 200),
    widgetDensity: num('widgetDensity', 100, 0, 200),
    tint: c.get<string>('tint', 'none'),
    lens: c.get<string>('lens', 'default'),
    aberration: c.get<string>('aberration', 'default'),
    wallpaper: c.get<Tri>('wallpaper', 'auto'),
    autoApply: c.get<boolean>('autoApply', true),
  };
}

/** The user-data folder (…/Code, …/Code - Insiders, or the portable data dir): the parent of the "User" folder. */
function userDataDir(ctx: vscode.ExtensionContext): string | null {
  const parts = ctx.globalStorageUri.fsPath.split(path.sep);
  const i = parts.lastIndexOf('User');
  return i > 0 ? parts.slice(0, i).join(path.sep) : null;
}

function files(ctx: vscode.ExtensionContext): Files {
  const root = vscode.env.appRoot; // …/Contents/Resources/app on macOS; …/resources/app elsewhere
  const data = userDataDir(ctx);
  const stateDir = data ? path.join(data, 'vs-glass') : null;
  return {
    root,
    main: path.join(root, 'out', 'main.js'),
    legacyCss: path.join(root, 'out', 'vs', 'workbench', 'workbench.desktop.main.css'),
    legacyProduct: path.join(root, 'product.json'),
    stateDir,
    glassCss: stateDir ? path.join(stateDir, 'glass.css') : null,
    stateJson: stateDir ? path.join(stateDir, 'state.json') : null,
    hookJson: stateDir ? path.join(stateDir, 'hook.json') : null,
  };
}

/** The see-through window is an Electron/macOS feature (vibrancy); elsewhere the wallpaper addon stands in. */
const wantsTransparency = (cfg: Cfg) => process.platform === 'darwin' && cfg.windowTransparency !== 'off';
const wantsWallpaper = (cfg: Cfg) => cfg.wallpaper === 'on' || (cfg.wallpaper === 'auto' && !wantsTransparency(cfg));
const isGlassTheme = () => /Glass (Regular Dark|Regular Light|Clear|Opaque)/.test(String(vscode.workspace.getConfiguration('workbench').get('colorTheme') ?? ''));
const version = (ctx: vscode.ExtensionContext) => String(ctx.extension.packageJSON.version ?? '0');
/** VS Code's checksum format: standard base64 of the raw SHA-256 digest, '=' padding stripped. */
const checksum = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('base64').replace(/=+$/, '');

/** The CSS the hook inserts into every window, composed from the shipped glass files and the user's settings. */
function compose(ctx: vscode.ExtensionContext, cfg: Cfg): string {
  const read = (p: string) => fs.readFileSync(path.join(ctx.extensionPath, 'glass', p), 'utf8');
  const parts = [`/* VS Glass ${version(ctx)} — composed by the VS Glass extension from your settings; rewritten on every change. */`, read('glass.css')];
  if (wantsWallpaper(cfg)) parts.push(read('glass-wallpaper.css'));
  if (cfg.tint && cfg.tint !== 'none') parts.push(read(`tints/glass-tint-${cfg.tint}.css`));
  if (cfg.lens && cfg.lens !== 'default') parts.push(read(`lens/glass-lens-${cfg.lens}.css`));
  if (cfg.aberration && cfg.aberration !== 'default') parts.push(read(`aberration/glass-aberration-${cfg.aberration}.css`));
  parts.push(`/* VS Glass settings (vsGlass.density, vsGlass.widgetDensity) */\n${GUARD} {\n  --vsg-density: ${(cfg.density / 100).toFixed(3)};\n  --vsg-widget-density: ${(cfg.widgetDensity / 100).toFixed(3)};\n}\n`);
  return parts.join('\n');
}

function stateFor(ctx: vscode.ExtensionContext, cfg: Cfg): State {
  const kind = vscode.window.activeColorTheme.kind;
  const light = kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight;
  return { transparent: cfg.effects && wantsTransparency(cfg), material: cfg.windowMaterial, background: light ? '#f3f3f3' : '#1f1f1f', version: version(ctx) };
}
const stateText = (ctx: vscode.ExtensionContext, cfg: Cfg) => JSON.stringify(stateFor(ctx, cfg), null, 2) + '\n';

/** Write a file only when its content changes, atomically, so the hook's watcher sees whole files. */
function writeIfChanged(file: string, content: string): boolean {
  let cur: string | null = null;
  try { cur = fs.readFileSync(file, 'utf8'); } catch { cur = null; }
  if (cur === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeAtomic(file, content);
  return true;
}

interface Status {
  desktop: boolean; esm: boolean; writable: boolean;
  hookApplied: boolean; hookCurrent: boolean; hookLive: boolean; spliced: boolean; anchors: number; vibrancyContinued: boolean;
  cssApplied: boolean; cssStale: boolean; stateStale: boolean; legacyCss: boolean; themeColorsStale: boolean;
  backups: string[]; files: Files;
}

function status(ctx: vscode.ExtensionContext, cfg: Cfg): Status {
  const f = files(ctx);
  const desktop = vscode.env.appHost === 'desktop' && fs.existsSync(f.main);
  const esm = desktop && isEsmApp(f.root);
  let writable = false;
  try { fs.accessSync(f.main, fs.constants.W_OK); fs.accessSync(path.dirname(f.main), fs.constants.W_OK); writable = true; } catch { writable = false; }
  const main = desktop ? fs.readFileSync(f.main, 'utf8') : '';
  let hookLive = false;
  try { hookLive = !!f.hookJson && JSON.parse(fs.readFileSync(f.hookJson, 'utf8')).pid === process.ppid; } catch { hookLive = false; }
  let css: string | null = null, state: string | null = null;
  try { css = f.glassCss ? fs.readFileSync(f.glassCss, 'utf8') : null; } catch { css = null; }
  try { state = f.stateJson ? fs.readFileSync(f.stateJson, 'utf8') : null; } catch { state = null; }
  let legacyCss = fs.existsSync(f.legacyCss + BACKUP_SUFFIX) || fs.existsSync(f.legacyProduct + BACKUP_SUFFIX);
  try { legacyCss = legacyCss || fs.readFileSync(f.legacyCss, 'utf8').includes(LEGACY_CSS_START); } catch { /* ignore */ }
  const backups = [f.main, f.legacyCss, f.legacyProduct].filter(p => fs.existsSync(p + BACKUP_SUFFIX)).map(p => path.basename(p) + BACKUP_SUFFIX);
  const anchors = desktop ? anchorCount(main) : 0;
  return {
    desktop, esm, writable,
    hookApplied: hasHook(main), hookCurrent: hookVersionOf(main) === HOOK_VERSION && (hasSplice(main) || anchors !== 1), hookLive,
    spliced: hasSplice(main), anchors, vibrancyContinued: main.includes(VIBRANCY_MARKER),
    cssApplied: css !== null, cssStale: css !== null && css !== compose(ctx, cfg),
    stateStale: state !== stateText(ctx, cfg),
    themeColorsStale: themeColorsPlan(ctx, cfg.effects).changed,
    legacyCss, backups, files: f,
  };
}

/**
 * Theme-scoped colour customizations for the Glass themes. Webviews (Claude Code, Markdown preview, extension views)
 * paint their own bodies from the THEME colours — CSS in the workbench cannot reach inside them — so while Layer 2 is on
 * those colours carry the same near-clear alphas as the planes (glass/webview-colors.json, generated with the CSS).
 * Scoped `[Glass …]` blocks only: other themes and the user's own customizations are left alone.
 */
function themeColorTable(ctx: vscode.ExtensionContext): Record<string, Record<string, string>> {
  try { return JSON.parse(fs.readFileSync(path.join(ctx.extensionPath, 'glass', 'webview-colors.json'), 'utf8')); } catch { return {}; }
}
function themeColorsPlan(ctx: vscode.ExtensionContext, on: boolean): { next: Record<string, any> | undefined; changed: boolean } {
  const inspect = vscode.workspace.getConfiguration('workbench').inspect<Record<string, any>>('colorCustomizations');
  const cur: Record<string, any> = { ...(inspect?.globalValue ?? {}) };
  let changed = false;
  for (const [theme, colors] of Object.entries(themeColorTable(ctx))) {
    const key = `[${theme}]`;
    const block: Record<string, string> = { ...(cur[key] ?? {}) };
    for (const [k, v] of Object.entries(colors)) {
      if (on) { if (block[k] !== v) { block[k] = v; changed = true; } }
      else if (block[k] === v) { delete block[k]; changed = true; }
    }
    if (Object.keys(block).length) cur[key] = block; else delete cur[key];
  }
  return { next: Object.keys(cur).length ? cur : undefined, changed };
}
async function writeThemeColors(ctx: vscode.ExtensionContext, on: boolean): Promise<boolean> {
  const plan = themeColorsPlan(ctx, on);
  if (!plan.changed) return false;
  await vscode.workspace.getConfiguration('workbench').update('colorCustomizations', plan.next, vscode.ConfigurationTarget.Global);
  log(`${on ? 'wrote' : 'removed'} the [Glass …] colour customizations (webview backgrounds) in user settings`);
  return true;
}

/** Add the hook (and the options splice) to out/main.js, or take it out. Returns what changed. */
function writeHook(ctx: vscode.ExtensionContext, remove: boolean): { changed: boolean; spliced: boolean; anchors: number } {
  const f = files(ctx);
  const cur = fs.readFileSync(f.main, 'utf8');
  if (remove) {
    const how = restoreMain(f.main);
    if (how !== 'clean') log(`out/main.js ${how} (hook removed)`);
    return { changed: how !== 'clean', spliced: false, anchors: 0 };
  }
  const next = applyHook(cur, hookText(version(ctx)));
  if (next.text === cur) return { changed: false, spliced: next.spliced, anchors: next.anchors };
  ensureBackup(f.main, cur); // a pristine copy, refreshed whenever main.js is unpatched (e.g. after a VS Code update)
  writeAtomic(f.main, next.text);
  log(`wrote the window hook in out/main.js${next.spliced ? ' (creation-time transparency spliced in)' : ` — window-options anchor found ${next.anchors} times, expected 1: windows become see-through only after creation on this VS Code build (${vscode.version})`}`);
  return { changed: true, spliced: next.spliced, anchors: next.anchors };
}

/** Write vs-glass/glass.css and vs-glass/state.json (the hook applies them live). Returns true when anything changed. */
function writeState(ctx: vscode.ExtensionContext, cfg: Cfg): boolean {
  const f = files(ctx);
  if (!f.glassCss || !f.stateJson || !f.stateDir) throw new Error(`could not locate the user-data folder from ${ctx.globalStorageUri.fsPath}`);
  let changed = false;
  if (cfg.effects) {
    changed = writeIfChanged(f.glassCss, compose(ctx, cfg)) || changed;
  } else if (fs.existsSync(f.glassCss)) {
    fs.unlinkSync(f.glassCss); changed = true;
  }
  changed = writeIfChanged(f.stateJson, stateText(ctx, cfg)) || changed;
  if (changed) log(`wrote ${path.basename(f.stateDir)}/ (effects ${cfg.effects ? 'on' : 'off'}, transparency ${wantsTransparency(cfg) && cfg.effects ? 'on' : 'off'}, material ${cfg.windowMaterial}, density ${cfg.density}/${cfg.widgetDensity}, tint ${cfg.tint}, lens ${cfg.lens}, aberration ${cfg.aberration})`);
  return changed;
}

/** What the `vscode:uninstall` hook needs to undo the patch when the extension is uninstalled without "VS Glass: Remove". */
function writePathsFile(ctx: vscode.ExtensionContext, remove: boolean) {
  const file = path.join(ctx.extensionPath, PATHS_FILE);
  try {
    if (remove) { if (fs.existsSync(file)) fs.unlinkSync(file); return; }
    const f = files(ctx);
    fs.writeFileSync(file, JSON.stringify({ main: f.main, stateDir: f.stateDir, appRoot: f.root, written: new Date().toISOString() }, null, 2));
  } catch { /* best effort */ }
}

/** Automatic applies coalesce (activation, a settings change and the theme-change event our own colour write raises can all land within a few ms). */
let applyTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleApply(ctx: vscode.ExtensionContext) {
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => void apply(ctx, false), 250);
}

async function quitPrompt(message: string) {
  const pick = await vscode.window.showInformationMessage(message, 'Quit now', 'Later');
  if (pick === 'Quit now') await vscode.commands.executeCommand('workbench.action.quit');
}

async function apply(ctx: vscode.ExtensionContext, interactive: boolean): Promise<void> {
  const cfg = readCfg();
  const st = status(ctx, cfg);
  log(`apply (${interactive ? 'command' : 'automatic'}): effects ${cfg.effects}, transparency ${wantsTransparency(cfg) ? 'on' : 'off'}, material ${cfg.windowMaterial}, density ${cfg.density}/${cfg.widgetDensity}, tint ${cfg.tint}, lens ${cfg.lens}, aberration ${cfg.aberration}; hook ${st.hookApplied ? (st.hookCurrent ? 'current' : 'old') : 'absent'}${st.hookLive ? ' live' : ''}, css ${st.cssApplied ? (st.cssStale ? 'stale' : 'current') : 'absent'}`);
  if (!st.desktop) { if (interactive) vscode.window.showWarningMessage('VS Glass: the glass effects can only be applied to a local desktop VS Code (this is a web or remote UI host).'); return; }
  if (cfg.effects && !st.esm) {
    vscode.window.showWarningMessage(`VS Glass needs VS Code 1.94 or newer (its startup file must be an ES module); this is ${vscode.version}. Nothing was changed.`);
    return;
  }
  try {
    // Order matters: the file inside VS Code first (it is the step that can fail on a read-only install), then our own
    // files, then the settings — so a failure never leaves half of the setup behind.
    const legacy = cleanupLegacyCss(st.files.root, checksum);
    if (legacy) log('restored the workbench stylesheet and product.json patched by a 1.1.0 preview');
    const hook = writeHook(ctx, !cfg.effects);
    const filesChanged = writeState(ctx, cfg);
    const coloursChanged = await writeThemeColors(ctx, cfg.effects);
    writePathsFile(ctx, !cfg.effects);
    let note = '';
    if (cfg.effects && st.vibrancyContinued) note += ' Vibrancy Continued is patched into this VS Code as well; the two will fight over the window — disable one of them.';
    if (cfg.effects && !hook.spliced && hook.anchors !== 1 && wantsTransparency(cfg)) note += ` This VS Code build (${vscode.version}) lays its window options out differently, so the window becomes see-through only after it opens; you may see stale pixels where panels closed. Please report the version.`;
    if (hook.changed || legacy || (cfg.effects && !st.hookLive)) {
      await quitPrompt(cfg.effects
        ? `VS Glass is installed. Quit and reopen VS Code once to start the see-through window; after that every VS Glass setting applies live.${note}`
        : 'VS Glass effects removed. Quit and reopen VS Code to finish.');
    } else if (interactive) {
      vscode.window.showInformationMessage((filesChanged || coloursChanged ? 'VS Glass applied.' : 'VS Glass: already up to date.') + note);
    } else if (note && cfg.effects) {
      vscode.window.showWarningMessage(`VS Glass:${note}`);
    }
  } catch (e: any) {
    const denied = e && (e.code === 'EACCES' || e.code === 'EPERM' || e.code === 'EROFS');
    log(`apply failed: ${e?.stack ?? e}`);
    const pick = await vscode.window.showErrorMessage(
      denied
        ? `VS Glass could not write to VS Code's own startup file (${files(ctx).main}). Make the app folder writable for your user; nothing else was changed.`
        : `VS Glass could not apply: ${e?.message ?? e}`,
      'Show log');
    if (pick === 'Show log') out.show();
  }
}

async function remove(ctx: vscode.ExtensionContext): Promise<void> {
  const f = files(ctx);
  log(`remove invoked (${vscode.env.sessionId})`);
  try {
    const restored: string[] = [];
    const how = fs.existsSync(f.main) ? restoreMain(f.main) : 'clean';
    if (how !== 'clean') restored.push(`main.js ${how}`);
    if (cleanupLegacyCss(f.root, checksum)) restored.push('workbench.desktop.main.css + product.json restored');
    if (f.stateDir && fs.existsSync(f.stateDir)) { fs.rmSync(f.stateDir, { recursive: true, force: true }); restored.push('vs-glass/ settings folder deleted'); }
    if (await writeThemeColors(ctx, false)) restored.push('[Glass …] colour customizations removed from settings');
    writePathsFile(ctx, true);
    log(`removed: ${restored.join(', ') || 'nothing was applied'}`);
    await quitPrompt(`VS Glass removed (${restored.join(', ') || 'nothing was applied'}). Quit and reopen VS Code to finish.`);
  } catch (e: any) {
    log(`remove failed: ${e?.stack ?? e}`);
    vscode.window.showErrorMessage(`VS Glass could not restore VS Code's files: ${e?.message ?? e}`);
  }
}

function showStatus(ctx: vscode.ExtensionContext) {
  const cfg = readCfg();
  const st = status(ctx, cfg);
  const hookLine = !st.hookApplied ? 'not applied'
    : `${st.hookCurrent ? 'applied' : `applied, ${hookVersionOf(fs.readFileSync(st.files.main, 'utf8')) ?? 'older'} (re-run Apply)`}${st.hookLive ? ', running' : ', not running yet (quit and reopen VS Code)'}${st.spliced ? ', windows created transparent' : st.anchors === 1 ? ', creation-time transparency NOT spliced (re-run Apply)' : `, creation-time transparency unavailable on this build (anchor ×${st.anchors})`}`;
  const lines = [
    `VS Glass ${version(ctx)} on VS Code ${vscode.version}${st.esm ? '' : ' (startup file is not an ES module: VS Glass needs 1.94+)'}`,
    `app: ${st.files.root}${st.writable ? '' : '  (out/main.js not writable)'}`,
    `window hook (out/main.js): ${hookLine}${st.vibrancyContinued ? '  — Vibrancy Continued is patched in too' : ''}`,
    `glass CSS (${st.files.stateDir ?? 'user-data folder not found'}/glass.css): ${st.cssApplied ? `written${st.cssStale ? ', out of date with your settings' : ''}` : 'not written'}`,
    `settings: density ${cfg.density} %, widgets ${cfg.widgetDensity} %, tint ${cfg.tint}, lens ${cfg.lens}, aberration ${cfg.aberration}, wallpaper ${wantsWallpaper(cfg) ? 'on' : 'off'}, transparency ${wantsTransparency(cfg) ? `on (${cfg.windowMaterial})` : process.platform === 'darwin' ? 'off' : 'off (macOS only)'}`,
    `webview colours ([Glass …] blocks in workbench.colorCustomizations): ${st.themeColorsStale ? (cfg.effects ? 'missing or out of date' : 'still present') : (cfg.effects ? 'applied' : 'none')}`,
    `backups: ${st.backups.length ? st.backups.join(', ') : 'none'}${st.legacyCss ? '  — a 1.1.0 preview patched the workbench stylesheet; Apply restores it' : ''}`,
  ];
  out.appendLine(lines.join('\n')); out.show(true);
}

async function firstRun(ctx: vscode.ExtensionContext, st: Status) {
  // A VS Code update replaces out/main.js and takes the hook with it. The state folder survives, so "applied before,
  // hook gone now" means an update: ask again (once per VS Code version), whatever the first-run answer was.
  const updated = st.cssApplied && !st.hookApplied;
  const key = updated ? `vsGlass.reapply.${vscode.version}` : 'vsGlass.prompted';
  if (ctx.globalState.get<boolean>(key)) return;
  const pick = await vscode.window.showInformationMessage(
    updated
      ? `VS Glass: VS Code ${vscode.version} replaced its startup file, so the see-through window and glass effects are off. Apply VS Glass again? (Same reversible hook as before.)`
      : 'VS Glass: make the window see-through and apply the glass effects? VS Code has no extension point for this, so VS Glass patches one file inside VS Code (out/main.js — backed up first, restored byte-exact by "VS Glass: Remove") and adds theme-scoped [Glass …] colour blocks to your settings so webviews match.',
    'Apply', 'Not now', 'Never ask again');
  if (pick === 'Never ask again') { await ctx.globalState.update(key, true); return; }
  if (pick === 'Apply') { await ctx.globalState.update(key, true); await apply(ctx, true); }
}

export async function activate(ctx: vscode.ExtensionContext) {
  out = vscode.window.createOutputChannel('VS Glass');
  ctx.subscriptions.push(out);
  try { fs.mkdirSync(ctx.logUri.fsPath, { recursive: true }); logFile = path.join(ctx.logUri.fsPath, 'vs-glass.log'); } catch { logFile = ''; }
  ctx.subscriptions.push(
    vscode.commands.registerCommand('vsGlass.apply', () => apply(ctx, true)),
    vscode.commands.registerCommand('vsGlass.remove', () => remove(ctx)),
    vscode.commands.registerCommand('vsGlass.status', () => showStatus(ctx)),
    vscode.commands.registerCommand('vsGlass.openSettings', () => vscode.commands.executeCommand('workbench.action.openSettings', '@ext:MilosHampl.vs-glass')),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (!e.affectsConfiguration('vsGlass')) return;
      const cfg = readCfg();
      if (cfg.autoApply && status(ctx, cfg).hookApplied) scheduleApply(ctx); // live: the hook picks the new files up
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      const cfg = readCfg();
      const st = status(ctx, cfg);
      if (st.hookApplied) { if (cfg.autoApply) scheduleApply(ctx); return; } // the opaque fallback colour follows the theme kind
      if (cfg.effects && st.desktop && isGlassTheme()) void firstRun(ctx, st); // a fresh install: the user just picked a Glass theme
    }),
  );
  if (vscode.env.appHost !== 'desktop') return;
  const cfg = readCfg();
  const st = status(ctx, cfg);
  const themeIsGlass = isGlassTheme();
  log(`activate ${version(ctx)} on ${vscode.version}: theme ${themeIsGlass ? 'Glass' : 'other'}, effects ${cfg.effects}, hook ${st.hookApplied ? (st.hookCurrent ? 'current' : 'old') : 'absent'}${st.hookLive ? ' live' : ''}${st.spliced ? ' spliced' : ''}, css ${st.cssApplied ? (st.cssStale ? 'stale' : 'current') : 'absent'}, legacy ${st.legacyCss}`);
  if (st.hookApplied) writePathsFile(ctx, false);
  if (!cfg.effects || !themeIsGlass) return;
  if (!st.hookApplied) { void firstRun(ctx, st); return; } // consent before touching VS Code's file (again, after a VS Code update)
  if ((st.cssStale || !st.cssApplied || st.stateStale || !st.hookCurrent || st.legacyCss || st.themeColorsStale) && cfg.autoApply) scheduleApply(ctx); // settings or version changed since the last apply
}

export function deactivate() { /* nothing to do: the patches are files, not processes */ }
