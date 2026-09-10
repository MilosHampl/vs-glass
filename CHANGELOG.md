# Changelog

All notable changes to VS Glass are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-09-10

### Changed

- One material for every control, from a design review over the regenerated screenshots: list selection, focus and
  quick-input rows are an accent film (22 %) with the existing ring instead of a solid blue bar; inputs, dropdowns and
  checkboxes are light films with a hairline (they were darker wells); badges are accent pills; the focus ring is a soft
  accent; scrollbar sliders are white films; diff decorations are thin films with a 2 px edge accent; minimap and
  overview-ruler marks are toned down; the active editor tab and the active panel tab share the same light film.
- The editor card lost its edge ring (it doubled the side bar's right edge into a groove at the seam); a wider text halo
  on code, tabs, breadcrumbs, list labels and the status bar for legibility over bright desktops.
- Floating widgets carry a 78 % body (was 72 %) so what passes through the frost stays a haze.
- Tints: mint is visible now (.09), amber is built on system yellow (it collapsed to maroon over warm desktops), blue
  pulled back a step.

## [1.1.0] - 2026-09-10

### Added

- **Standalone see-through window and live settings.** VS Glass is now an extension host, not only a theme. It adds
  one marker-delimited hook to VS Code's main-process bootstrap (`out/main.js`, the one bootstrap file VS Code does
  not checksum). The hook makes every workbench window see-through (transparent window background + a macOS
  vibrancy material), inserts the glass CSS into each window with Electron's `insertCSS`, and watches
  `<user-data>/vs-glass/{glass.css,state.json}` so every VS Glass setting applies the moment it changes — no
  reload, no other extension. `VS Glass: Remove` restores `main.js` byte-exact and deletes the folder.
- Settings in the VS Code Settings UI: **Effects**, **Window Transparency**, **Window Material** (19 macOS
  materials, switchable live), **Density** (0 = absolutely clear, 100 = default, 200 = opaque), **Widget Density**,
  **Tint**, **Lens**, **Aberration**, **Wallpaper**, **Auto Apply**; commands **Apply**, **Remove**, **Status**,
  **Open Settings**. A one-time consent prompt precedes the first write.
- Theme-scoped `[Glass …]` blocks in `workbench.colorCustomizations` while the effects are on, so webviews (Claude
  Code, Markdown preview, extension views), which paint their bodies from theme colours no CSS can reach, carry the
  same near-clear alphas as the planes. Generated with the CSS (`glass/webview-colors.json`); removed with Remove.
- A durable extension log (`vs-glass.log` in the extension's log folder) next to the "VS Glass" output channel.
- After a VS Code update replaces `out/main.js` (and the hook with it), VS Glass notices at startup — the state
  folder is still there, the hook is not — and asks once per VS Code version whether to apply again.
- A `vscode:uninstall` hook restores `out/main.js` and deletes the state folder when the extension is uninstalled
  without running Remove first (it stands down on an update, when a newer VS Glass folder is present).
- All file patching lives in `out/patch.js`, shared with the uninstall hook and the release verifier: the strip is the
  byte-exact inverse of the apply, writes are atomic, and the pristine backup is refreshed after VS Code updates.
- Requires VS Code 1.94 or newer (the startup file must be an ES module); older builds are refused untouched.
- Dev tools: `scripts/wincap.swift` captures a VS Code window as the OS composites it (ScreenCaptureKit);
  `scripts/dev-relaunch-bed.sh` restarts a scratch test bed.

### Changed

- **The material is now clear glass, not frosted chrome.** Base planes dropped from ~20 % to ~7 % (editor) and 6 %
  (side bars, panel, strips); the window film from 16 % to 5 %. The OS material supplies the frost; the workbench
  paints almost nothing of its own. Density 200 is now genuinely opaque (piecewise ramp: 0 → clear, 1 → base,
  2 → opaque) instead of "twice the base".
- Edges are a single hairline of light where the curved rim catches the room (top and left), a faint contact line
  at the bottom, and nothing else. Buttons lost their inner "refraction band"; activity and status pills lost their
  drop shadows; the title and status bars lost their lens strips (there is nothing in-page behind them to bend).
- Lensing and chromatic aberration stay on every inside element: command palette, menus, hovers, suggest,
  notifications, dialogs, modal editors, buttons and capsule pills. The base panes (side bars, panel, activity
  bar, title and status bars) carry no backdrop filter over the see-through window — nothing in-page sits behind
  them, and a filter over a see-through region re-samples stale pixels (the neon side bar). The wallpaper addon
  switches their lens back on over its opaque in-page smoke.
- Windows are created transparent (a spread spliced into VS Code's window options in `out/main.js`, read from the
  state file at creation) instead of being made transparent afterwards: only a creation-time transparent window
  gets its frame cleared every paint; the earlier approach left ghosts of closed panels in the near-clear editor.
- The window edge is one ring following the window corners (brightest along the top) instead of two 40 px strips.
- Palette: window alphas per variant (`window` knobs) and `--vsg-window-film-a` retuned for the clear material.

### Removed

- All painted gradients: the radial "sheen" highlights inside cards and widgets, the button top-light gradient,
  the bevel bands inside every rim, the inner shading gradients and the layered drop shadows under base cards. A
  shaded band inside a rim reads as a bevelled window frame, not as glass.
- The 1.1.0 preview's patch of `workbench.desktop.main.css` + `product.json` checksum fix. `Apply` and `Remove`
  restore those files if a preview left them patched. `scripts/inject.sh` still offers that route by hand for
  people who inject CSS by other means.

## [1.0.0] - 2026-09-10

### Added

- Four theme variants: **Glass Regular Dark**, **Glass Regular Light**, **Glass Clear**, and
  **Glass Opaque**, generated from a single OKLCH palette.
- Generated palette pipeline (`src/palette.ts` → `npm run build` → `themes/*.json`) covering the
  VS Code color-theme key set, plus TextMate `tokenColors` and `semanticTokenColors`.
- Layer 2 glass effects (`glass/glass.css`), applied on top of the theme by injecting CSS into
  the workbench:
  - Lensing/refraction via an SVG displacement map (`glass/glass-filters.svg`) in
    `backdrop-filter: url(#...)`.
  - Specular edge highlight rings.
  - Material-thickness shadows (layered inset + contact shadows).
  - Vibrancy blend (`saturate()`/`brightness()` plus `mix-blend-mode: plus-lighter` on chrome).
  - Concentric corner-radius geometry across nested surfaces.
  - Liquid response, deliberately restrained by owner direction: a static specular sheen (no hover
    motion anywhere), with a press scale on buttons/icon buttons/pills, a pop-in entrance on floating
    widgets, and a focus glow on list rows; disabled under `prefers-reduced-motion`.
  - Chromatic aberration on the lens, tuned per variant.
- Transparent-first `glass/glass.css`: the window itself is assumed see-through (Vibrancy Continued);
  the workbench paints only a smoky film plus an optional tint, and the window is one rounded glass slab
  with its own specular rim ring.
- `glass/glass-wallpaper.css` addon, for a window that is NOT transparent: paints a neutral smoke
  backdrop (no hue, only luminance) and thickens every plane back to an opaque-window density.
- Eight `glass/tints/glass-tint-<id>.css` addons (graphite, blue, indigo, violet, teal, mint, rose, amber),
  each a thin coloured film over every plane; combinable with either mode above.
- A concentric radius ladder across the whole window: window 20px > cards 16px > widgets 14px >
  controls 9px > inner rows 7px.
- Window-edge lensing: one-sided lens strips (clear glass, no frost) along the window slab's top and
  bottom edges bend the title bar and status bar toward the window centre, following the window's
  corner radius; the editor card gets a matching strip along its bottom seam that bends the last
  visible code lines. Real refraction of in-page content, not a static rim; the window's side rim stays
  a plain inset ring.
- Stronger lensing overall: roughly doubled rim displacement and stronger chromatic aberration, with a
  thinner frost, so refraction reads clearly in the command palette, hovers, suggest, dropdown lists and
  notifications over code. Rim width is kept proportional to displacement so the lens stays under its
  own folding limit (see `DESIGN.md` §4.1).
- A bevel band just inside every rim (cards, widgets, the window slab, capsule buttons and pills) so
  edges read as thick glass even over a flat or blurred backdrop.
- The editor area's own Layer 1 paints (editor pane, gutter, tab strip, breadcrumb, minimap, terminal,
  panel, sidebar, activity bar, status bar, title bar, Settings header) are cleared under Layer 2 so the
  editor is genuinely part of the glass stack rather than an opaque slab sitting on top of it.
- A legibility text shadow on editor lines, line numbers, terminal rows and sticky-scroll lines, since
  code now sits on a see-through plane; measured to cost nothing on scroll frame times.
- Buttons rebuilt as static clear glass pills (bright hairline rim, darker refraction band, static top
  light, backdrop bent at the rim by the lens filter, a light accent tint on primary buttons): nothing
  moves on hover, only a quick press scale.
- Six `glass/density/glass-density-<percent>.css` presets (`0`, `25`, `50`, `75`, `150`, `200`; `100` is
  the default and needs no file) turn density into a knob for the base planes: `--vsg-density` multiplies
  the window film, editor content, and chrome cards/strips (plus the dim behind chrome text). `0` is
  fully clear (rims, bevels, lensing and text only); the tuned default is now itself almost clear, a
  faint smoky film; `200` is opaque-ish, the most legible. Floating widgets (command palette, hovers,
  suggest, notifications, dialogs, dropdown lists) are exempt on purpose — they keep a fixed, readable
  body of their own, tunable separately via `--vsg-widget-density`, so they stay legible however clear
  the base window goes. Works with either mode above; any value works by setting the variables directly.
- Two `glass/lens/glass-lens-<id>.css` addons (`soft` ×0.7, `strong` ×1.4) and three
  `glass/aberration/glass-aberration-<id>.css` addons (`off`, `subtle` ×0.5, `strong` ×2.5) re-emit the
  same SVG lens filters at a different strength; displacement and rim width scale together so the
  folding limit is unchanged.
- Small controls (activity-bar and status-bar pills, secondary buttons, the active tab, sticky scroll)
  are now clear films rather than grey bodies, so they take on the colour behind them; only floating
  widgets keep a smoky body of their own.
- Install/uninstall scripts for the Layer 2 effects layer (`scripts/inject.sh`), with `--wallpaper`,
  `--tint NAME`, `--density PERCENT`, `--lens soft|strong` and `--aberration off|subtle|strong` flags
  for the five addon families above.
- Verification audits: `npm run validate` (theme JSON schema), `npm run audit:coverage` (color
  key coverage against the full VS Code key inventory), `npm run audit:contrast` (WCAG contrast).
- Project documentation: README, DESIGN.md, and this CHANGELOG.

[Unreleased]: https://github.com/MilosHampl/vs-glass/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/MilosHampl/vs-glass/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/MilosHampl/vs-glass/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MilosHampl/vs-glass/releases/tag/v1.0.0
