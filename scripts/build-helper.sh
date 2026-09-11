#!/usr/bin/env bash
# Build bin/vs-glass-helper — the window-slab helper (native/vs-glass-helper.swift) — as a universal, ad-hoc-signed
# binary. macOS only (needs Xcode or the Command Line Tools). The version string is taken from package.json.
#
#   scripts/build-helper.sh            build
#   scripts/build-helper.sh --check    build to a temp dir and only report whether bin/ is up to date (CI)
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(node -p "require('./package.json').version")
OUT=bin/vs-glass-helper
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
sed "s/^let VERSION = \".*\"/let VERSION = \"$VER\"/" native/vs-glass-helper.swift > "$TMP/vs-glass-helper.swift"
for arch in arm64 x86_64; do
  xcrun swiftc -swift-version 5 -O -target "$arch-apple-macos13.0" -o "$TMP/helper-$arch" "$TMP/vs-glass-helper.swift"
done
lipo -create -output "$TMP/vs-glass-helper" "$TMP/helper-arm64" "$TMP/helper-x86_64"
strip -x "$TMP/vs-glass-helper"
codesign --force --sign - --identifier com.miloshampl.vs-glass.helper "$TMP/vs-glass-helper"
if [ "${1:-}" = "--check" ]; then
  built=$("$TMP/vs-glass-helper" --version); shipped=$("$OUT" --version 2>/dev/null || echo none)
  echo "built $built, shipped $shipped ($(du -k "$OUT" 2>/dev/null | cut -f1) KB)"
  [ "$built" = "$shipped" ] || { echo "bin/vs-glass-helper is out of date: run scripts/build-helper.sh and commit it"; exit 1; }
  exit 0
fi
mkdir -p bin
cp "$TMP/vs-glass-helper" "$OUT"
chmod 755 "$OUT"
echo "built $OUT ($("$OUT" --version), $(du -k "$OUT" | cut -f1) KB): $(lipo -archs "$OUT")"
