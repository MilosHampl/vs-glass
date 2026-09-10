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
# Nothing else outside the repository was modified. Test copies of VS Code live in <repo>/scratch (safe to delete).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="$REPO/.backup"
APP="${VSCODE_APP_PATH:-/Applications/Visual Studio Code.app}"
OUT="$APP/Contents/Resources/app/out"
CODE_CLI="$APP/Contents/Resources/app/bin/code"
USER_DIR="$HOME/Library/Application Support/Code/User"

say() { printf '\033[1m%s\033[0m\n' "$*"; }

say "1/4 Theme extension"
if [ -x "$CODE_CLI" ] && "$CODE_CLI" --list-extensions 2>/dev/null | grep -qi '^MilosHampl\.vs-glass$'; then
  "$CODE_CLI" --uninstall-extension MilosHampl.vs-glass && echo "   uninstalled MilosHampl.vs-glass"
else
  echo "   not installed — nothing to do"
fi

say "2/4 settings.json"
latest_settings="$(ls -t "$BACKUP"/settings.json.* 2>/dev/null | head -1 || true)"
if [ -n "$latest_settings" ]; then
  cp "$USER_DIR/settings.json" "$BACKUP/settings.json.pre-uninstall.$(date +%Y%m%d%H%M%S)"
  cp "$latest_settings" "$USER_DIR/settings.json"
  echo "   restored $(basename "$latest_settings") → $USER_DIR/settings.json"
else
  echo "   no backup found in $BACKUP — settings.json left untouched"
fi

say "3/4 VS Code app files patched by Vibrancy Continued (main.js, workbench.html, product.json)"
if [ -d "$BACKUP/app" ]; then
  for f in main.js vs/code/electron-browser/workbench/workbench.html; do
    if [ -f "$BACKUP/app/$(basename "$f")" ]; then cp "$BACKUP/app/$(basename "$f")" "$OUT/$f" && echo "   restored $f"; fi
  done
  [ -f "$BACKUP/app/product.json" ] && cp "$BACKUP/app/product.json" "$APP/Contents/Resources/app/product.json" && echo "   restored product.json"
else
  echo "   no $BACKUP/app — app files left untouched"
fi

say "4/4 inject.sh patch (only if it was ever applied to this app)"
if [ -f "$OUT/vs/workbench/workbench.desktop.main.css.vs-glass-backup" ]; then
  bash "$REPO/scripts/inject.sh" uninstall
else
  echo "   not applied — nothing to do"
fi

echo
say "Done. Fully quit VS Code (⌘Q) and start it again for the restored files to take effect."
echo "Test copies of VS Code and isolated profiles are under $REPO/scratch — delete the folder to reclaim ~3 GB."
