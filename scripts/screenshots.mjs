#!/usr/bin/env node
/**
 * Screenshot matrix for VS Glass. Drives a VS Code instance over CDP (see scripts/cdp.mjs) and writes 2× PNGs
 * into screenshots/. The instance must be started with --remote-debugging-port and an isolated
 * --user-data-dir whose settings.json we may edit (theme switching is done by editing that file; VS Code
 * applies it live), with the repo's `samples/` folder open and this extension installed/symlinked.
 *
 *   node scripts/screenshots.mjs --port 9334 --profile scratch/profile-clean/user \
 *        [--variants glass-regular-dark,glass-regular-light,glass-clear,glass-opaque] [--layer2 on|off|both] [--scenes hero,palette,...]
 *
 * Layer 2 is injected as a <style id="vs-glass-dev"> from glass/glass.css (so no loader is needed for the
 * matrix) and switched off by adding the `vs-glass-off` class to .monaco-workbench.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const port = Number(opt('--port', 9334));
const profile = opt('--profile', 'scratch/profile-clean/user');
const variants = opt('--variants', 'glass-regular-dark,glass-regular-light,glass-clear,glass-opaque').split(',');
const layer2 = opt('--layer2', 'both');
const scenes = opt('--scenes', 'hero,sidebar,palette,hover,suggest,menu,terminal,diff,merge,notification,settings,markdown,python,rust').split(',');
const outDir = path.resolve('screenshots');
fs.mkdirSync(outDir, { recursive: true });
const NAMES = { 'glass-regular-dark': 'Glass Regular Dark', 'glass-regular-light': 'Glass Regular Light', 'glass-clear': 'Glass Clear', 'glass-opaque': 'Glass Opaque' };

// ---- CDP plumbing ----
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = list.find(t => t.type === 'page' && /workbench\.html/.test(t.url));
if (!target) { console.error('no workbench target'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl); let id = 0;
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; ws.addEventListener('message', function h(e) { const d = JSON.parse(e.data); if (d.id === i) { ws.removeEventListener('message', h); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => ws.addEventListener('open', r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const evalJs = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails)); return r.result.value; };
const key = async (combo) => {
  const parts = combo.toLowerCase().split('+'); const k = parts.pop();
  const mods = (parts.includes('alt') ? 1 : 0) | (parts.includes('ctrl') ? 2 : 0) | (parts.includes('meta') ? 4 : 0) | (parts.includes('shift') ? 8 : 0);
  const special = { escape: ['Escape', 27], enter: ['Enter', 13], down: ['ArrowDown', 40], up: ['ArrowUp', 38], space: [' ', 32], backspace: ['Backspace', 8], tab: ['Tab', 9], f10: ['F10', 121] };
  let keyName, vk, code; if (special[k]) { [keyName, vk] = special[k]; code = keyName === ' ' ? 'Space' : keyName; } else { keyName = k; vk = k.toUpperCase().charCodeAt(0); code = /[a-z]/.test(k) ? 'Key' + k.toUpperCase() : /[0-9]/.test(k) ? 'Digit' + k : k; }
  const base = { modifiers: mods, key: keyName, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: mods & ~8 ? undefined : (keyName.length === 1 ? keyName : undefined) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
};
const type = async (text) => send('Input.insertText', { text });
const mouse = async (x, y, action = 'move', button = 'left') => {
  if (action === 'move') { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 20, y }); await sleep(50); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
  else { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 }); }
};
const rect = async (sel) => evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; })()`);
const shot = async (file, clipSel, pad = 24) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const full = path.join(outDir, file); fs.writeFileSync(full, Buffer.from(r.data, 'base64'));
  if (clipSel) {
    const b = await rect(clipSel); const dpr = await evalJs('window.devicePixelRatio'); const vw = await evalJs('innerWidth'), vh = await evalJs('innerHeight');
    if (b) { const x = Math.max(0, Math.floor((b.x - pad) * dpr)), y = Math.max(0, Math.floor((b.y - pad) * dpr)); const w = Math.min(Math.floor((b.w + 2 * pad) * dpr), vw * dpr - x), h = Math.min(Math.floor((b.h + 2 * pad) * dpr), vh * dpr - y);
      execFileSync('sips', ['-c', String(h), String(w), '--cropOffset', String(y), String(x), full, '--out', full], { stdio: 'ignore' }); }
  }
  console.log('  wrote', path.relative(process.cwd(), full));
};
const openFile = async (name) => {
  // Quick Open ranks recently used files first ("glass.ts" would match GlassPane.tsx), so pick the exact label.
  await key('meta+p'); await sleep(350); await type(name); await sleep(700);
  const idx = await evalJs(`(() => { const rows = [...document.querySelectorAll('.quick-input-widget .monaco-list-row')]; return rows.findIndex(r => (r.querySelector('.label-name')?.textContent || '').trim() === ${JSON.stringify(name)}); })()`);
  for (let i = 0; i < Math.max(0, idx); i++) { await key('down'); await sleep(60); }
  await key('enter');
  for (let i = 0; i < 24; i++) { await sleep(250); const ok = await evalJs(`(() => { const t = document.querySelector('.part.editor .tab.active .label-name'); return t && t.textContent.trim() === ${JSON.stringify(name)} && document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 3; })()`); if (ok) break; }
  await sleep(500);
};
const runCommand = async (cmd) => { await key('meta+shift+p'); await sleep(350); await type(cmd); await sleep(700); await key('enter'); await sleep(900); };
const closeAll = async () => { await key('escape'); await sleep(150); await key('escape'); await sleep(150); };
const setTheme = async (variant) => {
  const file = path.join(profile, 'User', 'settings.json'); const s = JSON.parse(fs.readFileSync(file, 'utf8')); s['workbench.colorTheme'] = NAMES[variant]; fs.writeFileSync(file, JSON.stringify(s, null, 2));
  for (let i = 0; i < 40; i++) { await sleep(250); const cls = await evalJs(`document.querySelector('.monaco-workbench').className`); if (cls.includes(`-themes-${variant}-`)) return; }
  throw new Error('theme did not apply: ' + variant);
};
const setLayer2 = async (on) => {
  const css = fs.readFileSync('glass/glass.css', 'utf8');
  await evalJs(`(() => { let s = document.getElementById('vs-glass-dev'); if (!s) { s = document.createElement('style'); s.id = 'vs-glass-dev'; document.head.appendChild(s); } s.textContent = ${JSON.stringify(css)}; document.querySelector('.monaco-workbench').classList.toggle('vs-glass-off', ${!on}); return 1; })()`);
  await sleep(400);
};
const showSidebarView = async () => { await runCommand('View: Show Explorer'); await sleep(500); };

// ---- scenes ----
const SCENES = {
  hero: async (tag) => { await showSidebarView(); await openFile('glass.ts'); await sleep(400); await shot(`${tag}-hero.png`); },
  sidebar: async (tag) => { await showSidebarView(); await shot(`${tag}-sidebar.png`, '.part.sidebar', 32); },
  palette: async (tag) => { await openFile('GlassPane.tsx'); await key('meta+shift+p'); await sleep(350); await type('view'); await sleep(900); await shot(`${tag}-palette.png`, '.quick-input-widget', 60); await closeAll(); },
  hover: async (tag) => {
    await openFile('glass.ts');
    const pos = await evalJs(`(() => { const spans = [...document.querySelectorAll('.monaco-editor .view-lines .view-line span span')].filter(s => /RefractiveIndex|MaterialProperties|OptimizedResult|GlassRenderer/.test(s.textContent)); const s = spans[Math.floor(spans.length / 2)] || spans[0]; if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.x + Math.min(r.width / 2, 30), y: r.y + r.height / 2 }; })()`);
    if (!pos) throw new Error('no hover target token visible');
    await mouse(pos.x, pos.y); await sleep(1600);
    const hov = await rect('.monaco-editor .monaco-hover'); if (!hov || hov.w < 10) throw new Error('hover did not appear');
    await shot(`${tag}-hover.png`, '.monaco-editor .monaco-hover', 60); await mouse(pos.x, pos.y + 300);
  },
  suggest: async (tag) => {
    await openFile('glass.ts');
    const pos = await evalJs(`(() => { const lines = [...document.querySelectorAll('.monaco-editor .view-lines .view-line')].filter(l => l.textContent.trim().length > 12); const l = lines[Math.floor(lines.length / 2)]; if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.x + Math.min(r.width, 260), y: r.y + r.height / 2 }; })()`);
    if (!pos) throw new Error('no editor lines rendered');
    await mouse(pos.x, pos.y, 'click'); await sleep(250); await key('ctrl+space'); await sleep(1500);
    const sw = await rect('.monaco-editor .suggest-widget'); if (!sw || sw.w < 10) throw new Error('suggest widget did not appear');
    await shot(`${tag}-suggest.png`, '.monaco-editor .suggest-widget', 60); await closeAll();
  },
  menu: async (tag) => { const r = await rect('.monaco-editor .view-lines'); await mouse(r.cx, r.cy, 'click'); await sleep(200); await key('shift+f10'); await sleep(900); await shot(`${tag}-menu.png`, '.context-view .monaco-menu-container', 60); await closeAll(); },
  terminal: async (tag) => { await runCommand('View: Toggle Terminal'); await sleep(1800); await shot(`${tag}-terminal.png`); await runCommand('View: Toggle Terminal'); await sleep(600); },
  diff: async (tag) => { await openFile('diff-before.ts'); await runCommand('File: Compare Active File With...'); await sleep(500); await type('diff-after.ts'); await sleep(700); await key('enter'); await sleep(2000); await shot(`${tag}-diff.png`); await key('meta+w'); await sleep(500); },
  merge: async (tag) => { await openFile('merge-conflict.ts'); await sleep(800); await shot(`${tag}-merge.png`); },
  notification: async (tag) => { await runCommand('Developer: Show Running Extensions'); await sleep(600); await key('meta+w'); await sleep(300); await runCommand('Notifications: Show Notifications'); await sleep(900); await shot(`${tag}-notifications.png`); await closeAll(); },
  settings: async (tag) => { await runCommand('Preferences: Open Settings (UI)'); await sleep(1800); await shot(`${tag}-settings.png`); await key('meta+w'); await sleep(400); },
  markdown: async (tag) => { await openFile('README.md'); await shot(`${tag}-markdown.png`); },
  python: async (tag) => { await openFile('optics.py'); await shot(`${tag}-python.png`); },
  rust: async (tag) => { await openFile('lens.rs'); await shot(`${tag}-rust.png`); },
};

const layers = layer2 === 'both' ? [true, false] : [layer2 === 'on'];
for (const variant of variants) {
  console.log(`== ${variant}`); await setTheme(variant);
  for (const on of layers) {
    if (variant === 'glass-opaque' && on) continue; // Opaque never gets effects
    await setLayer2(on); const tag = `${variant}${on ? '' : '-layer1'}`;
    for (const scene of scenes) { try { await SCENES[scene](tag); } catch (e) { console.log(`  ! ${scene}: ${e.message.slice(0, 120)}`); await closeAll(); } }
  }
}
await setLayer2(true);
ws.close();
