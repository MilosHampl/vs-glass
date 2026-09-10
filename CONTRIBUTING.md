# Contributing to VS Glass

Thanks for looking at VS Glass. This is a generated theme -- almost nothing in this repo should
be hand-edited directly. Read the "How the build works" section first; it explains why.

## How the build works

Everything about colour lives in one pipeline:

```
src/palette.ts + src/colors/*.ts   --npm run build-->   themes/*-color-theme.json
src/glass/glass.css                --npm run build-->   glass/glass.css, glass/glass-filters.svg
```

- **`src/palette.ts`** is the single source of truth: an OKLCH ladder that derives the four
  variants (Glass Regular Dark, Glass Regular Light, Glass Clear, Glass Opaque) from a small set
  of parameters, plus the Apple system-colour table.
- **`src/colors/*.ts`** (`chrome.ts`, `editor.ts`, `controls.ts`, `panels.ts`) map the palette
  onto the ~988 VS Code color-theme keys, grouped by UI area.
- **`src/tokens.ts`** / **`src/semantic.ts`** hold the TextMate `tokenColors` and
  `semanticTokenColors` rules.
- **`src/glass/glass.css`** is the Layer 2 effects source (lensing, specular rings, shadows,
  vibrancy, motion) -- see "Layer 2 development" below.
- **`src/build.ts`** runs all of the above and writes `themes/*.json` and `glass/*`.

Run the build with:

```bash
npm run build
```

**Never hand-edit `themes/*.json` or `glass/glass.css`/`glass/glass-filters.svg` directly** --
they are generated, and CI enforces this: it runs `npm run build` and fails if that changes any
committed file under `themes/` or `glass/`. If you find yourself wanting to tweak a hex value in
a generated theme file, the fix belongs in `src/palette.ts` or the relevant `src/colors/*.ts`
module instead.

## The material model

The palette is organised the way Apple's Liquid Glass HIG describes materials, not as a flat list
of colours:

- **ground** -- the window ground that glass floats over (Layer 2 paints a wallpaper here).
- **content** -- the content plane (the editor).
- **glass** -- a 4-level material stack: **chrome → raised → widget → overlay**, each level a
  translucent tint whose *composited* appearance follows a fixed OKLCH lightness ladder.
- **label tiers** -- primary / secondary / tertiary / quaternary vibrancy tiers, expressed as
  alpha over whatever sits behind them, not as fixed grays.
- **accent vs. accentText** -- `accent` is Apple's system colour used for UI (buttons, selection,
  indicators); `accentText` is the "Increased Contrast" grade of the same hue, used anywhere the
  colour has to be read as text (syntax highlighting, diagnostics, links).

Keep new colours inside this model: pick the right elevation in the glass stack, or the right
label tier, rather than inventing a one-off gray.

## Proposing a colour change

1. Edit `src/palette.ts` (for a systemic change -- e.g. the lightness ladder, an accent hue) or
   the relevant `src/colors/*.ts` module (for a single key or a handful of related keys).
2. `npm run build`.
3. `npm run audit:coverage && npm run audit:contrast` (or `npm run audit` for both).
4. Attach before/after screenshots for every variant your change touches (see "Testing locally"
   below for how to get them).
5. Update `CHANGELOG.md` under `[Unreleased]`.

## Audit gates and exceptions

- **`npm run validate`** checks every generated theme file against the VS Code color-theme shape
  (structure, hex format).
- **`npm run audit:coverage`** checks every theme against the ~988-key inventory: a key must
  either be set, or be documented as a deliberate omission in the owning `src/colors/*.ts`
  module. An undocumented gap is a real bug and fails the build.
- **`npm run audit:contrast`** checks WCAG contrast for foreground/background pairs.

If an audit fails and the failure is *intentional* (e.g. a deliberately low-contrast decorative
element), do not silence it in code. Add an entry to `scripts/contrast-allowlist.json` instead:

```json
{ "theme": "glass-clear", "pair": "tokenColor:comment/editor.background", "reason": "why this is acceptable" }
```

`theme` is a variant id or `"*"` for all variants; `pair` is the exact identifier the audit prints
in its failure line. Every allowlist entry needs a real `reason` -- it's reviewed like any other
change to the audit's pass/fail behaviour.

## Testing locally

Load the extension without packaging it:

```bash
code --extensionDevelopmentPath="$PWD"
```

or symlink this repo into your extensions directory so it behaves like an installed extension
(`~/.vscode/extensions/vs-glass-dev` on macOS/Linux), then select a variant from the theme picker.

For a tight screenshot loop while iterating on colour or Layer 2 CSS, start VS Code with a CDP
debug port and drive it with `scripts/cdp.mjs`:

```bash
open -a "Visual Studio Code" --args --remote-debugging-port=9333 --user-data-dir=/tmp/vsglass-dev
node scripts/cdp.mjs shot screenshots/dev.png
```

`scripts/cdp.mjs` also supports `eval "<js>"`, `css <file>` (inject/replace a dev `<style>` tag
live, without a reload -- see "Layer 2 development"), and `trace out.json <ms> "<js>"` for a
performance trace. Run `node scripts/cdp.mjs` with no arguments to see the full command list.

## Layer 2 development

Layer 2 (`glass/glass.css`, generated from `src/glass/glass.css`) is the pure-CSS effects layer:
lensing via an SVG `feDisplacementMap` in `backdrop-filter`, specular rings, thickness shadows,
vibrancy blend, concentric radii, the bevelled window slab and a press-only response. It never modifies a theme
key -- it only reads the CSS custom properties a theme sets and layers visual effects on top.

To iterate on it against a running VS Code:

1. Start VS Code with a debug port, e.g. `--remote-debugging-port=9334` (keep this separate from
   the port you use for screenshots, so you can leave a dev instance running):
   ```bash
   open -a "Visual Studio Code" --args --remote-debugging-port=9334 --user-data-dir=/tmp/vsglass-dev
   ```
2. Edit `src/glass/glass.css`.
3. `npm run build` (regenerates `glass/glass.css`).
4. Re-inject without restarting VS Code:
   ```bash
   node scripts/cdp.mjs --port 9334 css glass/glass.css
   ```
5. Repeat 2-4. Use `node scripts/cdp.mjs --port 9334 shot screenshots/dev.png` to capture the
   result at 2x for comparison against the previous iteration or against reference imagery.

For the actual injection routes end users have available (Custom CSS and JS Loader, Vibrancy
Continued's `imports`, or this project's own `scripts/inject.sh install`), see the README.

### Screenshot matrix and the two test beds

The screenshots in `screenshots/` come from two isolated VS Code instances, never from a personal
install:

- an unpatched VS Code with an opaque window (wallpaper mode): `node scripts/screenshots.mjs --port 9334
  --profile <profile> --layer2 both --addons glass/glass-wallpaper.css` writes the whole matrix
  (variants x scenes x Layer 2 on/off) at 2x;
- a Vibrancy Continued instance with a see-through window (the default mode): `scripts/transparent-shots.sh
  --port 9335 --profile <profile> --wall <desktop picture> --tints` captures each scene with a transparent
  page background and composites it over the blurred desktop picture with
  `scripts/composite-transparent.mjs` into `screenshots/transparent/` (captions say "simulated compositing").

Two things bite here. Chromium pauses `requestAnimationFrame` in an occluded window, so Monaco stops
rendering and every capture goes stale: launch the instances with `--disable-backgrounding-occluded-windows
--disable-renderer-backgrounding` (the script refuses to run when rAF is paused). And Vibrancy inlines its
`imports` into the app at patch time, so after every `npm run build` run **Reload Vibrancy** in that
instance and restart it, or you are looking at yesterday's CSS. Context menus are the one surface you
cannot screenshot through the DOM without `"window.menuStyle": "custom"` in the test profile; they render
in a shadow root and only take the theme's colours.

## Commit messages

Short, imperative, present tense (`Fix contrast on Glass Clear suggest widget`, not `Fixed...` or
`Fixes...`). Reference an issue with `#123` where relevant. A commit that changes generated output
should include the regenerated files from the same `npm run build` run as the source change --
don't hand-patch generated files, and don't split a source change from its regeneration across
commits.

## Release process

1. Bump `"version"` in `package.json` and add a new `## [X.Y.Z] - YYYY-MM-DD` section at the top
   of `CHANGELOG.md` (move the relevant `[Unreleased]` entries into it).
2. Commit that as its own change (e.g. `Release vX.Y.Z`).
3. Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Pushing the tag triggers `.github/workflows/release.yml`, which rebuilds, re-runs every audit,
   verifies the tag matches `package.json`'s version, packages the VSIX, and creates (or updates)
   the GitHub Release with the VSIX and the `glass/*` assets attached.

If a release is ever cut by hand first (`gh release create vX.Y.Z ...`), that's fine -- the
release workflow updates an existing release for the same tag rather than failing.
