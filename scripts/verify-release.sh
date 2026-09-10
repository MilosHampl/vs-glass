#!/usr/bin/env bash
# VS Glass — verify the published release end to end, as a stranger would.
#   1. download the .vsix from the public release with `gh release download` AND with a plain unauthenticated curl
#   2. install it into a throw-away VS Code profile (isolated --user-data-dir / --extensions-dir)
#   3. check that all four themes are contributed (package.json inside the vsix) and that VS Code lists them
#   4. apply Layer 2 from a clean state with scripts/inject.sh against a pristine VS Code copy and confirm the marker block
# Usage: bash scripts/verify-release.sh v1.0.0 [/path/to/pristine/Visual Studio Code.app]
set -euo pipefail
TAG="${1:-v1.0.0}"; VER="${TAG#v}"
PRISTINE="${2:-$(cd "$(dirname "$0")/.." && pwd)/scratch/VSCode-pristine.app}"
CODE_CLI="$PRISTINE/Contents/Resources/app/bin/code"
TMP="$(mktemp -d /tmp/vs-glass-verify.XXXXXX)"; cd "$TMP"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1a. gh release download $TAG"
env -u GITHUB_TOKEN gh release download "$TAG" --repo MilosHampl/vs-glass --pattern '*.vsix' --dir gh >/dev/null && ls -la gh/
say "1b. unauthenticated curl of the browser download URL"
curl -sSL -o curl/vs-glass-$VER.vsix --create-dirs "https://github.com/MilosHampl/vs-glass/releases/download/$TAG/vs-glass-$VER.vsix" && ls -la curl/
cmp gh/vs-glass-$VER.vsix curl/vs-glass-$VER.vsix && echo "identical bytes via gh and curl: $(shasum -a 256 curl/vs-glass-$VER.vsix | cut -c1-16)…"

say "2. install into an isolated profile"
mkdir -p profile/user profile/ext
"$CODE_CLI" --user-data-dir "$TMP/profile/user" --extensions-dir "$TMP/profile/ext" --install-extension "curl/vs-glass-$VER.vsix" 2>&1 | tail -1
"$CODE_CLI" --user-data-dir "$TMP/profile/user" --extensions-dir "$TMP/profile/ext" --list-extensions --show-versions | grep -i vs-glass

say "3. themes contributed by the installed extension"
unzip -p "curl/vs-glass-$VER.vsix" extension/package.json | python3 -c "import json,sys; t=json.load(sys.stdin)['contributes']['themes']; [print('  ', x['label'], '->', x['path'], x['uiTheme']) for x in t]; assert len(t)==4, 'expected 4 themes'"
for f in glass-regular-dark glass-regular-light glass-clear glass-opaque; do unzip -l "curl/vs-glass-$VER.vsix" | grep -q "themes/$f-color-theme.json" && echo "   ok themes/$f-color-theme.json"; done

say "4. Layer 2 from a clean state (scripts/inject.sh against the pristine app copy)"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VSCODE_APP_PATH="$PRISTINE" bash "$REPO/scripts/inject.sh" status || true
VSCODE_APP_PATH="$PRISTINE" bash "$REPO/scripts/inject.sh" install --transparent
grep -c "VS-GLASS-START" "$PRISTINE/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css"
VSCODE_APP_PATH="$PRISTINE" bash "$REPO/scripts/inject.sh" status
echo
echo "Temp dir kept for inspection: $TMP (profile can be launched with the pristine app + --user-data-dir/--extensions-dir above)"
