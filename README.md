# VS Glass

Apple Liquid Glass for VS Code — refractive edges, specular highlights, and layered glass materials.

[![Latest release](https://img.shields.io/github/v/release/MilosHampl/vs-glass)](https://github.com/MilosHampl/vs-glass/releases/latest)
[![License](https://img.shields.io/github/license/MilosHampl/vs-glass)](LICENSE)
![VS Code ^1.90](https://img.shields.io/badge/VS%20Code-%5E1.90-blue)
[![CI](https://github.com/MilosHampl/vs-glass/actions/workflows/ci.yml/badge.svg)](https://github.com/MilosHampl/vs-glass/actions/workflows/ci.yml)

VS Glass is an unofficial, fan-made project. It is not affiliated with, endorsed by, or sponsored by Apple.

VS Glass is colourless, multilayer glass, built for a transparent window first. The Electron window
itself is see-through; the workbench above it is a stack of thin translucent planes — editor content,
sidebar, panel, tab strip, floating widgets, Control-Center-style capsule buttons — each catching a smoky
film and, if you want one, a tint. There is no coloured wallpaper mesh in the default material.

## Modes

Layer 2 is one default plus five optional addon families, loaded in this order:

1. **Transparent window** (default) — `glass/glass.css` alone. Assumes the window itself is see-through
   (Vibrancy Continued, `vscode_vibrancy.type: "under-window"`, theme `"Custom theme (use imports)"`). The
   workbench paints only a thin smoky film plus any tint; the window is one rounded glass slab with its
   own specular rim.
2. **Wallpaper** (addon, for a window that is NOT transparent) — load `glass/glass-wallpaper.css` after
   `glass.css`. Paints a neutral smoke backdrop (no hue, only luminance) and thickens every plane back to
   an opaque-window density, so every rim still has something to refract.
3. **Tints** (addons, combinable with either mode above) — load one of `glass/tints/glass-tint-<id>.css`
   after `glass.css` (and after `glass-wallpaper.css`, if used). Eight options: `graphite` (neutral grey,
   the smokiest glass), `blue`, `indigo`, `violet`, `teal`, `mint`, `rose`, `amber` — each a thin coloured
   film laid into every plane.
4. **Density** (addons, combinable with any of the above) — load one of
   `glass/density/glass-density-<percent>.css` after `glass.css` (and after `glass-wallpaper.css`/a tint,
   if used). Six presets: `0`, `25`, `50`, `75`, `150`, `200` (`100` is the tuned default and needs no
   file). Each just sets one CSS variable, `--vsg-density`, which scales the *base* planes — the window
   film, editor content, and chrome cards and strips. `0` is fully clear; the tuned default is now itself
   almost clear, a faint smoky film; `200` is opaque-ish, the most legible. Floating widgets (command
   palette, hovers, suggest, notifications, dialogs, dropdown lists) deliberately don't follow this knob —
   they keep a fixed, readable body of their own (tunable separately, `--vsg-widget-density`) so they stay
   legible however clear the base window goes. Any value in between (or beyond) works too: copy a preset
   and edit the number.
5. **Lens strength** (addons, combinable with any of the above) — load `glass/lens/glass-lens-soft.css`
   or `-strong.css` after `glass.css`. Re-emits the SVG lens filters at ×0.7 (soft, a gentler bend) or
   ×1.4 (strong, a heavier bend); rim width scales with the bend so the lens stays under its own folding
   limit either way.
6. **Aberration** (addons, combinable with any of the above) — load one of
   `glass/aberration/glass-aberration-off.css`, `-subtle.css` (half the default fringing) or
   `-strong.css` (heavy red-to-blue fringing, like thick crystal) after `glass.css`.

The default material is colourless and thin; tint and density are both opt-in. Over a bright desktop,
raise density (`150` or `200`), or load the `graphite` tint (a denser smoky film) or the wallpaper addon,
to keep text easiest to read; Layer 1's own colours are unchanged either way and pass the contrast audit
on their own.

## Screenshots

![Glass Regular Dark, transparent window](screenshots/transparent/glass-regular-dark-hero.png)

Transparent-window mode, simulated by compositing a CDP capture of the window's own pixels (transparent
page background) over the maintainer's desktop picture, blurred the way Vibrancy's under-window material
blurs it (`scripts/composite-transparent.mjs`) — not a screen recording. See `screenshots/transparent/`.

### Variants

| Glass Regular Dark | Glass Clear | Glass Opaque |
|---|---|---|
| ![Glass Regular Dark](screenshots/glass-regular-dark-hero.png) | ![Glass Clear](screenshots/glass-clear-hero.png) | ![Glass Opaque](screenshots/glass-opaque-layer1-hero.png) |

The three shots above are wallpaper mode (an opaque window) — the "opaque window" counterpart to the
transparent hero above. `Glass Opaque` has no Layer 2 effects, by design — see [Install](#install).
`Glass Regular Light` also ships — the pipeline generates it at no extra cost — but it's kept for
completeness, not tuned for the transparent window, and isn't a headline variant here.

### Layer 1 alone vs. Layer 1 + 2

The command palette floating over code is where the refraction actually reads: a frosted body, a clear
refracted rim, and a chromatic edge where the backdrop bends.

| Layer 1 only | Layer 1 + 2 |
|---|---|
| ![Palette, Layer 1 only](screenshots/glass-regular-dark-layer1-palette.png) | ![Palette, Layer 1 + 2](screenshots/glass-regular-dark-palette.png) |

Hover and suggest widgets over code, in the transparent window: `screenshots/transparent/glass-regular-dark-hover.png`
and `-suggest.png` (the rim bends the code beside it; the frosted body stays readable).

**What you're looking at:**

- A lensing rim on floating widgets — the backdrop is genuinely displaced, not just blurred, and strong
  enough to be unmistakable in the command palette, hovers, suggest and notifications over code. The
  refracted rim replaces what is behind it rather than adding a second copy, so there's no double image.
- The window's own top and bottom edges bend what sits just inside them (title bar, status bar) toward
  the window centre, and the editor card's bottom edge bends the last visible code lines the same way —
  real refraction, not a static rim.
- A bevel band just inside every rim (cards, widgets, the window slab, capsule buttons) so edges read as
  thick glass even where there's nothing in-page for the lens to bend.
- A specular ring along the top edge, brightest near a fixed virtual light source.
- Layered slab shadows that read as material thickness, not a flat drop shadow.
- A neutral smoke behind the glass (wallpaper mode) giving every rim something to bend; an optional tint
  addon lays a thin coloured film across every plane instead.
- Small controls (activity-bar and status-bar pills, secondary buttons, the active tab, sticky scroll)
  as clear films rather than grey bodies, so they take on the colour of whatever sits behind them; only
  floating widgets keep a smoky body of their own.
- Concentric corner radii, one ladder: window 20px > cards 16px > widgets 14px > controls 9px > inner rows
  7px (window = card + VS Code's own 4px floating-card margin).

## Install

VS Glass ships in two layers. **Layer 1** is the color theme — install it the normal way, below. **Layer 2**
is the CSS that makes the theme's colors actually behave like glass (refraction, specular highlights,
motion) — it needs an extra step, covered in [Enable the glass effects](#enable-the-glass-effects-layer-2).
If you only install Layer 1, you get the right palette on flat rectangles; if you want it to look like
glass, do both.

### The theme (Layer 1)

**a. From Releases:**

```sh
# Download vs-glass-1.0.0.vsix from https://github.com/MilosHampl/vs-glass/releases/latest, then:
code --install-extension vs-glass-1.0.0.vsix
```

Or, in VS Code: Extensions view → `…` → **Install from VSIX…**.

**b. One-liner (needs the `gh` CLI):**

```sh
gh release download --repo MilosHampl/vs-glass --pattern '*.vsix' && code --install-extension vs-glass-*.vsix
```

**c. From source:**

```sh
git clone https://github.com/MilosHampl/vs-glass && cd vs-glass
npm ci && npm run build
npx @vscode/vsce package --no-dependencies
code --install-extension vs-glass-1.0.0.vsix
```

Then pick a theme (⌘K ⌘T / Ctrl K Ctrl T):

- **Glass Regular Dark** — the flagship variant.
- **Glass Clear** — more transparent, more luminous, with a dimming layer behind text-bearing surfaces to
  keep them legible.
- **Glass Opaque** — the Reduce Transparency equivalent: every alpha is 1, no Layer 2 effects. The right
  choice if you don't want Layer 2 at all — flat, distraction-free, good for screen-sharing or recording.
- **Glass Regular Light** — kept for completeness (the pipeline generates it at no extra cost); not tuned
  for the transparent window and not a headline variant.

VS Glass is **not on the VS Code Marketplace**. That's deliberate for v1.0.0 — see `PROGRESS.md` for what
publishing would require.

### Enable the glass effects (Layer 2)

This is the reason the project exists. `glass/glass.css` is the injected CSS that produces the lensing at
widget edges, the specular highlight ring, the material-thickness shadows, and the liquid hover/press
motion. Without it, the theme's colors sit on flat rectangles — no bending, no shine, no depth.

VS Code has no supported extension point for injecting CSS, so every route below works by **patching a
file inside your VS Code installation**. All three trip VS Code's own file-integrity check, producing a
harmless **"Your Code installation appears to be corrupt"** notice the first time — click the notification's
gear icon and choose **Don't Show Again**, or install
[`RimuruChan.vscode-fix-checksums-next`](https://marketplace.visualstudio.com/items?itemName=RimuruChan.vscode-fix-checksums-next)
and run its Apply command. This is expected, not a sign anything is broken. Pick one route:

- **Route C — Vibrancy Continued** (`illixion.vscode-vibrancy-continued`) — the intended setup: a
  genuinely see-through window using native OS blur, with `glass.css` alone providing the transparent-window
  material:

  ```json
  {
    "vscode_vibrancy.theme": "Custom theme (use imports)",
    "vscode_vibrancy.imports": [
      "/ABSOLUTE/PATH/vs-glass/glass/glass.css"
    ],
    "vscode_vibrancy.type": "under-window"
  }
  ```

  Add a tint, density, lens and/or aberration addon path after `glass.css` in `vscode_vibrancy.imports`
  if you want them, e.g. `/ABSOLUTE/PATH/vs-glass/glass/tints/glass-tint-indigo.css`,
  `/ABSOLUTE/PATH/vs-glass/glass/density/glass-density-150.css`,
  `/ABSOLUTE/PATH/vs-glass/glass/lens/glass-lens-strong.css`, and/or
  `/ABSOLUTE/PATH/vs-glass/glass/aberration/glass-aberration-subtle.css`.

![Transparent-window mode. A CDP capture of the window's own pixels over a transparent page background, composited over the maintainer's desktop picture blurred the way Vibrancy's under-window material blurs it. Not a screen recording.](screenshots/transparent/glass-regular-dark-hero.png)

  `vscode_vibrancy.imports` takes plain file paths, not `file://` URLs — the opposite of Route A, and the
  most common mistake. Run **Reload Vibrancy**, then fully restart VS Code — Vibrancy patches the Electron
  main process, which is only read at launch.

- **Route B — `scripts/inject.sh`** (this repo's own installer, no extension needed):

  ```sh
  bash scripts/inject.sh install                            # transparent-window mode (pairs with Route C)
  bash scripts/inject.sh install --wallpaper                 # wallpaper mode, for a window that isn't transparent
  bash scripts/inject.sh install --wallpaper --tint indigo   # wallpaper mode + a tint addon
  bash scripts/inject.sh install --density 150               # either mode + a denser preset
  bash scripts/inject.sh install --lens strong --aberration subtle  # either mode + retuned lensing
  ```

  Then quit VS Code fully (⌘Q) and reopen. It appends `glass.css` (and, with the flags above,
  `glass-wallpaper.css`, a tint, a density preset, and/or a lens/aberration preset) straight into VS
  Code's own `workbench.desktop.main.css` and fixes the `product.json` checksum for you, so — unlike
  Routes A and C —
  it needs **no CSP change at all**, and the corrupt-installation notice shouldn't appear with this route.
  `bash scripts/inject.sh status` reports drift after a VS Code update; `bash scripts/inject.sh uninstall`
  restores both files byte-exact from its own backup.

- **Route A — Custom CSS and JS Loader** (`be5invis.vscode-custom-css`). Install it, then add to
  `settings.json`. Custom CSS and JS Loader doesn't make the window transparent, so — because your window
  stays opaque — add `glass-wallpaper.css` after `glass.css` (and, optionally, a tint, density, lens
  and/or aberration preset last):

  ```json
  "vscode_custom_css.imports": [
    "file:///ABSOLUTE/PATH/vs-glass/glass/glass.css",
    "file:///ABSOLUTE/PATH/vs-glass/glass/glass-wallpaper.css"
  ]
  ```

  Run **Enable Custom CSS and JS**, then fully quit and reopen VS Code. Note the `file://` prefix — this
  extension wants a URL, not a plain path. Best if you're editing `glass.css` yourself: re-run
  **Reload Custom CSS and JS** after each edit for a fast loop.

**Updating after a VS Code upgrade:** VS Code's updater overwrites every file these routes patch, so all
three need to be re-applied after each update — this is ongoing maintenance, not one-time setup. Route C:
re-run **Reload Vibrancy**, then restart. Route B: re-run `bash scripts/inject.sh install` (check
`bash scripts/inject.sh status` first to see the drift). Route A: re-run **Enable Custom CSS and JS**.

**Full uninstall:** Route A — **Disable Custom CSS and JS**, then remove `vscode_custom_css.imports`. Route
B — `bash scripts/inject.sh uninstall`. Route C — **Disable Vibrancy**, then remove the
`vscode_vibrancy.*` settings. To remove the theme itself: `code --uninstall-extension MilosHampl.vs-glass`.

> **Risks**
> - Every route patches files inside your VS Code installation, not a supported extension point.
> - Route A removes the workbench's entire Content-Security-Policy meta tag for the lifetime of the
>   window — a real, if narrow, reduction in defense-in-depth while it's active.
> - The patch must be re-applied after every VS Code update, or it silently disappears.
> - Microsoft can change `workbench.experimental.modernUI` (rename, restrict, or remove it) in a future
>   release without notice; Layer 2's floating-panes optics depend on it and degrade to shadow-only without
>   it.

**Just want it off, right now, without touching settings?** Open DevTools (Help → Toggle Developer Tools)
and run `document.querySelector('.monaco-workbench').classList.add('vs-glass-off')` in the console. It's a
live, in-session toggle, lost on reload — useful for isolating whether Layer 2 is responsible for something
you're seeing. Switching to a different theme (including `Glass Opaque`) is the persistent equivalent.

Full walkthrough and troubleshooting: [`glass/install.md`](glass/install.md).

Layer 2 is built around VS Code's floating-card layout. Set `"workbench.experimental.modernUI": true` —
the intended layout, and the substrate for the floating-panes and concentric-geometry optics below.

## Recommended companion settings

```json
{
  "workbench.experimental.modernUI": true,
  "window.titleBarStyle": "custom",
  "editor.fontFamily": "'SF Mono', 'JetBrains Mono', Menlo, monospace",
  "editor.fontLigatures": true,
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.smoothScrolling": true,
  "workbench.list.smoothScrolling": true,
  "editor.minimap.renderCharacters": false,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active"
}
```

`SF Mono` is Apple's system monospace font — it is **not bundled** with VS Glass or VS Code, only
available if you already have it installed (e.g. via Xcode). `JetBrains Mono` is the first cross-platform
fallback. If you're on the Vibrancy Continued route (Route C above), also set
`"terminal.integrated.gpuAcceleration": "off"` — without it the terminal's GPU renderer can paint over the
vibrancy material incorrectly.

## How close is this to real Liquid Glass?

An honest scorecard against Apple's own description of each optic (WWDC25 sessions 219/323/356, HIG
Materials). Layer 1 = the color theme; Layer 2 = the injected CSS.

| # | Optic | Status | Layer | Notes |
|---|---|---|---|---|
| 1 | Lensing / refraction | Reproduced | 2 | SVG `feDisplacementMap` in `backdrop-filter`, stronger than earlier builds: frosted body, clear rim, chromatic aberration; `lens`/`aberration` addons retune the strength. Reads wherever glass overlaps in-page content — widgets over code, card rims over the editor seam, the window's own top/bottom edges, the editor's bottom seam — and, in wallpaper mode, the neutral smoke behind every card. Refracting what's actually behind the window (the desktop, another window, a playing video) is impossible from CSS, full stop; see the limitations note below. |
| 2 | Specular edge highlight | Reproduced | 2 | A `conic-gradient` ring from a fixed virtual light. Static — Apple's moves with device motion; ours moves only on hover/focus. |
| 3 | Material thickness | Reproduced | 2 | Layered inset/outer shadows, plus a bevel band just inside every rim, simulate a slab. Not content-aware the way Apple's is (shadow opacity doesn't change based on what's directly behind it). |
| 4 | Vibrancy | Approximated | 1 + 2 | Four alpha label tiers plus `saturate()` and `mix-blend-mode: plus-lighter` on chrome text. No true per-pixel colour sampling of what's behind each glyph. |
| 5 | Floating layered panes | Reproduced | 1 + 2 | VS Code's modern floating layout plus Layer 2's elevation shadows. Degrades to flush seams without `workbench.experimental.modernUI`. |
| 6 | Concentric geometry | Reproduced | 2 | Radius tokens overridden so inner radius = parent radius − padding. VS Code's own radii still drive most controls outside Layer 2's reach. |
| 7 | Adaptive tint | Approximated | 1 + 2 | Default material is colourless. In transparent-window mode, the OS blur of your real desktop supplies the adaptive tint; the optional tint addons (`glass/tints/*.css`) add a fixed coloured film instead — no colour mesh either way. |
| 8 | Liquid response | Approximated | 2 | Minimal by the owner's direction: press scale (buttons, icon buttons, pills), widget pop-in, and a focus glow on list rows — no hover motion anywhere, the most restrained of the eight. No spring physics, no morphing between shapes — Apple's motion model is elastic and undocumented numerically. |

Performance: on a 120 Hz display, editor scrolling measures p50 8.3 ms / p95 8.6 ms with every glass surface
active versus p50 8.3 ms / p95 8.5 ms with effects off. The heaviest case, scrolling code beneath an open
command palette, lands at p95 9.2 ms. Method and full numbers in `DESIGN.md` §6.

**What is not possible:** refracting what's actually behind the window — the desktop, another window, a
video playing underneath VS Code — is impossible from CSS, full stop. The renderer never receives those
pixels at all: `backdrop-filter` can only bend what the page itself painted. macOS composites whatever is
behind a window only after the page has already been drawn, and its behind-window materials (what
Vibrancy Continued enables) only blur and saturate; they don't hand those pixels back to the app to
filter. The only even-conceivable route is a native macOS 26 `NSGlassEffectView` experiment, which would
need its own native module inside Electron's main process and, even then, is unlikely to expose sampling
of what's behind the window — out of scope for this project. So Layer 2 refracts only in-page content,
and deliberately ships no "desktop mirror" or other fake (a painted copy of the wallpaper standing in for
the real thing), because the owner ruled fakery out. In transparent-window mode, refraction is visible
only where glass overlaps in-page content (widgets over code, sticky scroll, capsule buttons, card rims
over the editor seam); in wallpaper mode the neutral smoke gives every rim something to bend everywhere.
True content-aware shadows (opacity driven by what's directly behind an element). Device-motion-driven
highlights. Editor text is never filtered, by design — legibility comes first. Context menus are the one
overlay Layer 2 cannot reach at all: on macOS, VS Code shows native OS
menus by default, and with `window.menuStyle: "custom"` it renders them inside an isolated shadow root
injected CSS cannot penetrate, so they always show the theme's plain `menu.*` colours, never a glass
rim. Dropdown lists and every other overlay are unaffected.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) — this is a generated theme; almost nothing under `themes/` or
`glass/` should be hand-edited. It covers the build pipeline, the material model, audit gates, and the
release process. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT © 2026 Milos Hampl. See [`LICENSE`](LICENSE).

## Credits

- Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) and
  WWDC25 sessions 219 ("Meet Liquid Glass"), 323 ("Build a SwiftUI app with the new design"), and 356
  ("Get to know the new design system") — the design reference this project is built against. This is an
  unofficial, unaffiliated homage; Apple, macOS, and Liquid Glass are trademarks of Apple Inc.
- [shuding/liquid-glass](https://github.com/shuding/liquid-glass) and
  [kube.io's "Liquid Glass in the Browser"](https://kube.io/blog/liquid-glass-css-svg/) — the
  displacement-map-in-`backdrop-filter` lineage this project's lensing technique builds on.
- [ruri.design](https://ruri.design)'s Glass tool — the chromatic-aberration recipe (displaced R/G/B
  channels, recomposited) used in Layer 2's lens filters.
- [Vibrancy Continued](https://github.com/illixion/vscode-vibrancy-continued) and
  [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) —
  the two community extensions Layer 2's injection routes are built around.
- VS Code's own experimental modern UI (`workbench.experimental.modernUI`) — the floating-card layout
  Layer 2's optics are designed for.
