/**
 * Color math for VS Glass — dependency-free.
 *
 * Everything in the palette is expressed in OKLCH (perceptual lightness L 0..1,
 * chroma C, hue h in degrees) and converted to sRGB hex here. Alpha is carried as a
 * separate number and emitted as 8-digit #RRGGBBAA when needed.
 */

export type Hex = string; // "#rrggbb" or "#rrggbbaa"

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ---------- sRGB <-> linear ----------
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// ---------- hex parsing ----------
export function parseHex(hex: Hex): { r: number; g: number; b: number; a: number } {
  let h = hex.trim().replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 && h.length !== 8) throw new Error(`bad hex: ${hex}`);
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

const to2 = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');

export function rgbToHex(r: number, g: number, b: number, a = 1): Hex {
  const base = `#${to2(r)}${to2(g)}${to2(b)}`;
  return a >= 1 ? base : `${base}${to2(a)}`;
}

// ---------- OKLab / OKLCH (Björn Ottosson) ----------
export function linearRgbToOklab(r: number, g: number, b: number) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToLinearRgb(L: number, a: number, b: number) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

export function hexToOklch(hex: Hex): { L: number; C: number; h: number; a: number } {
  const { r, g, b, a } = parseHex(hex);
  const lab = linearRgbToOklab(toLinear(r), toLinear(g), toLinear(b));
  const C = Math.hypot(lab.a, lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L: lab.L, C, h, a };
}

function inGamut(c: { r: number; g: number; b: number }) {
  const eps = 0.0005;
  return c.r >= -eps && c.r <= 1 + eps && c.g >= -eps && c.g <= 1 + eps && c.b >= -eps && c.b <= 1 + eps;
}

/** OKLCH → sRGB hex. Chroma is reduced (hue and lightness preserved) until the colour is in gamut. */
export function oklch(L: number, C: number, h: number, alpha = 1): Hex {
  const rad = (h * Math.PI) / 180;
  let c = C;
  let rgb = oklabToLinearRgb(L, c * Math.cos(rad), c * Math.sin(rad));
  let guard = 0;
  while (!inGamut(rgb) && c > 0.0005 && guard++ < 64) {
    c *= 0.94;
    rgb = oklabToLinearRgb(L, c * Math.cos(rad), c * Math.sin(rad));
  }
  return rgbToHex(toGamma(clamp01(rgb.r)), toGamma(clamp01(rgb.g)), toGamma(clamp01(rgb.b)), alpha);
}

// ---------- operations ----------
/** Attach / replace alpha. `alpha(hex, 0.5)` → "#rrggbb80". */
export function alpha(hex: Hex, a: number): Hex {
  const { r, g, b } = parseHex(hex);
  return rgbToHex(r, g, b, clamp01(a));
}

/** Strip alpha. */
export function opaque(hex: Hex): Hex {
  const { r, g, b } = parseHex(hex);
  return rgbToHex(r, g, b, 1);
}

/** Alpha of a hex colour (1 for 6-digit). */
export function alphaOf(hex: Hex): number {
  return parseHex(hex).a;
}

/** Source-over composite of `fg` (may carry alpha) on an opaque `bg`. Returns opaque hex. */
export function composite(fg: Hex, bg: Hex): Hex {
  const f = parseHex(fg);
  const b = parseHex(bg);
  // if bg itself has alpha, treat it as composited over black (should not happen in our use)
  const r = f.r * f.a + b.r * (1 - f.a);
  const g = f.g * f.a + b.g * (1 - f.a);
  const bl = f.b * f.a + b.b * (1 - f.a);
  return rgbToHex(r, g, bl, 1);
}

/** Perceptual mix in OKLab. t=0 → a, t=1 → b. Alpha is mixed linearly. */
export function mix(a: Hex, b: Hex, t: number): Hex {
  const A = parseHex(a), B = parseHex(b);
  const la = linearRgbToOklab(toLinear(A.r), toLinear(A.g), toLinear(A.b));
  const lb = linearRgbToOklab(toLinear(B.r), toLinear(B.g), toLinear(B.b));
  const L = la.L + (lb.L - la.L) * t, aa = la.a + (lb.a - la.a) * t, bb = la.b + (lb.b - la.b) * t;
  const rgb = oklabToLinearRgb(L, aa, bb);
  return rgbToHex(toGamma(clamp01(rgb.r)), toGamma(clamp01(rgb.g)), toGamma(clamp01(rgb.b)), A.a + (B.a - A.a) * t);
}

/** Change OKLCH lightness by delta (keeps chroma/hue/alpha). */
export function lighten(hex: Hex, dL: number): Hex {
  const { L, C, h, a } = hexToOklch(hex);
  return oklch(clamp01(L + dL), C, h, a);
}

/** Set OKLCH lightness absolutely. */
export function withLightness(hex: Hex, L: number): Hex {
  const { C, h, a } = hexToOklch(hex);
  return oklch(clamp01(L), C, h, a);
}

/** Scale OKLCH chroma. */
export function saturate(hex: Hex, factor: number): Hex {
  const { L, C, h, a } = hexToOklch(hex);
  return oklch(L, C * factor, h, a);
}

// ---------- WCAG 2.x ----------
export function relativeLuminance(hex: Hex): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio between two opaque colours (alpha in `fg` is composited over `bg` first). */
export function contrast(fg: Hex, bg: Hex): number {
  const f = relativeLuminance(composite(fg, opaque(bg)));
  const b = relativeLuminance(opaque(bg));
  const [hi, lo] = f > b ? [f, b] : [b, f];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nudge `fg` lightness (in OKLCH, keeping hue/chroma) away from `bg` until the WCAG ratio is met.
 * Direction is chosen automatically (lighter on dark backgrounds, darker on light ones).
 */
export function ensureContrast(fg: Hex, bg: Hex, ratio: number): Hex {
  if (contrast(fg, bg) >= ratio) return fg;
  const bgL = relativeLuminance(opaque(bg));
  const dir = bgL < 0.18 ? +1 : -1;
  let { L, C, h, a } = hexToOklch(fg);
  for (let i = 0; i < 80; i++) {
    L = clamp01(L + dir * 0.01);
    const candidate = oklch(L, C, h, a);
    if (contrast(candidate, bg) >= ratio) return candidate;
    if (L <= 0 || L >= 1) break;
  }
  // last resort: also drop chroma a little (lets very saturated hues reach the target)
  for (let i = 0; i < 40 && C > 0; i++) {
    C *= 0.9;
    const candidate = oklch(L, C, h, a);
    if (contrast(candidate, bg) >= ratio) return candidate;
  }
  return oklch(L, C, h, a);
}

/** Convenience: format a hex for CSS rgba() when alpha < 1, else hex. */
export function css(hex: Hex): string {
  const { r, g, b, a } = parseHex(hex);
  if (a >= 1) return opaque(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${+a.toFixed(3)})`;
}
