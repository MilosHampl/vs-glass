#!/usr/bin/env bash
# Build the landing page's images from the repo's screenshots.
#
#   bash docs/assets/sync.sh
#
# Screenshots are captured at 2× into screenshots/ and screenshots/transparent/ (scripts/screenshots.mjs,
# scripts/transparent-shots.sh). Those are 2–3 MB PNGs each — fine as evidence in the repo, far too heavy for a
# web page — so this script writes web-sized JPEGs into docs/assets/shots/ and leaves the originals alone.
# It also extracts one real displacement map out of the generated CSS, which the page shows as the lens figure.
set -euo pipefail
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DEST/../.." && pwd)"
SHOTS="$DEST/shots"
mkdir -p "$SHOTS"
cd "$ROOT"

# web(<source png>, <name>, <width>)
web() {
  local src="$1" name="$2" width="$3"
  [ -f "$src" ] || { echo "  missing $src"; return 0; }
  sips -s format jpeg -s formatOptions 78 -Z "$width" "$src" --out "$SHOTS/$name.jpg" >/dev/null
  printf '  %-28s %4s KB\n' "$name.jpg" "$(( $(stat -f%z "$SHOTS/$name.jpg") / 1024 ))"
}

echo "hero + showcases (transparent-window composites):"
web screenshots/transparent/glass-regular-dark-hero.png     hero            1800
web screenshots/transparent/glass-regular-dark-palette.png  palette         1100
web screenshots/transparent/glass-regular-dark-suggest.png  suggest         1100
web screenshots/transparent/glass-regular-dark-menu.png     menu             900
web screenshots/transparent/glass-regular-dark-sidebar.png  sidebar          900
web screenshots/transparent/glass-regular-dark-terminal.png terminal        1100
web screenshots/transparent/glass-regular-dark-notifications.png notifications 1100
web screenshots/transparent/glass-regular-dark-settings.png settings        1100
web screenshots/transparent/glass-regular-dark-hover.png    hover           1100
web screenshots/transparent/glass-clear-hero.png            clear-hero      1100

echo "variants:"
for v in glass-regular-dark glass-regular-light glass-clear; do web "screenshots/$v-hero.png" "variant-${v#glass-}" 900; done
web screenshots/glass-opaque-layer1-hero.png variant-opaque 900

echo "tints:"
for t in graphite blue indigo violet teal mint rose amber; do web "screenshots/transparent/tints/hero-$t.png" "tint-$t" 640; done

echo "icon + social preview:"
for f in assets/icon-512.png assets/social-preview.png; do
  [ -f "$ROOT/$f" ] && { cp "$ROOT/$f" "$DEST/$(basename "$f")"; printf '  %-28s %4s KB\n' "$(basename "$f")" "$(( $(stat -f%z "$DEST/$(basename "$f")") / 1024 ))"; }
done

echo "lens figure (a real displacement map, straight out of glass/glass.css):"
python3 - "$ROOT/glass/glass.css" "$DEST/lens-map.png" <<'PY'
import base64, re, sys, urllib.parse
css = urllib.parse.unquote(open(sys.argv[1]).read())
m = re.search(r"--vsg-lens-widget:.*?feImage href='data:image/png;base64,([A-Za-z0-9+/=]+)'", css, re.S)
if not m: print("  no map found"); raise SystemExit
open(sys.argv[2], 'wb').write(base64.b64decode(m.group(1)))
print(f"  lens-map.png                {len(m.group(1))//1024} KB (the widget class's map: R/G = displacement, B = rim)")
PY
echo
echo "docs/assets is now $(du -sh "$DEST" | cut -f1)"
