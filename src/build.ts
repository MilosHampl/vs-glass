/**
 * VS Glass build: palette → themes/*.json (Layer 1) and glass/glass.css + glass-filters.svg (Layer 2).
 * Run with `npm run build`. Generated files are never hand-edited.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { palettes, describe, TINTS, DENSITY_PRESETS, LENS_PRESETS, ABERRATION_PRESETS, type Palette } from './palette';
import { css as cssColor, alpha, parseHex } from './color';
import { LENS_CLASSES, makeMap, filterSvg, filterDataUrl } from './lens';
import chrome from './colors/chrome';
import editor from './colors/editor';
import controls from './colors/controls';
import panels from './colors/panels';
import tokens from './tokens';
import semantic from './semantic';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEYS_FILE = path.join(ROOT, 'research', 'all-color-keys.json');
const knownKeys: Set<string> = new Set((JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')).keys as { id: string }[]).map(k => k.id));

export type ColorModule = (p: Palette) => Record<string, string>;
const MODULES: [string, ColorModule][] = [['chrome', chrome], ['editor', editor], ['controls', controls], ['panels', panels]];

/** Class VS Code puts on .monaco-workbench for a theme file: vscode-theme-<ext>-<path>. */
export const themeClass = (p: Palette) => `MilosHampl-vs-glass-themes-${p.id}-color-theme-json`;
/** CSS-only guard: effects apply only while a VS Glass theme (other than Opaque) is active. `.vs-glass-off` force-disables. */
export const GUARD = '.monaco-workbench[class*="-vs-glass-themes-glass-"]:not([class*="glass-opaque"]):not(.vs-glass-off)';

function buildColors(p: Palette): Record<string, string> {
  const out: Record<string, string> = {};
  const owner: Record<string, string> = {};
  const unknown: string[] = [];
  for (const [name, mod] of MODULES) {
    for (const [key, value] of Object.entries(mod(p))) {
      if (key in out) throw new Error(`duplicate key "${key}" set by both ${owner[key]} and ${name}`);
      if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) throw new Error(`${name}: "${key}" has non-hex value "${value}"`);
      if (!knownKeys.has(key)) unknown.push(`${key} (${name})`);
      out[key] = value.toLowerCase();
      owner[key] = name;
    }
  }
  if (unknown.length) console.warn(`  ⚠ ${p.id}: ${unknown.length} key(s) not in research/all-color-keys.json:\n    ${unknown.join('\n    ')}`);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function buildTheme(p: Palette) {
  return {
    $schema: 'vscode://schemas/color-theme',
    name: p.name,
    type: p.type,
    semanticHighlighting: true,
    colors: buildColors(p),
    tokenColors: tokens(p),
    semanticTokenColors: semantic(p),
  };
}

// ---------------------------------------------------------------------------------------------
// Layer 2: CSS variables + lens filters
// ---------------------------------------------------------------------------------------------
const rgbOf = (hex: string) => { const c = parseHex(hex); return `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`; };
const alphaOf = (hex: string) => parseHex(hex).a;
/** rgb + base alpha + wallpaper-mode alpha for one plane, and the composed colour that follows --vsg-density */
function planeVars(name: string, color: string, wallAlpha: number, minAlpha = 0, densityVar = '--vsg-density'): Record<string, string> {
  // minAlpha: a floor the density knob cannot go below. Widgets over code need one: a backdrop-filtered copy of
  // text on a transparent page is too thin to hide the sharp original beneath it (PROGRESS.md finding 6), so a
  // bodiless widget ghosts instead of frosting. The editor and chrome planes have no floor (density 0 = clear glass).
  // density D runs 0 → 2: alpha climbs linearly from 0 to the tuned base at D = 1, then on to fully opaque at D = 2, so the
  // one slider really spans "absolutely clear" to "opaque" whatever the base is
  const a = densityRamp(`var(--vsg-plane-${name}-a)`, `var(${densityVar})`);
  return {
    [`--vsg-plane-${name}-rgb`]: rgbOf(color),
    [`--vsg-plane-${name}-a`]: alphaOf(color).toFixed(3),
    [`--vsg-plane-${name}-wall-a`]: wallAlpha.toFixed(3),
    [`--vsg-plane-${name}`]: minAlpha > 0
      ? `rgba(var(--vsg-plane-${name}-rgb), max(${minAlpha}, ${a}))`
      : `rgba(var(--vsg-plane-${name}-rgb), calc(${a}))`,
  };
}

/** CSS expression: base alpha `a` at density 1, 0 at density 0, 1 at density 2 (piecewise linear). */
const densityRamp = (a: string, d: string) => `${a} * min(1, ${d}) + (1 - ${a}) * max(0, ${d} - 1)`;

function glassVars(p: Palette): { css: string; filtersSvg: string[] } {
  const e = p.effects, g = p.glass;
  const v: Record<string, string> = {
    '--vsg-ground': cssColor(p.ground),
    '--vsg-ground-deep': cssColor(p.groundDeep),
    '--vsg-content-bg': cssColor(p.content.bg),
    '--vsg-content-bg-glass': cssColor(p.content.bgGlass),
    '--vsg-tint': cssColor(p.glass.tint),
    '--vsg-accent': cssColor(p.ui.accent),
    '--vsg-focus': cssColor(p.ui.focus),
    '--vsg-label-1': cssColor(p.label.primary),
    '--vsg-label-2': cssColor(p.label.secondary),
    '--vsg-label-3': cssColor(p.label.tertiary),
    '--vsg-label-4': cssColor(p.label.quaternary),
    '--vsg-hairline': cssColor(p.separator.hairline),
    '--vsg-shadow-rgb': (() => { const h = e.shadowColor.replace('#', ''); return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`; })(),
    '--vsg-spec-rgb': p.isDark ? '255, 238, 222' : '255, 250, 244', // warm environment light, never a sterile white
    '--vsg-blur': `${e.blur}px`,
    '--vsg-blur-widget': `${e.blurWidget}px`,
    '--vsg-saturate': String(e.saturate),
    '--vsg-brightness': String(e.brightness),
    '--vsg-contrast': String(e.contrastBoost),
    '--vsg-dim': String(e.dim),
    '--vsg-radius-window': `${e.radius.window}px`,
    '--vsg-radius-card': `${e.radius.card}px`,
    '--vsg-radius-widget': `${e.radius.widget}px`,
    '--vsg-radius-control': `${e.radius.control}px`,
    '--vsg-radius-inner': `${e.radius.inner}px`,
    '--vsg-light-angle': `${e.lightAngle}deg`,
    '--vsg-motion-fast': `${e.motion.fast}ms`,
    '--vsg-motion-base': `${e.motion.base}ms`,
    '--vsg-motion-slow': `${e.motion.slow}ms`,
    '--vsg-ease': e.motion.ease,
    '--vsg-vibrancy-blend': p.isDark ? 'plus-lighter' : 'multiply',
    '--vsg-exaggeration': String(e.exaggeration),
    // planes — default = transparent-window mode (the OS shows the desktop through the window; the in-page planes
    // stay thin). Every plane alpha is a base value × --vsg-density, one knob from 0 (absolutely clear: only rims,
    // lensing remains) to 2 (opaque); glass/density/*.css presets set it, or set it yourself.
    // glass-wallpaper.css swaps the base alphas for the denser wallpaper-mode materials (same rgb).
    '--vsg-density': '1',
    ...planeVars('content', p.planes.content, p.opaqueMode ? 1 : alphaOf(p.content.bgGlass)),
    ...planeVars('chrome', p.planes.chrome, p.opaqueMode ? 1 : alphaOf(p.glass.chrome.bgGlass)),
    // widgets (palette, hovers, menus, notifications, dialogs) do NOT follow --vsg-density: the owner wants the base
    // window fully clear while modals stay readable, so they keep a fixed frosted body (--vsg-widget-density tunes it)
    ...planeVars('widget', p.planes.widget, p.opaqueMode ? 1 : alphaOf(p.glass.widget.bgGlass), p.opaqueMode ? 1 : 0.3, '--vsg-widget-density'),
    '--vsg-widget-density': '1',
    '--vsg-plane-dim-a': String(p.planes.dim),
    '--vsg-plane-dim-wall-a': String(p.effects.dim),
    '--vsg-plane-dim': 'calc(var(--vsg-plane-dim-a) * min(1, var(--vsg-density)))',
    // the window slab's own smoky film (dark: a little shadow colour; light: a little white), also × density
    '--vsg-window-film-rgb': p.isDark ? rgbOf(p.groundDeep) : '255, 255, 255',
    '--vsg-window-film-a': String(p.opaqueMode ? 1 : p.isDark ? (p.variant === 'clear' ? 0.02 : 0.05) : 0.1),
    '--vsg-window-film': `rgba(var(--vsg-window-film-rgb), calc(${densityRamp('var(--vsg-window-film-a)', 'var(--vsg-density)')}))`,
    // tint film: colourless by default; glass/tints/*.css set these
    '--vsg-tint-rgb': '0, 0, 0',
    '--vsg-tint-a': '0',
    '--vsg-wallpaper': p.wallpaper.blobs.length === 0 ? cssColor(p.wallpaper.base) :
      p.wallpaper.blobs.map(b => `radial-gradient(ellipse ${b.size} ${b.size} at ${b.x} ${b.y}, ${cssColor(b.color).replace(/^#(..)(..)(..)$/, (_, r, g2, bl) => `rgba(${parseInt(r, 16)}, ${parseInt(g2, 16)}, ${parseInt(bl, 16)}, ${b.alpha.toFixed(3)})`)}, transparent 62%)`).join(', ') + `, ${cssColor(p.wallpaper.base)}`,
  };
  for (const level of ['chrome', 'raised', 'widget', 'overlay'] as const) {
    const el = g[level];
    v[`--vsg-${level}-solid`] = cssColor(el.solid);
    v[`--vsg-${level}-bg`] = cssColor(el.bg);
    v[`--vsg-${level}-glass`] = cssColor(el.bgGlass);
    v[`--vsg-${level}-border`] = cssColor(el.border);
    v[`--vsg-${level}-spec-hi`] = String(el.specular.hi);
    v[`--vsg-${level}-spec-mid`] = String(el.specular.mid);
    v[`--vsg-${level}-spec-lo`] = String(el.specular.lo);
  }
  Object.assign(v, materialOverrides(p));
  const lens = lensVars(p);
  Object.assign(v, lens.vars);
  const body = Object.entries(v).map(([k, val]) => `  ${k}: ${val};`).join('\n');
  return { css: body, filtersSvg: lens.filtersSvg };
}

/**
 * Same material → same plane. Layer 1 has to give every surface a standalone colour; under Layer 2 those colours are
 * re-pointed to the plane variables so every surface built from the same material (chrome bars, raised headers and
 * inputs, floating widgets, the editor content plane, the window ground) is one sheet of glass that follows the density
 * knob. Keys that are not surfaces (cursors, badges, drop targets, avatars, progress, shadow-DOM menus) are left alone.
 */
function materialOverrides(p: Palette): Record<string, string> {
  const colors = buildColors(p);
  const norm = (h: string) => h.toLowerCase();
  const map = new Map<string, string>();
  const put = (hex: string, val: string) => map.set(norm(hex), val);
  put(p.content.bg, 'var(--vsg-plane-content)'); put(p.content.bgTheme, 'var(--vsg-plane-content)'); put(p.content.bgGlass, 'var(--vsg-plane-content)');
  put(p.glass.chrome.bg, 'var(--vsg-plane-chrome)'); put(p.glass.chrome.solid, 'var(--vsg-plane-chrome)');
  put(p.glass.raised.bg, 'var(--vsg-film-raised)'); put(p.glass.raised.solid, 'var(--vsg-film-raised)');
  put(p.glass.widget.bg, 'var(--vsg-plane-widget)'); put(p.glass.widget.solid, 'var(--vsg-plane-widget)');
  put(p.glass.overlay.bg, 'var(--vsg-plane-widget)'); put(p.glass.overlay.solid, 'var(--vsg-plane-widget)');
  put(p.ground, 'transparent'); put(p.groundDeep, 'transparent');
  const skip = /cursor|dropBackground|drop\b|avatar|badge|progress|stateLabel|keybindingLabel|requestBubble|historyItem|scmGraph|button\.|checkbox|banner|Border|border|shadow|Shadow|^menu\.|^menubar|Foreground|foreground|statusBarItem\.prominent|profileBadge|editorMultiCursor|Cursor|Strong|selection|Selection|match|Match|highlight|Highlight|guide|ruler|Ruler|indent|whitespace|line\.|Line\.|lineHighlight|word|bracket|fold|range|find|Find|icon|Icon|slider|Slider|decoration|Decoration|marker|Marker|diff|Diff|merge|Merge|inserted|removed|Inserted|Removed|error|warning|info|Error|Warning|Info|debug|Debug|testing|git|scm|charts|terminal\.ansi|minimap|Minimap|overview|Overview|sash|Sash|breadcrumb\.|activeItemIndicator|Indicator|hover|Hover|active|Active|focus|Focus|inactive|Inactive|unfocused|Unfocused|Item|item|entry|Entry|filter|Filter|input|Input|dropdown|Dropdown|textPreformat|textBlockQuote|textCodeBlock|list\.|tree\.|editorGutter|gutter|Gutter|stickyScroll|StickyScroll|overlay|Overlay|welcomePage\.tile|tile|editorGroupHeader|tab\.|modernTab|modernEditorTab|editorStickyScroll|peekViewEditorStickyScroll|outputViewStickyScroll|panelStickyScroll|sideBarStickyScroll|terminalStickyScroll|editorWidget\.resizeBorder|surface\./;
  const out: Record<string, string> = {};
  for (const [key, hex] of Object.entries(colors)) {
    const val = map.get(norm(hex));
    if (!val || skip.test(key)) continue;
    out[`--vscode-${key.replace(/\./g, '-')}`] = val;
  }
  out['--vsg-film-raised'] = 'rgba(var(--vsg-spec-rgb), 0.08)';
  return out;
}

/** Lens filter variables (one data-URI filter per aspect class). lensMul scales displacement and rim width together
 *  (same slope), aberrationMul scales the chromatic offset. Presets re-emit only these variables. */
function lensVars(p: Palette, lensMul = 1, aberrationMul = 1, idSuffix = ''): { vars: Record<string, string>; filtersSvg: string[] } {
  const e = p.effects;
  const vars: Record<string, string> = {};
  const filtersSvg: string[] = [];
  for (const cls of LENS_CLASSES) {
    if (e.lensScale <= 0) { vars[`--vsg-lens-${cls.name}`] = 'none'; continue; }
    // convex capsules: the rim IS the whole shape (edge = radius), gentler ramp, no frost
    const { uri } = cls.edgePx !== undefined ? makeMap(cls, cls.edgePx * lensMul, cls.power ?? 0)
      : cls.convex ? makeMap(cls, Math.min(cls.w, cls.h) / 2, 1.3)
      : makeMap(cls, e.lensEdge * lensMul * cls.rim);
    const id = `vsg-lens-${p.id}-${cls.name}${idSuffix}`;
    const blur = cls.blur ?? (cls.convex ? 0 : cls.name === 'widget' || cls.name === 'menu' ? e.blurWidget : cls.name === 'strip' ? Math.min(e.blur, 12) : e.blur);
    const markup = filterSvg(id, cls, uri, e.lensScale * lensMul * (cls.disp ?? cls.rim), blur, e.aberration * aberrationMul * (cls.abr ?? cls.disp ?? cls.rim));
    filtersSvg.push(markup);
    vars[`--vsg-lens-${cls.name}`] = filterDataUrl(markup, id);
  }
  return { vars, filtersSvg };
}

/** An addon file that re-emits the lens variables for every palette with a preset multiplier applied. */
function lensPresetCss(kind: 'lens' | 'aberration', id: string, mul: number, description: string): string {
  const blocks = palettes.map(p => {
    const { vars } = lensVars(p, kind === 'lens' ? mul : 1, kind === 'aberration' ? mul : 1, `-${kind}-${id}`);
    const body = Object.entries(vars).map(([k, val]) => `  ${k}: ${val};`).join('\n');
    // guard + theme class: beats the palette block in glass.css
    return `/* ${p.name} */\n${GUARD}.${themeClass(p)} {\n${body}\n}`;
  });
  return `/*! VS Glass — ${kind} preset "${id}" (generated; load AFTER glass.css). ${description}. MIT */\n${blocks.join('\n\n')}\n`;
}

function buildGlassCss(): { css: string; svg: string } {
  const template = fs.readFileSync(path.join(ROOT, 'src', 'glass', 'glass.css'), 'utf8').replaceAll('@G', GUARD);
  const blocks: string[] = [];
  const allFilters: string[] = [];
  const [first] = palettes;
  for (const p of palettes) {
    const { css, filtersSvg } = glassVars(p);
    allFilters.push(...filtersSvg);
    // The first palette (Regular Dark) is also the default when the theme class cannot be matched.
    const selector = p === first
      ? `.monaco-workbench.vs-glass,\n.monaco-workbench.${themeClass(p)}`
      : `.monaco-workbench.${themeClass(p)}`;
    blocks.push(`/* ${p.name} */\n${selector} {\n${css}\n}`);
  }
  const header = `/*! VS Glass — Layer 2 effects (generated by src/build.ts from src/palette.ts; do not edit)\n *  ${new Date().toISOString().slice(0, 10)} · https://github.com/MilosHampl/vs-glass · MIT */\n`;
  const css = `${header}\n/* ===== Generated palette tokens ===== */\n${blocks.join('\n\n')}\n\n/* ===== Effects ===== */\n${template}`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- VS Glass lens filters (generated; the same filters are embedded in glass.css as data URIs) -->\n<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">\n<defs>\n${allFilters.join('\n')}\n</defs>\n</svg>\n`;
  return { css, svg };
}

// ---------------------------------------------------------------------------------------------
function main() {
  fs.mkdirSync(path.join(ROOT, 'themes'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'glass'), { recursive: true });
  for (const p of palettes) {
    const theme = buildTheme(p);
    const file = path.join(ROOT, 'themes', `${p.id}-color-theme.json`);
    fs.writeFileSync(file, JSON.stringify(theme, null, 2) + '\n');
    console.log(`✓ ${path.relative(ROOT, file)} — ${Object.keys(theme.colors).length} colors, ${theme.tokenColors.length} token rules, ${Object.keys(theme.semanticTokenColors).length} semantic rules`);
    console.log(describe(p).split('\n').slice(1).map(l => '   ' + l.trim()).join('\n'));
  }
  const { css, svg } = buildGlassCss();
  fs.writeFileSync(path.join(ROOT, 'glass', 'glass.css'), css);
  fs.writeFileSync(path.join(ROOT, 'glass', 'glass-filters.svg'), svg);
  // addons: wallpaper mode (opaque window) and tints (coloured film) — both load after glass.css
  const wallpaper = `/*! VS Glass — wallpaper-mode addon (generated; load AFTER glass.css). For a window that is not see-through:\n *  paints a neutral smoke backdrop and thickens the planes. MIT */\n` +
    fs.readFileSync(path.join(ROOT, 'src', 'glass', 'glass-wallpaper.css'), 'utf8').replaceAll('@G', GUARD);
  fs.writeFileSync(path.join(ROOT, 'glass', 'glass-wallpaper.css'), wallpaper);
  fs.mkdirSync(path.join(ROOT, 'glass', 'tints'), { recursive: true });
  const tintTemplate = fs.readFileSync(path.join(ROOT, 'src', 'glass', 'glass-tint.css'), 'utf8');
  for (const t of TINTS) {
    const h = t.color.replace('#', '');
    const rgb = `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
    const out = `/*! VS Glass — tint addon "${t.name}" (generated; load AFTER glass.css). MIT */\n` +
      tintTemplate.replaceAll('@G', GUARD).replaceAll('@NAME', t.name).replaceAll('@DESC', t.description).replaceAll('@RGB', rgb).replaceAll('@ALPHA', String(t.alpha));
    fs.writeFileSync(path.join(ROOT, 'glass', 'tints', `glass-tint-${t.id}.css`), out);
  }
  fs.mkdirSync(path.join(ROOT, 'glass', 'density'), { recursive: true });
  const densityTemplate = fs.readFileSync(path.join(ROOT, 'src', 'glass', 'glass-density.css'), 'utf8');
  for (const d of DENSITY_PRESETS) {
    const out = `/*! VS Glass — density preset ${d.percent} % (generated; load AFTER glass.css). ${d.description}. MIT */\n` +
      densityTemplate.replaceAll('@G', GUARD).replaceAll('@PERCENT', String(d.percent)).replaceAll('@VALUE', String(d.percent / 100)).replaceAll('@DESC', d.description);
    fs.writeFileSync(path.join(ROOT, 'glass', 'density', `glass-density-${d.percent}.css`), out);
  }
  // lens strength and chromatic-aberration presets (each re-emits the filters with a multiplier)
  fs.mkdirSync(path.join(ROOT, 'glass', 'lens'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'glass', 'aberration'), { recursive: true });
  // Theme-scoped colour customizations the extension applies while Layer 2 is on. Webviews (Claude Code, Markdown
  // preview, extension views) paint their own bodies from the THEME colours, which our CSS cannot reach, so those
  // colours must carry the same near-clear alphas as the planes — or a webview sits as an opaque slab in a see-through
  // window. Scoped to the Glass themes, so no other theme is touched; removed with "VS Glass: Remove".
  const webview: Record<string, Record<string, string>> = {};
  for (const p of palettes) {
    if (p.opaqueMode) continue;
    const none = '#00000000';
    webview[p.name] = {
      'editor.background': p.planes.content,
      'editorPane.background': none,
      'sideBar.background': p.planes.chrome,
      'panel.background': p.planes.chrome,
      'activityBar.background': p.planes.chrome,
      'statusBar.background': p.planes.chrome,
      'statusBar.noFolderBackground': p.planes.chrome,
      'titleBar.activeBackground': p.planes.chrome,
      'titleBar.inactiveBackground': p.planes.chrome,
      'editorGroupHeader.tabsBackground': none,
      'sideBarSectionHeader.background': none,
      'sideBarTitle.background': none,
      'terminal.background': none,
    };
  }
  fs.writeFileSync(path.join(ROOT, 'glass', 'webview-colors.json'), JSON.stringify(webview, null, 2) + '\n');
  for (const l of LENS_PRESETS) fs.writeFileSync(path.join(ROOT, 'glass', 'lens', `glass-lens-${l.id}.css`), lensPresetCss('lens', l.id, l.mul, l.description));
  for (const a of ABERRATION_PRESETS) fs.writeFileSync(path.join(ROOT, 'glass', 'aberration', `glass-aberration-${a.id}.css`), lensPresetCss('aberration', a.id, a.mul, a.description));
  console.log(`✓ glass/glass.css (${(css.length / 1024).toFixed(0)} KB) · glass/glass-wallpaper.css (${(wallpaper.length / 1024).toFixed(0)} KB) · glass/tints/ (${TINTS.length}) · glass/density/ (${DENSITY_PRESETS.length}) · glass/lens/ (${LENS_PRESETS.length}) · glass/aberration/ (${ABERRATION_PRESETS.length}) · glass/glass-filters.svg (${(svg.length / 1024).toFixed(0)} KB)`);
}

main();
