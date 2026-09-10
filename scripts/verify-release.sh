#!/usr/bin/env bash
# VS Glass — verify the published release end to end, as a stranger would.
#   1. download the .vsix from the public release with `gh release download` AND with a plain unauthenticated curl
#   2. install it into a throw-away VS Code profile (isolated --user-data-dir / --extensions-dir)
#   3. check that all four themes are contributed (package.json inside the vsix) and that VS Code lists them
#   4. apply Layer 2 from a clean state with scripts/inject.sh against a pristine VS Code copy and confirm the marker block
# Usage: bash scripts/verify-release.sh v1.0.0 [/path/to/pristine/Visual Studio Code.app]
set -euo pipefail
TAG="${1:-v1.1.0}"; VER="${TAG#v}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # resolved before we cd into the temp dir
PRISTINE="${2:-$REPO/scratch/VSCode-pristine.app}"
CODE_CLI="$PRISTINE/Contents/Resources/app/bin/code"
TMP="$(mktemp -d /tmp/vs-glass-verify.XXXXXX)"; cd "$TMP"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1a. gh release download $TAG"
env -u GITHUB_TOKEN gh release download "$TAG" --repo MilosHampl/vs-glass --pattern '*.vsix' --dir gh >/dev/null && ls -la gh/
say "1b. unauthenticated curl of the browser download URL"
curl -sSL -o curl/vs-glass-$VER.vsix --create-dirs "https://github.com/MilosHampl/vs-glass/releases/download/$TAG/vs-glass-$VER.vsix" && ls -la curl/
cmp gh/vs-glass-$VER.vsix curl/vs-glass-$VER.vsix && echo "identical bytes via gh and curl: $(shasum -a 256 curl/vs-glass-$VER.vsix | cut -c1-16)…"
say "1c. Layer 2 assets attached to the release (glass.css, glass-wallpaper.css, 8 tints, 6 density, 2 lens, 3 aberration presets, glass-filters.svg)"
env -u GITHUB_TOKEN gh release download "$TAG" --repo MilosHampl/vs-glass --pattern 'glass*' --dir assets >/dev/null && ls assets/
n_css=$(ls assets/*.css | wc -l | tr -d ' '); [ "$n_css" -ge 21 ] || { echo "expected >= 21 CSS assets, got $n_css"; exit 1; }
[ -f assets/glass-filters.svg ] || { echo "glass-filters.svg missing"; exit 1; }
cmp assets/glass.css "$REPO/glass/glass.css" >/dev/null 2>&1 && echo "release glass.css is byte-identical to the working tree" || echo "note: release glass.css differs from the working tree (fine if the tree moved on)"

say "2. install into an isolated profile"
mkdir -p profile/user profile/ext
"$CODE_CLI" --user-data-dir "$TMP/profile/user" --extensions-dir "$TMP/profile/ext" --install-extension "curl/vs-glass-$VER.vsix" 2>&1 | tail -1
"$CODE_CLI" --user-data-dir "$TMP/profile/user" --extensions-dir "$TMP/profile/ext" --list-extensions --show-versions | grep -i vs-glass

say "3. themes contributed by the installed extension"
unzip -p "curl/vs-glass-$VER.vsix" extension/package.json | python3 -c "import json,sys; t=json.load(sys.stdin)['contributes']['themes']; [print('  ', x['label'], '->', x['path'], x['uiTheme']) for x in t]; assert len(t)==4, 'expected 4 themes'"
for f in glass-regular-dark glass-regular-light glass-clear glass-opaque; do unzip -l "curl/vs-glass-$VER.vsix" | grep -q "themes/$f-color-theme.json" && echo "   ok themes/$f-color-theme.json" || { echo "   FAIL: themes/$f-color-theme.json missing"; exit 1; }; done

say "4. Manual CSS route (scripts/inject.sh) round-trips against the pristine app copy and leaves it byte-exact"
CSS="$PRISTINE/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css"
before="$(shasum -a 256 "$CSS" | cut -d' ' -f1)"
VSCODE_APP_PATH="$PRISTINE" bash "$REPO/scripts/inject.sh" install --wallpaper --tint indigo --density 150 --aberration strong
[ "$(grep -c "VS-GLASS-START" "$CSS")" = "1" ] && echo "   ok marker block present after install" || { echo "   FAIL: marker block missing after install"; exit 1; }
VSCODE_APP_PATH="$PRISTINE" bash "$REPO/scripts/inject.sh" uninstall
[ "$(shasum -a 256 "$CSS" | cut -d' ' -f1)" = "$before" ] && echo "   ok workbench stylesheet byte-exact after uninstall" || { echo "   FAIL: stylesheet differs after uninstall"; exit 1; }
say "5. Extension hook assets are in the package"
unzip -l "curl/vs-glass-$VER.vsix" | grep -q "extension/out/extension.js" && echo "   ok out/extension.js" || { echo "   FAIL: out/extension.js missing from the vsix"; exit 1; }
unzip -l "curl/vs-glass-$VER.vsix" | grep -q "extension/glass/webview-colors.json" && echo "   ok glass/webview-colors.json" || { echo "   FAIL: glass/webview-colors.json missing from the vsix"; exit 1; }
unzip -l "curl/vs-glass-$VER.vsix" | grep -q "extension/out/patch.js" && echo "   ok out/patch.js" || { echo "   FAIL: out/patch.js missing from the vsix"; exit 1; }
say "6. The window hook round-trips byte-exact against the pristine app's out/main.js"
MAIN="$PRISTINE/Contents/Resources/app/out/main.js"
node -e '
const fs = require("fs"); const p = require(process.argv[1]); const main = process.argv[2];
const orig = fs.readFileSync(main, "utf8"); const clean = p.stripHook(orig);
const anchors = clean.split(p.OPTIONS_ANCHOR).length - 1;
if (anchors !== 1) { console.log("   FAIL: window-options anchor found " + anchors + " times in the pristine main.js (expected 1)"); process.exit(1); }
const patched = p.applyHook(clean, p.hookText("verify")); if (!patched.spliced) { console.log("   FAIL: splice not applied"); process.exit(1); }
if (p.stripHook(patched.text) !== clean) { console.log("   FAIL: stripHook(applyHook(x)) !== x"); process.exit(1); }
fs.writeFileSync("/tmp/vsg-verify-hook.mjs", p.hookText("verify")); fs.writeFileSync("/tmp/vsg-verify-hook.cjs", p.hookText("verify"));
console.log("   ok anchor ×1, splice applied, strip is the byte-exact inverse");
' "$REPO/out/patch.js" "$MAIN" || exit 1
node --check /tmp/vsg-verify-hook.mjs && node --check /tmp/vsg-verify-hook.cjs && echo "   ok hook parses as ES module and as CommonJS" || { echo "   FAIL: hook does not parse"; exit 1; }
echo
echo "Temp dir kept for inspection: $TMP (profile can be launched with the pristine app + --user-data-dir/--extensions-dir above)"
