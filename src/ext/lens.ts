/**
 * Lens filters (Layer 2) — shared by the build (src/build.ts) and the extension, which composes the lens and
 * aberration settings into one set of filters at runtime (the preset files cannot combine: each re-emits every filter).
 *
 * Each class is one SVG filter, referenced from CSS as a data URI in `backdrop-filter`. Everything is in CSS px:
 *  - the displacement map is an SVG image, not a bitmap. feImage lays it out in the filter region at the element's
 *    real size, so its ramps are fixed-width: a rim is the same 30 px and bends the same distance on a 120 px tooltip
 *    and on a 900 px palette;
 *  - primitiveUnits is userSpaceOnUse, so `scale` and `stdDeviation` are px too.
 * Both replace a bitmap map stretched over the bounding box with bbox-relative scale, which went wrong in two ways
 * (measured in Chromium 148/155): the rim was a fraction of the element (wide on a palette, a sliver on a toast), and
 * Blink's feDisplacementMap scales BOTH axes by the bbox width, so a wide, short surface was bent vertically several
 * times harder than intended — the folded, colour-split double image under the Claude Code composer.
 *
 * Map encoding: each axis is one SVG image with two ramps — the near edge in R, the far edge in G, the far one drawn as
 * a mirror image of the near one (`scaleX(-1)` about its own box) and lighten-blended — reduced in the filter to
 * 0.5 + 0.5·(near − far). On an element narrower than two rims the ramps overlap and sum to one continuous dome, so
 * there is never a seam where the bend flips direction. A dome class spans its whole extent the same way.
 */

export interface LensClass {
  /** CSS custom property suffix, e.g. "widget" → --vsg-lens-widget */
  name: string;
  /** rim: a refracting band of `edge` px on every edge over a frosted body; dome: the whole surface is one curve */
  kind: 'rim' | 'dome';
  /** which axes bend */
  axes: 'xy' | 'x' | 'y';
  /** rim width in CSS px (rim kind) */
  edge?: number;
  /** × the palette's lensScale = the displacement scale in px; the backdrop moves by half of it at the very edge */
  disp: number;
  /** × the palette's aberration = the chromatic spread (R bends by scale + spread, B by scale − spread) */
  abr: number;
  /** frost under the rim: the palette's widget or pane blur, or px (0 = clear glass) */
  blur: 'widget' | 'pane' | number;
  /** filter region padding (bounding-box fraction): the frost samples real pixels just outside the element */
  pad?: number;
  /** profile exponent: 0 = the circular bevel of a curved glass edge, >0 = a power ramp */
  power?: number;
  /** opacity of a base of the palette's widget colour laid under the frost and the bent rim (0 = none). Over a
   *  see-through window the backdrop is mostly transparent, and Chromium draws a backdrop-filter's output OVER the
   *  original backdrop, so whatever the filter leaves transparent shows the sharp, unbent content through it: frost
   *  reads as smoke and every bent copy sits on top of its own original. A base inside the filter hides the original
   *  without dimming what the lens bends — the bent rim and the frost are drawn above it. */
  base?: number;
  /** peak opacity of the bent copy over the frost (rim kind, default 1). Below 1 the rim is part bend, part frost:
   *  calmer where text sits on the glass right at its edge (a composer's footer row). */
  rimAlpha?: number;
}

/** The palette values a lens is built from (written to glass/lens-params.json by the build for the extension). */
export interface LensParams {
  id: string;
  themeClass: string;
  lensScale: number;
  aberration: number;
  blur: number;
  blurWidget: number;
  /** "r, g, b" of the widget plane: the colour of a class's base */
  baseRgb: string;
}

// Slopes stay under the folding limit: the bevel's steepest point is ~2.9× its mean, so the backdrop folds (text
// doubles inside the rim) once 2.9 × (scale / 2) / edge passes ~0.7. Regular Dark (lensScale 14): widget 2.9·5.6/30 =
// 0.54, menu 2.9·4.2/20 = 0.61; Clear (18): bar 2.9·2.25/10 = 0.65, tip 2.9·1.35/6 = 0.65, composer 2.9·3.6/16 = 0.65.
// The lens presets scale the edge with the displacement, so the slope holds at every preset.
export const LENS_CLASSES: LensClass[] = [
  // quick input, suggest, hovers, notifications, dialogs, modal editors
  { name: 'widget', kind: 'rim', axes: 'xy', edge: 30, disp: 0.8, abr: 0.8, blur: 'widget', pad: 0.08, base: 0.93 },
  // context and dropdown lists, the terminal find bar, the editor's overlay message
  { name: 'menu', kind: 'rim', axes: 'xy', edge: 20, disp: 0.6, abr: 0.6, blur: 'widget', pad: 0.08, base: 0.93 },
  // bars (the editor's find and rename widgets, the terminal's find, the overlay message, the debug toolbar; 25–35 px
  // tall): a widget rim would make the whole bar one dome and smear the code behind it across the search text, so a
  // bar bends only in a 10 px band at its edge (slope 2.9 · 2.25 / 10 = 0.65 on Clear)
  { name: 'bar', kind: 'rim', axes: 'xy', edge: 10, disp: 0.25, abr: 0.5, blur: 'widget', pad: 0.12, base: 0.93, rimAlpha: 0.7 },
  // tooltips (compact hovers, ~25 px tall): any wider rim would make the whole tip one dome, and the label would sit on a
  // bent copy of whatever is under it. A thin band at the very edge, half bend and half frost, is all a tip carries.
  { name: 'tip', kind: 'rim', axes: 'xy', edge: 6, disp: 0.15, abr: 0.3, blur: 'widget', pad: 0.12, base: 0.93, rimAlpha: 0.35 },
  // the file overview's viewport slider: a clear magnifying dome over the minimap canvas — warp and fringe only
  { name: 'slider', kind: 'dome', axes: 'xy', disp: 2, abr: 2, blur: 0, pad: 0.1 },
  // side bars, panel and activity bar — wallpaper mode only (a see-through window gives base panes no filter)
  { name: 'pane', kind: 'rim', axes: 'xy', edge: 36, disp: 0.9, abr: 0.9, blur: 'pane', pad: 0.04 },
  // a chat composer (the Claude Code input, in the webview sheet): a refracting rim over a frosted body, so the
  // messages scrolling under it bend and fringe at the edge and soften behind the text being typed
  { name: 'composer', kind: 'rim', axes: 'xy', edge: 16, disp: 0.4, abr: 0.6, blur: 8, pad: 0.1, base: 0.96, rimAlpha: 0.6 },
];

/** Classes the workbench sheet references (the composer lives in the webview sheet only). */
export const WORKBENCH_CLASSES = ['widget', 'menu', 'bar', 'tip', 'slider'];
/** Classes only the wallpaper addon references: they ship in glass-wallpaper.css, not in the sheet every window loads. */
export const WALLPAPER_CLASSES = ['pane'];

/**
 * Displacement profile at a distance from the edge: 1 at the edge, 0 at `edge` px in. power > 0 is a power curve;
 * power <= 0 the circular bevel: the surface normal tilts like a quarter circle (k caps the arc so the slope at the very
 * edge stays finite), which concentrates the bend in the outer third of the rim.
 */
const BEVEL_K = 0.85;
export function profile(distToEdge: number, edge: number, power = 0): number {
  if (distToEdge >= edge) return 0;
  const t = 1 - Math.max(0, distToEdge) / edge;
  if (power > 0) return Math.pow(t, power);
  const arc = (x: number) => 1 - Math.sqrt(1 - (BEVEL_K * x) * (BEVEL_K * x));
  return arc(t) / arc(1);
}

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
const num = (v: number) => String(Math.round(v * 1e4) / 1e4);

/** Gradient stops of one ramp: value 1 at the edge (offset 0) falling to 0 at the inner end (offset 1); denser near
 *  the edge, where the bevel is steep. `chan` puts the value in R or G. */
function stops(power: number, chan: 'r' | 'g'): string {
  const N = 8;
  let out = '';
  for (let k = 0; k <= N; k++) {
    const o = Math.pow(k / N, 1.6);
    const v = hex2(profile(o, 1, power));
    out += `<stop offset='${num(o)}' stop-color='#${chan === 'r' ? v + '0000' : '00' + v + '00'}'/>`;
  }
  return out;
}

/**
 * One axis of the map as an SVG document. The near ramp (left/top) is R, the far ramp (right/bottom) is G, drawn as
 * the near ramp mirrored about the element box. Rim ramps are `edge` px long (userSpaceOnUse); dome ramps are half the
 * element (objectBoundingBox), so they meet at the centre. `pad` places the element box inside the filter region.
 */
function axisMap(axis: 'x' | 'y', cls: LensClass, edgePx: number): string {
  const power = cls.power ?? 0;
  const len = cls.kind === 'dome' ? '0.5' : num(edgePx);
  const units = cls.kind === 'dome' ? '' : ` gradientUnits='userSpaceOnUse'`;
  const end = axis === 'x' ? `x2='${len}' y2='0'` : `x2='0' y2='${len}'`;
  const flip = axis === 'x' ? 'scaleX(-1)' : 'scaleY(-1)';
  const pad = cls.pad ?? 0;
  const off = num((100 * pad) / (1 + 2 * pad)), size = num(100 / (1 + 2 * pad));
  return `<svg xmlns='http://www.w3.org/2000/svg'><defs>` +
    `<linearGradient id='a'${units} ${end}>${stops(power, 'r')}</linearGradient>` +
    `<linearGradient id='b'${units} ${end}>${stops(power, 'g')}</linearGradient></defs>` +
    `<svg x='${off}%' y='${off}%' width='${size}%' height='${size}%'>` +
    `<rect width='100%' height='100%' fill='url(#a)'/>` +
    `<rect width='100%' height='100%' fill='url(#b)' style='transform:${flip};transform-box:fill-box;transform-origin:center;mix-blend-mode:lighten'/>` +
    `</svg></svg>`;
}

/** A data URI for an image inside the filter — base64 survives the second URI-encoding of the filter far smaller. */
const svgImage = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

export interface LensValues { scale: number; spread: number; blur: number; edge: number; base: number; baseRgb: string }

/**
 * The base a class gets at a widget density (vsGlass.widgetDensity / 100, 0–2). The density mostly moves the CSS film
 * on top; the base only follows it gently — its job is to hide the sharp original under the glass, so what it lets
 * through (1 − base) goes from 1.6× the tuned amount at density 0 to 0.4× at density 2.
 */
export const baseAt = (base: number, density: number) =>
  base <= 0 ? 0 : Math.max(0, Math.min(0.99, 1 - (1 - base) * (1.6 - 0.6 * Math.max(0, Math.min(2, density)))));

/** The px values one class gets from a palette and the lens/aberration multipliers. */
export function lensValues(cls: LensClass, p: LensParams, lensMul = 1, aberrationMul = 1, density = 1): LensValues {
  const blur = cls.blur === 'widget' ? p.blurWidget : cls.blur === 'pane' ? p.blur : cls.blur;
  return {
    scale: p.lensScale * cls.disp * lensMul,
    spread: p.aberration * cls.abr * aberrationMul,
    blur,
    // the rim widens with the displacement, so a stronger preset keeps the same slope (no folding)
    edge: (cls.edge ?? 0) * lensMul,
    base: baseAt(cls.base ?? 0, density),
    baseRgb: p.baseRgb,
  };
}

/** The SVG filter markup for one class. */
export function filterSvg(id: string, cls: LensClass, v: LensValues): string {
  const pad = cls.pad ?? 0;
  const xs = cls.axes !== 'y', ys = cls.axes !== 'x';
  const out: string[] = [
    `<filter id='${id}' x='${-pad}' y='${-pad}' width='${1 + 2 * pad}' height='${1 + 2 * pad}' filterUnits='objectBoundingBox' primitiveUnits='userSpaceOnUse' color-interpolation-filters='sRGB'>`,
  ];
  // the map: R = x bend, G = y bend (0.5 = none)
  if (xs) out.push(`<feImage href='${svgImage(axisMap('x', cls, v.edge))}' preserveAspectRatio='none' result='ix'/>`,
    `<feColorMatrix in='ix' type='matrix' values='.5 -.5 0 0 .5  0 0 0 0 ${ys ? 0 : 0.5}  0 0 0 0 0  0 0 0 0 1' result='${ys ? 'mx' : 'map'}'/>`);
  if (ys) out.push(`<feImage href='${svgImage(axisMap('y', cls, v.edge))}' preserveAspectRatio='none' result='iy'/>`,
    `<feColorMatrix in='iy' type='matrix' values='0 0 0 0 ${xs ? 0 : 0.5}  .5 -.5 0 0 .5  0 0 0 0 0  0 0 0 0 1' result='${xs ? 'my' : 'map'}'/>`);
  if (xs && ys) out.push(`<feComposite in='mx' in2='my' operator='arithmetic' k1='0' k2='1' k3='1' k4='0' result='map'/>`);
  // the bend. With a spread the R/G/B channels are displaced by different amounts and re-added, so the rim fringes
  // the way thick glass disperses light.
  const s = Math.max(0, v.scale), ab = Math.max(0, v.spread);
  if (ab > 0) {
    out.push(
      `<feColorMatrix in='SourceGraphic' type='matrix' values='1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' result='cR'/>`,
      `<feColorMatrix in='SourceGraphic' type='matrix' values='0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' result='cG'/>`,
      `<feColorMatrix in='SourceGraphic' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' result='cB'/>`,
      `<feDisplacementMap in='cR' in2='map' scale='${num(s + ab)}' xChannelSelector='R' yChannelSelector='G' result='dR'/>`,
      `<feDisplacementMap in='cG' in2='map' scale='${num(s)}' xChannelSelector='R' yChannelSelector='G' result='dG'/>`,
      `<feDisplacementMap in='cB' in2='map' scale='${num(Math.max(0, s - ab))}' xChannelSelector='R' yChannelSelector='G' result='dB'/>`,
      `<feComposite in='dR' in2='dG' operator='arithmetic' k1='0' k2='1' k3='1' k4='0' result='dRG'/>`,
      `<feComposite in='dRG' in2='dB' operator='arithmetic' k1='0' k2='1' k3='1' k4='0' result='lens'/>`,
    );
  } else {
    out.push(`<feDisplacementMap in='SourceGraphic' in2='map' scale='${num(s)}' xChannelSelector='R' yChannelSelector='G' result='lens'/>`);
  }
  if (cls.kind === 'dome') {
    // a dome is clear glass: the bent copy is the whole surface (no frost, no mask, no light of its own)
    out.push(`<feGaussianBlur in='lens' stdDeviation='0.35'/>`);
  } else {
    // rim weight from the bend: |near − far| per axis, ×4, so the bent copy fully replaces the frost wherever the bend
    // is more than a quarter of its maximum and fades only where it is already sub-pixel (no double image at the rim)
    out.push(
      `<feComponentTransfer in='map' result='mabs'><feFuncR type='table' tableValues='1 0 1'/><feFuncG type='table' tableValues='1 0 1'/></feComponentTransfer>`,
      `<feColorMatrix in='mabs' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  4 4 0 0 0' result='${(cls.rimAlpha ?? 1) < 1 ? 'rimA0' : 'rimA'}'/>`,
      ...((cls.rimAlpha ?? 1) < 1 ? [`<feComponentTransfer in='rimA0' result='rimA'><feFuncA type='linear' slope='${num(cls.rimAlpha ?? 1)}'/></feComponentTransfer>`] : []),
      v.blur > 0 ? `<feGaussianBlur in='SourceGraphic' stdDeviation='${num(v.blur)}' result='frost'/>` : `<feOffset in='SourceGraphic' result='frost'/>`,
      `<feGaussianBlur in='lens' stdDeviation='0.35' result='lensSoft'/>`,
      `<feComposite in='lensSoft' in2='rimA' operator='in' result='rim'/>`,
      `<feComposite in='rim' in2='frost' operator='over'${v.base > 0 ? ` result='glass'` : ''}/>`,
    );
    if (v.base > 0) out.push(
      `<feFlood flood-color='rgb(${v.baseRgb})' flood-opacity='${num(Math.min(1, v.base))}' result='base'/>`,
      `<feComposite in='glass' in2='base' operator='over'/>`,
    );
  }
  out.push(`</filter>`);
  return out.join('');
}

/** A CSS `url("data:image/svg+xml,…#id")` value for a filter. Inside a quoted CSS url() a data URI needs only `%`, `#`
 *  (the fragment) and `"` escaped; encodeURIComponent also escaped every space, quote and bracket of the markup, which
 *  made the filters most of the sheet the hook inserts into every window. */
export function filterDataUrl(filterMarkup: string, id: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'>${filterMarkup}</svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/"/g, '%22').replace(/[\r\n]/g, '')}#${id}")`;
}

/** The --vsg-lens-* variables (and the raw filter markup) for one palette. `names` limits the classes emitted. */
export function lensVars(p: LensParams, lensMul = 1, aberrationMul = 1, idSuffix = '', names?: string[], density = 1): { vars: Record<string, string>; filters: string[] } {
  const vars: Record<string, string> = {};
  const filters: string[] = [];
  for (const cls of LENS_CLASSES) {
    if (names && !names.includes(cls.name)) continue;
    if (p.lensScale <= 0) { vars[`--vsg-lens-${cls.name}`] = 'none'; continue; }
    const id = `vsg-lens-${p.id}-${cls.name}${idSuffix}`;
    const markup = filterSvg(id, cls, lensValues(cls, p, lensMul, aberrationMul, density));
    filters.push(markup);
    vars[`--vsg-lens-${cls.name}`] = filterDataUrl(markup, id);
  }
  return { vars, filters };
}
