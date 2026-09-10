/**
 * Displacement-map generation for the Liquid Glass lens (Layer 2).
 *
 * The map is an RGBA PNG: R encodes x-displacement, G encodes y-displacement (128 = none).
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
}

export const LENS_CLASSES: LensClass[] = [
  { name: 'widget', w: 480, h: 320, mw: 96, mh: 64, axes: 'xy' },     // quick input, suggest, hovers, notifications
  { name: 'menu', w: 240, h: 320, mw: 48, mh: 64, axes: 'xy' },       // context menus, dropdown lists
  { name: 'sidebar', w: 300, h: 820, mw: 48, mh: 128, axes: 'xy' },   // side bar / auxiliary bar cards
  { name: 'panel', w: 1100, h: 320, mw: 128, mh: 40, axes: 'xy' },    // bottom panel card
  { name: 'column', w: 48, h: 820, mw: 12, mh: 128, axes: 'x' },      // activity bar
  { name: 'strip', w: 1400, h: 36, mw: 128, mh: 12, axes: 'y' },      // title bar, status bar, tab strip, sticky scroll
];

/** Displacement profile: 0 in the flat centre, rising to 1 at the edge over `edge` px (eased). */
function profile(distToEdge: number, edge: number, power: number): number {
  if (distToEdge >= edge) return 0;
  const t = 1 - distToEdge / edge; // 0 at inner boundary → 1 at the edge
  return Math.pow(t, power);
}

export function makeMap(cls: LensClass, edgePx: number, power = 2): { uri: string; ampX: number; ampY: number } {
  const { mw, mh, w, h } = cls;
  const sx = w / mw, sy = h / mh; // CSS px per map px
  const data = new Uint8Array(mw * mh * 4);
  // amplitude compensation so px displacement matches on both axes at the representative size
  const ampX = cls.axes === 'y' ? 0 : Math.min(1, h / w);
  const ampY = cls.axes === 'x' ? 0 : Math.min(1, w / h);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const cx = (x + 0.5) * sx, cy = (y + 0.5) * sy; // CSS-px position in the representative surface
      const dl = cx, dr = w - cx, dt = cy, db = h - cy;
      const px = profile(Math.min(dl, dr), edgePx, power) * (dl < dr ? 1 : -1); // toward centre
      const py = profile(Math.min(dt, db), edgePx, power) * (dt < db ? 1 : -1);
      const i = (y * mw + x) * 4;
      data[i] = Math.round(128 + px * ampX * 127);
      data[i + 1] = Math.round(128 + py * ampY * 127);
      data[i + 2] = 128;
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
export function filterSvg(id: string, cls: LensClass, mapUri: string, displacePx: number, blurPx = 0): string {
  const scale = displacePx / Math.max(1, cls.axes === 'y' ? cls.h : cls.w);
  const blur = blurPx > 0 ? `<feGaussianBlur in='SourceGraphic' stdDeviation='${(blurPx / cls.w).toFixed(5)} ${(blurPx / cls.h).toFixed(5)}' result='b'/>` : '';
  const input = blurPx > 0 ? 'b' : 'SourceGraphic';
  return `<filter id='${id}' x='0' y='0' width='1' height='1' filterUnits='objectBoundingBox' primitiveUnits='objectBoundingBox' color-interpolation-filters='sRGB'>${blur}<feImage href='${mapUri}' x='0' y='0' width='1' height='1' preserveAspectRatio='none' result='map'/><feDisplacementMap in='${input}' in2='map' scale='${scale.toFixed(5)}' xChannelSelector='R' yChannelSelector='G'/></filter>`;
}

/** A CSS `url("data:image/svg+xml,…#id")` value for a filter. */
export function filterDataUrl(filterMarkup: string, id: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'>${filterMarkup}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}#${id}")`;
}
