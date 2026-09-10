/**
 * VS Glass — `vscode:uninstall` hook. VS Code runs this with plain Node after the extension has been uninstalled and
 * VS Code restarted. It undoes what "VS Glass: Remove" would have: restores out/main.js from its pristine backup (or
 * strips the hook) and deletes the <user-data>/vs-glass folder. The theme-scoped [Glass …] colour blocks stay in
 * settings.json — they are inert without the Glass themes, and rewriting a user's settings file from a script would
 * lose its comments; "VS Glass: Remove" (run before uninstalling) takes them out cleanly.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { restoreMain } from './patch';

const extDir = path.resolve(__dirname, '..');
const pathsFile = path.join(extDir, '.vs-glass-paths.json');
try {
  // VS Code also runs this hook for the OLD folder after an update (it is marked obsolete). A newer VS Glass folder
  // next to this one means "update, not uninstall": leave everything in place for the new version to manage.
  const siblings = fs.readdirSync(path.dirname(extDir)).filter(n => /^miloshampl\.vs-glass-/i.test(n) && path.join(path.dirname(extDir), n) !== extDir);
  if (siblings.length) { console.log(`VS Glass uninstall: newer install present (${siblings.join(', ')}); nothing undone`); process.exit(0); }
  // VS Code removes an uninstalled extension from extensions.json before it runs this hook. If the id is still listed
  // (an update, a version mismatch on a development symlink, a reinstall), this is not an uninstall: leave everything.
  try {
    const index = JSON.parse(fs.readFileSync(path.join(path.dirname(extDir), 'extensions.json'), 'utf8')) as Array<{ identifier?: { id?: string } }>;
    if (index.some(e => String(e.identifier?.id ?? '').toLowerCase() === 'miloshampl.vs-glass')) { console.log('VS Glass uninstall: the extension is still installed (extensions.json lists it); nothing undone'); process.exit(0); }
  } catch { /* no index: fall through */ }
  const paths = JSON.parse(fs.readFileSync(pathsFile, 'utf8')) as { main?: string; stateDir?: string };
  if (paths.main && fs.existsSync(paths.main)) console.log(`VS Glass uninstall: out/main.js ${restoreMain(paths.main)}`);
  if (paths.stateDir && fs.existsSync(paths.stateDir)) { fs.rmSync(paths.stateDir, { recursive: true, force: true }); console.log(`VS Glass uninstall: deleted ${paths.stateDir}`); }
} catch (e) {
  console.log(`VS Glass uninstall: nothing to undo (${(e as Error).message})`);
}
