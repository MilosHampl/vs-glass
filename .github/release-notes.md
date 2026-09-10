# VS Glass 1.0.0

Apple Liquid Glass for VS Code — refractive edges, specular highlights, and layered glass materials. Unofficial, not affiliated with Apple.

## What's in the box

**Layer 1 — the theme (`vs-glass-1.0.0.vsix`)**
- Four variants generated from one OKLCH palette: **Glass Regular Dark** (flagship), **Glass Regular Light**, **Glass Clear** (more transparent, more luminous, dimming layer) and **Glass Opaque** (the Reduce Transparency equivalent — pick this if you do not install the effects layer).
- 974 of 988 workbench colour keys set (the 14 omissions are documented), 95 TextMate rules + 50 semantic-token rules verified across TypeScript, TSX, Python, Rust, Go, JSON, YAML, Markdown, CSS, SQL and shell.
- Apple system colours in two grades: default for UI, "Increased Contrast" grade for anything read as text. WCAG contrast audited against the real, alpha-composited backgrounds; every exception is justified in `scripts/contrast-allowlist.json`.

**Layer 2 — the glass effects (`glass.css`, `glass-transparent.css`)**
- **Lensing**: real refraction via SVG `feDisplacementMap` inside `backdrop-filter` — a frosted body with a clear, refracted rim and chromatic aberration. CSS-only (data-URI filters), no JavaScript.
- Specular edge rings from a virtual light, material-thickness shadows, a wallpaper ground that tints the glass, concentric corner radii, vibrancy blend on chrome text, and a restrained liquid response on hover and press (macOS Control Center style controls).
- `glass-transparent.css` addon for a fully see-through window with Vibrancy Continued.
- Measured: editor scrolling p50 8.3 ms with every glass surface active (120 Hz), identical to effects off. Editor text is never filtered.

## Install

```sh
# theme
code --install-extension vs-glass-1.0.0.vsix
# effects (pick one route — see glass/install.md)
bash scripts/inject.sh install            # direct patch, checksum-fixed, byte-exact backups
```
Or use Custom CSS and JS Loader with `file:///…/glass/glass.css`, or Vibrancy Continued's `imports` for a transparent window. Recommended companion setting: `"workbench.experimental.modernUI": true`.

## Known limitations
- Layer 2 patches VS Code core files (every route does); re-apply after each VS Code update. The "installation appears to be corrupt" notice can be dismissed; `inject.sh` fixes the checksum so it does not appear.
- CSS can only refract what the page paints: over a transparent window the desktop is blurred by the OS, not lensed by us.
- Highlights do not follow device motion; shadows are not content-aware; motion is CSS transitions, not springs.
- Chromium-only techniques (fine: VS Code is Electron). Not published to the Marketplace.

Full details: `README.md`, `DESIGN.md`, `glass/install.md`, `CHANGELOG.md`.
