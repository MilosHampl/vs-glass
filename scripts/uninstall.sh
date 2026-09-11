#!/usr/bin/env bash
# VS Glass — reverse everything the VS Glass build touched on THIS machine (Milos Hampl's Mac).
#
# What the build changed, and what this script undoes (each step is skipped if the backup is absent):
#   1. Installed the theme extension MilosHampl.vs-glass into the user's VS Code   → uninstalls it
#   2. Edited ~/Library/Application Support/Code/User/settings.json               → restores .backup/settings.json.<ts>
#      (theme, workbench.experimental.modernUI, vscode_vibrancy.* pointing at glass/glass.css,
#       removal of the old workbench.colorCustomizations block)
#   3. Re-ran Vibrancy Continued's patch so the VS Glass CSS is inlined in the app's main.js  → restores the
#      three checksummed files from .backup/app/ byte-exact (main.js, workbench.html, product.json), i.e. the
#      previous Vibrancy state (Tokyo Night Storm), not a pristine VS Code
#   4. If scripts/inject.sh was used on the real app                              → runs `inject.sh uninstall`
#   5. If the VS Glass extension (1.1.0) applied its window hook                   → restores out/main.js from its
#      .vs-glass-backup, deletes <user-data>/vs-glass/ and removes the [Glass …] blocks it added to
#      workbench.colorCustomizations (this is exactly what the "VS Glass: Remove" command does)
#   6. If the window-slab helper (1.2.0+, bin/vs-glass-helper) is still running                 → stops it (it normally exits
#      with VS Code; it only ever owned windows of its own, nothing on disk)
# Nothing else outside the repository was modified. Test copies of VS Code live in <repo>/scratch (safe to delete).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="$REPO/.backup"
APP="${VSCODE_APP_PATH:-/Applications/Visual Studio Code.app}"
OUT="$APP/Contents/Resources/app/out"
CODE_CLI="$APP/Contents/Resources/app/bin/code"
USER_DIR="$HOME/Library/Application Support/Code/User"

say() { printf '\033[1m%s\033[0m\n' "$*"; }

say "1/5 Theme extension"
if [ -x "$CODE_CLI" ] && "$CODE_CLI" --list-extensions 2>/dev/null | grep -qi '^MilosHampl\.vs-glass$'; then
  "$CODE_CLI" --uninstall-extension MilosHampl.vs-glass && echo "   uninstalled MilosHampl.vs-glass"
else
  echo "   not installed — nothing to do"
fi

say "2/5 settings.json"
latest_settings="$(ls -t "$BACKUP"/settings.json.* 2>/dev/null | head -1 || true)"
if [ -n "$latest_settings" ]; then
  cp "$USER_DIR/settings.json" "$BACKUP/pre-uninstall-settings.json.$(date +%Y%m%d%H%M%S)"
  cp "$latest_settings" "$USER_DIR/settings.json"
  echo "   restored $(basename "$latest_settings") → $USER_DIR/settings.json"
else
  echo "   no backup found in $BACKUP — settings.json left untouched"
fi

say "3/5 VS Code app files patched by Vibrancy Continued (main.js, workbench.html, product.json)"
if [ -d "$BACKUP/app" ]; then
  for f in main.js vs/code/electron-browser/workbench/workbench.html; do
    if [ -f "$BACKUP/app/$(basename "$f")" ]; then cp "$BACKUP/app/$(basename "$f")" "$OUT/$f" && echo "   restored $f"; fi
  done
  [ -f "$BACKUP/app/product.json" ] && cp "$BACKUP/app/product.json" "$APP/Contents/Resources/app/product.json" && echo "   restored product.json"
else
  echo "   no $BACKUP/app — app files left untouched"
fi

say "4/5 inject.sh patch (only if it was ever applied to this app)"
if [ -f "$OUT/vs/workbench/workbench.desktop.main.css.vs-glass-backup" ]; then
  bash "$REPO/scripts/inject.sh" uninstall
else
  echo "   not applied — nothing to do"
fi

say "5/5 VS Glass extension hook (out/main.js), its <user-data>/vs-glass folder and the [Glass …] colour blocks"
if [ -f "$OUT/main.js.vs-glass-backup" ]; then
  cp -p "$OUT/main.js.vs-glass-backup" "$OUT/main.js" && rm -f "$OUT/main.js.vs-glass-backup" && echo "   restored out/main.js byte-exact"
elif grep -q "VS-GLASS-WINDOW-START" "$OUT/main.js" 2>/dev/null; then
  python3 - "$OUT/main.js" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read(); a, b = '/* VS-GLASS-WINDOW-START */', '/* VS-GLASS-WINDOW-END */'
i, j = s.find(a), s.find(b)
while i >= 0 and j > i:
    before, after = s[:i], s[j + len(b):]
    if after.startswith('\n'): after = after[1:]
    if before.endswith('\n'): before = before[:-1]
    s = before + after; i, j = s.find(a), s.find(b)
s = s.replace(',...(globalThis.__vsGlassWindowOptions?globalThis.__vsGlassWindowOptions():{}),experimentalDarkMode:!0}', ',experimentalDarkMode:!0}')
open(p, 'w').write(s)
PY
  echo "   stripped the hook block and the window-options splice from out/main.js (no backup was present)"
else
  echo "   hook not applied — nothing to do"
fi
DATA_DIR="$(dirname "$USER_DIR")"
if [ -d "$DATA_DIR/vs-glass" ]; then rm -rf "$DATA_DIR/vs-glass" && echo "   deleted $DATA_DIR/vs-glass"; fi
if [ -f "$USER_DIR/settings.json" ] && grep -q '"\[Glass ' "$USER_DIR/settings.json"; then
  cp "$USER_DIR/settings.json" "$BACKUP/pre-uninstall-settings.json.$(date +%Y%m%d%H%M%S)" && echo "   backed up settings.json before removing the [Glass …] blocks"
  python3 - "$USER_DIR/settings.json" <<'PY'
import json, re, sys
p = sys.argv[1]; raw = open(p).read()
try:
    s = json.loads(re.sub(r',(\s*[}\]])', r'\1', re.sub(r'^\s*//.*$', '', raw, flags=re.M)))
except Exception as e:
    print('   settings.json not parseable, left untouched:', e); sys.exit(0)
cc = s.get('workbench.colorCustomizations')
if isinstance(cc, dict):
    for k in [k for k in cc if re.match(r'^\[Glass (Regular Dark|Regular Light|Clear)\]$', k)]: del cc[k]
    if not cc: del s['workbench.colorCustomizations']
    json.dump(s, open(p, 'w'), indent=2, ensure_ascii=False); open(p, 'a').write('\n'); print('   removed the [Glass …] colour blocks from settings.json')
PY
fi

# 6. the window-slab helper: a detached process the 1.2.0 extension starts; it dies with VS Code, but make sure
if pkill -x vs-glass-helper 2>/dev/null; then say "stopped the vs-glass-helper process"; fi

echo
say "Done. Fully quit VS Code (⌘Q) and start it again for the restored files to take effect."
echo "Test copies of VS Code and isolated profiles are under $REPO/scratch — delete the folder to reclaim ~3 GB."
