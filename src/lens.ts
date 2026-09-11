/**
 * Displacement-map generation for the Liquid Glass lens (Layer 2).
 *
 * The map is an RGBA PNG: R encodes x-displacement, G encodes y-displacement (128 = none),
 * B encodes the rim weight (0 in the frosted centre, 255 at the edge) used to composite a sharp,
 * refracted rim over a frosted (blurred) centre — the actual Liquid Glass look: clear lensed edge,
 * frosted body.
 * Near each edge the backdrop is sampled toward the pane centre, so content compresses in the
 * last `edgePx` pixels — the "rim refraction" the eye reads as Liquid Glass. The centre is flat.
 *
 * Filters use objectBoundingBox units so one map stretches to any element of the same aspect
 * class. Because bbox `scale` is a fraction of width (x) and height (y), the G channel amplitude
 * is pre-scaled by W/H so the *pixel* displacement is equal on both axes at the class's
 * representative size. Percent-based units are never used (they resolve to nothing in Chromium).
 */
import { pngDataUri } from './png';

export interface LensClass {
  /** CSS custom property suffix, e.g. "widget" → --vsg-lens-widget */
  name: string;
  /** representative CSS size of surfaces in this class */
  w: number;
  h: number;
  /** map resolution (px) — the profile is smooth, so low resolution is fine */
  mw: number;
  mh: number;
  /** which axes lens: both, or only x / only y for thin strips */
  axes: 'xy' | 'x' | 'y';
  /** multiplier on the palette's rim width and displacement for this class (smaller surfaces → thinner rims) */
  rim: number;
  /** convex "ball lens": the whole shape refracts with a gentle profile and no frosted body — icon-only controls */
  convex?: boolean;
  /** which edges lens (default: all). One-sided classes are for window-edge strips that only bend inward. */
  sides?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };
  /** explicit edge-zone width in CSS px (overrides the palette's lensEdge × rim) — a whole-surface dome needs one */
  edgePx?: number;
  /** profile exponent for the edge zone: 0 = circular bevel (edge-curved slab), >0 = a power ramp (1 ≈ smooth dome) */
  power?: number;
  /** displacement multiplier, independent of `rim`, so a class can bend far over a wide zone (magnifier) */
  disp?: number;
  /** false = the filter draws no light at all: no curvature specular, no edge lift, only warp + chromatic fringe */
  spec?: boolean;
  /** extra bend where two edges meet: displacement × (1 + cornerBoost × cornerness), so the corners magnify hardest */
  cornerBoost?: number;
  /** chromatic-aberration multiplier, independent of `disp` (more dispersion without more displacement) */
  abr?: number;
  /** filter region padding in bounding-box fractions. A backdrop-filter samples only its filter region: displacement
   *  that reaches past the element pulls transparent black, which paints as a dark fringe at the rim. Padding the
   *  region gives the lens real pixels to bend from. */
  pad?: number;
  /** rim alpha 1 everywhere: the whole surface shows the displaced copy (no mask boundary between bent and unbent) */
  fullRim?: boolean;
  /** override the frost blur (px) for this class; 0 = clear glass (never blur UI text under a window-edge strip) */
  blur?: number;
  /** corner radius (CSS px at the representative size) — the rim follows a rounded-rect SDF, so corners bend radially */
  radius?: number;
}

export const LENS_CLASSES: LensClass[] = [
  { name: 'widget', w: 560, h: 360, mw: 140, mh: 90, axes: 'xy', rim: 0.8, radius: 14 },   // quick input, suggest, hovers, notifications
  { name: 'menu', w: 240, h: 320, mw: 60, mh: 80, axes: 'xy', rim: 0.6, radius: 14 },      // dropdown lists, capsule buttons
  { name: 'sidebar', w: 300, h: 820, mw: 60, mh: 164, axes: 'xy', rim: 0.9, radius: 16 },  // side bar / auxiliary bar cards
  { name: 'panel', w: 1100, h: 320, mw: 160, mh: 48, axes: 'xy', rim: 0.9, radius: 16 },   // bottom panel card
  { name: 'column', w: 48, h: 820, mw: 12, mh: 128, axes: 'x', rim: 0.5 },     // activity bar
  { name: 'strip', w: 1400, h: 36, mw: 128, mh: 12, axes: 'y', rim: 0.35 },    // title bar, status bar, tab strip, sticky scroll
  // (the 'capsule' class was dropped in 1.2.0: activity-bar and status-bar pills carry no filter at all. Over a
  //  see-through window nothing in-page sits behind a 36 px icon, so the lens only added its own brightness lift and
  //  specular — drawn light, which the owner ruled out, and it made a hovered pill a glossy blob beside the flat tabs.)
  // the minimap's viewport slider: a thick, clear (blur 0) slab of glass with a wide curved edge, dragged over the file
  // overview. It is the one place where glass slides over rendered content, so the bend must read as a lens, not a tint.
  // the minimap's viewport slider and the editor scrollbar: a magnifying dome. The edge zone is half the nominal
  // height, so the WHOLE surface is inside the curve, and `power: 0` gives it the circular-arc profile — nearly flat
  // through the middle, bending hard toward the rim, the section of a thick lens rather than a cone. Displacement is
  // 2× (slope 2.9·28/120 = 0.68, inside the folding limit) and the chromatic fringe scales with it, so the shape and
  // the depth come from the optic alone: the filter draws no light of its own (`spec: false`).
  { name: 'slider', w: 110, h: 240, mw: 40, mh: 88, axes: 'xy', rim: 1, radius: 18, blur: 0, edgePx: 140, power: 0, disp: 2, cornerBoost: 0.15, abr: 2, spec: false, pad: 0.4, fullRim: true },
  // window-edge strips: the slab's top/bottom rim bends what sits just inside the window edge (title bar, status bar,
  // the last code lines). One-sided, clear (no frost), so UI text is bent a little but never blurred.
  { name: 'edge-top', w: 1400, h: 40, mw: 64, mh: 40, axes: 'y', rim: 0.6, sides: { top: true }, blur: 0 },
  { name: 'edge-bottom', w: 1400, h: 40, mw: 64, mh: 40, axes: 'y', rim: 0.6, sides: { bottom: true }, blur: 0 },
];

/**
 * Displacement profile: 0 on the flat top, rising to 1 at the edge over `edge` px.
 * power > 0 → a power curve; power <= 0 → the circular bevel of a curved glass edge: the surface normal tilts
 * like a quarter circle (k caps the arc so the slope at the very edge stays finite), which concentrates the bend
 * in the outer third of the rim — the look of the reference pens (ruri.design glass, the "Generate" pill).
 */
const BEVEL_K = 0.85;
function profile(distToEdge: number, edge: number, power: number): number {
  if (distToEdge >= edge) return 0;
  const t = 1 - distToEdge / edge; // 0 at inner boundary → 1 at the edge
  if (power > 0) return Math.pow(t, power);
  const arc = (x: number) => 1 - Math.sqrt(1 - (BEVEL_K * x) * (BEVEL_K * x));
  return arc(t) / arc(1);
}

export function makeMap(cls: LensClass, edgePx: number, power = 0): { uri: string; ampX: number; ampY: number } {
  const { mw, mh, w, h } = cls;
  const sx = w / mw, sy = h / mh; // CSS px per map px
  const data = new Uint8Array(mw * mh * 4);
  // amplitude compensation so px displacement matches on both axes at the representative size
  const ampX = cls.axes === 'y' ? 0 : Math.min(1, h / w);
  const ampY = cls.axes === 'x' ? 0 : Math.min(1, w / h);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const cx = (x + 0.5) * sx, cy = (y + 0.5) * sy; // CSS-px position in the representative surface
      const sd = cls.sides ?? { top: true, bottom: true, left: true, right: true };
      const far = 1e9; // a disabled side is infinitely far away → no displacement, no rim from it
      const dl = sd.left ? cx : far, dr = sd.right ? w - cx : far, dt = sd.top ? cy : far, db = sd.bottom ? h - cy : far;
      let px: number, py: number;
      const rad = cls.radius ?? 0;
      const nearX = Math.min(dl, dr), nearY = Math.min(dt, db);
      // "cornerness": 1 where both axes are at an edge (a corner), 0 along the middle of a side. A boost here makes the
      // corners the strongest part of the lens, the way a real curved slab wraps light hardest where it turns twice.
      const corner = cls.cornerBoost
        ? 1 + cls.cornerBoost * Math.max(0, 1 - nearX / edgePx) * Math.max(0, 1 - nearY / edgePx)
        : 1;
      if (rad > 0 && !cls.sides && nearX < rad && nearY < rad) {
        // inside a corner: distance and direction from the rounded-rect SDF (radial around the corner centre)
        const qx = rad - nearX, qy = rad - nearY;           // offset from the corner circle's centre
        const len = Math.hypot(qx, qy) || 1;
        const dist = rad - len;                             // distance to the curved edge (negative outside the arc)
        const pr = profile(Math.max(0, dist), edgePx, power);
        px = pr * corner * (qx / len) * (dl < dr ? 1 : -1); // toward the corner centre (i.e. toward the surface centre)
        py = pr * corner * (qy / len) * (dt < db ? 1 : -1);
      } else {
        px = profile(nearX, edgePx, power) * corner * (dl < dr ? 1 : -1); // toward centre
        py = profile(nearY, edgePx, power) * corner * (dt < db ? 1 : -1);
      }
      const i = (y * mw + x) * 4;
      // rim weight (0 centre → 1 edge). Steep: the displaced copy fully replaces the frosted body wherever the
      // displacement is more than a quarter of its maximum, and only fades in the innermost part of the rim, where
      // the displacement is already tiny. A gentle ramp here shows the undisplaced body under the displaced copy
      // (a double image) — review round 3, F3/F4.
      const rim = cls.convex || cls.fullRim ? 1 : Math.min(1, Math.hypot(cls.axes === 'y' ? 0 : px, cls.axes === 'x' ? 0 : py) * 4);
      data[i] = Math.round(128 + px * ampX * 127);
      data[i + 1] = Math.round(128 + py * ampY * 127);
      data[i + 2] = Math.round(rim * 255);
      data[i + 3] = 255;
    }
  }
  return { uri: pngDataUri(mw, mh, data), ampX, ampY };
}

/**
 * Build the SVG filter markup for one class. `displacePx` is the rim displacement in CSS px;
 * converted to a bbox fraction of the representative width (the map's amplitude compensation
 * keeps the y displacement equal in px).
 */
export function filterSvg(id: string, cls: LensClass, mapUri: string, displacePx: number, blurPx: number, aberrationPx = 0): string {
  const lit = cls.spec !== false; // false → no curvature specular and no edge lift: warp + fringe only
  const denom = Math.max(1, cls.axes === 'y' ? cls.h : cls.w);
  const scale = displacePx / denom;
  const ab = aberrationPx / denom;
  const bx = (blurPx / cls.w).toFixed(5), by = (blurPx / cls.h).toFixed(5);
  const sx = (0.6 / cls.w).toFixed(5), sy = (0.6 / cls.h).toFixed(5); // sub-pixel soften of the rim (anti-alias)
  const pad = cls.pad ?? 0; // region padding: without it, displacement near the rim samples outside the region (black)
  return [
    `<filter id='${id}' x='${-pad}' y='${-pad}' width='${1 + 2 * pad}' height='${1 + 2 * pad}' filterUnits='objectBoundingBox' primitiveUnits='objectBoundingBox' color-interpolation-filters='sRGB'>`,
    `<feImage href='${mapUri}' x='0' y='0' width='1' height='1' preserveAspectRatio='none' result='map'/>`,
    // rim weight: blue channel → alpha
    `<feColorMatrix in='map' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0' result='rimA'/>`,
    // frosted body
    blurPx > 0 ? `<feGaussianBlur in='SourceGraphic' stdDeviation='${bx} ${by}' result='frost'/>` : `<feOffset in='SourceGraphic' dx='0' dy='0' result='frost'/>`,
    // refracted rim: displace the sharp backdrop toward the centre, lift it a touch (light concentrates at the edge).
    // With aberration > 0 the R/G/B channels are displaced by slightly different amounts and re-added
    // (feComposite arithmetic k2=k3=1) → colour fringing at the rim, the way thick glass disperses light.
    ...(ab > 0 ? [
      `<feColorMatrix in='SourceGraphic' type='matrix' values='1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0' result='cR'/>`,
      `<feColorMatrix in='SourceGraphic' type='matrix' values='0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0' result='cG'/>`,
      `<feColorMatrix in='SourceGraphic' type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' result='cB'/>`,
      `<feDisplacementMap in='cR' in2='map' scale='${(scale + ab).toFixed(5)}' xChannelSelector='R' yChannelSelector='G' result='dR'/>`,
      `<feDisplacementMap in='cG' in2='map' scale='${scale.toFixed(5)}' xChannelSelector='R' yChannelSelector='G' result='dG'/>`,
      `<feDisplacementMap in='cB' in2='map' scale='${Math.max(0, scale - ab).toFixed(5)}' xChannelSelector='R' yChannelSelector='G' result='dB'/>`,
      `<feComposite in='dR' in2='dG' operator='arithmetic' k1='0' k2='1' k3='1' k4='0' result='dRG'/>`,
      `<feComposite in='dRG' in2='dB' operator='arithmetic' k1='0' k2='1' k3='1' k4='0' result='lens'/>`,
    ] : [
      `<feDisplacementMap in='SourceGraphic' in2='map' scale='${scale.toFixed(5)}' xChannelSelector='R' yChannelSelector='G' result='lens'/>`,
    ]),
    `<feGaussianBlur in='lens' stdDeviation='${sx} ${sy}' result='lensSoft'/>`,
    // light concentrates at the edge: a small lift only (a strong lift reads as a bright wash on a transparent page)
    ...(lit ? [`<feComponentTransfer in='lensSoft' result='lensLit'><feFuncR type='linear' slope='1.05' intercept='0.006'/><feFuncG type='linear' slope='1.05' intercept='0.006'/><feFuncB type='linear' slope='1.05' intercept='0.009'/></feComponentTransfer>`] : []),
    // curvature specular: the map's R/G channels are the bend direction (= the surface normal, projected); a light from
    // the top-left lights every part of the rim whose normal tilts toward it — brightest along the top and left arcs,
    // dark along the bottom and right — the way a real curved glass edge catches the room light
    ...(lit ? [
      `<feColorMatrix in='map' type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.6 1.6 0 0 -1.6' result='specA'/>`,
      `<feComponentTransfer in='specA' result='specSoft'><feFuncA type='linear' slope='0.55' intercept='0'/></feComponentTransfer>`,
      `<feComposite in='specSoft' in2='lensLit' operator='over' result='lensSpec'/>`,
    ] : []),
    `<feComposite in='${lit ? 'lensSpec' : 'lensSoft'}' in2='rimA' operator='in' result='rim'/>`,
    `<feComposite in='rim' in2='frost' operator='over'/>`,
    `</filter>`,
  ].join('');
}

/** A CSS `url("data:image/svg+xml,…#id")` value for a filter. */
export function filterDataUrl(filterMarkup: string, id: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'>${filterMarkup}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}#${id}")`;
}
