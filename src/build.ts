/**
 * VS Glass build: palette → themes/*.json (Layer 1) and glass/glass.css + glass-filters.svg (Layer 2).
 * Run with `npm run build`. Generated files are never hand-edited.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { palettes, describe, type Palette } from './palette';
import { css as cssColor, alpha } from './color';
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
    '--vsg-spec-rgb': p.isDark ? '255, 255, 255' : '255, 255, 255',
    '--vsg-blur': `${e.blur}px`,
    '--vsg-blur-widget': `${e.blurWidget}px`,
    '--vsg-saturate': String(e.saturate),
    '--vsg-brightness': String(e.brightness),
    '--vsg-contrast': String(e.contrastBoost),
    '--vsg-dim': String(e.dim),
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
    // transparent-window mode (Vibrancy Continued): the OS blurs the desktop behind the window, so the
    // in-page planes must stay translucent instead of painting a wallpaper
    '--vsg-content-bg-window': cssColor(alpha(p.content.bg, p.opaqueMode ? 1 : (p.variant === 'clear' ? 0.42 : 0.6))),
    '--vsg-chrome-window': cssColor(alpha(p.glass.chrome.solid, p.opaqueMode ? 1 : (p.variant === 'clear' ? 0.26 : 0.42))),
    '--vsg-widget-window': cssColor(alpha(p.glass.widget.solid, p.opaqueMode ? 1 : 0.6)),
    '--vsg-dim-window': String(p.isDark ? 0.22 : 0.1),
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
  // lens filters (one per aspect class); opaque variant gets none
  const filtersSvg: string[] = [];
  for (const cls of LENS_CLASSES) {
    if (e.lensScale <= 0) { v[`--vsg-lens-${cls.name}`] = 'none'; continue; }
    // convex capsules: the rim IS the whole shape (edge = radius), gentler ramp, no frost
    const { uri } = cls.convex ? makeMap(cls, Math.min(cls.w, cls.h) / 2, 1.3) : makeMap(cls, e.lensEdge * cls.rim);
    const id = `vsg-lens-${p.id}-${cls.name}`;
    const blur = cls.convex ? 0 : cls.name === 'widget' || cls.name === 'menu' ? e.blurWidget : cls.name === 'strip' ? Math.min(e.blur, 12) : e.blur;
    const markup = filterSvg(id, cls, uri, e.lensScale * cls.rim, blur, e.aberration * cls.rim);
    filtersSvg.push(markup);
    v[`--vsg-lens-${cls.name}`] = filterDataUrl(markup, id);
  }
  const body = Object.entries(v).map(([k, val]) => `  ${k}: ${val};`).join('\n');
  return { css: body, filtersSvg };
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
  const transparent = `/*! VS Glass — transparent-window mode addon (generated; load AFTER glass.css). For use with Vibrancy\n *  Continued or any setup that makes the window itself see-through. MIT */\n` +
    fs.readFileSync(path.join(ROOT, 'src', 'glass', 'glass-transparent.css'), 'utf8').replaceAll('@G', GUARD);
  fs.writeFileSync(path.join(ROOT, 'glass', 'glass-transparent.css'), transparent);
  console.log(`✓ glass/glass.css (${(css.length / 1024).toFixed(0)} KB) · glass/glass-transparent.css (${(transparent.length / 1024).toFixed(0)} KB) · glass/glass-filters.svg (${(svg.length / 1024).toFixed(0)} KB)`);
}

main();
