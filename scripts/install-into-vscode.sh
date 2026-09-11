#!/usr/bin/env bash
# VS Glass — install into a real VS Code, from a shell, in one step.
#
#   bash scripts/install-into-vscode.sh                 # install + set a Glass theme
#   bash scripts/install-into-vscode.sh --dry-run       # say what it would do, change nothing
#   bash scripts/install-into-vscode.sh --theme "Glass Clear" --app "/Applications/VSCodium.app"
#
# Everything the GUI flow does (install the .vsix, pick a theme, answer Apply), plus the one thing the extension
# deliberately will not do for you: take another window patcher out of VS Code first. Vibrancy Continued and VS Glass
# both patch the same startup file, so they fight over the window.
#
# What it changes, in this order, and how to undo it:
#   1. <repo>/.backup/real-app-<timestamp>/   — copies of every file below, before anything is written
#   2. VS Code's out/main.js                  — removes a Vibrancy Continued block if present, then adds the VS Glass
#                                               hook (also backed up in place as main.js.vs-glass-backup)
#   3. VS Code's workbench.html               — removes Vibrancy's CSP token and VERIFIES the result against the
#                                               checksum in product.json, so it is provably the stock file again
#   4. out/vscode-vibrancy-runtime-v6/        — Vibrancy's runtime folder inside the app, deleted if present
#   5. the Vibrancy Continued extension       — uninstalled (its folder removed so its uninstall hook cannot later
#                                               restore its own copy of main.js over the VS Glass hook)
#   6. ~/.vscode/extensions/                  — VS Glass installed with VS Code's own CLI
#   7. your user settings.json                — workbench.colorTheme set to a Glass theme (nothing else touched)
#   8. <user-data>/vs-glass/                  — glass.css, state.json and window-glass.json written up front, so the
#                                               very first window after the restart is already glass
#
# `bash scripts/uninstall.sh` reverses all of it. Quit VS Code fully (⌘Q) and reopen once when this finishes.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
APP="/Applications/Visual Studio Code.app"
THEME="Glass Regular Dark"
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --app) APP="$2"; shift 2 ;;
    --theme) THEME="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown option $1"; exit 64 ;;
  esac
done

say()  { printf '\033[1m==>\033[0m %s\n' "$*"; }
ok()   { printf '    ok   %s\n' "$*"; }
warn() { printf '    \033[33mnote\033[0m %s\n' "$*"; }
die()  { printf '    \033[31mFAIL\033[0m %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then printf '    would: %s\n' "$*"; else eval "$@"; fi; }

RES="$APP/Contents/Resources/app"
MAIN="$RES/out/main.js"
WB="$RES/out/vs/code/electron-browser/workbench/workbench.html"
CLI="$RES/bin/code"
# VSG_USER_DIR / VSG_EXT_DIR let the test harness point this at a scratch profile; unset means the real one
USER_DIR="${VSG_USER_DIR:-$HOME/Library/Application Support/Code/User}"
DATA_DIR="$(dirname "$USER_DIR")"
EXT_ROOT="${VSG_EXT_DIR:-$HOME/.vscode/extensions}"
EXT_ARG=""; [ -n "${VSG_EXT_DIR:-}" ] && EXT_ARG="--extensions-dir '$VSG_EXT_DIR'"
[ -f "$MAIN" ] || die "no VS Code at $APP (pass --app)"
[ -x "$CLI" ] || die "no VS Code CLI at $CLI"
VSIX="$(ls -t "$REPO"/vs-glass-*.vsix 2>/dev/null | head -1 || true)"
[ -n "$VSIX" ] || die "no vs-glass-*.vsix in $REPO — run 'npm run package' or download one from the releases page"
[ -w "$MAIN" ] || die "$MAIN is not writable by you. Run: sudo chown -R \"\$USER\" \"$APP\""

say "VS Code $("$CLI" --version 2>/dev/null | head -1) at $APP"
echo "    package: $(basename "$VSIX")"
[ "$DRY" = 1 ] && warn "dry run: nothing will be written"

# ---- 1. back up everything this script can touch -----------------------------------------------------------------
STAMP="$(date +%Y%m%d-%H%M%S)"
BK="$REPO/.backup/real-app-$STAMP"
say "Backing up into $BK"
run "mkdir -p '$BK'"
for f in "$MAIN" "$WB" "$RES/product.json" "$USER_DIR/settings.json" "$EXT_ROOT/extensions.json"; do
  [ -f "$f" ] || continue
  run "cp '$f' '$BK/$(basename "$f")'"
  ok "$(basename "$f")"
done

# ---- 2. Vibrancy Continued: out of the app --------------------------------------------------------------------------
if grep -q "VSCODE-VIBRANCY-START" "$MAIN" 2>/dev/null; then
  say "Removing the Vibrancy Continued patch (it patches the same file and would fight over the window)"
  if [ "$DRY" = 1 ]; then
    warn "would strip the VSCODE-VIBRANCY block from main.js and the CSP token from workbench.html"
  else
    python3 - "$MAIN" <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding='utf8').read()
a, b = '/* !! VSCODE-VIBRANCY-START !! */', '/* !! VSCODE-VIBRANCY-END !! */'
i, j = s.index(a), s.index(b) + len(b)
out = s[:i].rstrip('\n') + '\n' + s[j:].lstrip('\n')
open(p, 'w', encoding='utf8').write(out)
print(f"    ok   stripped {j - i} characters from main.js")
PY
  fi
else
  ok "no Vibrancy patch in main.js"
fi

# workbench.html is checksummed by VS Code, so the restore can be proven rather than hoped for
if grep -q "VscodeVibrancyContinued" "$WB" 2>/dev/null; then
  if [ "$DRY" = 1 ]; then
    warn "would remove the VscodeVibrancyContinued CSP token from workbench.html and verify the checksum"
  else
    python3 - "$WB" "$RES/product.json" <<'PY'
import base64, hashlib, json, sys
wb, prod = sys.argv[1], sys.argv[2]
original = open(wb, encoding='utf8').read()
fixed = original.replace('trusted-types VscodeVibrancyContinued', 'trusted-types')
digest = base64.b64encode(hashlib.sha256(fixed.encode('utf8')).digest()).decode().rstrip('=')
want = json.load(open(prod))['checksums']['vs/code/electron-browser/workbench/workbench.html']
if digest != want:
    print(f"    FAIL workbench.html would not match VS Code's own checksum ({digest} != {want}); left untouched", file=sys.stderr)
    raise SystemExit(1)
open(wb, 'w', encoding='utf8').write(fixed)
print("    ok   workbench.html restored and verified byte-exact against product.json's checksum")
PY
  fi
else
  ok "no Vibrancy token in workbench.html"
fi

if [ -d "$RES/out/vscode-vibrancy-runtime-v6" ]; then
  run "rm -rf '$RES/out/vscode-vibrancy-runtime-v6'"
  ok "removed Vibrancy's runtime folder from the app"
fi

if "$CLI" $EXT_ARG --list-extensions 2>/dev/null | grep -qi "illixion.vscode-vibrancy-continued"; then
  say "Uninstalling the Vibrancy Continued extension"
  run "'$CLI' $EXT_ARG --uninstall-extension illixion.vscode-vibrancy-continued >/dev/null 2>&1 || true"
  # its vscode:uninstall hook would restore its own copy of main.js at the next start, over the VS Glass hook
  for d in "$EXT_ROOT"/illixion.vscode-vibrancy-continued-*; do
    [ -d "$d" ] || continue
    run "rm -rf '$d'"
    ok "removed $(basename "$d") (its uninstall hook would have restored its main.js later)"
  done
fi

# ---- 3. install VS Glass --------------------------------------------------------------------------------------------
say "Installing $(basename "$VSIX")"
run "'$CLI' $EXT_ARG --install-extension '$VSIX' --force 2>&1 | grep -vi deprecat | tail -2"

EXT_DIR="$(ls -td "$EXT_ROOT"/miloshampl.vs-glass-* 2>/dev/null | head -1 || true)"
if [ "$DRY" = 0 ]; then
  [ -n "$EXT_DIR" ] || die "the extension folder did not appear in $EXT_ROOT"
  ok "$(basename "$EXT_DIR")"
fi

# ---- 4. theme ---------------------------------------------------------------------------------------------------------
say "Setting the colour theme to \"$THEME\""
if [ "$DRY" = 1 ]; then
  warn "would set workbench.colorTheme in $USER_DIR/settings.json"
else
  python3 - "$USER_DIR/settings.json" "$THEME" <<'PY'
import json, re, sys
p, theme = sys.argv[1], sys.argv[2]
try:
    s = open(p, encoding='utf8').read()
except FileNotFoundError:
    s = '{\n}\n'
if re.search(r'"workbench\.colorTheme"\s*:', s):
    s = re.sub(r'("workbench\.colorTheme"\s*:\s*)"[^"]*"', lambda m: m.group(1) + json.dumps(theme), s, count=1)
    how = 'updated'
else:
    s = s.replace('{', '{\n  "workbench.colorTheme": %s,' % json.dumps(theme), 1)
    how = 'added'
open(p, 'w', encoding='utf8').write(s)
print(f"    ok   {how} workbench.colorTheme (the rest of the file is untouched, comments and all)")
PY
fi

# ---- 5. the hook and the state, so the first window is already glass ---------------------------------------------------
say "Applying the VS Glass hook to out/main.js"
if [ "$DRY" = 1 ]; then
  warn "would write the hook block and <user-data>/vs-glass/{glass.css,state.json,window-glass.json}"
else
  node -e "
const fs = require('fs'), path = require('path');
const { applyHook, ensureBackup, hookText, hasHook, writeAtomic } = require('$REPO/out/patch.js');
const main = '$MAIN';
const before = fs.readFileSync(main, 'utf8');
if (hasHook(before)) { console.log('    ok   the hook is already in place'); }
else {
  ensureBackup(main, before);
  const r = applyHook(before, hookText());
  writeAtomic(main, r.text);
  console.log('    ok   hook written (creation-time transparency spliced in: ' + r.spliced + ')');
}
const dir = path.join('$DATA_DIR', 'vs-glass');
fs.mkdirSync(dir, { recursive: true });
const version = require('$REPO/package.json').version;
const css = fs.readFileSync('$REPO/glass/glass.css', 'utf8')
  + '\n/* VS Glass settings (vsGlass.density, vsGlass.widgetDensity) */\n'
  + '.monaco-workbench[class*=\"-vs-glass-themes-glass-\"]:not([class*=\"glass-opaque\"]):not(.vs-glass-off) {\n  --vsg-density: 1.000;\n  --vsg-widget-density: 1.000;\n}\n';
fs.writeFileSync(path.join(dir, 'glass.css'), css);
fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ transparent: true, material: 'none', background: '#1f1f1f', version }, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'window-glass.json'), JSON.stringify({ enabled: process.platform === 'darwin', radius: 20, margin: 40, refraction: -60, refractionHeight: 20, chroma: 1.5, chromaBand: 12, chromaLevels: 1 }, null, 2) + '\n');
console.log('    ok   wrote ' + dir + '/{glass.css,state.json,window-glass.json}');
"
fi

echo
say "Done."
echo "    Quit VS Code completely (⌘Q — a window reload is not enough) and open it again."
echo "    Then: VS Glass: Status  shows the hook, the CSS and the window slab; VS Glass: Settings has every knob."
echo "    To undo everything: bash $REPO/scripts/uninstall.sh   (backups: $BK)"
