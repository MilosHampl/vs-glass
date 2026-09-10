#!/usr/bin/env bash
# VS Glass — configure THIS Mac for the transparent-window setup (Vibrancy Continued + VS Glass), with backups.
#
# What it does (each step backs up first into <repo>/.backup/ so scripts/uninstall.sh can reverse it):
#   1. installs the packaged theme (dist/vs-glass-<version>.vsix) into the user's VS Code
#   2. rewrites ~/Library/Application Support/Code/User/settings.json:
#        - workbench.colorTheme = "Glass Regular Dark", workbench.experimental.modernUI = true
#        - vscode_vibrancy.theme = "Custom theme (use imports)", vscode_vibrancy.imports = [glass.css, glass-transparent.css]
#        - vscode_vibrancy.type = "under-window", vscode_vibrancy.windowMode kept, window.titleBarStyle = "custom"
#        - removes the old workbench.colorCustomizations block (it would override the theme's own keys)
#   3. backs up the app files Vibrancy patches (out/main.js, workbench.html, product.json) — the actual re-patch
#      ("Reload Vibrancy") is run by the maintainer from an isolated VS Code window, so the running window is untouched
# Usage: bash scripts/setup-local-vibrancy.sh [--dry-run]
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="$REPO/.backup"; mkdir -p "$BACKUP/app"
APP="${VSCODE_APP_PATH:-/Applications/Visual Studio Code.app}"
OUT="$APP/Contents/Resources/app/out"
CODE_CLI="$APP/Contents/Resources/app/bin/code"
USER_DIR="$HOME/Library/Application Support/Code/User"
SETTINGS="$USER_DIR/settings.json"
DRY=${1:-}
TS="$(date +%Y%m%d%H%M%S)"
say() { printf '\033[1m%s\033[0m\n' "$*"; }

say "0/3 Backups → $BACKUP"
cp "$SETTINGS" "$BACKUP/settings.json.$TS"; echo "   settings.json → settings.json.$TS"
for f in main.js vs/code/electron-browser/workbench/workbench.html; do
  if [ ! -f "$BACKUP/app/$(basename "$f")" ]; then cp "$OUT/$f" "$BACKUP/app/$(basename "$f")"; echo "   $f → .backup/app/"; else echo "   .backup/app/$(basename "$f") already exists (kept — it is the earliest state)"; fi
done
[ -f "$BACKUP/app/product.json" ] || { cp "$APP/Contents/Resources/app/product.json" "$BACKUP/app/product.json"; echo "   product.json → .backup/app/"; }
[ "$DRY" = "--dry-run" ] && { say "dry run — stopping before changes"; exit 0; }

say "1/3 Theme extension"
VSIX="$(ls -t "$REPO"/dist/vs-glass-*.vsix 2>/dev/null | head -1 || true)"
[ -n "$VSIX" ] || { echo "   no dist/*.vsix — run: npx @vscode/vsce package --no-dependencies --out dist/"; exit 1; }
"$CODE_CLI" --install-extension "$VSIX" --force 2>&1 | tail -1

say "2/3 settings.json"
python3 - "$SETTINGS" "$REPO" <<'PY'
import json, sys, re
path, repo = sys.argv[1], sys.argv[2]
raw = open(path).read()
# settings.json may contain comments/trailing commas; strip line comments conservatively
txt = re.sub(r'^\s*//.*$', '', raw, flags=re.M)
txt = re.sub(r',(\s*[}\]])', r'\1', txt)
s = json.loads(txt)
s['workbench.colorTheme'] = 'Glass Regular Dark'
s['workbench.experimental.modernUI'] = True
s['window.titleBarStyle'] = 'custom'
s['vscode_vibrancy.theme'] = 'Custom theme (use imports)'
s['vscode_vibrancy.preferredDarkTheme'] = 'Glass Regular Dark'
s['vscode_vibrancy.imports'] = [f'{repo}/glass/glass.css', f'{repo}/glass/glass-transparent.css']
s['vscode_vibrancy.type'] = 'under-window'
removed = s.pop('workbench.colorCustomizations', None)
json.dump(s, open(path, 'w'), indent=2, ensure_ascii=False)
print('   written; removed workbench.colorCustomizations:', 'yes (%d keys)' % len(removed) if removed else 'none present')
PY

say "3/3 Vibrancy patch"
echo "   Vibrancy inlines the imports when it patches; run the command 'Reload Vibrancy' in a VS Code window that"
echo "   uses these settings, then fully quit and restart VS Code. (The maintainer's build does this from an"
echo "   isolated window so the currently running VS Code is not restarted underneath you.)"
