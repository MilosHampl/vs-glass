/**
 * VS Glass — the window slab (macOS 26 and newer).
 *
 * `vsGlass.windowMaterial: "liquid-glass"` (the `auto` default where supported) makes the window itself a plane of the
 * system's Liquid Glass: a small helper process, bin/vs-glass-helper, keeps a real glass window directly under every
 * window of this VS Code, so whatever is live behind it — other windows, video, the desktop — is refracted at the rim
 * and colour-split, the way the in-window rims bend the workbench. Nothing is screen-captured; the OS composites it.
 *
 * Why a helper: VS Code's main process runs with library validation on, so an extension cannot load native code into
 * it, and the compositor's glass exists only as native views. The helper is detached (it outlives this extension
 * host, since every VS Code window has one of those) and exits when VS Code does, when the parameters file says
 * `enabled: false`, or when the file is gone. One helper serves one VS Code instance; its lock makes later starts exit.
 *
 * This module: support check, parameters from the settings, the parameters file (the helper watches it), and start/stop.
 */
import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const LIQUID_GLASS = 'liquid-glass';
const HELPER = 'vs-glass-helper';
/** The window's corner radius — keep equal to `radius.window` in src/palette.ts (`--vsg-radius-window`). */
export const WINDOW_RADIUS = 20;

export interface WindowGlassParams {
  enabled: boolean;
  radius: number;           // corner radius of the slab, pt
  margin: number;           // the slab window is this much larger than the VS Code window, so the rim can sample beyond it
  refraction: number;       // rim refraction amount (Apple's clear glass: -60)
  refractionHeight: number; // rim width the refraction acts over, pt
  chroma: number;           // chromatic aberration at the rim, pt (0 = off)
  chromaBand: number;       // width of each aberration band, pt
  chromaLevels: number;     // number of bands, each further one proportionally weaker
}

/** The window slab needs the desktop app on macOS 26 (Darwin 25) or newer. */
export function windowGlassSupport(): { ok: boolean; why: string } {
  if (process.platform !== 'darwin') return { ok: false, why: 'macOS only' };
  const major = Number(os.release().split('.')[0]);
  if (!(major >= 25)) return { ok: false, why: `it needs macOS 26 or newer (this is Darwin ${os.release()})` };
  return { ok: true, why: '' };
}

/** `auto` is Liquid Glass where the OS can do it and the light vibrancy blur elsewhere. */
export const resolveMaterial = (material: string) => material === 'auto' ? (windowGlassSupport().ok ? LIQUID_GLASS : 'hud') : material;

// The same three lens strengths and four aberration strengths as the in-window rims, in the slab's units.
const REFRACTION: Record<string, [amount: number, height: number]> = { soft: [-40, 16], default: [-60, 20], strong: [-100, 28] };
const CHROMA: Record<string, [pt: number, band: number, levels: number]> = { off: [0, 12, 0], subtle: [0.8, 8, 1], default: [1.5, 12, 1], strong: [2.5, 16, 2] };

export function windowGlassParams(enabled: boolean, lens: string, aberration: string): WindowGlassParams {
  const [refraction, refractionHeight] = REFRACTION[lens] ?? REFRACTION.default;
  const [chroma, chromaBand, chromaLevels] = CHROMA[aberration] ?? CHROMA.default;
  return { enabled, radius: WINDOW_RADIUS, margin: 40, refraction, refractionHeight, chroma, chromaBand, chromaLevels };
}

export const paramsFile = (stateDir: string) => path.join(stateDir, 'window-glass.json');
export const helperLogFile = (stateDir: string) => path.join(stateDir, 'window-glass.log');
const pidFile = (stateDir: string) => path.join(stateDir, 'window-glass.pid');

/** The pid of the helper serving this VS Code, when one is alive. */
export function helperPid(stateDir: string): number | null {
  try {
    const pid = Number(fs.readFileSync(pidFile(stateDir), 'utf8').trim());
    if (!pid) return null;
    process.kill(pid, 0); // throws when the process is gone
    return pid;
  } catch { return null; }
}

let child: cp.ChildProcess | undefined;
let lastStart = 0;

/** Start the helper unless one already serves this VS Code (its own lock decides; a second start exits at once). */
export function ensureHelper(extensionPath: string, stateDir: string, log: (m: string) => void, onUnsupported: (why: string) => void): void {
  if (child && child.exitCode === null && child.signalCode === null) return;   // the one we started is alive (a signalled child has exitCode null too)
  if (helperPid(stateDir)) return;                // another window's extension host started one
  if (Date.now() - lastStart < 2000) return;
  lastStart = Date.now();
  const bin = path.join(extensionPath, 'bin', HELPER);
  if (!fs.existsSync(bin)) { log(`window glass: ${bin} is missing from this install`); return; }
  try { fs.chmodSync(bin, 0o755); } catch { /* a read-only extension folder keeps the bit it was unpacked with */ }
  let logFd: number | undefined;
  try { logFd = fs.openSync(helperLogFile(stateDir), 'a'); } catch { logFd = undefined; }
  try {
    const proc = cp.spawn(bin, ['--pid', String(process.ppid), '--state', stateDir], { detached: true, stdio: ['ignore', logFd ?? 'ignore', logFd ?? 'ignore'] });
    proc.unref();
    child = proc;
    log(`window glass: started ${HELPER} ${proc.pid} for VS Code ${process.ppid} (log: ${helperLogFile(stateDir)})`);
    proc.on('exit', (code, signal) => {
      if (child === proc) child = undefined;
      log(`window glass: ${HELPER} ${proc.pid} exited with ${code ?? signal}`);
      if (code === 3) onUnsupported(lastLine(helperLogFile(stateDir)));
    });
    proc.on('error', e => log(`window glass: could not start ${HELPER}: ${e.message}`));
  } catch (e: any) {
    log(`window glass: could not start ${HELPER}: ${e?.message ?? e}`);
  } finally {
    if (logFd !== undefined) { try { fs.closeSync(logFd); } catch { /* the child holds its own copy */ } }
  }
}

/** Stop the helper: the parameters file already says off (writeState); also end the process right away. */
export function stopHelper(stateDir: string): void {
  const pid = helperPid(stateDir);
  if (pid) { try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ } }
  child = undefined;
}

function lastLine(file: string): string {
  try { const lines = fs.readFileSync(file, 'utf8').trim().split('\n'); return lines[lines.length - 1].replace(/^\S+\s/, ''); } catch { return ''; }
}
