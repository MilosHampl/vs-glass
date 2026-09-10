/**
 * Minimal, dependency-free colour math for the verification scripts
 * (scripts/audit-coverage.mjs, scripts/audit-contrast.mjs, scripts/validate-schema.mjs).
 *
 * Deliberately NOT imported from src/color.ts: these scripts run under plain `node`
 * (no tsx, no build step) so CI can gate on them without a TypeScript toolchain.
 * Kept intentionally tiny — just what the audits need: parse, format, composite, luminance, contrast.
 */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Parse "#rrggbb" / "#rrggbbaa" into 0..1 components. Throws on anything else (no 3/4-digit shorthand — VS Code theme hex is always 6/8-digit). */
export function parseHex(hex) {
  const h = String(hex).trim();
  if (!HEX_RE.test(h)) throw new Error(`bad hex colour: ${hex}`);
  const s = h.slice(1);
  const n = (i) => parseInt(s.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: s.length === 8 ? n(6) : 1 };
}

const to2 = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');

/** Format r/g/b/a (0..1 each) back to "#rrggbb" (a>=1) or "#rrggbbaa". */
export function toHex(r, g, b, a = 1) {
  const base = `#${to2(r)}${to2(g)}${to2(b)}`;
  return a >= 1 ? base : `${base}${to2(a)}`;
}

/** Strip alpha (return the opaque "#rrggbb" for any hex). */
export function opaque(hex) {
  const { r, g, b } = parseHex(hex);
  return toHex(r, g, b, 1);
}

/** Source-over composite of `fgHex` (may carry alpha) onto `bgHex` (assumed already opaque — resolve bg alpha first). */
export function composite(fgHex, bgHex) {
  const f = parseHex(fgHex);
  const b = parseHex(bgHex);
  const r = f.r * f.a + b.r * (1 - f.a);
  const g = f.g * f.a + b.g * (1 - f.a);
  const bl = f.b * f.a + b.b * (1 - f.a);
  return toHex(r, g, bl, 1);
}

/** WCAG relative luminance of an opaque colour (any alpha present is ignored — composite first). */
export function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.x contrast ratio. `fgHex` may carry alpha — it is composited over opaque(bgHex) first, per spec. */
export function contrast(fgHex, bgHex) {
  const bg = opaque(bgHex);
  const fg = composite(fgHex, bg);
  const l1 = luminance(fg), l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
