# Changelog

All notable changes to VS Glass are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [1.3.3] - 2026-10-19

### Fixed

- **VS Code 1.141 support: windows are created see-through again.** 1.141 moved its main process out of `out/main.js`
  into `out/mainImpl.js`, window options included, so VS Glass found nowhere to splice its creation-time options:
  windows turned transparent only after they opened (stale pixels where panels closed) and losing focus snapped to the
  inactive fill before the 1.3.1 fade. The splice now goes into `mainImpl.js` on those builds (not checksummed either;
  backed up and restored byte-exact like main.js, by Remove and by the uninstall hook too). The hook itself stays in
  main.js and still runs before the first window. Quit and reopen VS Code once after the update applies.
- **The "lays its window options out differently" warning** no longer reappears after every settings change on a build
  VS Glass can't splice: it shows once per VS Code version, in plainer words.

## [1.3.2] - 2026-10-16

### Fixed

- **The focus fade followed only focus changes, not live setting changes** (hook V10). Switching an unfocused window's
  material to `none` or Liquid Glass left its opaque veil up until the window was focused; choosing a vibrancy material
  in an unfocused window kept it blurring instead of fading and parking; and a window whose vibrancy was parked when the
  material went to `none` stayed unblurred once a material came back. Every live change of look now settles the veil
  and the parked vibrancy too.
- **Windows opened with Window Transparency off snapped to the inactive fill** once glass was switched on live: they now
  get the same creation-time `visualEffectState: 'active'` (without a vibrancy view it does nothing).

## [1.3.1] - 2026-10-16

### Changed

- **Losing focus fades instead of snapping.** macOS switches a window's vibrancy to its flat inactive fill the instant
  the window loses focus — glass to opaque in one frame. Windows are now created with their vibrancy kept active, and
  the page fades an opaque ground in behind all of its content over 1.4 s (and out again on focus). Once the fade is
  done the hook removes that window's vibrancy view, so an unfocused window asks the window server for no live blur at
  all — with several windows open this costs less than the OS's own inactive state, not more. Hook V9: quit and reopen
  VS Code once.

### Fixed

- **The IN and OUT of Claude Code tool calls were invisible.** Claude Code clips a long tool row with a fade drawn as a
  mask in its background colour; a mask uses only that colour's alpha, and over the glass the background is clear, so
  the whole row vanished. The webview sheet draws the same fade with an opaque mask colour (applies live).

## [1.3.0] - 2026-10-14

The first release since 1.2.2: it also carries everything listed under 1.2.3, which was never tagged.

### Changed

- **Dense work planes in a clear frame.** The editor card, the side bars, the panel and the activity bar now carry a
  real body (Regular Dark 30 % / 26 %, Clear 20 % / 17 % at density 100), and `vsGlass.density` moves only them. The
  frame — title bar, status bar and the gaps between the panes — is a fixed near-clear film at every density. If you
  had lowered Density to make the old planes clearer, raise it again: 10 % now means 10 % of a much denser plane.
- **Every lens is drawn in CSS pixels.** The displacement maps are SVG images laid out at the element's real size,
  and the bend and blur are in px, so a rim is the same width and bends the same distance on a 25 px tooltip and on a
  900 px palette. The old maps were bitmaps stretched over the element: the rim was a fraction of its size, and since
  Chromium scales a bounding-box displacement by the element's *width* on both axes, wide and short surfaces were bent
  vertically several times harder than intended. Short bars (find, rename, the terminal's find, the overlay message,
  the debug toolbar) and tooltips get their own narrow rims, so a label never sits on a bent copy of what is under it.
- **Floating widgets hide what is behind them.** Over a see-through window Chromium draws a backdrop filter's result
  on top of the original backdrop, so the sharp text under every widget showed through its frost (and under every
  bent rim, a second time). The widget filters now lay a base of the widget colour under the frost and the bend:
  the original is hidden, the frost and the bend stay vivid. `vsGlass.widgetDensity` moves the film on top and, gently,
  the base. Vibrancy (saturation) is applied to what is behind a widget, at a third of the chrome's strength, instead
  of to its body.
- **The Claude Code composer** is a frosted body with a refracting, colour-fringed rim over the same kind of base,
  instead of a clear magnifier across its whole surface.
- **The window slab carries no chromatic aberration.** Chained to the system glass, the aberration stage made macOS
  draw no glass at all; the slab is Apple's material with the rim refraction retuned by Lens.
- Scrollbar thumbs are a film, not a lens: on a semi-transparent plane a lens laid a second copy of the plane under
  each thumb, a dark bar.
- The sheet the hook inserts into every window is 206 KB (275 KB in 1.2.3), the webview sheet 15 KB (42 KB): filters
  are encoded minimally, unused lens classes are gone, and the wallpaper-only lens ships in the wallpaper addon.

### Fixed

- **Lens and Aberration combine.** Each preset file re-emitted every filter with only its own multiplier, so setting
  both kept whichever loaded last: with Lens `soft` and Aberration `subtle`, the lens setting did nothing. The extension
  now builds one set of filters for the pair. (The manual CSS route, `scripts/inject.sh`, refuses the combination.)
- **The Liquid Glass slab showed nothing** with any Aberration other than `off`: the window behind it came through
  pixel-sharp (measured with the helper under a stand-in window). See above.
- **The composer's double, colour-split image**: the wrong axis scaling, and a map that overflowed at the corners
  (`128 + 1.15 × 127` wrapped to 18 in a byte array), which flipped the bend near every corner of the slider and the
  composer. The minimap slider's dome no longer tears down its middle either (its two halves met with the bend 30 %
  strong in opposite directions).
- **Extension icons in the activity bar (Claude Code and others) were invisible until hovered.** They are a mask over
  the label's background colour, which the glass made transparent; their pill now lives on the item's indicator layer.
  Inactive icons are brighter over a bright desktop.
- The minimap slider was a dark slab on a dense plane; the minimap is now a backdrop root, so the slider bends only
  the overview.
- Inputs, buttons, toggles and the chat input were a bright diagonal wash: the gradient rim was a `border-box`
  background under a translucent film, which shows through the whole control. The rim is a masked 1 px ring.
- The hover pointer was a dark wedge stuck to the glass; it is gone. The dropdown list painted a 90 % slab inside its
  own glass.
- **`code <path>` from a terminal made the window look un-hooked.** The short-lived second instance ran the hook and
  overwrote `hook.json` with its own pid, so the real window withheld the webview sheet and asked to quit and reopen
  on every apply. Only a process that owns a window writes it now (hook V8).
- The webview script polled every webview that was not the chat four times a second, forever, and the sweep re-sent
  the 42 KB sheet to every frame every five seconds; with two windows, `hook.json` was rewritten on every sweep. Writing
  `state.json` or `webview.css` re-inserted the whole workbench sheet and re-set the vibrancy in every window. All of it
  happens only when something changed now, and the hook re-watches its folder when it is deleted and recreated.
- **VS Glass: Remove (or uninstalling) after a VS Code update could put the old build's `main.js` back** from a stale
  backup. A `main.js` without the hook is left alone and the stale backup deleted; stripping (the exact inverse of
  applying) is preferred, the backup is only the way back for a damaged hook block.
- A hand-edited setting value outside its list (`"vsGlass.tint": "red"`) made activation throw; values are checked
  against the manifest, and event handlers never throw.
- The window-slab helper re-applied its filters every 250 ms forever when they could not be tuned, the extension
  respawned it every 30 s after it reported the macOS unsupported, and a stale pid file could make the extension signal
  an unrelated process. The helper also removes its pid file when stopped.
- Two stray, empty test files were in the package.

After updating, quit and reopen VS Code once: the hook in the main process is new (V8).

## [1.2.3] - 2026-09-14

### Changed

- **`vsGlass.windowMaterial: auto` is real vibrancy again (`under-window`), not the Liquid Glass slab.** Choosing
  `liquid-glass` makes the hook switch the OS blur off so the slab can show through — and over a plain or smooth
  wallpaper the slab has nothing to refract, so the window read as a clear hole onto the desktop with unreadable code,
  and every Window Glass Style looked the same. The slab stays available by name; its setting description now says
  what it trades away. If you had `auto`, nothing to do; if you set `liquid-glass` yourself and want the blur back,
  pick `auto` or `under-window`.
- Buttons are the same glass as every other control: a film with the gradient rim at the control corner, instead of
  a 999 px pill with its own lens (the one shape that broke the concentric radii, and one backdrop filter per Install
  button in the Extensions view). Focus everywhere is the rim taking the accent: one hairline, no glow ring.
- The sticky-scroll header carries no lens: it spans the editor and re-composites on every scroll frame.

### Added

- **Webviews.** The window hook (now V7) adopts `glass/webview.css` into every `vscode-webview://` frame as a
  constructed stylesheet (CSSOM, so a webview's Content Security Policy does not apply). The Claude Code chat composer
  becomes the minimap slider's optic at composer proportions, clear, with warp and chromatic fringe carrying the shape,
  over a plane film dense enough to type on; its opaque plate, focus glow and drop shadow go; your own messages are the
  same pill as a selected tab. The sheet styles only surfaces it recognises by class-name prefix.
- `extreme` for **Lens** and **Aberration**: every rim becomes a magnifier; fringing like a prism. Displacement and rim
  width still scale together, so nothing folds.
- `frosted` **Window Glass Style**: Apple's Regular face under a much deeper blur, for a slab that stays readable over
  anything. The slab's body blur now matches Apple's effective radii (the backdrop is sampled at full resolution).
- The lens plane on more surfaces that float over live content: the debugger's variable hover, the terminal's find
  bar, the editor's overlay message, scrollbar thumbs in the side bars and the panel. The built-in Copilot Chat
  composer is styled as an input.
- `scripts/fix-hook.mjs`: rewrites (or `--restore`s) the hook in VS Code's `out/main.js` from a shell, parsing the
  result before it is left in place: the way back in when VS Code cannot start.

### Fixed

- **The extension can no longer write a hook that does not parse.** A malformed hook stops VS Code's main process
  ("A JavaScript error occurred in the main process"), and VS Code then cannot run the extension to undo it. This
  happened once during 1.2.3 development. `writeHook` now compiles the block first and refuses otherwise.
- The hook's folder watcher reacts only to the three files the extension writes for it. It used to re-insert the whole
  workbench stylesheet whenever anything in the folder changed, including its own `hook.json` and the slab helper's
  log; with the first webview sweep that was every three seconds, in every window.
- The webview sheet is withheld until `hook.json` confirms a V7 hook in this window, and state-file permissions are
  repaired on apply.

## [1.2.2] - 2026-09-11

### Changed

- The window slab shows the system's Liquid Glass as the system draws it. 1.2.0 zeroed the material's blur and face
  tint to make the body a pixel-exact pass-through, leaving only a rim refraction — which on a window that fills the
  screen sits on the screen border with nothing beyond it to bend, so `liquid-glass` looked like a plain translucent
  window. New `vsGlass.windowGlassStyle`: `apple-clear` (default, Apple's Clear material), `apple-regular` (its
  heavier Regular material) or `clear-plane` (the 1.2.0 behaviour). Lens and Aberration still retune the rim.
- The helper never leaves a slab above its window. A full-screen round trip showed the window server can place the
  slab on top of the window it was ordered under (it does for the transitional frames, and for anything that joins a
  native full-screen Space). Each full tick checks the z-order and hides a slab that came out on top until the window
  moves or resizes. Native full screen therefore shows no slab; zoomed windows are unaffected.

## [1.2.1] - 2026-09-11

### Added

- A first-run nudge: installed but no Glass theme picked yet now says so once, with the theme picker one click away.
  Before this, installing the extension and never touching the theme looked exactly like a failed install.

### Changed

- The install instructions lead with **Extensions → … → Install from VSIX…** and give the absolute path for the CLI.
  On macOS `code` is often not on `PATH`, and a `code` shell alias wrapping `open -b com.microsoft.VSCode` swallows
  `--install-extension` silently: it opens a window and installs nothing. README gained a "Nothing happened?" section.
- VS Glass now refuses to patch on top of Vibrancy Continued and says what to do, instead of patching anyway and
  explaining afterwards that the two fight over the window.
- The "could not write to VS Code's own startup file" error carries the exact `chown` command to fix it.

## [1.2.0] - 2026-09-11

### Added

- `vsGlass.windowMaterial: "liquid-glass"` (macOS 26 or newer) and the new default `auto` (Liquid Glass where the OS
  can do it, `hud` elsewhere): the window itself becomes a plane of the system's Liquid Glass. A small helper process,
  `bin/vs-glass-helper`, keeps a real glass window directly under every VS Code window, tuned so its body is a
  pixel-exact pass-through and only the rim refracts and colour-splits — other windows, video and the desktop bend
  under the window's edge, live, with nothing screen-captured. `Lens` and `Aberration` retune it; any other material,
  `VS Glass: Remove` and quitting VS Code stop it. Measured on a stand-in window: body difference 0.00, the rim bent
  over exactly the configured width, red/blue split by exactly the configured offset (DESIGN.md §5.2).
- `vsGlass.windowMaterial: "none"` — no vibrancy view at all, so the transparent window shows the desktop unblurred
  and untinted. With a low density this is as see-through as a window can get; raise the density if text gets hard to
  read over a busy wallpaper.

- The file overview (minimap) got its own optic: the viewport slider is a bare plane of clear, edge-curved glass that
  refracts the code lines under it as it slides — the one surface in VS Code where glass sits over rendered content, and
  the one surface with no border and no shadow at all, because anything drawn on top of it read as a framed rectangle
  sliding over the overview. A dedicated `slider` lens class (no frost, a 56 px curved edge on a 110 px width) and a
  5 % film, nothing else. Scroll cost is unmeasurable (p50 8.2 ms / p95 9.0 ms against 8.3 / 9.1 with the effects off).
  Pair it with `"editor.minimap.showSlider": "always"`.

### Changed

- One interactive ladder for every control the pointer can touch. Editor tabs, panel tabs, list rows, activity-bar and
  status-bar capsules, toolbar and icon buttons, breadcrumbs, menu-bar titles and buttons now all use the same film and
  1 px hairline at the same alphas (hover 6 %/9 %, selected 10 %/16 %, selected+hover 13 %), the same press scale, and
  the same two corners (12 px for tabs and pills, 7 px for small icon capsules). Nothing else changes between states.

- Every drop shadow is gone — under widgets, buttons, pills, sticky scroll, the minimap slider and the minimap's own
  seam — along with the list-row focus glow and the activity-bar indicator glow. The rim hairline (the liquid-glass
  border) and the light each lens computes from its own curvature are what define an edge now.

### Fixed

- The active panel tab (Problems / Output / Debug Console) painted its film and its gradient rim twice — once on the
  tab and once on its label — so it stacked to ~19 % with a doubled rim and read as a bright bevelled lozenge next to
  the flat editor tabs. It is painted once now, on the element that wraps the label and its badge.
- Activity-bar and status-bar pills carried a capsule lens on hover. Over a see-through window nothing in-page sits
  behind a 36 px icon, so the filter only contributed its own brightness lift and specular — drawn light. Both are
  gone, and with them the `capsule` lens class (12 KB of generated CSS).
- Buttons had no hover step at all: their background is set with `!important`, which swallowed VS Code's own hover
  colour. Primary and secondary buttons now brighten one step, like every other control.
- The close-button strip inside an editor tab painted VS Code's opaque tab colour, which slid in as a solid slab over
  the glass when a tab was hovered.
- The file overview's lens pulled transparent black past its rim (a `backdrop-filter` samples only its filter region),
  which read as a dark fringe and an artifact at the border. The lens classes gained a region padding, and the slider's
  rim mask is off so the whole surface shows the displaced copy.
- Text is flat everywhere: every legibility `text-shadow` is gone.
- Editor tabs and side-bar rows paint their highlight as an inset pill with a corner concentric to the card, instead of
  filling the container edge to edge; tab hover is the same pill one step fainter.

## [1.1.2] - 2026-09-11

### Added

- The file overview (minimap) got its own optic: the viewport slider is a slab of clear, edge-curved glass that
  refracts the code lines under it as it slides — the one surface in VS Code where glass sits over rendered content.
  A dedicated `slider` lens class (clear, no frost, a 56 px curved edge on a 110 px width), a bright hairline along
  the top and left, a contact shade at the bottom and a small drop shadow. Scroll cost is unmeasurable (p50 8.2 ms /
  p95 9.0 ms against 8.3 / 9.1 with the effects off). Pair it with `"editor.minimap.showSlider": "always"`.
- The hard dark band VS Code paints where the minimap meets the code is a soft contact shadow now.

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

[Unreleased]: https://github.com/MilosHampl/vs-glass/compare/v1.3.3...HEAD
[1.3.3]: https://github.com/MilosHampl/vs-glass/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/MilosHampl/vs-glass/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/MilosHampl/vs-glass/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/MilosHampl/vs-glass/compare/v1.2.2...v1.3.0
[1.2.3]: https://github.com/MilosHampl/vs-glass/compare/v1.2.2...bfc7c7e
[1.2.2]: https://github.com/MilosHampl/vs-glass/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/MilosHampl/vs-glass/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/MilosHampl/vs-glass/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/MilosHampl/vs-glass/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/MilosHampl/vs-glass/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/MilosHampl/vs-glass/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MilosHampl/vs-glass/releases/tag/v1.0.0
