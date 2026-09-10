# VS Glass 1.0.0

Apple Liquid Glass for VS Code — refractive edges, specular highlights, and layered glass materials. Unofficial, not affiliated with Apple.

## What's in the box

**Layer 1 — the theme (`vs-glass-1.0.0.vsix`)**
- Four variants generated from one OKLCH palette: **Glass Regular Dark** (flagship), **Glass Clear** (more transparent, more luminous, dimming layer) and **Glass Opaque** (the Reduce Transparency equivalent — pick this if you do not install the effects layer). **Glass Regular Light** also ships, kept for completeness but not tuned for the transparent window.
- 974 of 988 workbench colour keys set (the 14 omissions are documented), 95 TextMate rules + 50 semantic-token rules verified across TypeScript, TSX, Python, Rust, Go, JSON, YAML, Markdown, CSS, SQL and shell.
- Apple system colours in two grades: default for UI, "Increased Contrast" grade for anything read as text. WCAG contrast audited against the real, alpha-composited backgrounds; every exception is justified in `scripts/contrast-allowlist.json`.

**Layer 2 — the glass effects (`glass.css` + addons)**
- **Lensing**: real refraction via SVG `feDisplacementMap` inside `backdrop-filter` — a frosted body with a clear, refracted rim and chromatic aberration, stronger and with a thinner frost than earlier builds. CSS-only (data-URI filters), no JavaScript.
- Window-edge lensing: one-sided lens strips (clear glass, no frost) along the window slab's top and bottom edges bend the title bar and status bar toward the window centre; the editor card's bottom edge bends the last visible code lines the same way. Real refraction, not a static rim.
- A bevel band just inside every rim (cards, widgets, the window slab, capsule buttons and pills), specular edge rings from a virtual light, material-thickness shadows, a concentric radius ladder (window 20px > cards 16px > widgets 14px > controls 9px > inner rows 7px), and vibrancy blend on chrome text.
- Buttons rebuilt as static clear glass pills: a bright hairline rim, a darker refraction band just inside it, a faint static top light, a soft drop shadow, the backdrop bent at the rim by the lens filter, and a light accent tint on primary buttons (secondary buttons are clear glass). Nothing moves on hover, by explicit owner direction; the only response anywhere in Layer 2 is a quick press scale, a floating widget's pop-in, and a focus glow on list rows.
- Small controls (activity-bar and status-bar pills, secondary buttons, the active tab, sticky scroll) are clear films rather than grey bodies, so they take on the colour behind them; only floating widgets keep a smoky body of their own.
- `glass.css` is transparent-first: alone, it assumes the window itself is see-through (Vibrancy Continued) and paints only a thin smoky film plus an optional tint; the window is one rounded glass slab. Layer 1's own editor-area paints are cleared under Layer 2 so the editor genuinely joins the glass stack instead of sitting on it as an opaque slab; editor lines, line numbers, terminal rows and sticky-scroll lines get a soft legibility shadow instead.
- `glass-wallpaper.css` addon: a neutral smoke backdrop (no colour) for a window that is NOT transparent.
- Eight `tints/glass-tint-<id>.css` addons (graphite, blue, indigo, violet, teal, mint, rose, amber) — a thin coloured film, combinable with either mode above. Default material is colourless.
- Six `density/glass-density-<percent>.css` presets (0, 25, 50, 75, 150, 200; 100 is the default and needs no file): `--vsg-density` multiplies the base planes only (window film, editor content, chrome cards/strips), from fully clear (0) to opaque-ish (200); the tuned default is now itself almost clear. Floating widgets (command palette, hovers, suggest, notifications, dialogs, dropdown lists) are exempt on purpose and keep a fixed, readable body of their own (`--vsg-widget-density`), so they don't wash out as the base window clears. Works with either mode above and with tints. Over a bright desktop, raise density (150 or 200), or use the `graphite` tint or the wallpaper addon, to keep text easiest to read.
- Two `lens/glass-lens-<id>.css` addons (soft ×0.7, strong ×1.4) and three `aberration/glass-aberration-<id>.css` addons (off, subtle ×0.5, strong ×2.5) re-emit the same SVG lens filters at a different strength. Displacement and rim width scale together, so the folding limit is unchanged.
- Measured: editor scrolling p50 8.3 ms / p95 8.6 ms with every glass surface active (120 Hz) versus p50 8.3 ms / p95 8.5 ms with effects off; scrolling under an open command palette lands at p95 9.2 ms. Editor text is never filtered.

## Assets
`vs-glass-1.0.0.vsix`, `glass.css`, `glass-wallpaper.css`, `tints/*.css` (8 tint addons), `density/*.css` (6 density presets), `lens/*.css` (2 lens presets), `aberration/*.css` (3 aberration presets), `glass-filters.svg`.

## Install

```sh
# theme
code --install-extension vs-glass-1.0.0.vsix
# effects (pick one route — see glass/install.md)
bash scripts/inject.sh install                       # transparent window (pairs with Vibrancy Continued)
bash scripts/inject.sh install --wallpaper            # opaque window: neutral smoke addon
bash scripts/inject.sh install --tint indigo          # add a coloured film to either mode above
bash scripts/inject.sh install --density 150          # add a denser preset to either mode above
bash scripts/inject.sh install --lens strong --aberration subtle   # retune the lens itself
```
Or use Custom CSS and JS Loader with `file:///…/glass/glass.css` (add `glass-wallpaper.css` after it, since that route can't make the window transparent), or Vibrancy Continued's `imports` with `glass.css` alone for a genuinely transparent window. Recommended companion setting: `"workbench.experimental.modernUI": true`.

## Known limitations
- Layer 2 patches VS Code core files (every route does); re-apply after each VS Code update. The "installation appears to be corrupt" notice can be dismissed; `inject.sh` fixes the checksum so it does not appear.
- Refracting what's actually behind the window (the desktop, another window, a playing video) is impossible from CSS: the renderer never receives those pixels at all, macOS composites them only after the page is drawn, and Vibrancy Continued's behind-window materials only blur and saturate, they don't hand pixels back to the app. A native `NSGlassEffectView` experiment is the only even-conceivable route and is unlikely to expose that sampling either; out of scope. Layer 2 therefore refracts only in-page content, and ships no "desktop mirror" or other fake, by design. In wallpaper mode the neutral smoke gives every rim something to bend everywhere instead.
- Context menus are the one overlay Layer 2 cannot reach: macOS shows them as native OS menus by default, and `window.menuStyle: "custom"` renders them in an isolated shadow root injected CSS cannot penetrate, so they keep the theme's plain colours only. Dropdown lists and every other overlay are unaffected.
- Highlights do not follow device motion; shadows are not content-aware; motion is CSS transitions, not springs, and is deliberately minimal (press/pop-in/focus-glow only, no hover motion).
- Chromium-only techniques (fine: VS Code is Electron). Not published to the Marketplace.

Full details: `README.md`, `DESIGN.md`, `glass/install.md`, `CHANGELOG.md`.
