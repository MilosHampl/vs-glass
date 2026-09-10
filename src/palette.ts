/**
 * VS Glass — single source of truth for every colour in both layers.
 *
 * Structure follows Apple's Liquid Glass model rather than a flat colour list:
 *   ground      → the window ground the glass floats over (Layer 2 paints a wallpaper here)
 *   content     → the content plane (editor)
 *   glass       → a 4-level material stack (chrome → raised → widget → overlay), each a translucent
 *                 tint whose *composited* look is fixed by an OKLCH lightness ladder
 *   label       → primary / secondary / tertiary / quaternary vibrancy tiers (alpha, not fixed grays)
 *   accent      → Apple system colours; `accent` for UI, `accentText` (Apple's "Increased Contrast"
 *                 grade) for anything that has to be read as text — syntax, diagnostics, links
 *   effects     → Layer-2 tokens (blur, saturation, lens strength, radii, specular ramp)
 *
 * Every gray carries a cool blue-violet cast (OKLCH hue ≈ 262). Nothing here is neutral.
 * Values are generated: change this file, run `npm run build`, never edit themes/*.json.
 */
import { alpha, composite, contrast, ensureContrast, hexToOklch, mix, oklch, opaque, parseHex, rgbToHex, type Hex } from './color';

// ------------------------------------------------------------------------------------------------
// Apple system colours — HIG "Color", values dated 2025-06-09 (see research/apple-liquid-glass.md §4)
// ------------------------------------------------------------------------------------------------
export type SystemColor = 'blue' | 'indigo' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'brown';
export const SYSTEM_COLORS: readonly SystemColor[] = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'brown'];

export const APPLE = {
  light: { red: '#FF383C', orange: '#FF8D28', yellow: '#FFCC00', green: '#34C759', mint: '#00C8B3', teal: '#00C3D0', cyan: '#00C0E8', blue: '#0088FF', indigo: '#6155F5', purple: '#CB30E0', pink: '#FF2D55', brown: '#AC7F5E' },
  dark: { red: '#FF4245', orange: '#FF9230', yellow: '#FFD600', green: '#30D158', mint: '#00DAC3', teal: '#00D2E0', cyan: '#3CD3FE', blue: '#0091FF', indigo: '#6D7CFF', purple: '#DB34F2', pink: '#FF375F', brown: '#B78A66' },
  /** "Increased Contrast" grades — darker on light, lighter on dark. Used for text-bearing roles. */
  lightContrast: { red: '#E9152D', orange: '#C55300', yellow: '#A16A00', green: '#008932', mint: '#008575', teal: '#008198', cyan: '#007EAE', blue: '#1E6EF4', indigo: '#564ADE', purple: '#B02FC2', pink: '#E7124D', brown: '#956D51' },
  darkContrast: { red: '#FF6165', orange: '#FFA056', yellow: '#FEDF43', green: '#4AD968', mint: '#54DFCB', teal: '#3BDDEC', cyan: '#6DD9FF', blue: '#5CB8FF', indigo: '#A7AAFF', purple: '#EA8DFF', pink: '#FF8AC4', brown: '#DBA679' },
} as const satisfies Record<string, Record<SystemColor, Hex>>;

// ------------------------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------------------------
export type VariantId = 'glass-regular-dark' | 'glass-regular-light' | 'glass-clear' | 'glass-opaque';

export interface Elevation {
  /** What the pane looks like composited over the ground (opaque). Use for contrast math. */
  solid: Hex;
  /** The value written into theme JSON (#RRGGBBAA). Composites to `solid` over `ground`. */
  bg: Hex;
  /** Same tint at the alpha Layer 2 uses once blur+saturation provide legibility. */
  bgGlass: Hex;
  /** Hairline border/edge for this level. */
  border: Hex;
  /** Specular ring alphas (white) for Layer 2 — brightest at the light source, falling off. */
  specular: { hi: number; mid: number; lo: number };
}

export interface Palette {
  id: VariantId;
  name: string;
  uiTheme: 'vs-dark' | 'vs';
  type: 'dark' | 'light';
  variant: 'regular' | 'clear' | 'opaque';
  isDark: boolean;
  /** Opaque mode: Reduce Transparency equivalent; every alpha is 1. */
  opaqueMode: boolean;

  /** Window ground (opaque). Painted by `titleBar.activeBackground` through the grid view. */
  ground: Hex;
  groundDeep: Hex;
  /** Layer-2 wallpaper mesh: base + soft radial blobs in palette hues. */
  wallpaper: { base: Hex; blobs: { color: Hex; alpha: number; x: string; y: string; size: string }[] };

  content: {
    bg: Hex;              // editor background (opaque in Layer 1)
    bgGlass: Hex;         // editor background under Layer 2 (slight translucency)
    lineHighlight: Hex;
    selection: Hex;
    selectionInactive: Hex;
    wordHighlight: Hex;
    wordHighlightStrong: Hex;
    findMatch: Hex;
    findMatchHighlight: Hex;
    bracketMatch: Hex;
    bracketMatchBorder: Hex;
    indentGuide: Hex;
    indentGuideActive: Hex;
    whitespace: Hex;
    ruler: Hex;
    lineNumber: Hex;
    lineNumberActive: Hex;
    cursor: Hex;
    foldBg: Hex;
    rangeHighlight: Hex;
  };

  glass: {
    tint: Hex;                 // the material's own colour (cool white for dark, cool white for light)
    chrome: Elevation;         // L1: sidebar, panel, activity bar, title bar, status bar, aux bar
    raised: Elevation;         // L2: section headers, tab strips, inputs, list hover
    widget: Elevation;         // L3: quick input, suggest, hovers, notifications, menus
    overlay: Elevation;        // L4: dialogs, dropdown lists, tooltips
  };

  /** Vibrancy tiers — alpha over whatever is behind (the macOS label ramp). */
  label: { primary: Hex; secondary: Hex; tertiary: Hex; quaternary: Hex; inverse: Hex; onAccent: Hex };
  /** Same tiers composited over chrome.solid — for keys where alpha would double-composite badly. */
  labelSolid: { primary: Hex; secondary: Hex; tertiary: Hex; quaternary: Hex };
  separator: { hairline: Hex; strong: Hex };

  accent: Record<SystemColor, Hex>;
  accentText: Record<SystemColor, Hex>;

  ui: {
    accent: Hex; accentHover: Hex; accentActive: Hex; accentMuted: Hex; onAccent: Hex;
    focus: Hex; selectionBg: Hex; selectionBgInactive: Hex; hover: Hex; active: Hex; pressed: Hex;
    badgeBg: Hex; badgeFg: Hex; link: Hex; linkActive: Hex;
    inputBg: Hex; inputBorder: Hex; inputPlaceholder: Hex; dropBg: Hex;
    scrollbar: Hex; scrollbarHover: Hex; scrollbarActive: Hex;
    shadow: Hex; shadowStrong: Hex; progress: Hex;
    error: Hex; warning: Hex; info: Hex; success: Hex;
    errorBg: Hex; warningBg: Hex; infoBg: Hex;
  };

  syntax: {
    comment: Hex; docComment: Hex; docTag: Hex;
    keyword: Hex; storage: Hex; control: Hex; operator: Hex; punctuation: Hex;
    string: Hex; stringEscape: Hex; regex: Hex; number: Hex; constant: Hex; enumMember: Hex;
    variable: Hex; variableReadonly: Hex; parameter: Hex; property: Hex;
    function: Hex; method: Hex; macro: Hex; decorator: Hex;
    type: Hex; class: Hex; interface: Hex; typeParameter: Hex; namespace: Hex; label: Hex;
    tag: Hex; attribute: Hex; attributeValue: Hex;
    invalid: Hex; invalidBg: Hex; deprecated: Hex;
    markupHeading: Hex; markupLink: Hex; markupCode: Hex; markupQuote: Hex; markupList: Hex;
    markupBold: Hex; markupItalic: Hex; markupInserted: Hex; markupDeleted: Hex; markupChanged: Hex;
    cssSelector: Hex; cssProperty: Hex; cssUnit: Hex; jsonKey: Hex; yamlKey: Hex; sqlKeyword: Hex; shellBuiltin: Hex;
  };

  terminal: { ansi: Hex[]; foreground: Hex; background: Hex; cursor: Hex; selection: Hex; selectionInactive: Hex };
  git: { added: Hex; modified: Hex; deleted: Hex; untracked: Hex; ignored: Hex; conflicting: Hex; submodule: Hex; renamed: Hex; stageModified: Hex; stageDeleted: Hex };
  diagnostics: { error: Hex; warning: Hex; info: Hex; hint: Hex };
  diff: { inserted: Hex; removed: Hex; insertedLine: Hex; removedLine: Hex; insertedText: Hex; removedText: Hex; insertedGutter: Hex; removedGutter: Hex; modifiedGutter: Hex; diagonalFill: Hex; unchangedRegion: Hex; move: Hex };
  merge: { current: Hex; incoming: Hex; common: Hex; currentHeader: Hex; incomingHeader: Hex; commonHeader: Hex };
  charts: Record<'red' | 'blue' | 'yellow' | 'orange' | 'green' | 'purple' | 'foreground' | 'lines', Hex>;

  effects: {
    blur: number;          // px, chrome panes
    blurWidget: number;    // px, floating widgets
    saturate: number;      // backdrop saturate()
    brightness: number;    // backdrop brightness()
    contrastBoost: number; // backdrop contrast()
    lensScale: number;     // rim displacement in CSS px (how far the backdrop is bent at the edge)
    lensEdge: number;      // rim width in CSS px over which the displacement ramps to zero
    dim: number;           // Clear: dimming layer alpha behind text-bearing surfaces (0 = none)
    radius: { card: number; widget: number; control: number; inner: number; pill: number };
    shadowColor: Hex;      // opaque base for shadows
    lightAngle: number;    // degrees, virtual light source for specular (from top-left)
    motion: { fast: number; base: number; slow: number; ease: string };
  };
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------
const HUE = 262; // cool blue-violet cast — the Liquid Glass gray

/** Cool gray at a given OKLCH lightness. */
const gray = (L: number, C = 0.018) => oklch(L, C, HUE);

/**
 * A translucent colour X with alpha `a` such that composite(X@a, ground) == solid.
 * This lets us pick the *look* (solid) and the *transparency* (a) independently.
 * Falls back to lower alpha if X would leave the sRGB gamut.
 */
function translucent(solid: Hex, ground: Hex, a: number): Hex {
  if (a >= 1) return opaque(solid);
  const s = parseHex(solid), g = parseHex(ground);
  for (let alphaTry = a; alphaTry <= 1.0001; alphaTry = Math.min(1, alphaTry + 0.05)) {
    const ch = (sv: number, gv: number) => (sv - gv * (1 - alphaTry)) / alphaTry;
    const r = ch(s.r, g.r), gg = ch(s.g, g.g), b = ch(s.b, g.b);
    if ([r, gg, b].every(v => v >= -0.002 && v <= 1.002)) {
      return rgbToHex(Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, gg)), Math.min(1, Math.max(0, b)), alphaTry);
    }
    if (alphaTry >= 1) break;
  }
  return opaque(solid);
}

function elevation(solidL: number, ground: Hex, themeAlpha: number, glassAlpha: number, borderAlpha: number, spec: [number, number, number], isDark: boolean, chroma = 0.02, opaqueMode = false): Elevation {
  const solid = gray(solidL, chroma);
  const white = '#ffffff', black = '#000000';
  return {
    solid,
    bg: opaqueMode ? solid : translucent(solid, ground, themeAlpha),
    bgGlass: opaqueMode ? solid : translucent(solid, ground, glassAlpha),
    border: isDark ? alpha(white, borderAlpha) : alpha(black, borderAlpha * 0.9),
    specular: { hi: spec[0], mid: spec[1], lo: spec[2] },
  };
}

function labels(isDark: boolean, boost = 0) {
  // macOS label ramp (research §5): primary .85, secondary .55/.50, tertiary .26, quaternary .10
  const base = isDark ? oklch(0.985, 0.006, HUE) : oklch(0.16, 0.014, HUE);
  const inv = isDark ? oklch(0.16, 0.014, HUE) : oklch(0.985, 0.006, HUE);
  return {
    primary: alpha(base, Math.min(1, 0.86 + boost)),
    secondary: alpha(base, Math.min(1, 0.58 + boost * 0.8)),
    tertiary: alpha(base, Math.min(1, 0.34 + boost * 0.6)),
    quaternary: alpha(base, Math.min(1, 0.13 + boost * 0.3)),
    inverse: alpha(inv, 0.9),
    onAccent: '#ffffff',
  };
}

function solidLabels(l: ReturnType<typeof labels>, over: Hex) {
  return { primary: composite(l.primary, over), secondary: composite(l.secondary, over), tertiary: composite(l.tertiary, over), quaternary: composite(l.quaternary, over) };
}

const ansiDark = (a: Record<SystemColor, Hex>, c: Record<SystemColor, Hex>, black: Hex, brightBlack: Hex, white: Hex, brightWhite: Hex): Hex[] => [
  black, a.red, a.green, a.yellow, a.blue, a.purple, a.cyan, white,
  brightBlack, c.red, c.green, c.yellow, c.blue, c.purple, c.cyan, brightWhite,
];

// ------------------------------------------------------------------------------------------------
// Variant builders
// ------------------------------------------------------------------------------------------------
interface Knobs {
  id: VariantId; name: string; isDark: boolean; variant: Palette['variant'];
  ladder: { ground: number; groundDeep: number; content: number; chrome: number; raised: number; widget: number; overlay: number };
  alphas: { chrome: number; raised: number; widget: number; overlay: number; chromeGlass: number; widgetGlass: number; content: number };
  labelBoost: number;
  wallpaperVividness: number;
  effects: Palette['effects'];
}

function build(k: Knobs): Palette {
  const { isDark } = k;
  const opaqueMode = k.variant === 'opaque';
  const chroma = isDark ? 0.02 : 0.012;
  const ground = gray(k.ladder.ground, chroma);
  const groundDeep = gray(k.ladder.groundDeep, chroma);
  const contentBg = gray(k.ladder.content, isDark ? 0.017 : 0.006);

  const accent = isDark ? APPLE.dark : APPLE.light;
  const accentText0 = isDark ? APPLE.darkContrast : APPLE.lightContrast;
  // Guarantee AA for text roles against the editor plane while keeping Apple's hue.
  const accentText = Object.fromEntries(SYSTEM_COLORS.map(c => [c, ensureContrast(accentText0[c], contentBg, 4.5)])) as Record<SystemColor, Hex>;

  const spec: Record<'chrome' | 'raised' | 'widget' | 'overlay', [number, number, number]> = isDark
    ? { chrome: [0.42, 0.14, 0.03], raised: [0.5, 0.16, 0.04], widget: [0.62, 0.2, 0.05], overlay: [0.72, 0.24, 0.06] }
    : { chrome: [0.95, 0.55, 0.2], raised: [0.97, 0.6, 0.25], widget: [1, 0.7, 0.3], overlay: [1, 0.75, 0.35] };
  const borderA = isDark ? { chrome: 0.09, raised: 0.11, widget: 0.16, overlay: 0.2 } : { chrome: 0.09, raised: 0.1, widget: 0.12, overlay: 0.14 };
  if (opaqueMode) { for (const key of Object.keys(borderA) as (keyof typeof borderA)[]) borderA[key] *= 1.8; }

  const glass = {
    tint: isDark ? oklch(0.97, 0.01, HUE) : oklch(0.995, 0.004, HUE),
    chrome: elevation(k.ladder.chrome, ground, k.alphas.chrome, k.alphas.chromeGlass, borderA.chrome, spec.chrome, isDark, chroma, opaqueMode),
    raised: elevation(k.ladder.raised, ground, k.alphas.raised, k.alphas.chromeGlass + 0.08, borderA.raised, spec.raised, isDark, chroma, opaqueMode),
    widget: elevation(k.ladder.widget, ground, k.alphas.widget, k.alphas.widgetGlass, borderA.widget, spec.widget, isDark, chroma, opaqueMode),
    overlay: elevation(k.ladder.overlay, ground, k.alphas.overlay, k.alphas.widgetGlass + 0.08, borderA.overlay, spec.overlay, isDark, chroma, opaqueMode),
  };

  const label = labels(isDark, k.labelBoost);
  const labelSolid = solidLabels(label, glass.chrome.solid);
  const white = '#ffffff', black = '#000000';
  const sep = isDark ? white : black;

  const blue = accent.blue;
  const onDark = isDark;
  const linkText = ensureContrast(accent.blue, contentBg, 4.5);

  const ui: Palette['ui'] = {
    accent: blue,
    accentHover: isDark ? mix(blue, white, 0.12) : mix(blue, black, 0.1),
    accentActive: isDark ? mix(blue, white, 0.22) : mix(blue, black, 0.2),
    accentMuted: alpha(blue, 0.35),
    onAccent: '#ffffff',
    focus: alpha(blue, opaqueMode ? 0.95 : 0.7),
    selectionBg: alpha(blue, isDark ? 0.3 : 0.22),
    selectionBgInactive: alpha(blue, isDark ? 0.16 : 0.12),
    hover: alpha(onDark ? white : black, onDark ? 0.07 : 0.05),
    active: alpha(onDark ? white : black, onDark ? 0.12 : 0.08),
    pressed: alpha(onDark ? white : black, onDark ? 0.17 : 0.11),
    badgeBg: blue,
    badgeFg: '#ffffff',
    link: linkText,
    linkActive: isDark ? mix(linkText, white, 0.2) : mix(linkText, black, 0.2),
    inputBg: opaqueMode ? gray(isDark ? k.ladder.content : 0.995, chroma) : alpha(onDark ? black : white, onDark ? 0.28 : 0.6),
    inputBorder: alpha(sep, isDark ? 0.14 : 0.14),
    inputPlaceholder: label.tertiary,
    dropBg: alpha(blue, 0.18),
    scrollbar: alpha(sep, isDark ? 0.18 : 0.2),
    scrollbarHover: alpha(sep, isDark ? 0.28 : 0.3),
    scrollbarActive: alpha(sep, isDark ? 0.4 : 0.42),
    shadow: alpha(groundDeep, isDark ? 0.55 : 0.18),
    shadowStrong: alpha(groundDeep, isDark ? 0.8 : 0.3),
    progress: blue,
    error: accentText.red,
    warning: accentText.yellow,
    info: accentText.blue,
    success: accentText.green,
    errorBg: alpha(accent.red, 0.16),
    warningBg: alpha(accent.yellow, 0.16),
    infoBg: alpha(accent.blue, 0.16),
  };

  // Syntax: text-grade system colours, mapped deliberately and identically across variants.
  const t = accentText;
  const fg = ensureContrast(composite(label.primary, contentBg), contentBg, 7);
  const dimFg = composite(label.secondary, contentBg);
  const syntax: Palette['syntax'] = {
    comment: ensureContrast(composite(alpha(isDark ? '#c9cee0' : '#3d4258', isDark ? 0.5 : 0.62), contentBg), contentBg, 4.5),
    docComment: ensureContrast(composite(alpha(isDark ? '#c9cee0' : '#3d4258', isDark ? 0.56 : 0.68), contentBg), contentBg, 4.5),
    docTag: t.teal,
    keyword: t.pink, storage: t.pink, control: t.pink,
    operator: ensureContrast(dimFg, contentBg, 4.5), punctuation: ensureContrast(mix(dimFg, fg, 0.35), contentBg, 4.5),
    string: t.orange, stringEscape: t.teal, regex: t.green, number: t.yellow, constant: t.yellow, enumMember: t.yellow,
    variable: fg, variableReadonly: fg, parameter: fg, property: t.cyan,
    function: t.mint, method: t.mint, macro: t.purple, decorator: t.purple,
    type: t.indigo, class: t.indigo, interface: t.indigo, typeParameter: t.indigo, namespace: fg, label: t.purple,
    tag: t.blue, attribute: t.cyan, attributeValue: t.orange,
    invalid: t.red, invalidBg: alpha(accent.red, 0.14), deprecated: dimFg,
    markupHeading: t.blue, markupLink: t.blue, markupCode: t.orange, markupQuote: dimFg, markupList: t.pink,
    markupBold: fg, markupItalic: fg, markupInserted: t.green, markupDeleted: t.red, markupChanged: t.orange,
    cssSelector: t.mint, cssProperty: t.cyan, cssUnit: t.yellow, jsonKey: t.blue, yamlKey: t.blue, sqlKeyword: t.pink, shellBuiltin: t.pink,
  };

  // Terminal — ANSI 16 mapped to system colours (normal = default grade, bright = contrast grade in dark; reversed in light)
  const termBlack = isDark ? gray(0.27, 0.02) : gray(0.3, 0.02);
  const termBrightBlack = isDark ? gray(0.55, 0.02) : gray(0.5, 0.02);
  const termWhite = isDark ? gray(0.9, 0.008) : gray(0.72, 0.01);
  const termBrightWhite = isDark ? '#ffffff' : gray(0.86, 0.006);
  const termNormal = isDark ? accent : accentText;
  const termBright = isDark ? accentText : Object.fromEntries(SYSTEM_COLORS.map(c => [c, ensureContrast(accent[c], contentBg, 3)])) as Record<SystemColor, Hex>;
  const terminal: Palette['terminal'] = {
    ansi: ansiDark(termNormal, termBright, termBlack, termBrightBlack, termWhite, termBrightWhite),
    foreground: fg,
    background: '#00000000',
    cursor: fg,
    selection: alpha(blue, 0.3),
    selectionInactive: alpha(blue, 0.16),
  };

  const git: Palette['git'] = {
    added: t.green, modified: t.orange, deleted: t.red, untracked: t.mint, ignored: composite(label.tertiary, glass.chrome.solid),
    conflicting: t.purple, submodule: t.indigo, renamed: t.teal, stageModified: t.orange, stageDeleted: t.red,
  };
  const diagnostics: Palette['diagnostics'] = { error: accent.red, warning: isDark ? accent.yellow : accentText.yellow, info: accent.blue, hint: accent.mint };
  const diff: Palette['diff'] = {
    inserted: alpha(accent.green, isDark ? 0.16 : 0.18), removed: alpha(accent.red, isDark ? 0.16 : 0.16),
    insertedLine: alpha(accent.green, isDark ? 0.1 : 0.12), removedLine: alpha(accent.red, isDark ? 0.1 : 0.1),
    insertedText: alpha(accent.green, 0.32), removedText: alpha(accent.red, 0.32),
    insertedGutter: alpha(accent.green, 0.7), removedGutter: alpha(accent.red, 0.7), modifiedGutter: alpha(accent.orange, 0.7),
    diagonalFill: alpha(sep, 0.08), unchangedRegion: alpha(sep, isDark ? 0.05 : 0.04), move: alpha(accent.indigo, 0.6),
  };
  const merge: Palette['merge'] = {
    current: alpha(accent.mint, 0.2), incoming: alpha(accent.blue, 0.2), common: alpha(sep, 0.1),
    currentHeader: alpha(accent.mint, 0.5), incomingHeader: alpha(accent.blue, 0.5), commonHeader: alpha(sep, 0.25),
  };
  const charts: Palette['charts'] = { red: accent.red, blue: accent.blue, yellow: accent.yellow, orange: accent.orange, green: accent.green, purple: accent.purple, foreground: fg, lines: alpha(sep, 0.2) };

  const vivid = k.wallpaperVividness;
  const cap = (a: number) => Math.min(0.92, a);
  const wallpaper: Palette['wallpaper'] = isDark
    ? { base: ground, blobs: [
        { color: oklch(0.5, 0.15, 275), alpha: cap(0.62 * vivid), x: '10%', y: '6%', size: '62%' },    // indigo, top-left
        { color: oklch(0.46, 0.14, 325), alpha: cap(0.5 * vivid), x: '90%', y: '94%', size: '58%' },   // magenta-violet, bottom-right
        { color: oklch(0.5, 0.11, 200), alpha: cap(0.44 * vivid), x: '94%', y: '8%', size: '46%' },    // teal, top-right
        { color: oklch(0.44, 0.13, 250), alpha: cap(0.42 * vivid), x: '18%', y: '96%', size: '52%' },  // blue, bottom-left
        { color: oklch(0.5, 0.12, 350), alpha: cap(0.26 * vivid), x: '58%', y: '34%', size: '28%' },   // pink core, centre-right
        { color: oklch(0.5, 0.1, 170), alpha: cap(0.22 * vivid), x: '38%', y: '70%', size: '26%' },    // mint core, centre-left
      ] }
    : { base: ground, blobs: [
        { color: oklch(0.84, 0.09, 275), alpha: cap(0.8 * vivid), x: '10%', y: '6%', size: '62%' },
        { color: oklch(0.86, 0.08, 340), alpha: cap(0.7 * vivid), x: '90%', y: '94%', size: '58%' },
        { color: oklch(0.88, 0.08, 190), alpha: cap(0.65 * vivid), x: '94%', y: '8%', size: '46%' },
        { color: oklch(0.85, 0.08, 240), alpha: cap(0.6 * vivid), x: '18%', y: '96%', size: '52%' },
        { color: oklch(0.88, 0.07, 20), alpha: cap(0.4 * vivid), x: '58%', y: '34%', size: '28%' },
        { color: oklch(0.9, 0.07, 160), alpha: cap(0.35 * vivid), x: '38%', y: '70%', size: '26%' },
      ] };

  const content: Palette['content'] = {
    bg: contentBg,
    bgGlass: opaqueMode ? contentBg : alpha(contentBg, k.alphas.content),
    lineHighlight: alpha(sep, isDark ? 0.045 : 0.035),
    selection: ui.selectionBg,
    selectionInactive: ui.selectionBgInactive,
    wordHighlight: alpha(sep, isDark ? 0.1 : 0.08),
    wordHighlightStrong: alpha(accent.blue, 0.22),
    findMatch: alpha(accent.orange, isDark ? 0.45 : 0.4),
    findMatchHighlight: alpha(accent.orange, isDark ? 0.22 : 0.2),
    bracketMatch: alpha(accent.blue, 0.18),
    bracketMatchBorder: alpha(accent.blue, 0.6),
    indentGuide: alpha(sep, isDark ? 0.08 : 0.08),
    indentGuideActive: alpha(sep, isDark ? 0.2 : 0.2),
    whitespace: alpha(sep, 0.12),
    ruler: alpha(sep, 0.07),
    lineNumber: composite(label.tertiary, contentBg),
    lineNumberActive: composite(label.secondary, contentBg),
    cursor: isDark ? oklch(0.95, 0.01, HUE) : oklch(0.25, 0.02, HUE),
    foldBg: alpha(accent.blue, 0.1),
    rangeHighlight: alpha(sep, 0.05),
  };

  return {
    id: k.id, name: k.name, uiTheme: isDark ? 'vs-dark' : 'vs', type: isDark ? 'dark' : 'light', variant: k.variant, isDark, opaqueMode,
    ground, groundDeep, wallpaper, content, glass, label, labelSolid,
    separator: { hairline: alpha(sep, isDark ? 0.09 : 0.1), strong: alpha(sep, isDark ? 0.18 : 0.2) },
    accent, accentText, ui, syntax, terminal, git, diagnostics, diff, merge, charts,
    effects: k.effects,
  };
}

const motion = { fast: 120, base: 240, slow: 320, ease: 'cubic-bezier(.2,.8,.2,1)' };
const radius = { card: 14, widget: 12, control: 8, inner: 6, pill: 999 };

export const regularDark = build({
  id: 'glass-regular-dark', name: 'Glass Regular Dark', isDark: true, variant: 'regular',
  ladder: { ground: 0.165, groundDeep: 0.11, content: 0.205, chrome: 0.255, raised: 0.295, widget: 0.335, overlay: 0.375 },
  alphas: { chrome: 0.62, raised: 0.7, widget: 0.94, overlay: 0.96, chromeGlass: 0.5, widgetGlass: 0.62, content: 0.94 },
  labelBoost: 0, wallpaperVividness: 1,
  effects: { blur: 18, blurWidget: 22, saturate: 1.55, brightness: 1.02, contrastBoost: 1.02, lensScale: 10, lensEdge: 26, dim: 0, radius, shadowColor: '#03040a', lightAngle: 225, motion },
});

export const regularLight = build({
  id: 'glass-regular-light', name: 'Glass Regular Light', isDark: false, variant: 'regular',
  ladder: { ground: 0.9, groundDeep: 0.8, content: 0.985, chrome: 0.955, raised: 0.97, widget: 0.98, overlay: 0.99 },
  alphas: { chrome: 0.62, raised: 0.7, widget: 0.94, overlay: 0.96, chromeGlass: 0.55, widgetGlass: 0.68, content: 0.96 },
  labelBoost: 0, wallpaperVividness: 1,
  effects: { blur: 22, blurWidget: 26, saturate: 1.35, brightness: 1.06, contrastBoost: 1.0, lensScale: 9, lensEdge: 26, dim: 0, radius, shadowColor: '#2a2f45', lightAngle: 225, motion },
});

export const clear = build({
  id: 'glass-clear', name: 'Glass Clear', isDark: true, variant: 'clear',
  ladder: { ground: 0.15, groundDeep: 0.1, content: 0.19, chrome: 0.235, raised: 0.275, widget: 0.32, overlay: 0.36 },
  alphas: { chrome: 0.34, raised: 0.42, widget: 0.9, overlay: 0.94, chromeGlass: 0.26, widgetGlass: 0.42, content: 0.86 },
  labelBoost: 0.1, wallpaperVividness: 1.7,
  effects: { blur: 8, blurWidget: 12, saturate: 1.9, brightness: 1.05, contrastBoost: 1.04, lensScale: 13, lensEdge: 30, dim: 0.35, radius, shadowColor: '#02030a', lightAngle: 225, motion },
});

export const opaqueTheme = build({
  id: 'glass-opaque', name: 'Glass Opaque', isDark: true, variant: 'opaque',
  ladder: { ground: 0.15, groundDeep: 0.1, content: 0.19, chrome: 0.245, raised: 0.29, widget: 0.335, overlay: 0.38 },
  alphas: { chrome: 1, raised: 1, widget: 1, overlay: 1, chromeGlass: 1, widgetGlass: 1, content: 1 },
  labelBoost: 0.1, wallpaperVividness: 0,
  effects: { blur: 0, blurWidget: 0, saturate: 1, brightness: 1, contrastBoost: 1, lensScale: 0, lensEdge: 30, dim: 0, radius, shadowColor: '#03040a', lightAngle: 225, motion },
});

export const palettes: Palette[] = [regularDark, regularLight, clear, opaqueTheme];

/** Small report used by `npm run build` to print the ladder. */
export function describe(p: Palette): string {
  const l = (h: Hex) => hexToOklch(h).L.toFixed(3);
  return [
    `${p.name} (${p.id})`,
    `  ground ${p.ground} L${l(p.ground)} · content ${p.content.bg} L${l(p.content.bg)}`,
    `  chrome ${p.glass.chrome.solid} (theme ${p.glass.chrome.bg}) · raised ${p.glass.raised.solid} · widget ${p.glass.widget.solid} (theme ${p.glass.widget.bg}) · overlay ${p.glass.overlay.solid}`,
    `  label primary ${p.label.primary} → ${p.labelSolid.primary} (${contrast(p.labelSolid.primary, p.glass.chrome.solid).toFixed(2)}:1 on chrome)`,
    `  keyword ${p.syntax.keyword} ${contrast(p.syntax.keyword, p.content.bg).toFixed(2)}:1 · string ${p.syntax.string} ${contrast(p.syntax.string, p.content.bg).toFixed(2)}:1 · type ${p.syntax.type} ${contrast(p.syntax.type, p.content.bg).toFixed(2)}:1 · comment ${p.syntax.comment} ${contrast(p.syntax.comment, p.content.bg).toFixed(2)}:1`,
  ].join('\n');
}
