#!/usr/bin/env node
/**
 * Minimal Chrome DevTools Protocol client for the VS Code workbench.
 * VS Code must be launched with --remote-debugging-port=<port>.
 *
 * Usage:
 *   node scripts/cdp.mjs [--port 9333] targets
 *   node scripts/cdp.mjs [--port 9333] shot out.png            # 2x (device scale) PNG of the workbench window
 *   node scripts/cdp.mjs [--port 9333] eval "<js expression>"  # evaluated in the workbench page (await'd)
 *   node scripts/cdp.mjs [--port 9333] evalfile path.js        # same, from a file
 *   node scripts/cdp.mjs [--port 9333] css path.css            # inject/replace a <style id="vs-glass-dev"> with the file's contents
 *   node scripts/cdp.mjs [--port 9333] trace out.json <ms> "<js to run during trace>"  # performance trace
 *
 * Uses Node's built-in WebSocket (Node >= 22). No dependencies.
 */
import fs from 'node:fs';

const args = process.argv.slice(2);
let port = 9333;
const pi = args.indexOf('--port');
if (pi >= 0) { port = Number(args[pi + 1]); args.splice(pi, 2); }
const [cmd, ...rest] = args;

async function targets() {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  return res.json();
}

function pickWorkbench(list) {
  // Prefer the main workbench page (not extension hosts, webviews, shared process).
  const pages = list.filter(t => t.type === 'page');
  return pages.find(t => /workbench\.html/.test(t.url) && !/shared-process|process-explorer|issue-reporter/.test(t.url))
    || pages.find(t => /workbench/.test(t.url))
    || pages[0];
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); this.events = []; this.listeners = new Map(); }
  open() {
    return new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', e => rej(e));
      this.ws.addEventListener('message', ev => {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const { res, rej } = this.pending.get(msg.id); this.pending.delete(msg.id);
          msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
          const l = this.listeners.get(msg.method); if (l) l.forEach(fn => fn(msg.params));
        }
      });
    });
  }
  on(method, fn) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(fn); }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  close() { this.ws.close(); }
}

async function connect() {
  const list = await targets();
  const t = pickWorkbench(list);
  if (!t) throw new Error('No workbench page target found. Is VS Code running with --remote-debugging-port?');
  const c = new CDP(t.webSocketDebuggerUrl);
  await c.open();
  return { c, t };
}

async function evalJs(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('JS exception: ' + JSON.stringify(r.exceptionDetails, null, 2));
  return r.result.value;
}

(async () => {
  if (cmd === 'targets') {
    const list = await targets();
    for (const t of list) console.log(t.type.padEnd(16), t.title.slice(0, 50).padEnd(52), t.url.slice(0, 120));
    return;
  }
  const { c, t } = await connect();
  try {
    if (cmd === 'shot') {
      const out = rest[0] || 'shot.png';
      const metrics = await c.send('Page.getLayoutMetrics');
      const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
      const dpr = await evalJs(c, 'window.devicePixelRatio');
      console.log(`wrote ${out} (css viewport ${metrics.cssVisualViewport.clientWidth}x${metrics.cssVisualViewport.clientHeight}, dpr ${dpr})`);
    } else if (cmd === 'shotel') {
      // shotel <css selector> <out.png> [padCss=24] — full 2x screenshot cropped to the element's box (+pad)
      const [sel, out, padStr] = rest; const pad = Number(padStr ?? 24);
      const rect = await evalJs(c, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, dpr: window.devicePixelRatio, vw: innerWidth, vh: innerHeight }; })()`);
      if (!rect) throw new Error('element not found: ' + sel);
      const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const full = out.replace(/\.png$/, '') + '.full.png';
      fs.writeFileSync(full, Buffer.from(r.data, 'base64'));
      const { execFileSync } = await import('node:child_process');
      const d = rect.dpr; const x = Math.max(0, Math.floor((rect.x - pad) * d)), y = Math.max(0, Math.floor((rect.y - pad) * d));
      const w = Math.min(Math.floor((rect.w + 2 * pad) * d), rect.vw * d - x), h = Math.min(Math.floor((rect.h + 2 * pad) * d), rect.vh * d - y);
      execFileSync('sips', ['-c', String(h), String(w), '--cropOffset', String(y), String(x), full, '--out', out], { stdio: 'ignore' });
      fs.unlinkSync(full);
      console.log(`wrote ${out} (${w}x${h} device px around ${sel})`);
    } else if (cmd === 'mouse') {
      // mouse move <x> <y> | mouse click <x> <y> [left|right]
      const [action, xs, ys, btn = 'left'] = rest; const x = Number(xs), y = Number(ys);
      if (action === 'move') { await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 30, y }); await new Promise(r => setTimeout(r, 60)); await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
      else { await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: btn, clickCount: 1 }); await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: btn, clickCount: 1 }); }
      console.log('mouse', action, x, y);
    } else if (cmd === 'rect') {
      const v = await evalJs(c, `(() => { const e = document.querySelector(${JSON.stringify(rest[0])}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) }; })()`);
      console.log(JSON.stringify(v));
    } else if (cmd === 'eval') {
      const v = await evalJs(c, rest.join(' '));
      console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    } else if (cmd === 'evalfile') {
      const v = await evalJs(c, fs.readFileSync(rest[0], 'utf8'));
      console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    } else if (cmd === 'css') {
      const css = fs.readFileSync(rest[0], 'utf8');
      const v = await evalJs(c, `(() => {
        let s = document.getElementById('vs-glass-dev');
        if (!s) { s = document.createElement('style'); s.id = 'vs-glass-dev'; document.head.appendChild(s); }
        s.textContent = ${JSON.stringify(css)};
        return 'injected ' + s.textContent.length + ' chars';
      })()`);
      console.log(v);
    } else if (cmd === 'key') {
      // key "meta+shift+p" | "escape" | "meta+b" ...
      const parts = rest[0].toLowerCase().split('+');
      const key = parts.pop();
      const mods = (parts.includes('alt') ? 1 : 0) | (parts.includes('ctrl') ? 2 : 0) | (parts.includes('meta') || parts.includes('cmd') ? 4 : 0) | (parts.includes('shift') ? 8 : 0);
      const special = { escape: ['Escape', 27], enter: ['Enter', 13], tab: ['Tab', 9], space: [' ', 32], backspace: ['Backspace', 8], down: ['ArrowDown', 40], up: ['ArrowUp', 38], left: ['ArrowLeft', 37], right: ['ArrowRight', 39], f1: ['F1', 112], f2: ['F2', 113], f5: ['F5', 116] };
      let keyName, vk, code;
      if (special[key]) { [keyName, vk] = special[key]; code = keyName === ' ' ? 'Space' : keyName; }
      else { keyName = key; vk = key.toUpperCase().charCodeAt(0); code = /[a-z]/.test(key) ? 'Key' + key.toUpperCase() : /[0-9]/.test(key) ? 'Digit' + key : key; }
      const base = { modifiers: mods, key: keyName, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: mods & ~8 ? undefined : (keyName.length === 1 ? keyName : undefined) });
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      console.log('key', rest[0]);
    } else if (cmd === 'type') {
      await c.send('Input.insertText', { text: rest.join(' ') });
      console.log('typed');
    } else if (cmd === 'trace') {
      const [out, msStr, js] = rest;
      const ms = Number(msStr || 3000);
      await c.send('Tracing.start', {
        traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink', 'cc', 'gpu', 'viz'] },
        transferMode: 'ReturnAsStream'
      });
      if (js) evalJs(c, js).catch(e => console.error('trace js error', e.message));
      await new Promise(r => setTimeout(r, ms));
      const done = new Promise(res => c.on('Tracing.tracingComplete', res));
      await c.send('Tracing.end');
      const { stream } = await done;
      let data = '';
      for (;;) {
        const chunk = await c.send('IO.read', { handle: stream });
        data += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data;
        if (chunk.eof) break;
      }
      await c.send('IO.close', { handle: stream });
      fs.writeFileSync(out, data);
      console.log(`wrote ${out} (${(data.length / 1e6).toFixed(1)} MB)`);
    } else {
      console.log(`target: ${t.title} ${t.url}`);
      console.log('commands: targets | shot <png> | eval <js> | evalfile <file> | css <file> | trace <out.json> <ms> [js]');
    }
  } finally { c.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
