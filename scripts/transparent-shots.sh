#!/usr/bin/env bash
# Transparent-window evidence: capture the Vibrancy test bed (transparent page background) and composite each capture
# over a desktop picture blurred the way Vibrancy's under-window material blurs it. Simulated compositing (the build
# tooling cannot screen-record the real desktop); the window pixels are real.
#
#   scripts/transparent-shots.sh --port 9335 --profile scratch/profile-vib/user --wall scratch/wall-cliffs-2880.jpg \
#        [--variants glass-regular-dark,glass-clear] [--scenes hero,palette,sidebar,notification,settings,terminal,hover,suggest] [--tints]
set -euo pipefail
PORT=9335; PROFILE=scratch/profile-vib/user; WALL=""; VARIANTS="glass-regular-dark,glass-clear"; SCENES="hero,palette,sidebar,notification,settings,terminal,hover,suggest"; TINTS=0
while [ $# -gt 0 ]; do case "$1" in
  --port) PORT="$2"; shift;; --profile) PROFILE="$2"; shift;; --wall) WALL="$2"; shift;; --variants) VARIANTS="$2"; shift;; --scenes) SCENES="$2"; shift;; --tints) TINTS=1;; *) echo "unknown $1"; exit 1;; esac; shift; done
[ -n "$WALL" ] || { echo "--wall <image> required"; exit 1; }
TMP=scratch/transparent-raw; OUT=screenshots/transparent; mkdir -p "$TMP" "$OUT" "$OUT/tints"
node scripts/screenshots.mjs --port "$PORT" --profile "$PROFILE" --variants "$VARIANTS" --layer2 on --scenes "$SCENES" --alpha --out "$TMP"
for f in "$TMP"/*.png; do
  b="$(basename "$f")"; [[ "$b" == *-alpha-tint-* ]] && continue
  node scripts/composite-transparent.mjs --in "$f" --wall "$WALL" --out "$OUT/$b" --label "Transparent-window mode (glass.css, Vibrancy Continued under-window). Window pixels captured over CDP, composited over the desktop picture blurred as the OS material blurs it. Simulated compositing, not a screen recording."
done
if [ "$TINTS" = "1" ]; then
  for t in glass/tints/glass-tint-*.css; do
    id="$(basename "$t" .css)"; id="${id#glass-tint-}"
    node scripts/screenshots.mjs --port "$PORT" --profile "$PROFILE" --variants glass-regular-dark --layer2 on --scenes hero --addons "$t" --alpha --out "$TMP" --suffix "-alpha-tint-$id"
    node scripts/composite-transparent.mjs --in "$TMP/glass-regular-dark-hero-alpha-tint-$id.png" --wall "$WALL" --out "$OUT/tints/hero-$id.png" --label "Tint addon: $id (glass/tints/glass-tint-$id.css over glass.css). Simulated compositing over the blurred desktop picture."
  done
fi
echo "wrote $(ls "$OUT"/*.png "$OUT"/tints/*.png 2>/dev/null | wc -l | tr -d ' ') composites into $OUT"
