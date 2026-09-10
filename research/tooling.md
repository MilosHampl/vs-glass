# VS Code Theme Extension Tooling Reference

**Project:** VS Glass (VS Code color theme extension with four variants)  
**Date:** 2026-09-10  
**Local Environment:** VS Code 1.136.1 (arm64), vsce 3.9.2

---

## 1. @vscode/vsce Packaging

### CLI Flags for `vsce package`

```bash
npx @vscode/vsce package [version] [options]
```

**Key flags:**

- `-o, --out <path>` — Output VSIX file path (defaults to `<name>-<version>.vsix`)
- `-t, --target <target>` — Target architecture. Valid: `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`, `linux-armhf`, `darwin-x64`, `darwin-arm64`, `alpine-x64`, `alpine-arm64`, `web`
- `--ignore-other-target-folders` — Ignore non-matching architectures when `--target` is specified
- `--no-dependencies` — Skip npm/yarn dependency resolution (converts to `'none'` internally); outputs minimal VSIX without `node_modules`
- `--readme-path <path>` — Custom README file (defaults to `README.md`)
- `--changelog-path <path>` — Custom CHANGELOG file (defaults to `CHANGELOG.md`)
- `--baseContentUrl <url>` — Prepend URL to relative links in README (e.g., GitHub raw content URLs for image rewriting)
- `--baseImagesUrl <url>` — Prepend URL to relative image links in README
- `--githubBranch <branch>` — Auto-infer GitHub URLs (overridable by `--baseContentUrl`/`--baseImagesUrl`)
- `--gitlabBranch <branch>` — Auto-infer GitLab URLs
- `--no-rewrite-relative-links` — Skip link rewriting
- `--yarn` / `--no-yarn` — Force package manager (auto-detected from lockfiles)
- `--ignoreFile <path>` — Custom `.vscodeignore` path
- `--no-gitHubIssueLinking` / `--no-gitLabIssueLinking` — Disable auto-expansion of issue syntax
- `--dependencies` / `--no-dependencies` — Explicitly enable/disable dependency detection
- `--pre-release` — Mark VSIX as pre-release
- `--allow-star-activation` — Allow `*` in activation events
- `--allow-missing-repository` — Allow extension without `repository` field in package.json
- `--allow-unused-files-pattern` — Allow `files` patterns that don't match any file
- `--allow-package-secrets <secrets...>` — Allow specific secret types in packaging
- `--allow-package-all-secrets` — Allow all secret types
- `--allow-package-env-file` — Allow `.env` files in package
- `--skip-license` — Package without LICENSE file (bypasses warning)
- `--sign-tool <path>` — Path to VSIX signing tool
- `--follow-symlinks` — Recurse into symlinked directories
- `-m, --message <msg>` — Git commit message for version bumping
- `--no-git-tag-version` — Skip git tagging on version bump
- `--no-update-package-json` — Don't modify `package.json` on version bump

**Recommended for theme extensions:**
```bash
npx @vscode/vsce package --no-dependencies
```

This excludes `node_modules` (unnecessary for pure JSON themes).

---

### `.vscodeignore` Format

Glob patterns (one per line) to exclude files from the VSIX. `package.json` and `README.md` are always included.

**Default ignores (hardcoded in vsce):**
- Config files: `.editorconfig`, `.npmrc`, `.yarnrc`, `.babelrc*`, `.eslintrc*`, `.prettierrc*`, `.cz-config.js`, `.commitlintrc*`, `webpack.config.js`
- Git: `.git`, `.git/**`, `.gitattributes`
- Lock files: `package-lock.json`, `npm-debug.log`, `yarn.lock`, `yarn-error.log`, `npm-shrinkwrap.json`
- CI/docs: `.github`, `.travis.yml`, `appveyor.yml`, `ISSUE_TEMPLATE.md`, `CONTRIBUTING.md`, `PULL_REQUEST_TEMPLATE.md`, `CODE_OF_CONDUCT.md`
- Build: `**/.vscode-test/**`, `**/.vscode-test-web/**`
- Artifacts: `**/*.vsix`, `**/*.vsixmanifest`, `**/.DS_Store`
- Dev: `*.todo`, `tslint.yaml`

**Typical theme `.vscodeignore`:**
```
.git
.github
.gitignore
node_modules
*.md
src/
scripts/
*.json
docs/
screenshots/
samples/
scratch/
research/
.vscode-test/
.DS_Store
```

For pure themes, exclude everything except `/themes` folder.

---

### License, README, CHANGELOG, Icon Requirements

**LICENSE file:**
- Checked: `LICENSE`, `LICENSE.md`, `LICENSE.txt`
- Missing: vsce emits warning (not error) — `WARNING  LICENSE, LICENSE.md, or LICENSE.txt not found`
- **To reach zero warnings:** Include one of these files

**README.md:**
- Always included in VSIX (never ignored)
- If missing: no warning, but marketplace appearance is affected
- Should contain: extension description, installation, usage, screenshots (with relative paths if using `--baseImagesUrl`)

**CHANGELOG.md:**
- Optional; vsce searches for it by default
- If not found: no warning
- Customizable via `--changelog-path`

**Icon (required):**
- Path: specified in `package.json` → `"icon": "extension/icon.png"`
- Size: **exactly 128×128px PNG** (no SVG allowed)
- Missing icon: vsce emits **ERROR** — `ERROR  The specified icon '<path>' wasn't found in the extension.`
- Icon size warnings: vsce checks dimensions during packaging
- To reach zero warnings: Include 128×128 PNG at the path specified in `icon`

**galleryBanner (optional):**
```json
"galleryBanner": {
  "color": "#2d2d30",
  "theme": "dark"  // or "light"
}
```

---

### `vsce ls` Command

Lists all files that will be published/packaged without creating a VSIX.

```bash
npx @vscode/vsce ls                    # Lists files (one per line)
npx @vscode/vsce ls --tree             # Tree view with sizes
npx @vscode/vsce ls --packagedDependencies <path>  # Include subset of dependencies
```

Output includes warnings about large files. Useful for verifying `.vscodeignore` exclusions before packaging.

---

### `vsce publish` (Not Used Here, Documented for Reference)

**Prerequisites:**
- Publisher account on VS Marketplace
- Personal Access Token (PAT) from Azure DevOps
- `package.json` → `"publisher": "<name>"`
- Valid manifest (validated by `validateManifestForPublishing`)

**Authentication:**
```bash
vsce login <publisher>            # Save PAT interactively
export VSCE_PAT=<token>           # Or set env var
vsce publish [version]             # Publishes to marketplace
```

**Key publish flags:**
- `-p, --pat <token>` — Personal Access Token
- `--azure-credential` — Use Microsoft Entra ID
- `--oidc` — Use OpenID Connect (GitHub Actions trusted publishing)
- `-i, --packagePath <paths...>` — Publish pre-built VSIX instead of packaging
- `--pre-release` — Mark as pre-release
- `--skip-duplicate` — Fail silently if version exists
- `-m, --message <msg>` — Commit message for version bump

**Publish flow (internal):**
1. Read `package.json` manifest
2. Validate marketplace requirements (publisher, repository field, etc.)
3. Run `vscode:prepublish` npm script if defined
4. Bump version via `npm version`
5. Package extension
6. Publish to marketplace

**For theme extensions, `vsce publish` additionally checks:**
- `"publisher"` field is set
- `"repository"` URL in package.json
- Icon exists and is correct size
- LICENSE file present

---

## 2. `contributes.themes` Schema

### Package.json Definition

```json
{
  "contributes": {
    "themes": [
      {
        "label": "Glass Regular Dark",
        "uiTheme": "vs-dark",
        "path": "./themes/glass-regular-dark-color-theme.json"
      },
      {
        "label": "Glass Regular Light",
        "uiTheme": "vs",
        "path": "./themes/glass-regular-light-color-theme.json"
      }
    ]
  }
}
```

### Schema Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `label` | string | Yes | Human-readable theme name (shown in theme picker) |
| `uiTheme` | enum | Yes | `"vs"` (light), `"vs-dark"` (dark), `"hc-black"` (high-contrast dark), `"hc-light"` (high-contrast light) |
| `path` | string | Yes | Relative path to JSON theme file (from extension root) |
| `id` | string | Optional | Unique identifier (auto-generated if omitted; recommended to set explicitly) |

VS Code uses `uiTheme` to determine which UI colors to apply and which syntax token scopes to prioritize in the editor.

---

### Color Theme JSON Schema

**Introspection URL (for editor validation):**
```
vscode://schemas/color-theme
```

When editing a theme JSON file in VS Code with the extension development host active, use:
- Command: `Developer: Inspect Editor Tokens and Scopes` — Click on text to see applied scopes
- Command: `Developer: Generate Color Theme From Current Settings` — Generate theme from current customizations

**Public JSON Schema:**
- **No published HTTPS schema URL** exists (as of 2026-09-10)
- Validation is structural: check against TypeScript definitions in `microsoft/vscode` repo at `src/vs/workbench/services/themes/common/colorThemeSchema.ts`
- **Approach for CI validation:** Parse theme JSON, validate object shape, check color hex values against regex `/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/`, validate scope names against known TextMate scopes

**Theme file structure:**
```json
{
  "name": "Glass Regular Dark",
  "type": "dark",
  "colors": {
    "editor.background": "#1e1e1e",
    "editor.foreground": "#d4d4d4",
    "editor.lineNumberActiveForeground": "#c6c7c7",
    "editorCursor.foreground": "#aeafad"
  },
  "tokenColors": [
    {
      "scope": ["comment"],
      "settings": {
        "foreground": "#6a9955",
        "fontStyle": ""
      }
    }
  ]
}
```

**Token Colors Settings:**
- `foreground` — Color (hex + optional alpha: `#RRGGBBAA`)
- `background` — Deprecated; not used
- `fontStyle` — Space-separated: `italic`, `bold`, `underline`, `strikethrough`, or empty string to clear

---

## 3. Package.json Requirements for Theme Extensions

### Minimal Required Fields

```json
{
  "name": "vs-glass",
  "version": "1.0.0",
  "description": "...",
  "publisher": "milos-hampl",
  "license": "MIT",
  "engines": {
    "vscode": "^1.70.0"
  },
  "categories": ["Themes"],
  "contributes": {
    "themes": [...]
  }
}
```

### Engine Semantics: `engines.vscode`

- Format: npm semver range (e.g., `"^1.70.0"`, `">=1.80.0"`)
- `^1.70.0` → compatible with 1.70.0 through < 2.0.0
- Specifies minimum API version required by the extension
- Marketplace filters extensions by VS Code version
- **Recommendation for themes:** Use a conservative lower bound to maximize compatibility (e.g., `"^1.70.0"` or `"^1.80.0"`)

### `categories`

Must include `"Themes"`:
```json
"categories": ["Themes"]
```

Other valid categories (for multi-category extensions): `"Color Themes"`, `"Icon Themes"`, etc. For pure color themes, use `"Themes"` or `"Color Themes"`.

### `icon`

Path to 128×128 PNG (no SVG):
```json
"icon": "extension/icon.png"
```

vsce validates:
- File exists at path
- Size is 128×128 (emits warning if not)
- Format is PNG (no SVG, no JPEG)

### `galleryBanner` (optional)

```json
"galleryBanner": {
  "color": "#2d2d30",
  "theme": "dark"
}
```

Displayed at top of marketplace page. `theme` affects text color rendering.

### `extensionKind` (optional)

```json
"extensionKind": ["ui", "workspace"]
```

For themes: typically omit or set to `["ui"]` (themes are UI-only, no backend)

### `sponsor` (optional; requires vsce ≥ 2.9.1)

Displays "Sponsor" button on marketplace:
```json
"sponsor": {
  "url": "https://github.com/sponsors/milos-hampl"
}
```

### `badges` (optional)

Array of badge objects displayed on marketplace page:
```json
"badges": [
  {
    "url": "https://img.shields.io/github/license/miloshampl/vs-glass",
    "href": "https://github.com/miloshampl/vs-glass/blob/main/LICENSE",
    "description": "License"
  }
]
```

**Allowed hosts:** `img.shields.io`, GitHub raw content, GitHub badges. Avoid external CDNs for security.

### `qna` (optional)

Marketplace Q&A forum link:
```json
"qna": "https://github.com/miloshampl/vs-glass/discussions"
```

### `repository` (required for `vsce publish`)

Not strictly required for packaging, but mandatory for publishing to marketplace:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/miloshampl/vs-glass"
}
```

vsce uses this to rewrite relative links in README (unless `--no-rewrite-relative-links`).

---

## 4. VS Code CLI Tools

### Extension Development & Testing

**Open extension development host** (new VS Code window with extension loaded):
```bash
code --extensionDevelopmentPath=/path/to/extension
```

This opens a fresh VS Code instance with your extension running. Used for testing theme before packaging.

**Install extension from VSIX:**
```bash
code --install-extension /path/to/extension.vsix
code --install-extension /path/to/extension.vsix --force  # Update if already installed
```

**Uninstall extension:**
```bash
code --uninstall-extension publisher.name
```

**List installed extensions:**
```bash
code --list-extensions
code --list-extensions --show-versions
code --list-extensions --category Themes
```

### Isolated Profile for Testing

Create a test environment without affecting user's actual extensions/settings:
```bash
code \
  --user-data-dir /tmp/vscode-user-data \
  --extensions-dir /tmp/vscode-extensions \
  /path/to/workspace
```

Then install extension:
```bash
code --user-data-dir /tmp/vscode-user-data --extensions-dir /tmp/vscode-extensions \
  --install-extension /path/to/extension.vsix
```

Or in same command:
```bash
code --user-data-dir /tmp/vscode-user-data --extensions-dir /tmp/vscode-extensions \
  --extensionDevelopmentPath=/path/to/extension /path/to/workspace
```

### Window & File Management

- `-n, --new-window` — Force new window
- `-r, --reuse-window` — Force current window
- `-w, --wait` — Block until file closed (useful for scripts)
- `-g, --goto <file:line[:character]>` — Open file at line/column

Example:
```bash
code -w -n ~/Projects/vs-glass  # Open new window, block until closed
```

### Debugging & Performance

**Extension debugging:**
```bash
code --inspect-extensions 9223  # Listen on port 9223 for extension host debugger
code --inspect-brk-extensions 9223  # Break on startup
```

**Remote debugging (Chrome DevTools Protocol):**
```bash
code --remote-debugging-port=9222
```

**Note:** As of VS Code 1.136.1, `--remote-debugging-port` appears **not listed** in the help output. However, CDP support in VS Code is primarily for web builds (`code serve-web`). For stable/desktop versions, extension inspection uses the `--inspect-extensions` port instead.

**GPU/rendering:**
- `--disable-gpu` — Disable GPU acceleration (rarely needed)
- `--disable-lcd-text` — Disable LCD font rendering

**Profiling:**
```bash
code --prof-startup  # CPU profiling during startup
```

---

### Screenshot Automation on macOS

#### Option A: Chrome DevTools Protocol (Preferred for precision)

**Limitations:** Not natively available in stable VS Code on macOS; primarily for web builds.

For stable VS Code, use Options B or C instead.

**If CDP were available (for reference):**
```
Page.captureScreenshot with deviceScaleFactor: 2
Emulation.setDeviceMetricsOverride (set viewport + pixel ratio)
Runtime.evaluate (DOM inspection, click simulation)
Tracing.start (performance metrics)
```

#### Option B: Xcode CommandLineTools — `screencapture` (Most Robust)

macOS native tool; no dependencies:

```bash
# 1. Get VS Code window ID
windowid=$(/usr/bin/osascript -e 'tell application "System Events"
  set appWindow to name of window 1 of process "Code"
  set appPID to unix id of process "Code"
  tell application "System Events"
    get id of window appWindow of process "Code"
  end tell
end tell')

# 2. Capture window at 2× (Retina)
screencapture -l "${windowid}" -r -x -R /tmp/screenshot-2x.png

# 3. Scale down to 1× if needed (requires ImageMagick or Python Pillow)
# sips -Z 50% /tmp/screenshot-2x.png --out /tmp/screenshot.png
```

**Notes:**
- `-l <windowid>` — Capture window only
- `-r` — Includes window chrome (title bar, etc.)
- `-x` — Suppress system sound
- Output is 2× Retina automatically on Retina displays
- Requires **Accessibility permission** for `osascript`; check with:
  ```bash
  # Check if Terminal has accessibility access
  sqlite3 ~/Library/Application\ Support/com.apple.launchservices.secure.sqlite3 \
    "SELECT * FROM access WHERE client = 'com.apple.Terminal'"
  ```

To grant permission: System Settings → Privacy & Security → Accessibility → Terminal (if not listed, add it).

#### Option C: Python Quartz (For Unattended Loops)

```python
import Quartz
import os
from PIL import Image

# Get all windows, find VS Code
windows = Quartz.CGWindowListCopyWindowInfo(
    Quartz.kCGWindowListOptionOnScreenOnly,
    Quartz.kCGNullWindowID
)

vscode_window = None
for window in windows:
    if 'Visual Studio Code' in window.get('kCGWindowName', ''):
        vscode_window = window
        break

if vscode_window:
    window_id = vscode_window['kCGWindowNumber']
    bounds = vscode_window['kCGWindowBounds']
    
    # Capture at native Retina resolution
    image = Quartz.CGWindowListCreateImage(
        bounds,
        Quartz.kCGWindowListOptionIncludingWindow,
        window_id,
        Quartz.kCGWindowImageDefault
    )
    
    # Convert NSImage to PNG (requires PIL or similar)
    # ... save to file
```

**For unattended loops:** This approach avoids permission prompts (use Quartz, not osascript). More complex but reliable.

#### macOS Screenshot Best Practices

1. **2× Retina output:** Both `screencapture -r` and Quartz output native Retina resolution automatically
2. **Isolate window:** Use `-l <windowid>` to exclude other windows
3. **Permissions:** Add Terminal/script to Accessibility if using `osascript`
4. **Unattended runs:** Prefer Quartz over osascript to avoid permission dialogs

---

## 5. Test Workspace Setup

### Pre-configured Theme via CLI + Settings

Create a test workspace with a specific theme:

```bash
# Create isolated user data directory
mkdir -p /tmp/vscode-test-{user,ext}

# Write settings.json to set active theme
mkdir -p "/tmp/vscode-test-user/User"
cat > "/tmp/vscode-test-user/User/settings.json" << 'EOF'
{
  "workbench.colorTheme": "Glass Regular Dark"
}
EOF

# Open workspace with extension and theme pre-selected
code \
  --user-data-dir /tmp/vscode-test-user \
  --extensions-dir /tmp/vscode-test-ext \
  --extensionDevelopmentPath=/path/to/vs-glass \
  /path/to/test-workspace
```

**settings.json format:**
```json
{
  "workbench.colorTheme": "Glass Regular Dark",
  "workbench.iconTheme": "vs-seti",
  "editor.fontFamily": "'Menlo', 'Courier New', monospace",
  "editor.fontSize": 13,
  "editor.lineHeight": 18
}
```

The `workbench.colorTheme` value must match the `label` field from `contributes.themes` in package.json.

### Developer Commands

Once VS Code is open with the extension active:

**Inspect tokens and scopes:**
- Command Palette (`Cmd+Shift+P`) → `Developer: Inspect Editor Tokens and Scopes`
- Click on text in editor to reveal applied scope and token color
- Shows: scope hierarchy, matched rule, active color value

**Generate theme from current settings:**
- Command Palette → `Developer: Generate Color Theme From Current Settings`
- Exports current color customizations to a theme file
- Useful for testing color adjustments interactively

**Programmatic access (via CDP, if available):**
```javascript
// Not available in stable VS Code, but for reference:
// Runtime.evaluate to execute JS in workbench context
// Can't directly invoke commands, but can inspect DOM
```

---

## 6. GitHub Actions for Theme Publishing

### Basic Workflow: Package on Tag

**.github/workflows/release.yml:**
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run validate  # Run any validation scripts
      - run: npx @vscode/vsce package --no-dependencies
      
      - uses: actions/upload-artifact@v4
        with:
          name: vsix
          path: '*.vsix'
      
      - uses: softprops/action-gh-release@v2
        with:
          files: '*.vsix'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Key elements:**
- `actions/setup-node@v4` with `cache: npm` — Caches node_modules
- `npm ci` — Clean install (respects package-lock.json)
- `vsce package --no-dependencies` — Minimal VSIX for theme
- `actions/upload-artifact@v4` — Store VSIX for download
- `softprops/action-gh-release@v2` — Create GitHub Release with asset

**Permissions required:**
```yaml
permissions:
  contents: write
```

### Pre-release Workflow

Add `--pre-release` flag:
```yaml
- run: npx @vscode/vsce package --no-dependencies --pre-release
```

### GitHub Pages from `/docs` on `main`

Enable Pages in repo settings (via UI or `gh` CLI):
```bash
gh api -X POST repos/{owner}/{repo}/pages \
  -f source[branch]=main \
  -f source[path]=/docs
```

GitHub Pages doesn't require `actions/deploy-pages` when source is a branch; it auto-publishes.

To add workflow that explicitly publishes (if needed):
```yaml
- uses: actions/deploy-pages@v4
  if: github.ref == 'refs/heads/main'
```

### Repository Metadata via GitHub CLI

```bash
# Set homepage (shown on GitHub profile)
gh repo edit --homepage "https://marketplace.visualstudio.com/items?itemName=milos-hampl.vs-glass"

# Add topics
gh repo edit --add-topic "vscode" --add-topic "theme" --add-topic "color-theme"
```

---

## 7. npm Packages for Color Math & WCAG Contrast

### Recommended Packages

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `culori` | 4.0.2 | General color library | Supports blending, color spaces, interpolation, alpha compositing |
| `colorjs.io` | 0.7.1 | Modern color + wide gamut | CSS Color Module 4, Display-P3, OKLab, more modern |
| `apca-w3` | 0.1.9 | WCAG 3 contrast (APCA) | Perceptual contrast (better than WCAG 2.x); W3C standard |
| `wcag-apca` | 1.0.0 | WCAG 2.x + APCA in one | Dependency-free; includes both algorithms |
| `tinycolor2` | 1.x | Lightweight color utility | Minimal; good for simple conversions; no wide-gamut support |

### Recommendation

**For theme development:** Use **`culori`** + **`apca-w3`**

- `culori` for color math, blending, and palette generation
- `apca-w3` for perceptual contrast checking
- Both are well-maintained and widely used

---

### Color Compositing Over Opaque Background

Composite a color with alpha (`#RRGGBBAA`) over opaque background:

**Using `culori`:**
```javascript
import { rgba, oklch } from 'culori';

// Parse foreground (with alpha)
const fg = rgba('#FF000080');  // Red at 50% opacity

// Parse background
const bg = rgba('#FFFFFF');    // White

// Composite: fg over bg
const result = {
  r: fg.r * fg.alpha + bg.r * (1 - fg.alpha),
  g: fg.g * fg.alpha + bg.g * (1 - fg.alpha),
  b: fg.b * fg.alpha + bg.b * (1 - fg.alpha),
};

// Convert back to hex
const hex = `#${Math.round(result.r * 255).toString(16).padStart(2, '0')}...`;
```

**Using `colorjs.io`:**
```javascript
import Color from 'colorjs.io';

const fg = new Color('color(srgb 1 0 0 / 0.5)');
const bg = new Color('white');

// Composite
const result = fg.mix(bg, 0.5);
console.log(result.to('srgb').toString());  // Output: rgb(...)
```

---

### WCAG 2.x Contrast Calculation

Computes contrast ratio between two colors (1:1 to 21:1):

**Using `wcag-apca`:**
```javascript
import { wcagContrast } from 'wcag-apca';

const ratio = wcagContrast('#000000', '#FFFFFF');  // Returns ~21
// Level AA: ratio >= 4.5 (normal text), >= 3 (large text)
// Level AAA: ratio >= 7
```

**Using `culori` + manual:**
```javascript
import { rgb } from 'culori';

function relativeLuminance(color) {
  const { r, g, b } = rgb(color);
  const [rs, gs, bs] = [r, g, b].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(color1, color2) {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

console.log(contrastRatio('#000000', '#FFFFFF'));  // ~21
```

---

### APCA (WCAG 3) Contrast

Perceptual contrast; more nuanced than WCAG 2:

**Using `apca-w3`:**
```javascript
import { APCAcontrast } from 'apca-w3';

const Lc = APCAcontrast('#000000', '#FFFFFF');  // Returns ~106
// Lc >= 90: APCA Level AAA
// Lc >= 75: APCA Level AA
// Lc >= 60: APCA Level A
// Negative values indicate reversed polarity (light on dark)
```

---

## Verified vs. From Docs vs. Assumed

### Verified (Ran Locally)
- VS Code version: 1.136.1 (arm64)
- @vscode/vsce version: 3.9.2
- `vsce package` help output and available flags
- `vsce ls --tree` output format (shows files and sizes)
- `vsce package` warnings: LICENSE missing, icon file not found
- License and icon validation behavior
- Project package.json structure (contributes.themes format, engines, etc.)

### From Documentation (Context7 + Direct Source)
- `/microsoft/vscode-vsce` library: all package command flags, publish flow, `.vscodeignore` logic, README/CHANGELOG handling
- `/websites/code_visualstudio_api` library: contributes.themes schema, package.json requirements (icon size, categories, engines.vscode semantics)
- Microsoft GitHub (vscode repo): colorThemeSchema.ts existence; no published HTTPS schema URL
- npm package info: culori 4.0.2, colorjs.io 0.7.1, apca-w3 0.1.9 (latest versions)

### Assumed
- VS Code 1.136.1 stable does not expose Chrome DevTools Protocol (`--remote-debugging-port`) as a documented feature; likely available in web builds only
- `screencapture -r` on macOS natively outputs 2× Retina resolution (standard macOS behavior)
- Accessibility permission check via SQLite is still valid in macOS 12.7+ (not newly verified)
- Quartz APIs remain unchanged from previous macOS versions

---

## Summary

This document provides exact, copy-pasteable information for:
- Packaging a VS Code theme extension with `vsce package --no-dependencies`
- Configuring `package.json` to meet theme extension requirements
- Setting up isolated test workspaces and theme verification
- Automating packaging and release via GitHub Actions
- Computing WCAG contrast and color compositing for theme validation

**For zero warnings in packaging:** Include LICENSE file, 128×128 PNG icon, and avoid missing fields in package.json.

---

**Last Updated:** 2026-09-10  
**Tools:** @vscode/vsce 3.9.2, VS Code 1.136.1, Context7 library documentation
