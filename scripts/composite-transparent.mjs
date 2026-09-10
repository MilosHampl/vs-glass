#!/usr/bin/env node
/**
 * Composite a CDP alpha capture of the transparent-window mode over a desktop picture, the way macOS shows it:
 * the desktop is blurred by Vibrancy Continued's "under-window" material, then the window's own pixels are
 * drawn on top. This is a *simulation* of the OS compositing (we cannot screen-record the real desktop from the
 * build tooling); the window pixels are real. Output is labelled accordingly by the caller.
 *
 *   node scripts/composite-transparent.mjs --in shot.png --wall wallpaper.jpg --out composite.png [--blur 28] [--dim 0.18]
 *        [--label "…"]  (optional caption under the frame)
 *        [--crop x,y,w,h]  (device pixels; render only that region of the composite, e.g. a window corner at 2×)
 *
 * Uses Google Chrome headless (macOS path) to render the HTML compositor; no npm dependency.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const inPng = path.resolve(opt('--in')); const wall = path.resolve(opt('--wall')); const out = path.resolve(opt('--out'));
const blur = Number(opt('--blur', 28)); const dim = Number(opt('--dim', 0.18)); const label = opt('--label', '');
const crop = opt('--crop', '').split(',').map(Number).filter(n => !Number.isNaN(n));
const chrome = opt('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
if (!fs.existsSync(chrome)) { console.error('Chrome not found at', chrome); process.exit(1); }

// PNG dimensions from the IHDR chunk
const buf = fs.readFileSync(inPng);
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
const scale = 2; // captures are 2× (Retina); the wallpaper is drawn at the same device scale
const cssW = Math.round(w / scale), cssH = Math.round(h / scale);
const labelH = label ? 34 : 0;
const hasCrop = crop.length === 4; const [cx, cy, cw, ch] = hasCrop ? crop.map(v => v / scale) : [0, 0, cssW, cssH + labelH];
const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#000}
.view{position:relative;width:${cw}px;height:${ch}px;overflow:hidden}
.view>.desk{position:absolute;left:${-cx}px;top:${-cy}px}
.desk{position:relative;width:${cssW}px;height:${cssH + labelH}px;overflow:hidden;background:#000}
.wall{position:absolute;inset:-${blur * 2}px;background:url("file://${wall}") center/cover no-repeat;filter:blur(${blur}px) saturate(1.1)}
.dim{position:absolute;inset:0;height:${cssH}px;background:rgba(0,0,0,${dim})}
.win{position:absolute;left:0;top:0;width:${cssW}px;height:${cssH}px}
.label{position:absolute;left:0;right:0;bottom:0;height:${labelH}px;background:#111;color:#cfd3dc;font:12px/${labelH}px -apple-system,system-ui,sans-serif;padding:0 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style><div class="view"><div class="desk"><div class="wall"></div><div class="dim"></div><img class="win" src="file://${inPng}">${label ? `<div class="label">${label.replace(/</g, '&lt;')}</div>` : ''}</div></div>`;
const tmp = path.join(path.dirname(out), `.composite-${process.pid}.html`);
fs.writeFileSync(tmp, html);
try {
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--force-device-scale-factor=${scale}`,
    `--window-size=${cw},${ch}`, `--screenshot=${out}`, `file://${tmp}`], { stdio: 'pipe', timeout: 60000 });
  console.log('wrote', path.relative(process.cwd(), out), hasCrop ? `crop ${crop.join(',')}` : `${w}×${h + labelH * scale}`);
} finally { fs.unlinkSync(tmp); }
