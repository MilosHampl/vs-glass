#!/usr/bin/env node
/**
 * VS Glass — repair the window hook in VS Code's out/main.js.
 *
 * Strips whatever VS Glass hook block is in main.js and writes the current one, then parses the result to prove it is
 * valid JavaScript before leaving it in place (a hook that does not parse stops VS Code's main process from starting).
 * `--restore` instead puts back the pristine main.js.vs-glass-backup, leaving VS Code with no VS Glass hook at all.
 *
 *   node scripts/fix-hook.mjs [--app "/Applications/Visual Studio Code.app"] [--restore]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = path.dirname(new URL(import.meta.url).pathname);
const patch = createRequire(import.meta.url)(path.join(here, '..', 'out', 'patch.js'));

const args = process.argv.slice(2);
const restore = args.includes('--restore');
const ai = args.indexOf('--app');
const app = ai >= 0 ? args[ai + 1] : '/Applications/Visual Studio Code.app';
const main = path.join(app, 'Contents', 'Resources', 'app', 'out', 'main.js');
const backup = main + patch.BACKUP_SUFFIX;

if (!fs.existsSync(main)) { console.error(`no main.js at ${main}`); process.exit(1); }

/** Throws unless the VS Glass hook block inside `text` parses as JavaScript. */
function checkHook(text) {
  const i = text.indexOf(patch.WIN_START);
  if (i < 0) return 'no hook';
  const body = text.slice(i).replace(patch.WIN_START, '').replace(patch.WIN_END, '');
  const tmp = path.join(os.tmpdir(), `vsg-hook-check-${process.pid}.js`);
  fs.writeFileSync(tmp, body);
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); return 'parses'; }
  finally { try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
}

const cur = fs.readFileSync(main, 'utf8');
console.log(`main.js: ${patch.hookVersionOf(cur) ?? 'no hook'}${fs.existsSync(backup) ? ', backup present' : ', NO backup'}`);

if (restore) {
  if (!fs.existsSync(backup)) { console.error('no pristine backup to restore'); process.exit(1); }
  patch.writeAtomic(main, fs.readFileSync(backup, 'utf8'));
  console.log('restored the pristine main.js — VS Code starts with no VS Glass hook');
  process.exit(0);
}

const { text, spliced, anchors } = patch.applyHook(patch.stripHook(cur), patch.hookText());
let verdict;
try { verdict = checkHook(text); }
catch (e) {
  console.error('the new hook does NOT parse — nothing written:\n' + String(e.stderr || e).slice(0, 800));
  process.exit(2);
}
patch.writeAtomic(main, text);
console.log(`wrote ${patch.hookVersionOf(text)} (${verdict}, creation-time transparency ${spliced ? 'spliced' : `NOT spliced — anchor ×${anchors}`})`);
console.log('quit VS Code completely (Cmd+Q) and reopen it.');
