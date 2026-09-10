#!/usr/bin/env bash
# VS Glass — Layer 2 direct-patch installer ("Route B" in glass/install.md).
#
# Appends glass/glass.css (plus, with --wallpaper, glass/glass-wallpaper.css and, with --tint NAME,
# glass/tints/glass-tint-NAME.css) directly to
# VS Code's own workbench.desktop.main.css, and fixes the product.json checksum entry for that
# file so VS Code does not show its "installation appears to be corrupt" notice. This needs no
# extension, no CSP/trusted-types workaround (style-src already allows 'self' 'unsafe-inline',
# and this is the same file the workbench already loads) — see research/vscode-injection.md
# Part A4 for why this is the lowest-blast-radius injection route of the ones evaluated.
#
# Usage:
#   scripts/inject.sh install [--wallpaper] [--tint NAME] [--density PERCENT] [--lens soft|strong] [--aberration off|subtle|strong]
#   scripts/inject.sh uninstall
#   scripts/inject.sh status
#   scripts/inject.sh --help
#
# Env:
#   VSCODE_APP_PATH   Override the VS Code app location (a .app bundle on macOS, or an
#                      already-resolved app directory such as /usr/share/code/resources/app
#                      on Linux). Takes priority over every default candidate below.
#
# macOS-first, Linux-tolerant. Never touches /Applications/Visual Studio Code.app unless you
# explicitly point VSCODE_APP_PATH at it — point it at a throwaway copy for testing.

set -euo pipefail

# ---------------------------------------------------------------------------
# Setup: paths, markers, colour output (only when stdout is a TTY)
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GLASS_CSS="$REPO_ROOT/glass/glass.css"
GLASS_WALLPAPER_CSS="$REPO_ROOT/glass/glass-wallpaper.css"
GLASS_TINT_DIR="$REPO_ROOT/glass/tints"
GLASS_DENSITY_DIR="$REPO_ROOT/glass/density"
GLASS_LENS_DIR="$REPO_ROOT/glass/lens"
GLASS_ABERRATION_DIR="$REPO_ROOT/glass/aberration"
PACKAGE_JSON="$REPO_ROOT/package.json"

MARKER_START="/* VS-GLASS-START */"
MARKER_END="/* VS-GLASS-END */"
CHECKSUM_KEY="vs/workbench/workbench.desktop.main.css"
BACKUP_SUFFIX=".vs-glass-backup"

if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_RED=$'\033[31m'; C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'; C_BLUE=$'\033[36m'
else
  C_RESET=""; C_BOLD=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""
fi

info()    { printf '%s\n' "${C_BLUE}==>${C_RESET} $*"; }
success() { printf '%s\n' "${C_GREEN}OK${C_RESET}   $*"; }
warn()    { printf '%s\n' "${C_YELLOW}WARN${C_RESET} $*" >&2; }
err()     { printf '%s\n' "${C_RED}ERROR${C_RESET} $*" >&2; }
detail()  { printf '%s\n' "      $*"; }

usage() {
  cat <<EOF
${C_BOLD}scripts/inject.sh${C_RESET} — VS Glass Layer 2 direct-patch installer

USAGE
  scripts/inject.sh install [--wallpaper] [--tint NAME] [--density PERCENT]
                            [--lens soft|strong] [--aberration off|subtle|strong]
      Patch VS Code's workbench.desktop.main.css with glass.css and fix the
      product.json checksum so VS Code doesn't flag the install as corrupt.
      glass.css alone assumes a see-through window (Vibrancy Continued).
        --wallpaper   also append glass-wallpaper.css: a neutral smoke backdrop
                      for a window that is NOT transparent.
        --tint NAME   also append glass/tints/glass-tint-NAME.css (graphite,
                      blue, indigo, violet, teal, mint, rose, amber).
        --density P   also append glass/density/glass-density-P.css: how much
                      film the planes carry, 0 (absolutely clear) 25 50 75
                      150 200 (opaque-ish); 100 is the default and needs no file.
        --lens L      also append glass/lens/glass-lens-L.css: rim bend strength
                      (soft, strong; the default needs no file).
        --aberration A  also append glass/aberration/glass-aberration-A.css:
                      colour fringing at the rim (off, subtle, strong).

  scripts/inject.sh uninstall
      Restore the pristine workbench.desktop.main.css and product.json from
      the backups made on first install (byte-exact), then delete the
      backups. Falls back to stripping the injected block if no backup
      exists.

  scripts/inject.sh status
      Report whether the patch is installed, which VS Glass/VS Code
      versions it was installed against vs. the versions found now, whether
      backups exist, and whether the CSS checksum in product.json matches
      the file on disk.

  scripts/inject.sh --help
      Show this message.

ENVIRONMENT
  VSCODE_APP_PATH   Override where VS Code is found. Accepts either a
                     macOS .app bundle (its "Contents/Resources/app" is
                     used) or an already-resolved app directory such as
                     /usr/share/code/resources/app on Linux.

DEFAULT SEARCH ORDER (first match wins)
  1. \$VSCODE_APP_PATH
  2. /Applications/Visual Studio Code.app
  3. ~/Applications/Visual Studio Code.app
  4. /Applications/Visual Studio Code - Insiders.app
  5. /usr/share/code/resources/app   (Linux)

NOTES
  - Every VS Code update overwrites these two files; re-run "install"
    after each update (see "status" to check for drift).
  - Running "install" twice is safe — it re-patches from a clean slate
    each time.
  - Never asks for sudo itself. If the app directory isn't writable, it
    prints the exact chown/sudo command to run yourself.
EOF
}

# ---------------------------------------------------------------------------
# App discovery
# ---------------------------------------------------------------------------

APP_BUNDLE=""   # set only when a real macOS .app bundle was matched (for xattr checks)
APP_DIR=""      # the "resources/app" directory containing out/ and product.json
CSS_FILE=""
PRODUCT_JSON=""

# Given a candidate path, decide whether it's a macOS .app bundle (has
# Contents/Resources/app) or already an app dir (Linux-style, or a direct
# override), and whether the files we need actually exist under it.
_try_candidate() {
  local candidate="$1"
  [ -n "$candidate" ] || return 1

  local as_bundle="$candidate/Contents/Resources/app"
  if [ -f "$as_bundle/out/vs/workbench/workbench.desktop.main.css" ] && [ -f "$as_bundle/product.json" ]; then
    APP_BUNDLE="$candidate"
    APP_DIR="$as_bundle"
    return 0
  fi

  if [ -f "$candidate/out/vs/workbench/workbench.desktop.main.css" ] && [ -f "$candidate/product.json" ]; then
    APP_BUNDLE=""
    APP_DIR="$candidate"
    return 0
  fi

  return 1
}

locate_app() {
  info "Locating VS Code..."

  local found=0

  # An explicit override is a hard requirement, not a preference: if it's set
  # but doesn't resolve, stop here rather than silently falling through to a
  # default candidate (which, on a machine with a real VS Code installed at
  # one of the default paths, could otherwise cause a typo'd override to
  # patch a real install by accident).
  if [ -n "${VSCODE_APP_PATH:-}" ]; then
    if _try_candidate "$VSCODE_APP_PATH"; then
      detail "found: \$VSCODE_APP_PATH -> $VSCODE_APP_PATH"
      found=1
    else
      err "\$VSCODE_APP_PATH is set to \"$VSCODE_APP_PATH\" but no VS Code install was found there"
      err "(expected either <path>/Contents/Resources/app or <path> itself to contain out/vs/workbench/workbench.desktop.main.css and product.json)."
      err "Refusing to fall back to a default location — fix or unset \$VSCODE_APP_PATH."
      exit 1
    fi
  else
    local candidates=(
      "/Applications/Visual Studio Code.app"
      "$HOME/Applications/Visual Studio Code.app"
      "/Applications/Visual Studio Code - Insiders.app"
      "/usr/share/code/resources/app"
    )
    local labels=(
      "/Applications/Visual Studio Code.app"
      "~/Applications/Visual Studio Code.app"
      "/Applications/Visual Studio Code - Insiders.app"
      "/usr/share/code/resources/app (Linux)"
    )

    local i
    for i in "${!candidates[@]}"; do
      local c="${candidates[$i]}"
      local l="${labels[$i]}"
      if _try_candidate "$c"; then
        detail "found: $l -> $c"
        found=1
        break
      else
        detail "not found: $l"
      fi
    done
  fi

  if [ "$found" -ne 1 ]; then
    err "Could not locate a VS Code install. Set \$VSCODE_APP_PATH to the .app bundle (macOS) or app directory (Linux) explicitly."
    exit 1
  fi

  CSS_FILE="$APP_DIR/out/vs/workbench/workbench.desktop.main.css"
  PRODUCT_JSON="$APP_DIR/product.json"

  if [ -n "$APP_BUNDLE" ]; then
    detail "app bundle:   $APP_BUNDLE"
  fi
  detail "app dir:      $APP_DIR"
  detail "CSS bundle:   $CSS_FILE"
  detail "product.json: $PRODUCT_JSON"

  report_quarantine
}

# Report (never fixes automatically) macOS App Translocation / quarantine state.
report_quarantine() {
  [ "$(uname)" = "Darwin" ] || return 0
  [ -n "$APP_BUNDLE" ] || return 0

  local q
  if q=$(xattr -p com.apple.quarantine "$APP_BUNDLE" 2>/dev/null); then
    warn "This app is still quarantined (App Translocation) — macOS may mount it read-only,"
    warn "which shows up as \"EROFS: read-only file system\" when patching."
    detail "fix: xattr -dr com.apple.quarantine \"$APP_BUNDLE\""
  fi
}

# Abort with guidance if the app directory (or product.json) isn't writable by us.
# Never calls sudo itself.
require_writable() {
  local target_dir
  target_dir="$(dirname "$CSS_FILE")"

  if [ -w "$target_dir" ] && [ -w "$CSS_FILE" ] && [ -w "$PRODUCT_JSON" ]; then
    return 0
  fi

  local owner_target="$APP_DIR"
  [ -n "$APP_BUNDLE" ] && owner_target="$APP_BUNDLE"

  local owner=""
  if [ "$(uname)" = "Darwin" ]; then
    owner=$(stat -f '%Su' "$owner_target" 2>/dev/null || echo "")
  else
    owner=$(stat -c '%U' "$owner_target" 2>/dev/null || echo "")
  fi

  err "The VS Code install directory is not writable: $target_dir"
  if [ -n "$owner" ] && [ "$owner" != "$(id -un)" ]; then
    detail "It's owned by \"$owner\", not you (\"$(id -un)\")."
    detail "fix: sudo chown -R \"\$USER\" \"$owner_target\""
  else
    detail "fix: re-run this same command with sudo, e.g.: sudo bash \"$0\" install"
  fi
  exit 1
}

# ---------------------------------------------------------------------------
# Small JSON helpers (python3 primary, careful fallbacks otherwise)
# ---------------------------------------------------------------------------

have_python3() { command -v python3 >/dev/null 2>&1; }

# Read a top-level "version" string out of a JSON file.
json_top_level_version() {
  local file="$1"
  if have_python3; then
    python3 -c '
import json, sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        print(json.load(f).get("version", ""))
except Exception:
    print("")
' "$file"
    return 0
  fi
  # Fallback: match a "version" key indented by exactly one level (one tab, or two
  # spaces) so we don't accidentally pick up a nested "version" (e.g. an extension
  # pack entry) that happens to appear earlier in the file.
  local v
  v=$(grep -m1 -E '^\t"version"[[:space:]]*:' "$file" 2>/dev/null | sed -E 's/.*:[[:space:]]*"([^"]*)".*/\1/') || true
  if [ -z "$v" ]; then
    v=$(grep -m1 -E '^  "version"[[:space:]]*:' "$file" 2>/dev/null | sed -E 's/.*:[[:space:]]*"([^"]*)".*/\1/') || true
  fi
  printf '%s' "$v"
}

# Read the recorded checksum for $CHECKSUM_KEY out of product.json.
json_get_checksum() {
  local file="$1"
  if have_python3; then
    python3 -c '
import json, sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    print(data.get("checksums", {}).get(sys.argv[2], ""))
except Exception:
    print("")
' "$file" "$CHECKSUM_KEY"
    return 0
  fi
  grep -F "\"$CHECKSUM_KEY\"" "$file" 2>/dev/null | head -1 | sed -E 's/.*:[[:space:]]*"([^"]*)".*/\1/'
}

# Write $CHECKSUM_KEY = $2 into product.json's checksums object.
# Primary: python3 json.load/dump, preserving key order and the file's own
# indentation style (this product.json uses tabs, not 2 spaces — detected,
# not assumed). Known side effect of the python3 path: json.dump reflows any
# single-line arrays (e.g. "serverLicense") onto multiple lines; every key,
# value, and the key order are preserved exactly, and product.json itself is
# never checksum-verified by VS Code, so this is cosmetic only.
# Fallback (no python3): a targeted sed substitution of just that one key's
# value, touching nothing else in the file byte-for-byte.
json_set_checksum() {
  local file="$1" new_value="$2"

  if have_python3; then
    python3 -c '
import json, re, sys

path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r"\n([ \t]+)\"", text)
indent = m.group(1) if m else "  "
had_trailing_newline = text.endswith("\n")

data = json.loads(text)
data.setdefault("checksums", {})[key] = value

dumped = json.dumps(data, indent=indent, ensure_ascii=False)
if had_trailing_newline:
    dumped += "\n"

with open(path, "w", encoding="utf-8") as f:
    f.write(dumped)
' "$file" "$CHECKSUM_KEY" "$new_value"
    return 0
  fi

  warn "python3 not found — falling back to a targeted sed edit of product.json."
  warn "This only rewrites the \"$CHECKSUM_KEY\" value; everything else is untouched."
  local tmp
  tmp="$(mktemp "${file}.XXXXXX")"
  sed -E 's|("'"$(printf '%s' "$CHECKSUM_KEY" | sed 's/[\/&]/\\&/g')"'"[[:space:]]*:[[:space:]]*")[^"]*(")|\1'"$new_value"'\2|' \
    "$file" > "$tmp"
  if ! grep -qF "$new_value" "$tmp"; then
    rm -f "$tmp"
    err "sed fallback failed to update the checksum — product.json left untouched."
    return 1
  fi
  mv "$tmp" "$file"
}

# ---------------------------------------------------------------------------
# Checksum (VS Code's format: standard base64 of the raw SHA-256 digest, '=' stripped)
# ---------------------------------------------------------------------------

sha256_b64_nopad() {
  local file="$1"
  if command -v openssl >/dev/null 2>&1 && command -v base64 >/dev/null 2>&1; then
    openssl dgst -sha256 -binary "$file" | base64 | tr -d '=\n'
  elif command -v sha256sum >/dev/null 2>&1 && command -v xxd >/dev/null 2>&1 && command -v base64 >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}' | xxd -r -p | base64 | tr -d '=\n'
  else
    err "Need either (openssl + base64) or (sha256sum + xxd + base64) to compute the checksum."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Backup / restore
# ---------------------------------------------------------------------------

backup_path_for() { printf '%s' "$1$BACKUP_SUFFIX"; }

# Back up $1 to $1.vs-glass-backup, but only if no backup exists yet — an
# existing backup is assumed to be the pristine original and is never
# overwritten.
backup_file() {
  local target="$1"
  local backup
  backup="$(backup_path_for "$target")"
  if [ -e "$backup" ]; then
    detail "backup already exists, left untouched: $backup"
  else
    cp -p "$target" "$backup"
    detail "backed up pristine file -> $backup"
  fi
}

# ---------------------------------------------------------------------------
# Marker block strip / append
# ---------------------------------------------------------------------------

# Remove any previous VS-GLASS marker block from $1 (in place). Safe to call
# on a file with no block present (no-op).
strip_marker_block() {
  local file="$1"
  local tmp
  tmp="$(mktemp "${file}.XXXXXX")"
  # Markers are always emitted on their own line (see build_marker_block), so
  # a literal, anchored line-range delete is exact and doesn't need to touch
  # the (very long, minified) lines around it.
  sed -e '/^\/\* VS-GLASS-START \*\/$/,/^\/\* VS-GLASS-END \*\/$/d' "$file" > "$tmp"
  mv "$tmp" "$file"
}

marker_block_present() {
  grep -qF "$MARKER_START" "$1" 2>/dev/null
}

# Build the marker block (header + glass.css + optional addons) to stdout.
build_marker_block() {
  local wallpaper="$1" tint="$2" density="$3" lens="$4" aberration="$5" vsg_version="$6" vscode_version="$7"
  local mode="transparent-window"
  [ "$wallpaper" = "1" ] && mode="wallpaper"
  [ -n "$tint" ] && mode="$mode, tint $tint"
  [ -n "$density" ] && mode="$mode, density $density %"
  [ -n "$lens" ] && mode="$mode, lens $lens"
  [ -n "$aberration" ] && mode="$mode, aberration $aberration"

  printf '%s\n' "$MARKER_START"
  cat <<HEADER
/* VS Glass — injected by scripts/inject.sh. Do not hand-edit this block;
 * re-run \`scripts/inject.sh install\` instead (safe to run repeatedly).
 * VS Glass version: $vsg_version
 * VS Code version:  $vscode_version
 * Mode:             $mode
 * Injected:         $(date -u +%Y-%m-%dT%H:%M:%SZ)
 */
HEADER
  cat "$GLASS_CSS"
  if [ "$wallpaper" = "1" ]; then
    printf '\n'
    cat "$GLASS_WALLPAPER_CSS"
  fi
  if [ -n "$tint" ]; then
    printf '\n'
    cat "$GLASS_TINT_DIR/glass-tint-$tint.css"
  fi
  if [ -n "$density" ]; then
    printf '\n'
    cat "$GLASS_DENSITY_DIR/glass-density-$density.css"
  fi
  if [ -n "$lens" ]; then
    printf '\n'
    cat "$GLASS_LENS_DIR/glass-lens-$lens.css"
  fi
  if [ -n "$aberration" ]; then
    printf '\n'
    cat "$GLASS_ABERRATION_DIR/glass-aberration-$aberration.css"
  fi
  printf '\n%s\n' "$MARKER_END"
}

recorded_field() {
  # $1 = file, $2 = field label as it appears in the header ("VS Glass version", "VS Code version", "Mode")
  sed -n "s/^ \* $2:[[:space:]]*//p" "$1" | head -1
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_install() {
  local wallpaper=0 tint="" density="" lens="" aberration=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --wallpaper) wallpaper=1 ;;
      --lens) shift; lens="${1:-}"; [ -n "$lens" ] || { err "--lens needs soft or strong"; usage; exit 1; } ;;
      --lens=*) lens="${1#--lens=}" ;;
      --aberration) shift; aberration="${1:-}"; [ -n "$aberration" ] || { err "--aberration needs off, subtle or strong"; usage; exit 1; } ;;
      --aberration=*) aberration="${1#--aberration=}" ;;
      --density) shift; density="${1:-}"; [ -n "$density" ] || { err "--density needs a percent (0 25 50 75 150 200)"; usage; exit 1; } ;;
      --density=*) density="${1#--density=}" ;;
      --transparent) warn "--transparent is now the default and the flag is ignored (use --wallpaper for an opaque window)" ;;
      --tint) shift; tint="${1:-}"; [ -n "$tint" ] || { err "--tint needs a name"; usage; exit 1; } ;;
      --tint=*) tint="${1#--tint=}" ;;
      *) err "Unknown option to install: $1"; usage; exit 1 ;;
    esac
    shift
  done

  [ -f "$GLASS_CSS" ] || { err "Missing $GLASS_CSS"; exit 1; }
  if [ "$wallpaper" = "1" ]; then
    [ -f "$GLASS_WALLPAPER_CSS" ] || { err "Missing $GLASS_WALLPAPER_CSS"; exit 1; }
  fi
  if [ -n "$tint" ]; then
    [ -f "$GLASS_TINT_DIR/glass-tint-$tint.css" ] || { err "Unknown tint '$tint' — available: $(ls "$GLASS_TINT_DIR" | sed -E 's/glass-tint-(.*)\.css/\1/' | tr '\n' ' ')"; exit 1; }
  fi
  if [ -n "$density" ]; then
    [ -f "$GLASS_DENSITY_DIR/glass-density-$density.css" ] || { err "Unknown density '$density' — available: $(ls "$GLASS_DENSITY_DIR" | sed -E 's/glass-density-(.*)\.css/\1/' | tr '\n' ' ')(100 is the default, no file needed)"; exit 1; }
  fi
  if [ -n "$lens" ]; then
    [ -f "$GLASS_LENS_DIR/glass-lens-$lens.css" ] || { err "Unknown lens preset '$lens' — available: soft strong"; exit 1; }
  fi
  if [ -n "$aberration" ]; then
    [ -f "$GLASS_ABERRATION_DIR/glass-aberration-$aberration.css" ] || { err "Unknown aberration preset '$aberration' — available: off subtle strong"; exit 1; }
  fi

  locate_app
  require_writable

  local vsg_version vscode_version
  vsg_version="$(json_top_level_version "$PACKAGE_JSON")"
  vscode_version="$(json_top_level_version "$PRODUCT_JSON")"
  [ -n "$vsg_version" ] || vsg_version="unknown"
  [ -n "$vscode_version" ] || vscode_version="unknown"

  info "Backing up pristine files (first run only)..."
  backup_file "$CSS_FILE"
  backup_file "$PRODUCT_JSON"

  info "Patching $CHECKSUM_KEY..."
  if marker_block_present "$CSS_FILE"; then
    detail "removing previous VS-GLASS block first (idempotent re-install)"
    strip_marker_block "$CSS_FILE"
  fi

  local block
  block="$(build_marker_block "$wallpaper" "$tint" "$density" "$lens" "$aberration" "$vsg_version" "$vscode_version")"
  printf '\n%s\n' "$block" >> "$CSS_FILE"
  if [ "$wallpaper" = "1" ]; then
    detail "appended glass.css + glass-wallpaper.css (wallpaper mode)${tint:+ + tint $tint}${density:+ + density $density}${lens:+ + lens $lens}${aberration:+ + aberration $aberration}"
  else
    detail "appended glass.css"
  fi

  info "Fixing the product.json checksum so VS Code doesn't flag the install as corrupt..."
  local new_checksum
  new_checksum="$(sha256_b64_nopad "$CSS_FILE")"
  json_set_checksum "$PRODUCT_JSON" "$new_checksum"
  detail "checksums[\"$CHECKSUM_KEY\"] = $new_checksum"

  success "Installed VS Glass Layer 2 ($( [ "$wallpaper" = "1" ] && echo "wallpaper mode" || echo "transparent-window mode" )${tint:+, tint $tint}${density:+, density $density %}${lens:+, lens $lens}${aberration:+, aberration $aberration})."
  echo
  info "Restart VS Code (Quit fully, ⌘Q — not just \"Reload Window\") to apply."
  detail "VS Code updates overwrite both patched files. Re-run \"scripts/inject.sh install\" after every update."
  detail "The corrupt-installation warning should NOT appear (the checksum was fixed above)."
  detail "If it still does: click the gear icon on the notification -> Don't Show Again."
}

cmd_uninstall() {
  locate_app

  local css_backup product_backup
  css_backup="$(backup_path_for "$CSS_FILE")"
  product_backup="$(backup_path_for "$PRODUCT_JSON")"

  if [ -e "$css_backup" ] && [ -e "$product_backup" ]; then
    require_writable
    info "Restoring pristine files from backup..."
    cp -p "$css_backup" "$CSS_FILE"
    cp -p "$product_backup" "$PRODUCT_JSON"

    if command -v cmp >/dev/null 2>&1; then
      cmp -s "$css_backup" "$CSS_FILE" || { err "Restore verification failed for $CSS_FILE"; exit 1; }
      cmp -s "$product_backup" "$PRODUCT_JSON" || { err "Restore verification failed for $PRODUCT_JSON"; exit 1; }
    fi

    rm -f "$css_backup" "$product_backup"
    success "Restored $CSS_FILE and $PRODUCT_JSON to their pristine, byte-exact state."
    detail "Backups removed. The stock product.json checksum is back, so no corrupt-install warning."
  else
    require_writable
    if marker_block_present "$CSS_FILE"; then
      info "No backup found — stripping the injected block instead."
      strip_marker_block "$CSS_FILE"
      success "Removed the VS-GLASS block from $CSS_FILE."
      warn "product.json's checksum was left as-is (it still reflects the patched file) —"
      warn "VS Code may show the corrupt-installation notice until you re-run \"install\" or"
      warn "manually restore product.json from a fresh VS Code install."
    else
      success "Nothing to uninstall — no VS-GLASS block and no backup found. Already clean."
    fi
  fi

  echo
  info "Restart VS Code (Quit fully, ⌘Q) to apply."
}

cmd_status() {
  locate_app
  echo

  local vsg_version_now vscode_version_now
  vsg_version_now="$(json_top_level_version "$PACKAGE_JSON")"
  [ -n "$vsg_version_now" ] || vsg_version_now="unknown"
  vscode_version_now="$(json_top_level_version "$PRODUCT_JSON")"
  [ -n "$vscode_version_now" ] || vscode_version_now="unknown"

  info "Marker block:"
  if marker_block_present "$CSS_FILE"; then
    local rec_vsg rec_vscode rec_mode
    rec_vsg="$(recorded_field "$CSS_FILE" "VS Glass version")"
    rec_vscode="$(recorded_field "$CSS_FILE" "VS Code version")"
    rec_mode="$(recorded_field "$CSS_FILE" "Mode")"
    detail "present"
    if [ "$rec_vsg" = "$vsg_version_now" ]; then
      detail "VS Glass version: $rec_vsg (matches package.json)"
    else
      warn "VS Glass version drift: patched with $rec_vsg, repo is now $vsg_version_now — re-run install"
    fi
    if [ "$rec_vscode" = "$vscode_version_now" ]; then
      detail "VS Code version:  $rec_vscode (matches current install)"
    else
      warn "VS Code version drift: patched against $rec_vscode, install is now $vscode_version_now — a VS Code update likely overwrote the patch; re-run install"
    fi
    detail "mode: ${rec_mode:-unknown}"
  else
    detail "absent (not installed)"
  fi

  echo
  info "Backups:"
  local css_backup product_backup
  css_backup="$(backup_path_for "$CSS_FILE")"
  product_backup="$(backup_path_for "$PRODUCT_JSON")"
  if [ -e "$css_backup" ]; then detail "CSS backup:          present ($css_backup)"; else detail "CSS backup:          absent"; fi
  if [ -e "$product_backup" ]; then detail "product.json backup: present ($product_backup)"; else detail "product.json backup: absent"; fi

  echo
  info "Checksum:"
  local recorded_checksum computed_checksum
  recorded_checksum="$(json_get_checksum "$PRODUCT_JSON")"
  computed_checksum="$(sha256_b64_nopad "$CSS_FILE")"
  detail "recorded in product.json: ${recorded_checksum:-<none>}"
  detail "computed from current CSS: $computed_checksum"
  if [ -n "$recorded_checksum" ] && [ "$recorded_checksum" = "$computed_checksum" ]; then
    success "checksum matches — no corrupt-installation warning expected."
  else
    warn "checksum mismatch — VS Code will show the \"installation appears to be corrupt\" notice."
  fi
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    install)
      shift
      cmd_install "$@"
      ;;
    uninstall)
      shift
      cmd_uninstall "$@"
      ;;
    status)
      shift
      cmd_status "$@"
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      err "Unknown command: $cmd"
      usage
      exit 1
      ;;
  esac
}

main "$@"
