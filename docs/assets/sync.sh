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
# the composites carry a burned-in caption line; a centred crop takes it off (and the same strip of wallpaper on top)
for t in graphite blue indigo violet teal mint rose amber; do
  src="screenshots/transparent/tints/hero-$t.png"
  [ -f "$src" ] || continue
  h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/{print $2}')
  w=$(sips -g pixelWidth  "$src" | awk '/pixelWidth/{print $2}')
  sips -c $((h - 120)) "$w" "$src" --out "$SHOTS/.tint-$t.png" >/dev/null
  web "$SHOTS/.tint-$t.png" "tint-$t" 640
  rm -f "$SHOTS/.tint-$t.png"
done

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

# ---- the live demo on the landing page -------------------------------------------------------------------------------
# The page's draggable glass pane runs the REAL filters, so they are lifted verbatim out of the generated CSS rather
# than re-implemented: the same displacement maps, the same per-channel offsets, the same rim tokens.
echo "live demo (real lens filters lifted out of glass/glass.css):"
sips -s format jpeg -s formatOptions 72 -Z 1600 scratch/wall-cliffs-2880.jpg --out "$SHOTS/wall.jpg" >/dev/null
printf '  %-28s %4s KB\n' "wall.jpg" "$(( $(stat -f%z "$SHOTS/wall.jpg") / 1024 ))"
python3 - "$ROOT" "$DEST/demo.css" <<'PY'
import re, sys
root, out = sys.argv[1], sys.argv[2]
def block(path, selector_contains):
    css = open(path, encoding='utf8').read()
    # the generated files are one rule per theme; take the Glass Regular Dark one
    for m in re.finditer(r'([^\n{}]+)\{([^{}]*)\}', css, re.S):
        if selector_contains in m.group(1):
            return m.group(2)
    raise SystemExit(f"no {selector_contains} block in {path}")
def var(body, name):
    m = re.search(rf'--vsg-{name}:\s*(.+?);\s*(?:\n|$)', body, re.S)
    return m.group(1).strip() if m else None
base   = block(f'{root}/glass/glass.css', 'glass-regular-dark')
whole  = open(f'{root}/glass/glass.css', encoding='utf8').read()  # the rim gradient lives in the shared guard block
soft   = block(f'{root}/glass/lens/glass-lens-soft.css', 'glass-regular-dark')
strong = block(f'{root}/glass/lens/glass-lens-strong.css', 'glass-regular-dark')
chroma = block(f'{root}/glass/aberration/glass-aberration-strong.css', 'glass-regular-dark')
pairs = [
    ('lens-card',          var(base, 'lens-widget')),
    ('lens-card-soft',     var(soft, 'lens-widget')),
    ('lens-card-strong',   var(strong, 'lens-widget')),
    ('lens-card-chroma',   var(chroma, 'lens-widget')),
    ('lens-mag',           var(base, 'lens-slider')),
    ('lens-mag-strong',    var(strong, 'lens-slider')),
    ('lens-mag-chroma',    var(chroma, 'lens-slider')),
    ('edge',               var(whole, 'edge-widget')),
    ('spec-rgb',           var(base, 'spec-rgb')),
    ('widget-spec-hi',     var(base, 'widget-spec-hi')),
    ('widget-spec-mid',    var(base, 'widget-spec-mid')),
    ('widget-spec-lo',     var(base, 'widget-spec-lo')),
    ('radius-widget',      var(base, 'radius-widget') or '14px'),
]
missing = [n for n, v in pairs if not v]
if missing: raise SystemExit(f"missing vars: {missing}")
body = '\n'.join(f'  --{n}: {v};' for n, v in pairs)
open(out, 'w', encoding='utf8').write(
    "/* Generated by docs/assets/sync.sh — the real lens filters and rim tokens from glass/glass.css (Glass Regular\n"
    "   Dark), so the landing page's demo runs the same optic the extension does. Do not edit by hand. */\n"
    f".vsg-demo {{\n{body}\n}}\n")
print(f"  demo.css                    {len(open(out, encoding='utf8').read()) // 1024} KB "
      f"({len(pairs)} real tokens: 4 card lenses, 3 magnifier lenses, the rim gradient)")
PY
