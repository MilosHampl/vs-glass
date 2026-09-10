# VS Glass — Design

VS Glass ships two layers: Layer 1, a color theme (`themes/*.json`, generated from
`src/palette.ts`), and Layer 2, injected CSS (`glass/glass.css` + `glass/glass-transparent.css`,
generated from `src/glass/*.css` and `src/lens.ts`). This document explains what Apple's Liquid
Glass documentation says the material actually does, and how each piece is approximated inside a
Chromium/Electron surface that was never designed to host a Metal-rendered material. Every number
here was read from generated themes, research files, or a script run in this repo on 2026-09-10.

---

## 1. Goals and non-goals

**Goal: reproduce Liquid Glass's optical *behaviour*, not ship "another frosted theme."**
`research/prior-art.md` §4 surveyed ten-plus existing glass-flavoured VS Code themes and found every
one stops at `backdrop-filter: blur()` plus a translucent background — none attempt the eight things
Apple's material actually does (lensing, specular highlights that trace geometry, size-dependent
thickness, adaptive vibrancy, floating layered panes, concentric geometry, adaptive tint, a "liquid"
interaction response). VS Glass closes that gap using the one Chromium capability that makes it
possible: `backdrop-filter: url(#svgFilter)` with `feDisplacementMap`, which Chromium — uniquely
among engines — resolves (`research/css-liquid-glass.md` §a; WebKit tracks this as an explicit
non-support bug, #245510).

**Non-goal, hard rule: never filter editor text.** Apple's Liquid Glass is a functional layer above
content that must never degrade it (§2). No selector in `glass.css` puts `backdrop-filter`, `filter`,
or `mix-blend-mode` on `.monaco-editor`'s text nodes — only its *background* gets a slightly
translucent color (optic 7). Widgets that overlap code (suggest, hover, find, sticky scroll) filter
their own backdrop, which includes the code behind them, but their own glyphs are never blended or
displaced.

**Non-goal: Layer 2 is CSS-only, by design.** PROGRESS.md's Phase-1 findings confirm data-URI SVG
filters work inside `backdrop-filter` (finding 3) — no runtime script, no CSP change, no Trusted
Types dependency (finding 8). This bounds optic 8 ("liquid response"): real Liquid Glass reshapes
its map per frame from touch/motion; VS Glass can only transition fixed custom properties
(`--vsg-hl-x/y/a`) on `:hover`/`:focus-within` — see §4.8, §9.

**Non-goal: be honest about what CSS cannot do.** Four optics have no faithful CSS equivalent:
per-pixel Metal-computed refraction (approximated with a static, low-res displacement map, §4.1);
content-aware shadow opacity (§4.3, fixed per-elevation recipes); device-motion-driven specular
travel (§4.2, impossible — no accelerometer in Electron); and continuous environment sampling
(approximated with static wallpaper blobs, §3, not live sampling).

---

## 2. Reading Apple's material

Sourced from `research/apple-liquid-glass.md` (HIG "Materials"/"Color"/"Dark Mode", "Adopting
Liquid Glass," and WWDC25 sessions 219/356/323, fetched from Apple's own DocC JSON and transcripts).

**Lensing**, the defining trait:
> "The primary way Liquid Glass visually defines itself is through... Lensing... this new set of
> materials dynamically bends, shapes, and concentrates light in real time." — WWDC25 219

Sampling is content-relative, never glass-relative:
> "The glass material reflects and refracts lights, picking colors from nearby content... by
> sampling content from an area larger than itself. However, glass can not sample other glass." —
> WWDC25 323 (the documented root of the "never glass-on-glass" rule)

**Specular highlights** come from a virtual environment light, not a static gradient:
> "Light sources... shine on the material producing highlights that respond to geometry... these
> lights move in space... the lighting responds to device motion." — WWDC25 219

**Thickness scales with size**; shadows are content-aware:
> "When glass flexes... to larger sizes... it casts deeper, richer shadows, has more pronounced
> lensing... [Shadows] increase... opacity... over text. Conversely, it lowers... over a solid light
> background." — WWDC25 219

**Vibrancy** flips lightness to track the material:
> "Symbols and glyphs on top of Liquid Glass... flip from light to dark and vice versa, mirroring
> the glass's behavior... All content placed on the Regular variant will automatically receive this
> treatment." — WWDC25 219

**Layering — a distinct functional layer, never glass-on-glass:**
> "Liquid Glass forms a distinct functional layer... that floats above the content layer... Always
> avoid glass on glass... When placing elements on top of Liquid Glass, avoid applying the material
> to both layers. Instead, use fills, transparency, and vibrancy." — HIG Materials / WWDC25 219

**Concentric shapes**, a three-rule geometry system:
> "Fixed shapes have a constant corner radius. Capsules use a radius that's half the height of the
> container. And concentric shapes calculate their radius by subtracting padding from the parent's."
> — WWDC25 356

**Adaptive tint**, no inherent color:
> "By default, Liquid Glass has no inherent color, and instead takes on colors from the content
> directly behind it... becoming darker when the underlying content is light, and lighter when it's
> dark." — HIG Color

**Gel-like response**, confirmed spring-based:
> "Liquid Glass responds to interaction by instantly flexing and energizing with light... an inherent
> gel-like flexibility... Reduced Motion... disables any elastic properties." — WWDC25 219

### Regular vs. Clear, and the 35% dimming rule

> "Regular... works in any size, over any content and anything can be placed on top of it. Clear...
> does not have adaptive behaviors... To provide enough legibility... it needs a dimming layer...
> Clear should only be used when... [1] the element... is over media-rich content... [2] your content
> layer won't be negatively affected by introducing a dimming layer... [3] the content sitting above
> it is bold and bright." — WWDC25 219
>
> "If the underlying content is bright, consider adding a dark dimming layer of **35% opacity**." —
> HIG Materials

This is the only concrete numeric optical constant Apple publishes anywhere in this research.
`effects.dim` encodes it exactly: `0` for Regular Dark/Light/Opaque, `0.35` for Clear
(`src/palette.ts`), applied as `rgba(0,0,0,var(--vsg-dim))` under every card/widget sheen
(`src/glass/glass.css` §4/§5).

### Mapping to a VS Code surface

| Apple's layer | VS Code surface | Why |
|---|---|---|
| Content plane (never Liquid Glass) | Editor (`.part.editor > .content`, `.monaco-editor`) | "Don't use Liquid Glass in the content layer... keep it in the content layer to ensure clarity" (WWDC25 219) — translucent background only, never filtered. |
| Functional layer (floats above content) | Title bar, status bar, activity bar, sidebar, aux bar, panel, tab strip | The literal equivalent of "tab bars and sidebars" (HIG Materials). |
| Floating widgets (highest lensing) | Quick input, hover, suggest, parameter hints, find, menus, notifications, dialogs, debug toolbar | These genuinely overlap code (PROGRESS.md finding 11) — sidebar/panel sit beside the editor as DOM siblings, not on top of it. |

---

## 3. The palette as a model

`src/palette.ts` evaluates a `build()` function once per variant over a fixed structure: `ground` /
`wallpaper` (opaque backdrop) → `content` (editor) → `glass` (`chrome`/`raised`/`widget`/`overlay`,
a 4-level `Elevation` stack) → `label` (vibrancy tiers) → `accent`/`accentText` (Apple system
colours, two grades) → `effects` (Layer-2 tokens).

### Ground, wallpaper, content plane, and the four-level stack

Each `Elevation` carries `solid` (composited look, used for contrast math), `bg` (the `#RRGGBBAA`
written to theme JSON), `bgGlass` (same tint at Layer 2's alpha), `border`, and a `specular {hi, mid,
lo}` ring-alpha ramp. The OKLCH lightness ladder (`describe()`, run 2026-09-10):

```
Glass Regular Dark:  ground #0a0e17 L0.164 · content #13171f L0.204
                      chrome #1e232d · raised #272d37 · widget #313741 · overlay #3b414c
Glass Regular Light: ground #dadee6 L0.900 · content #f8fafe L0.985
                      chrome #ecf0f8 · raised #f1f5fe · widget #f5f9ff · overlay #fafcff
Glass Clear:         ground #070b14 L0.150 · content #10141c L0.191
                      chrome #191e28 · raised #222832 · widget #2d333d · overlay #373d48
Glass Opaque:         ground #070b14 L0.150 · content #10141c L0.191
                      chrome #1b212a · raised #262c36 · widget #313741 · overlay #3d434d
```

Regular Dark's raw ladder (`src/palette.ts`): `{ ground: 0.165, groundDeep: 0.11, content: 0.205,
chrome: 0.255, raised: 0.295, widget: 0.335, overlay: 0.375 }` — a near-uniform +0.04 step per
level, so each elevation reads as sitting slightly "above" the last, matching Apple's "thicker glass
at larger sizes" reading (§7): overlay-level surfaces get both the highest ladder step *and* the
widest lens rim/deepest shadow (§4.1, §4.3). Clear's ladder sits slightly below Regular Dark's at
every level (chrome 0.235 vs. 0.255) because Clear leans on translucency, not lightness, for its
"thinner" read.

### `translucent(solid, ground, α)`: look and transparency, chosen independently

```ts
function translucent(solid: Hex, ground: Hex, a: number): Hex {
  if (a >= 1) return opaque(solid);
  const s = parseHex(solid), g = parseHex(ground);
  for (let alphaTry = a; alphaTry <= 1.0001; alphaTry = Math.min(1, alphaTry + 0.05)) {
    const ch = (sv: number, gv: number) => (sv - gv * (1 - alphaTry)) / alphaTry;
    const r = ch(s.r, g.r), gg = ch(s.g, g.g), b = ch(s.b, g.b);
    if ([r, gg, b].every(v => v >= -0.002 && v <= 1.002))
      return rgbToHex(Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, gg)), Math.min(1, Math.max(0, b)), alphaTry);
  }
  return opaque(solid);
}
```

Given the *look* a pane should have once composited over `ground` (`solid`) and the *transparency*
wanted (`a`), this back-solves an RGBA value that composites to exactly `solid`. It lets the OKLCH
ladder (fixes the look) and per-variant alpha knobs (fix how much shows through) vary independently
— Regular Dark's `chrome` alpha is `0.62`, Clear's is `0.34`, both composite to their own
ladder-fixed `solid`. Only near gamut extremes does the loop walk `alphaTry` up past the requested
value.

### Hue 262, chroma 0.012–0.02

```ts
const HUE = 262;
const gray = (L: number, C = 0.018) => oklch(L, C, HUE);
```

Every gray — ground, content, all four elevations — runs through this one function. Chroma is
`0.02` dark, `0.012` light (light grounds need less chroma before reading as simply "blue"). This
encodes Apple's "no inherent color... takes on colors from the content directly behind it" (HIG
Color) as a designed floor: a literal implementation needs real-time sampling Chromium cannot do
without JS, so hue 262 guarantees glass never reads as flat neutral gray; the wallpaper mesh (§4.7)
supplies the actual adaptive color.

### Label tiers: the macOS ramp, adapted

```ts
primary:    alpha(base, (isDark ? 0.86 : 0.88) + boost);
secondary:  alpha(base, (isDark ? 0.58 : 0.64) + boost * 0.8);
tertiary:   alpha(base, (isDark ? 0.44 : 0.54) + boost * 0.6);
quaternary: alpha(base, (isDark ? 0.16 : 0.18) + boost * 0.3);
```

`apple-liquid-glass.md` §5 gives the secondary-sourced macOS `NSColor` ramp: `labelColor` 84.7%,
`secondaryLabelColor` ~50–55%, `tertiaryLabelColor` ~25–26%, `quaternaryLabelColor` 9.8%. VS Glass
tracks that shape but not those numbers: light mode needs *stronger* tiers than dark to clear the
same WCAG ratios, because dark text loses contrast faster against light glass than light text does
against dark glass. Clear's `labelBoost: 0.1` compensates for its much lower material alpha
(`chromeGlass: 0.26` vs. Regular's `0.5`); `describe()` confirms it — Clear's primary label
composites to 14.78:1 on chrome vs. Regular Dark's 11.45:1.

### Apple system colours in two grades, and the hardest-background rule

`APPLE.light`/`dark` are Apple's twelve unified system colours verbatim from the HIG Color page's
swatch `alt` text (dated 2025-06-09), e.g. `blue: '#0088FF'`/`'#0091FF'`. `APPLE.lightContrast`/
`darkContrast` are Apple's own "Increased Contrast" grade, e.g. blue → `#1E6EF4`/`#5CB8FF`. `accent`
(default grade) is used for UI chrome; `accentText` (contrast grade, further hardened) for anything
read as text:

```ts
const hardestBg = isDark ? gray(k.ladder.overlay, chroma) : gray(k.ladder.chrome, chroma);
const accentText = ... ensureContrast(ensureContrast(accentText0[c], contentBg, 4.5), hardestBg, 4.5);
```

`accentText` is `ensureContrast`'d against `contentBg` *and* against `hardestBg` — **overlay** level
in dark mode, **chrome** level in light mode. In dark mode the lightest elevation (overlay: dialogs,
dropdown lists) is hardest for light-on-dark accent text; in light mode the darkest elevation
(chrome: sidebar, panel) is hardest, inverted. This guarantees every syntax/diagnostic/link colour
clears AA wherever in the four-level stack it renders, not just against the editor it was tuned on.

Filled controls carry white text, so fills are darkened until white clears 4.5:1
(`fillFor = c => ensureContrast(c, '#ffffff', 4.5)`), applied to `accentFill`/`errorFill`/
`infoFill`/`successFill`. The one exception runs the other way: system yellow is light in both
Apple grades (`#FFCC00`/`#FFD600`), so `onWarning` is a fixed dark, hue-262 text colour for anything
filled with it, rather than white.

### Syntax mapping, terminal ANSI, and the four variants' knobs

Syntax roles map to Apple hues by grouping, identically across all four variants: `keyword`/
`storage`/`control` → pink; `string` → orange; `stringEscape`/`docTag`/`function`/`method` → teal/
mint; `number`/`constant`/`enumMember` → yellow; `type`/`class`/`interface` → indigo (unused
elsewhere in syntax, so type-level identifiers own a hue no other category shares); `macro`/
`decorator` → purple; `tag` → blue; `variable`/`parameter`/`namespace` → `fg` (boosted to 7:1/AAA,
since it's read continuously — the majority of code); `comment`/`docComment` → a fixed desaturated
off-white/off-black, `ensureContrast`'d to 4.5:1 regardless of accent choices.

Terminal ANSI: in dark variants, normal colours use Apple's default grade and bright colours use the
contrast grade; light variants flip this (normal needs the contrast grade to read on a light panel;
bright falls back to a 3.2:1-hardened default grade). `terminal.background` is fully transparent
(`#00000000`) — the panel behind it supplies the material, which is why `audit-contrast.mjs`
resolves ANSI contrast against `panel.background` (§7).

| Variant | blur / blurWidget | saturate | lensScale / lensEdge | aberration | exaggeration | dim |
|---|---|---|---|---|---|---|
| Regular Dark | 18 / 22 px | 1.55 | 10 / 26 px | 0.7 px | 0.3 | 0 |
| Regular Light | 22 / 26 px | 1.35 | 9 / 26 px | 0.5 px | 0.3 | 0 |
| Clear | 8 / 12 px | 1.9 | 13 / 30 px | 2.2 px | 0.5 | 0.35 |
| Opaque | 0 / 0 px | 1.0 | 0 / 30 px | 0 px | 0 | 0 |

Clear is the *least* blurred (Apple: "highly translucent... prioritizing visibility of the
underlying content") but the most saturated/aberrated, and the only variant needing a dimming layer
— consistent with Apple's three-condition Clear rule (§2). Opaque zeroes every knob; `GUARD` (§4, §6)
excludes it from Layer 2 entirely, so it is what the other three look like with optics off, not a
fifth design.

---

## 4. The eight optics — how each is implemented

### 4.1 Lensing / refraction

**Apple:** Metal-computed per frame, samples "an area larger than itself," cannot sample other glass.

**VS Glass:** `backdrop-filter: url("data:image/svg+xml;utf8,...#id")`, generated per aspect class by
`src/lens.ts`, wired in by `src/build.ts`. PROGRESS.md finding 2 confirms Chromium 148 honours
`feDisplacementMap` via `backdrop-filter`; finding 3 confirms the data-URI form needs no external
file and no JS — the entire lens pipeline is static CSS.

**Map encoding:** `makeMap()` writes a small RGBA PNG per class — **R = x-displacement, G =
y-displacement** (128 = none), **B = rim weight** (0 centre → 255 edge), which is what lets one
filter composite a frosted-centre/clear-rim look.

**Amplitude compensation:** filters use `objectBoundingBox` units (0..1, fractions of the element's
own box), so a `scale` fraction of width ≠ the same fraction of height unless square:

```ts
const ampX = cls.axes === 'y' ? 0 : Math.min(1, h / w);
const ampY = cls.axes === 'x' ? 0 : Math.min(1, w / h);
```

pre-scaling the G-channel amplitude so a class's representative size (e.g. `sidebar: 300×820`)
produces equal *pixel* displacement on both axes despite being far from square.

**Folding rule:** PROGRESS.md finding 5 — slope over 1 (`scale ÷ edge-zone width × map derivative`)
folds the backdrop and doubles text; keep `|d(offset)/dx| < ~0.7`. `profile()`'s power-2 easing
(`Math.pow(t, 2)`) keeps peak slope well under that threshold as long as `lensScale` stays a modest
fraction of `lensEdge` — displacement should never exceed roughly 0.4× the rim width.

**Why never `%` in `userSpaceOnUse`:** finding 4 — percentages there resolve against the SVG's
zero-size viewport and silently produce nothing. `filterSvg()` uses `objectBoundingBox` throughout,
so no `%` ever appears in generated markup.

**Frosted-centre / clear-rim composite:** the source is blurred wholesale (`feGaussianBlur ...
result='frost'`); a separate branch displaces the *sharp* source toward the centre
(`feDisplacementMap`), lifts it slightly (`feComponentTransfer`, `slope='1.07'`), masks to only the
rim via the map's B channel (`feComposite in='lensLit' in2='rimA' operator='in'`), then composites
**over** the frosted body (`operator='over'`) — one filter, no JS, producing the flat-interior /
sharp-lit-rim read Apple's reference imagery shows.

**Chromatic aberration**, credited to ruri.design's Glass tool (studied per PROGRESS.md's mid-build
directives): the sharp source's R/G/B channels split into single-channel images, each displaced by a
different `scale` (`scale±aberration`), and re-added:

```ts
feComposite(in='dR', in2='dG', operator='arithmetic', k1=0, k2=1, k3=1, k4=0) // → dRG
feComposite(in='dRG', in2='dB', operator='arithmetic', k1=0, k2=1, k3=1, k4=0) // → lens
```

`k2=k3=1, k1=k4=0` is a pure additive sum, recombining three independently-displaced channels into
one RGB image with a colour fringe at the rim. `aberration` is `0`/`0.5`/`0.7`/`2.2px` across
Opaque/Regular Light/Regular Dark/Clear — Clear gets by far the most, matching its more-visible,
more-distorted character.

**Aspect classes** (`LENS_CLASSES`, `src/lens.ts`):

| Class | Size | Axes | Rim × | Used for |
|---|---|---|---|---|
| `widget` | 560×360 | xy | 0.8 | quick input, suggest, hovers, notifications |
| `menu` | 240×320 | xy | 0.6 | context menus, dropdown lists |
| `sidebar` | 300×820 | xy | 0.9 | side/aux bar cards |
| `panel` | 1100×320 | xy | 0.9 | bottom panel card |
| `column` | 48×820 | x | 0.5 | activity bar |
| `strip` | 1400×36 | y | 0.35 | title/status bar, tab strip, sticky scroll |

`rim` scales `lensEdge`/`lensScale` down for thinner surfaces so the lens zone doesn't consume a
36px strip.

**Refraction needs an opaque in-page backdrop:** PROGRESS.md finding 6 — under a transparent window
(Vibrancy, 20%-alpha editor) the displaced copy composites over the still-visible original and
ghosts; on an opaque backdrop displacement is clean. This is why wallpaper mode paints an opaque
in-page ground (§5).

**Real vs. simulated:** the displacement is real, GPU-evaluated `feDisplacementMap` math — not
faked. The *map* is a static, low-res, shape-generic profile per class, not Apple's per-frame
computation from actual glass geometry. **Gap:** no per-element fitting or resize response (§9).

### 4.2 Specular edge highlight

**Apple:** a virtual environment light tracing geometry, moving with interaction and device motion.

**VS Glass:** a `::before` ring, `conic-gradient(from var(--vsg-light-angle) at 22% 12%, ...)`,
masked to ~1px via `mask-composite: exclude` (`glass.css` §1/§4/§5). Alphas come from the palette's
`specular {hi, mid, lo}` ramp, brighter at higher elevations (dark `chrome: [0.42, 0.14, 0.03]` →
`overlay: [0.72, 0.24, 0.06]`), tracking "thicker glass has more pronounced effects" (§7.3).
`--vsg-light-angle` is fixed at `225deg` for every variant.

**Real vs. simulated:** the shape is a faithful static approximation. **Impossible, not
unimplemented:** device-motion response — Electron has no accelerometer.

### 4.3 Material thickness

**Apple:** thickness scales with current size; shadow opacity is content-aware.

**VS Glass:** a fixed layered `box-shadow` per elevation (`--vsg-thickness-chrome`/`-widget`):

```css
--vsg-thickness-widget:
  inset 0 1px 0 rgba(var(--vsg-spec-rgb), calc(var(--vsg-widget-spec-mid) * 0.9)),
  inset 0 -1px 0 rgba(var(--vsg-shadow-rgb), 0.30),
  inset 0 0 18px rgba(var(--vsg-shadow-rgb), 0.08),
  0 18px 48px rgba(var(--vsg-shadow-rgb), 0.45),
  0 2px 8px rgba(var(--vsg-shadow-rgb), 0.35);
```

Widget shadows (`0 18px 48px`) are deeper/wider than chrome's (`0 10px 30px`) — a fixed per-tier
choice standing in for "thickness scales with size," not a live function of rendered size.

**Real vs. simulated:** fully simulated — `box-shadow` has no notion of what's behind an element, so
content-aware shadow opacity has no CSS path (§9).

### 4.4 Vibrancy

**Apple:** vibrant labels "flip from light to dark... mirroring the glass's behavior."

**Layer 1:** label tiers are `#RRGGBBAA`, not opaque — genuinely alpha-composited with whatever sits
behind them wherever VS Code renders them, without the per-instance light/dark flip (VS Glass's
label base is fixed per theme-type, not evaluated per instance). **Layer 2:**
`mix-blend-mode: var(--vsg-vibrancy-blend)` (`plus-lighter` dark / `multiply` light) on a small, fixed
set of chrome text/icon roles — window title, status-bar labels, activity-bar labels, sidebar/aux
title labels, inactive tab labels, breadcrumbs (`glass.css` §7) — never on editor text or widget
body text.

**Real vs. simulated:** the alpha-tier mechanism is real, working vibrancy (true compositing).
**Gap:** no per-instance backdrop-luminance evaluation — one fixed flip direction per theme.

### 4.5 Floating layered panes

**Apple:** "a distinct functional layer... that floats above the content layer"; never glass-on-glass.

**VS Glass:** VS Code 1.136's `workbench.experimental.modernUI`/`floatingPanels` adds
`.floating-panels.modern-ui` with real margins and rounded corners (PROGRESS.md finding 10) — the
substrate `glass.css` §4 applies chrome material, lens filters, thickness shadow, and specular ring
to; §2 paints the wallpaper mesh into the gaps. Without the class, a fallback rule swaps the
elevation shadow for a flatter inset-seam treatment (no gap for a floating card's shadow).

Widgets over chrome still get their own `backdrop-filter`, which reads as glass-on-glass if taken
literally — but Apple's stated reason for the rule ("glass can not sample other glass... inconsistent
behavior," WWDC25 323) doesn't map cleanly here: VS Glass filters sample raw rendered pixels, not a
`GlassEffectContainer`-style shared sampling region, because Chromium has no such primitive (§9).

**Real vs. simulated:** floating-pane geometry and shadows are real, rendered structures. **Gap:** no
shape-merging/morphing container equivalent (§9).

### 4.6 Concentric geometry

**Apple:** "concentric shapes calculate their radius by subtracting padding from the parent's."

**VS Glass:** `glass.css` §1 overrides VS Code's radius custom properties (`--vscode-cornerRadius-
small/medium/large/xLarge` → `--vsg-radius-inner/control/card/card+4px`); §6 hand-sets inner-element
radii relative to their container (list rows: `--vsg-radius-inner`; widget rows: `widget − 6px`;
inputs/buttons: `--vsg-radius-control`) — an authored approximation, since CSS has no native
concentric-radius primitive (no `.rect(corner: .containerConcentric)` equivalent).

**Real vs. simulated:** rendered radii are real and correctly nested. **Gap:** the relationship is
hard-coded per selector, not computed from actual padding.

### 4.7 Adaptive tint

**Apple:** "no inherent color... takes on colors from the content directly behind it."

**VS Glass:** two layers — the hue-262 floor (§3) on every gray, plus a **wallpaper mesh** (six
radial-gradient blobs in palette hues, `--vsg-wallpaper`, `src/build.ts`/`wallpaper.blobs` in
`palette.ts`) painted onto the ground, e.g. Regular Dark: indigo top-left, magenta-violet
bottom-right, teal top-right, blue bottom-left, plus pink/mint cores — giving every pane's
`saturate()`/`brightness()`/`contrast()` backdrop stack (`--vsg-filter-chrome`) something colourful
to actually process, rather than gray-on-gray.

**Real vs. simulated:** the saturate/lens pipeline genuinely processes real wallpaper pixels — not
faked. The *source* is synthetic: a fixed mesh, not the user's real desktop/content (partially real
only in transparent-window mode, §5).

### 4.8 Liquid response

**Apple:** "instantly flexing and energizing with light... scaling, bouncing, and shimmering,"
confirmed spring/elastic.

**VS Glass:** `@property`-typed `--vsg-hl-x/-y/-a` (`glass.css` §0), transitioned over 240ms
(`cubic-bezier(.2,.8,.2,1)`) on `:hover`/`:focus-within` for widgets/cards. Buttons get a restrained
response after an explicit revert (PROGRESS.md decision 5: an earlier showy sheen-sweep/lift/glow
treatment was reverted at the user's direction — "make it as true to macOS Liquid Glass as possible
— the Control Center style buttons") to a capsule toggle: thin top specular ring, tinted frosted
fill, hover brightens ~7% (`filter: brightness(1.07–1.08)`), `:active { transform: scale(0.96) }`
with a fast 60ms return, no sweeps or overshoot.

**Real vs. simulated:** transitions are real, interpolated, GPU-composited. **Gap:** CSS
`cubic-bezier` is a fixed-duration ease, not Apple's physical spring (`apple-liquid-glass.md` §6
confirms no spring constants are ever published — this is an interpretation, not a port); no
cross-element illumination propagation ("glow spreads... onto any Liquid Glass elements nearby").

---

## 5. Wallpaper mode vs. transparent-window mode

Two Layer-2 configurations exist because of one directive and one constraint pulling opposite ways.
Directive (PROGRESS.md, mid-build): *"The entire window should be transparent with the liquid glass
effect."* Constraint (finding 6, §4.1): refraction ghosts unless the backdrop it displaces is
opaque. `backdrop-filter` cannot see the desktop — true window transparency can only come from the
OS (Vibrancy's native blur), which is incompatible with clean in-page refraction on the same surface.

**Wallpaper mode** (`glass/glass.css`, default): `@G { background: var(--vsg-wallpaper) !important;
}` paints an opaque in-page mesh; every glass surface refracts that — clean, ghost-free lensing
everywhere, at the cost of the window not actually being transparent.

**Transparent-window mode** (`glass/glass-transparent.css`, addon, loaded after `glass.css`):
requires Vibrancy Continued (`under-window`/`sidebar`/`hud`, "Custom theme (use imports)"). Removes
the wallpaper (`background: transparent !important`), keeps every plane translucent
(`--vsg-content-bg-window`, `--vsg-chrome-window`, `--vsg-widget-window` — e.g. Clear's chrome-window
alpha `0.26` vs. Regular's `0.42`), and adds a dimming layer (`--vsg-dim-window`: `0.22` dark / `0.1`
light) since the real desktop behind the window could be anything. Recommended pairing with Vibrancy
Continued — it's the configuration Vibrancy's OS blur exists to support; running wallpaper mode under
Vibrancy wastes that blur on a surface painting its own opaque mesh underneath.

**Trade-off:** wallpaper mode gains guaranteed clean refraction and a designed-legible backdrop, at
the cost of a synthetic, not-actually-transparent window. Transparent mode gains the literal
whole-window transparency requested and the real desktop, at the cost of ghosting risk wherever a
backdrop isn't fully opaque (finding 6 is unconditional) — mitigated, not eliminated, by higher
per-surface alphas. Refraction stays genuinely clean only where glass overlaps in-page content
(widgets over code, sticky scroll) — exactly where finding 11 says lensing is most visible anyway.

---

## 6. Performance

**Method:** `scripts/perf.mjs` connects over CDP (`--remote-debugging-port`, default 9334) and runs
an in-page `requestAnimationFrame` sampler while synthetic `WheelEvent`s scroll the editor (~60
events/s, reversing every 40 ticks) — in-page so CDP round-trip latency doesn't skew results. Frames
are sampled with glass **ON**, then again with `.vs-glass-off` added to `.monaco-workbench` (the
`GUARD` kill-switch in `src/build.ts`), so the delta is the effects' cost.

**Numbers** (120 Hz display, 4 s per run, window visible — Chromium pauses `requestAnimationFrame`
entirely for occluded windows, which is what produced an earlier "no frames" result; `perf.mjs` now
refuses to measure a hidden window):

| scenario | state | p50 | p95 | max | frames > 16.7 ms | frames > 33 ms |
|---|---|---|---|---|---|---|
| editor scroll | glass ON | 8.3 ms | 10.2 ms | 36.4 ms | 0.4 % | 0.2 % |
| editor scroll | glass OFF | 8.3 ms | 9.8 ms | 10.4 ms | 0.0 % | 0.0 % |
| scroll under open command palette | glass ON | 8.3 ms | 16.7 ms | 58.4 ms | 5.2 % | 0.2 % |
| scroll under open command palette | glass OFF | 8.3 ms | 10.1 ms | 10.4 ms | 0.0 % | 0.0 % |

Editor scrolling is unaffected: the seven persistent glass surfaces sit beside the editor, not over
it, so nothing re-filters while code moves (two slow frames in 476 is the compositor tail, not a
trend). The heaviest case is deliberately the pathological one — scrolling code *beneath an open
command palette* re-runs the palette's displacement + 22 px blur over a 600×420 CSS-px backdrop every
frame; p95 lands exactly on 16.7 ms (60 fps) with one frame above 33 ms in four seconds. Typing and
scrolling with hovers, suggest widgets or menus open behaves the same way (smaller backdrops, cheaper).

**Backdrop budget:** `css-liquid-glass.md` §g — "budget SVG-displacement `backdrop-filter` for at
most a handful of chrome surfaces... do NOT apply... per list row... or inside a scrolling list."
Persistent-filter surfaces: **title bar, status bar, activity bar, sidebar, aux bar, panel, tab
strip — seven.** Widgets filter only while open (not in the DOM otherwise); nothing inside a
scrolling list carries its own filter; the editor's text is never filtered. Every filtered rule also
sets `isolation: isolate` (§g: scopes blend modes, gives the compositor a clean boundary) and none of
the seven nests inside another's backdrop-affected subtree, avoiding the "exponential degradation"
nesting risk §g warns about.

**`prefers-reduced-transparency` kill-switch:** `glass.css` §9 forces every `backdrop-filter` to
`none` under this media query, swapping to opaque `solid` colours — "strictly cheaper than the
default" (§h). `.vs-glass-off` is the manual equivalent, implemented at the `GUARD` selector level:

```ts
export const GUARD = '.monaco-workbench[class*="-vs-glass-themes-glass-"]:not([class*="glass-opaque"]):not(.vs-glass-off)';
```

**Verification note:** `perf.mjs` requires a live VS Code instance with a debugging port open; none
was available in this environment, so the numbers above are quoted from PROGRESS.md rather than
re-run — stated explicitly in this task's final report.

---

## 7. Accessibility and contrast

**Method:** `scripts/audit-contrast.mjs` computes WCAG 2.x contrast for 330 pairs per theme (165 from
`research/all-color-keys.json` plus hand-picked extras, plus every `tokenColors`/
`semanticTokenColors` foreground vs. `editor.background`), compositing any alpha-carrying key over
its real ground chain first (`editor*` → `editor.background`; `terminal*` → `panel.background`;
everything else → `titleBar.activeBackground`, chained recursively) — `titleBar.activeBackground` is
the one key PROGRESS.md finding 9 confirms the workbench grid view actually paints through
(`.monaco-workbench`'s own background is a hardcoded, non-themeable constant). Text pairs need
4.5:1, UI pairs 3:1.

**Numbers** (`node scripts/audit-contrast.mjs`, run 2026-09-10):

| Theme | Evaluated | Pass | Fail | Justified |
|---|---|---|---|---|
| glass-clear | 330 (7 skipped) | 328 | 2 | 2 |
| glass-opaque | 330 (7 skipped) | 328 | 2 | 2 |
| glass-regular-dark | 330 (7 skipped) | 325 | 5 | 5 |
| glass-regular-light | 330 (7 skipped) | 323 | 7 | 7 |

Result: **PASS**, zero unjustified failures. Skipped checks are pairs keyed to one of the 14
deliberately-omitted keys below.

**Justified exceptions** (`scripts/contrast-allowlist.json`): `textBlockQuote.background/
editor.background` (all) — background-on-background, not text/boundary. `disabledForeground/
editor.background` (all) — WCAG-exempt disabled state, tertiary tier still ≥3:1.
`list.deemphasizedForeground/sideBar.background` (all) — intentional de-emphasis, ≥3.9:1.
`gitDecoration.ignoredResourceForeground/sideBar.background` (all) — intentional dimming, ≥3:1.
`checkbox.disabled.foreground/checkbox.disabled.background` (all) — disabled, exempt, ≥3:1.
`editorError.foreground`/`editorInfo.foreground` vs. their own `.background` (glass-regular-light
only) — squiggle colour is a non-text UI indicator (3:1 target), 3.4:1 passes; the audit tags it
"text" only because the key name says Foreground. `welcomePage.progress.foreground/
welcomePage.progress.background` (all) — progress-bar fill vs. track, non-text UI, ≥4.2:1.

**Coverage** (`node scripts/audit-coverage.mjs`, run 2026-09-10): all four themes report **974/988
keys set, 14 deliberate omissions, 0 unintentional gaps — PASS**. Omissions (identical across
themes, documented via `DELIBERATELY UNSET` blocks in `src/colors/*.ts`) include
`radio.inactiveBackground`/`Foreground`, `editor.findMatchForeground`, `editor.selectionForeground`,
`editorBracketMatch.foreground`, `terminal.selectionForeground`, and undocumented
`chat.voiceListeningGlow`/`voiceSpeakingGlow`.

**Reduced motion/transparency:** `glass.css` §9 — `prefers-reduced-transparency: reduce` drops every
`backdrop-filter` to `none` and every surface (including the ground) to its opaque `solid` colour;
`prefers-reduced-motion: reduce` sets `transition: none !important; animation: none !important;`
everywhere under the guard — the direct implementation of Apple's own stated modifiers ("Reduced
Transparency, makes Liquid Glass frostier... Reduced Motion decreases the intensity," WWDC25 219).

**Glass Opaque as high-contrast fallback:** `opaqueMode` sets every alpha to `1` and zeroes every
Layer-2 knob; `GUARD` explicitly excludes `glass-opaque`, so it never receives a filter, lens, ring,
or motion — positioned in `glass/install.md` for screen-sharing/recording, and functionally the
theme to reach for under `prefers-contrast: more`, since it needs no fallback path at all — it already
is what the fallback produces.

---

## 8. What is simulated vs. real

| Optic | Real | Simulated / approximated |
|---|---|---|
| 1. Lensing | `feDisplacementMap` genuinely bends backdrop pixels | Static, low-res, shape-generic map per class, not per-frame Metal geometry |
| 2. Specular highlight | Rendered conic-gradient ring, per-elevation ramp | Fixed 225° light; no device-motion response (impossible — no accelerometer) |
| 3. Thickness | Rendered layered `box-shadow` | Fixed per-elevation recipe; no content-aware shadow opacity |
| 4. Vibrancy | Real alpha compositing of label tiers | No per-instance light/dark flip; one fixed direction per theme |
| 5. Floating panes | Real floating-card geometry, shadows, gaps | No `GlassEffectContainer`-style shared sampling/merging |
| 6. Concentric geometry | Real nested rounded corners | Hand-authored per-selector radii, not computed from padding |
| 7. Adaptive tint | Real saturate/backdrop processing of wallpaper pixels | Wallpaper is a synthetic fixed mesh, not the real desktop (partial exception: transparent-window mode) |
| 8. Liquid response | Real interpolated CSS transitions | Fixed-duration ease, not a physical spring; no cross-element illumination propagation |

---

## 9. Open problems / future work

- **A JS enhancer for exact per-element maps.** Six fixed aspect classes (§4.1) approximate every
  element of a rough shape; a `ResizeObserver`-driven enhancer could fit a map to each element's
  actual size/radius, and approximate `GlassEffectContainer`-style shared sampling/shape merging
  (§4.5) — deliberately deferred for v1 to keep Layer 2 CSS-only (§1), not architecturally blocked.
- **Content-aware shadows** (§4.3) — would need `elementsFromPoint`/`IntersectionObserver`-driven
  text-density detection; not attempted.
- **Device-motion highlights are impossible**, not unimplemented — Electron has no accelerometer and
  VS Code's window doesn't tilt. Permanent, structural.
- **Cheaper widget blur while scrolling** (§6) — the one measurable cost is a 22 px SVG blur over the
  command palette while code scrolls beneath it (p95 16.7 ms). A smaller blur radius for the widget
  class, or `feGaussianBlur` at half resolution via `feImage`/`feTile` tricks, would buy headroom on
  60 Hz machines; not done because 120 Hz never dropped below 60 fps.
- **Windows/Linux Vibrancy materials** — §5's transparent-window mode was designed and verified only
  against macOS Vibrancy (`mica`/`under-window`/`sidebar`/`hud`). Vibrancy Continued also supports
  Windows 11 Acrylic/Mica and partial Linux (`prior-art.md` §1); the `--vsg-*-window` alphas were
  tuned by eye against macOS's blur characteristics and untested on either other platform.
- **VS Code's `modernUI` experiment being flipped remotely** — §4.5 depends on
  `workbench.experimental.modernUI`/`floatingPanels`, explicitly experimental settings (finding 10)
  that could change shape or default state in any release, including server-controlled rollouts. The
  `@G:not(.floating-panels)` fallback exists for exactly this but hasn't been tested against a build
  where the experiment is removed entirely rather than toggled off.

---

## 10. Provenance

### Research folder map

| File | Establishes |
|---|---|
| `research/apple-liquid-glass.md` | The Apple-side spec (HIG + WWDC25 219/356/323, quoted verbatim). Source for §2/§3/§4's Apple claims, the 35% dimming rule, system-colour RGB tables, and the flagged-secondary label-alpha ramps. |
| `research/css-liquid-glass.md` | Chromium feasibility: `backdrop-filter: url()` + `feDisplacementMap` (§a), SDF/precomputed-map lensing (§b), specular-ring recipe (§c), thickness recipe (§d), vibrancy via filter chaining (§e), `@property` liquid response (§f), performance/backdrop-root findings (§g, quoted in §6), reduced-motion/transparency guidance (§h, quoted in §7). |
| `research/prior-art.md` | Surveys existing glass VS Code themes; §4 confirms none implement Apple's eight optics — the gap VS Glass closes. Documents Vibrancy Continued's capabilities and the WWDC25 eight-property list. |
| `research/vscode-injection.md` | The three CSS-injection routes documented in `glass/install.md`. |
| `research/vscode-theme-keys.md`, `all-color-keys.json`, `selector-map.json`, `keys-by-owner/` | The 988-key inventory `audit-coverage.mjs`/`audit-contrast.mjs` check against. |
| `research/tooling.md` | CDP/debugging-port findings, corrected by PROGRESS.md's empirical Phase 1. |
| `research/reference/` | Downloaded Apple HIG screenshots for internal comparison only — copyrighted, gitignored, never committed. |
| `research/css-tests/` | The runnable proof-of-concept (`lensing-test.html`, `gen_displacement.py`) that validated SDF-based edge-lensing before it was ported into `src/lens.ts`. |

### Credits

- **Apple** — HIG ("Materials," "Color," "Dark Mode") and WWDC25 sessions 219, 356, 323. The entire
  optical model and every system colour/dimming value here is Apple's own documented design language.
- **shuding/liquid-glass** and **kube.io** — early write-ups on SDF-based edge-lensing displacement
  maps for `feDisplacementMap`; `src/lens.ts` follows the same "precomputed map via `feImage`" pattern.
- **ruri.design** — source of the chromatic-aberration recipe implemented in `src/lens.ts`'s
  `filterSvg()`, studied at the user's explicit mid-build direction.
- **Vibrancy Continued** (`illixion/vscode-vibrancy-continued`) — the OS-level transparency mechanism
  transparent-window mode (§5) pairs with, and the `imports`-based injection route in
  `glass/install.md` Route C.
- **Custom CSS and JS Loader** (`be5invis.vscode-custom-css`) — the most widely-installed CSS
  injection route, documented as Route A alongside its CSP trade-off.
- **Contributor Covenant** — this repo's `CODE_OF_CONDUCT.md` is adopted from it.
