#!/usr/bin/env node
/**
 * Frame-time profiler for the Layer-2 effects.
 * Requires VS Code running with --remote-debugging-port (default 9334) and an editor with a long file open.
 *
 *   node scripts/perf.mjs [--port 9334] [--seconds 4] [--scenario editor|palette]
 *
 * Method: a requestAnimationFrame sampler runs inside the workbench while synthetic wheel events scroll
 * the editor (scenario "editor") or while the command palette is open over the code and the editor scrolls
 * beneath it (scenario "palette"). We record every frame delta and report p50 / p95 / max and the share of
 * frames longer than 16.7 ms — first with the glass effects ON, then with `.vs-glass-off` added to the
 * workbench root (effects OFF), so the cost of the effects is the difference.
 */
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const port = Number(opt('--port', 9334)); const seconds = Number(opt('--seconds', 4)); const scenario = opt('--scenario', 'editor');

const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const t = list.find(x => x.type === 'page' && /workbench\.html/.test(x.url));
const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0;
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; ws.addEventListener('message', function h(e) { const d = JSON.parse(e.data); if (d.id === i) { ws.removeEventListener('message', h); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result); } }); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => ws.addEventListener('open', r));
const evalJs = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(label) {
  // Everything runs in-page: a rAF sampler plus synthetic wheel events (Monaco handles `wheel` itself),
  // so the measurement is not skewed by CDP round-trips.
  const frames = await evalJs(`new Promise(resolve => {
    const target = document.querySelector('.monaco-editor .lines-content') || document.querySelector('.monaco-editor');
    const r = target.getBoundingClientRect();
    const frames = []; let last = performance.now(); let stop = false; let dir = 1; let n = 0;
    const tick = now => { frames.push(now - last); last = now; if (!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const iv = setInterval(() => {
      if (++n % 40 === 0) dir = -dir;
      target.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 * dir, deltaMode: 0, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, cancelable: true }));
    }, 16);
    setTimeout(() => { stop = true; clearInterval(iv); resolve(frames.slice(3)); }, ${seconds * 1000});
  })`);
  if (!Array.isArray(frames) || frames.length < 10) { const line = `${label.padEnd(26)} no frames sampled (${JSON.stringify(frames).slice(0, 80)})`; console.log(line); return line; }
  const sorted = [...frames].sort((a, b) => a - b); const q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const slow = frames.filter(f => f > 16.7).length, veryslow = frames.filter(f => f > 33.4).length;
  const line = `${label.padEnd(26)} frames=${String(frames.length).padStart(4)}  p50=${q(0.5).toFixed(1).padStart(5)}ms  p95=${q(0.95).toFixed(1).padStart(5)}ms  max=${q(1).toFixed(1).padStart(6)}ms  >16.7ms: ${(100 * slow / frames.length).toFixed(1).padStart(5)}%  >33ms: ${(100 * veryslow / frames.length).toFixed(1).padStart(4)}%`;
  console.log(line); return line;
}

const key = async (k, mods = 0, code = k, vk = 0) => { const base = { modifiers: mods, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }; await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base }); await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base }); };

console.log(`scenario: ${scenario}, ${seconds}s each, wheel-scrolling the editor (~60 events/s)`);
if (scenario === 'palette') { await key('p', 12, 'KeyP', 80); await sleep(600); const open = await evalJs(`!!document.querySelector('.quick-input-widget') && getComputedStyle(document.querySelector('.quick-input-widget')).display !== 'none'`); if (!open) console.log('  (palette did not open via CDP key; open it manually first)'); else { await send('Input.insertText', { text: 'view' }); await sleep(600); } }
await evalJs(`document.querySelector('.monaco-workbench').classList.remove('vs-glass-off'); 'on'`); await sleep(300);
const on = await run(`${scenario}: glass ON`);
await evalJs(`document.querySelector('.monaco-workbench').classList.add('vs-glass-off'); 'off'`); await sleep(300);
const off = await run(`${scenario}: glass OFF`);
await evalJs(`document.querySelector('.monaco-workbench').classList.remove('vs-glass-off'); 'on'`);
if (scenario === 'palette') { await key('Escape', 0, 'Escape', 27); }
ws.close();
