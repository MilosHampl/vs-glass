# VS Glass — Design

VS Glass ships two layers: Layer 1, a color theme (`themes/*.json`, generated from
`src/palette.ts`), and Layer 2, injected CSS (`glass/glass.css`, plus the optional
`glass/glass-wallpaper.css` and `glass/tints/glass-tint-<id>.css` addons, generated from
`src/glass/*.css` and `src/lens.ts`). This document explains what Apple's Liquid
Glass documentation says the material actually does, and how each piece is approximated inside a
Chromium/Electron surface that was never designed to host a Metal-rendered material. Every number
here was read from generated themes, research files, or a script run in this repo on 2026-09-10.

---

## 1. Goals and non-goals

**Goal: reproduce the optical *behaviour* of Apple's glass material, not ship "another frosted theme."**
`research/prior-art.md` §4 surveyed ten-plus existing glass-flavoured VS Code themes and found every
one stops at `backdrop-filter: blur()` plus a translucent background — none attempt the eight things
Apple's material actually does (lensing, specular highlights that trace geometry, size-dependent
thickness, adaptive vibrancy, floating layered panes, concentric geometry, adaptive tint, a "liquid"
interaction response). VS Glass closes that gap using the one Chromium capability that makes it
possible: `backdrop-filter: url(#svgFilter)` with `feDisplacementMap`, which Chromium — uniquely
among engines — resolves (`research/css-liquid-glass.md` §a; WebKit tracks this as an explicit
non-support bug, #245510).

**Goal: colourless material, transparent window first.** Apple's own definition is explicit — "no
inherent color... takes on colors from the content directly behind it" (HIG Color, §2, §4.7) — so the
default Layer-2 material carries no hue mesh anywhere. `glass/glass.css` alone assumes the Electron
window itself is see-through (paired with Vibrancy Continued) and paints only a thin smoky film; the
window is one rounded glass slab (§4.5). Three optional addons cover the cases that default can't:
`glass/glass-wallpaper.css` paints a neutral, colourless smoke backdrop for a window that stays opaque,
eight `glass/tints/glass-tint-<id>.css` films let anyone who wants a deliberate colour cast add one on
top of either mode, and six `glass/density/glass-density-<percent>.css` presets turn the base window's
density into a knob, from fully clear to opaque-ish, on top of any mode or tint — floating widgets keep
their own fixed, readable body regardless (§3). See §5.

**Non-goal, hard rule: never filter editor text.** Apple's material is a functional layer above
content that must never degrade it (§2). No selector in `glass.css` puts `backdrop-filter`, `filter`,
or `mix-blend-mode` on `.monaco-editor`'s text nodes — only its *background* gets a slightly
translucent color (optic 7). Widgets that overlap code (suggest, hover, find, sticky scroll) filter
their own backdrop, which includes the code behind them, but their own glyphs are never blended or
displaced.

**Non-goal: Layer 2 is CSS-only, by design.** PROGRESS.md's Phase-1 findings confirm data-URI SVG
filters work inside `backdrop-filter` (finding 3) — no runtime script, no CSP change, no Trusted
Types dependency (finding 8). This bounds optic 8 ("liquid response"): Apple's real material reshapes
its map per frame from touch/motion; VS Glass keeps its specular sheen static and only transitions a
small, deliberate set of properties on `:active`/pop-in/focus — a press scale, a widget's entrance, a
focus glow — see §4.8, §9.

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
`effects.dim` encodes it exactly: `0` for Regular Dark/Light/Opaque, `0.42` for Clear in wallpaper mode (a little above Apple's 35 % because the dimmed layer sits over code, not a photo; the transparent-window planes use their own, thinner `window.dim`)
(`src/palette.ts`), applied as `rgba(0,0,0,var(--vsg-dim))` under every card/widget sheen
(`src/glass/glass.css` §4/§5).

### Mapping to a VS Code surface

| Apple's layer | VS Code surface | Why |
|---|---|---|
| Content plane (never Liquid Glass) | Editor (`.part.editor > .content`, `.monaco-editor`) | "Don't use Liquid Glass in the content layer... keep it in the content layer to ensure clarity" (WWDC25 219) — translucent background only, never filtered. |
| Functional layer (floats above content) | Title bar, status bar, activity bar, sidebar, aux bar, panel, tab strip | The literal equivalent of "tab bars and sidebars" (HIG Materials). |
| Floating widgets (highest lensing) | Quick input, hover, suggest, parameter hints, find, dropdown lists, notifications, dialogs, debug toolbar | These genuinely overlap code (PROGRESS.md finding 11) — sidebar/panel sit beside the editor as DOM siblings, not on top of it. Context menus are the exception: on macOS VS Code shows native menus by default, and with `window.menuStyle: custom` it renders them inside an isolated shadow root, so injected CSS cannot reach them and they take the theme's `menu.*` colours only. |

---

## 3. The palette as a model

`src/palette.ts` evaluates a `build()` function once per variant over a fixed structure: `ground` /
`wallpaper` (opaque backdrop) → `content` (editor) → `glass` (`chrome`/`raised`/`widget`/`overlay`,
a 4-level `Elevation` stack) → `label` (vibrancy tiers) → `accent`/`accentText` (Apple system
colours, two grades) → `effects` (Layer-2 tokens).

### Ground, wallpaper, content plane, and the four-level stack

`build()` produces four things above the four-level `glass` stack that Layer 2 draws the window
itself from: `ground` (the opaque window colour VS Code's grid view actually paints through,
`titleBar.activeBackground`, §7); `wallpaper` (the `glass-wallpaper.css` addon's neutral smoke source
— a `base` plus grey plumes/pockets, no hue, `wallpaper.blobs`, §4.7); `planes` (the transparent-window
mode's own four densities — `content`/`chrome`/`widget`/`dim` — generated per variant from its
`window: { content, chrome, widget, dim }` knob and written to `--vsg-plane-content/-chrome/-widget/
-dim`, the CSS that shows through when the OS makes the window transparent); and `glass.tint` (the
material's own base colour, distinct from the separate `TINTS` table, whose entries drive the optional
`--vsg-tint-rgb`/`--vsg-tint-a` film laid into every plane as `--vsg-tint-film`, §4.7).

**How planes are generated, and how density fits in:** the **base** planes — `--vsg-plane-content`,
`--vsg-plane-chrome`, `--vsg-window-film`, `--vsg-plane-dim` — are each built from a fixed colour
(`--vsg-plane-content-rgb` and so on), a base alpha (`--vsg-plane-content-a`, the per-variant density
before any preset), and `--vsg-density` (default `1`), multiplied together: `rgba(rgb, base-a ×
density)` (`--vsg-plane-dim` clamps to `min(1, density)` so it can't invert past fully opaque). The
tuned default base alpha is now low — "almost clear," a faint smoky film rather than a visible material
— and `glass/density/glass-density-<percent>.css` presets (§5) do nothing but set `--vsg-density` to a
new number: `0` is fully clear (only rims, lensing and text left), `2` is opaque-ish. Because
the multiplication happens once in `glass.css` itself, that one line changes the window film and every
base plane together. `glass-wallpaper.css` only re-points the *base-alpha* half of the formula
(`--vsg-plane-content-a` → `--vsg-plane-content-wall-a`, and so on) to wallpaper mode's denser starting
point; it never touches `--vsg-density`, so a density preset loaded after it keeps working the same way.

**Floating widgets don't follow `--vsg-density`.** After an adversarial review round, `--vsg-plane-widget`
was split off onto its own knob, `--vsg-widget-density` (default `1`, independent of the density
presets above), with a floor under the multiplication (`max(floor, base-a × widget-density)`): a
bodiless widget over an otherwise-clear base window has nothing to frost against and ghosts instead of
reading as glass, so widgets keep a fixed, readable body while the base window goes as clear as density
`0` allows. Command palette, hovers, suggest, notifications, dialogs and dropdown lists all use this
plane; only their alpha, not their lensing, is protected this way.

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
without JS, so hue 262 guarantees glass never reads as flat neutral gray, even though the default
material is otherwise colourless; §4.7 covers where the actual adaptive tint comes from in each mode.

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
| Regular Dark | 14 / 22 px | 1.55 | 20 / 56 px | 1.6 px | 0.3 | 0 |
| Regular Light | 16 / 24 px | 1.35 | 18 / 50 px | 1.2 px | 0.3 | 0 |
| Clear | 6 / 16 px | 1.9 | 26 / 74 px | 2.2 px | 0.5 | 0.42 |
| Opaque | 0 / 0 px | 1.0 | 0 / 30 px | 0 px | 0 | 0 |

Clear is the *least* blurred (Apple: "highly translucent... prioritizing visibility of the
underlying content") but the most saturated/aberrated, and the only variant needing a dimming layer
— consistent with Apple's three-condition Clear rule (§2). Opaque zeroes every knob; `GUARD` (§4, §6)
excludes it from Layer 2 entirely, so it is what the other three look like with optics off, not a
fifth design. `lensScale`/`lensEdge` roughly doubled and `aberration` strengthened across the board
(the frost blur dropped in step, so refraction reads clearly rather than getting buried under it) —
`lensEdge` is kept at roughly 2.8× `lensScale` for every variant, which is what keeps the displacement
slope under the folding limit (§4.1).

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
(`Math.pow(t, 2)`) keeps peak slope under that threshold by construction as long as the ratio holds:
`lensEdge` is kept at roughly 2.8× `lensScale` for every variant (e.g. Regular Dark: a 56px rim over a
20px displacement, §3), which is what lets lensing run roughly twice as strong as earlier tuning
without folding the backdrop or doubling text.

**Why never `%` in `userSpaceOnUse`:** finding 4 — percentages there resolve against the SVG's
zero-size viewport and silently produce nothing. `filterSvg()` uses `objectBoundingBox` throughout,
so no `%` ever appears in generated markup.

**Frosted-centre / clear-rim composite:** the source is blurred wholesale (`feGaussianBlur ...
result='frost'`); a separate branch displaces the *sharp* source toward the centre
(`feDisplacementMap`), lifts it slightly (`feComponentTransfer`, `slope='1.05'`, reduced from an
earlier `1.07`/`1.12` after review found a stronger lift read as a bright wash rather than a highlight),
masks to only the rim via the map's B channel (`feComposite in='lensLit' in2='rimA' operator='in'`),
then composites **over** the frosted body (`operator='over'`) — one filter, no JS, producing the
flat-interior / sharp-lit-rim read Apple's reference imagery shows.

**Steep rim alpha, and why:** the map's B channel (rim weight) is `min(1, max(profX, profY) × 4)`, not
the raw falloff profile — steep, not gentle: the displaced, refracted copy fully replaces the frosted
body wherever the displacement is already past a quarter of its maximum, and only fades in the
innermost sliver of the rim, where the displacement is tiny anyway. A gentler ramp there let the
*undisplaced* frosted body show faintly through the displaced copy at partial alpha — a double image,
flagged at widget rims and the editor's bottom edge in an adversarial review round. The steep ramp
removes it: past that quarter-point there is only ever one copy of the backdrop on screen.

**Chromatic aberration**, credited to ruri.design's Glass tool (studied per PROGRESS.md's mid-build
directives): the sharp source's R/G/B channels split into single-channel images, each displaced by a
different `scale` (`scale±aberration`), and re-added:

```ts
feComposite(in='dR', in2='dG', operator='arithmetic', k1=0, k2=1, k3=1, k4=0) // → dRG
feComposite(in='dRG', in2='dB', operator='arithmetic', k1=0, k2=1, k3=1, k4=0) // → lens
```

`k2=k3=1, k1=k4=0` is a pure additive sum, recombining three independently-displaced channels into
one RGB image with a colour fringe at the rim. `aberration` is `0`/`1.2`/`1.0`/`1.6px` across
Opaque/Regular Light/Regular Dark/Clear — pulled back from a more aggressive pass after review found
the fringe reading as smear rather than dispersion; Clear still gets the most, matching its
more-visible, more-distorted character.

**Aspect classes** (`LENS_CLASSES`, `src/lens.ts`):

| Class | Size | Axes | Rim × | Used for |
|---|---|---|---|---|
| `widget` | 560×360 | xy | 0.8 | quick input, suggest, hovers, notifications |
| `menu` | 240×320 | xy | 0.6 | dropdown lists, capsule buttons (context menus are out of reach, see §3) |
| `sidebar` | 300×820 | xy | 0.9 | side/aux bar cards |
| `panel` | 1100×320 | xy | 0.9 | bottom panel card |
| `column` | 48×820 | x | 0.5 | activity bar |
| `strip` | 1400×36 | y | 0.35 | title/status bar, tab strip, sticky scroll |
| `capsule` | 32×32 | xy, convex | 0.6 | icon-only pills (activity/status items) — a "ball lens" profile, no frosted body |
| `slider` | 110×240 | xy | 1.0 | the minimap's viewport slider — clear glass (blur 0), edge zone 56 px on a 110 px width, so the curve covers the full width and the ends stay flat |
| `edge-top` | 1400×40 | y, top-only | 0.6 | unused since 1.1.0 (set to `none`): the window edge carries no lens |
| `edge-bottom` | 1400×40 | y, bottom-only | 0.6 | unused since 1.1.0 (set to `none`) |

`rim` scales `lensEdge`/`lensScale` down for thinner surfaces so the lens zone doesn't consume a
36px strip. The two `edge-*` classes set `blur: 0` — clear glass, no frosted body — since a window-edge
strip is meant to bend the title bar/status bar/code beneath it, never blur it.

**Window edge (1.1.0):** no lens. An earlier build bent the title bar and status bar text with one-sided
`edge-top`/`edge-bottom` strips on `.monaco-workbench::before`/`::after`; the owner read the bent UI text as a
glitch, and there is nothing in-page behind those bars to refract anyway. The window edge is now one hairline
rim ring following the 20px window corners (§4.2, §5). Likewise the base panes — side bars, panel, activity
bar, title and status bars — carry no `backdrop-filter` over a see-through window (`--vsg-base-filter-*` = `none`;
the wallpaper addon switches them back on over its opaque smoke). The `strip`, `sidebar`, `panel` and `column`
classes therefore refract only in wallpaper mode; `widget`, `menu` and `capsule` are the ones that work over code.

**Refraction needs an opaque in-page backdrop:** PROGRESS.md finding 6 — under a transparent window
(Vibrancy, 20%-alpha editor) the displaced copy composites over the still-visible original and
ghosts; on an opaque backdrop displacement is clean. This is why wallpaper mode paints an opaque
in-page ground (§5). The window-edge and editor-edge strips above are the exception worth noting: they
bend in-page content (the title/status bar, the code itself), which is always opaque already, so they
carry no such risk regardless of mode.

**Real vs. simulated:** the displacement is real, GPU-evaluated `feDisplacementMap` math — not
faked. The *map* is a static, low-res, shape-generic profile per class, not Apple's per-frame
computation from actual glass geometry. **Gap:** no per-element fitting or resize response (§9).

### 4.2 Specular edge highlight

**Apple:** a virtual environment light tracing geometry, moving with interaction and device motion.

**VS Glass:** two lights, one drawn and one computed, and they stay. The drawn one is the rim border — a `::before`
ring, `conic-gradient` from a virtual top-left source, masked to a hairline (`glass.css` §1/§4/§5), with alphas from the
palette's `specular {hi, mid, lo}` ramp per elevation. That is the liquid-glass signature and the owner keeps it
("the liquid glass style borders are ok"). The computed one lives inside every lens filter: an `feColorMatrix` reads
the displacement map's R/G channels — the bend direction, i.e. the surface normal projected onto the screen — lights
the rim where that normal tilts toward the light, and composites the result onto the refracted rim only (§4.1), so it
sits exactly where the backdrop is being bent.

What has gone is everything underneath those two: the bevel band and the radial sheen (1.1.0), and every drop shadow
(1.2.0) — "i dont really like the fake shine/shadows there, just let the aberrations and warping effects shine". One
surface drops even the border: the minimap's viewport slider (§5b) slides over rendered content, so its whole presence
is the warp and the colour fringe it puts on the code beneath it; a framed rectangle sliding over the file overview
read as odd, a bare plane of glass does not.

**Real vs. simulated:** the ring is a static approximation; the curvature light is computed per pixel from the modelled
surface. **Impossible, not unimplemented:** device-motion response — Electron has no accelerometer.

### 4.3 Material thickness

**Apple:** thickness scales with current size; shadow opacity is content-aware.

**VS Glass (1.2.0):** the rim hairline, and nothing else. `--vsg-thickness-chrome` and `--vsg-thickness-widget` are
inset-only recipes — a light top edge, a fainter left edge, a faint contact line at the bottom:

```css
--vsg-thickness-chrome:                                   /* side bars, panel, activity bar, cards */
  inset 0 1px 0 rgba(var(--vsg-spec-rgb), var(--vsg-chrome-spec-mid)),
  inset 1px 0 0 rgba(var(--vsg-spec-rgb), var(--vsg-chrome-spec-lo)),
  inset 0 -1px 0 rgba(var(--vsg-shadow-rgb), 0.12);
--vsg-thickness-widget:                                   /* palette, menus, hovers, notifications, dialogs */
  inset 0 1px 0 rgba(var(--vsg-spec-rgb), var(--vsg-widget-spec-mid)),
  inset 1px 0 0 rgba(var(--vsg-spec-rgb), var(--vsg-widget-spec-lo)),
  inset 0 -1px 0 rgba(var(--vsg-shadow-rgb), 0.18);
```

No drop shadow appears anywhere in 1.2.0 — not under widgets, buttons, pills, sticky scroll, the minimap slider, nor
the minimap's own seam. Elevation is carried by what the glass does to what is behind it: a widget over code bends and
disperses that code at its rim (§4.1). A pane that bends nothing gets no elevation cue, and that is accepted.

**Real vs. simulated:** the displacement, the chromatic fringe and the curvature light are computed per pixel by the
filter; the rim hairline is drawn. **Gap:** no content-aware shadow opacity — there is no shadow at all now (§9).
of every inside element bends the code beneath it (§4.1), which reads as material far better than any
painted band did.

**The minimap slider (1.1.2):** the one surface in VS Code where glass slides over *rendered content*. The viewport
slider sits directly above the minimap canvas, so its `backdrop-filter` bends real pixels — the code lines of the file
overview — instead of a flat film. It is therefore clear glass (`blur: 0`, no frost) with a wide curved edge: the
`slider` class's 56 px edge on a 110 px nominal width means the bevel covers the full width (a magnifier's profile
across, flat along the middle of its length), at a slope of 2.9·14/56 = 0.73, just inside the folding limit (§4.1).
A bright hairline along the top and left, a contact shade at the bottom and a small drop shadow finish the slab so it
reads as lying *on* the overview. Measured offline over a striped backdrop (`scratch/lenstest.mjs` pattern): mean
|Δluma| 105 at the top edge, 119 at the bottom, 79 at the left, 34 through the middle band, and exactly 0 outside the
element. Scroll cost is nil — editor scrolling measures p50 8.2 ms / p95 9.0 ms with it against p50 8.3 / p95 9.1 with
the effects off — because the slab is small and clear (no frost to evaluate).

**Where the lens may live (1.1.0):** only where there is in-page content behind the glass. Floating widgets
over code, buttons and pills refract; the base panes — side bars, panel, activity bar, title and status bars —
carry `backdrop-filter: none` over a see-through window (`--vsg-base-filter-*` tokens default to `none`; the
wallpaper addon switches them back on, because its in-page smoke is a real opaque backdrop). There is nothing
behind a base pane to bend, and a filter over a see-through region can only re-sample pixels that are not the
desktop — at best nothing, at worst stale frames.

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
to. The window itself is painted as one slab: `.monaco-workbench::before` draws a single hairline rim ring
(no lens, no bevel) following the `--vsg-radius-window` (20px) corners, brightest along the top where the
light enters (§4.2); the earlier `edge-top`/`edge-bottom` lens strips are gone in 1.1.0 (§4.1, §5). Together these make every floating card sit
inside a single glass pane rather than on a flat rectangle. Cards, widgets, and controls nest inside
that slab on one concentric radius ladder — window 20 > card 16 > widget 14 > control 9 > inner row 7
(`radius` in `src/palette.ts`) — window is exactly card + VS Code's own 4px floating-card margin, so no
two nested radii collide (§4.6). In wallpaper mode the gaps between cards show the neutral smoke addon
(§4.7) instead of window transparency, and the slab itself is switched off (`glass-wallpaper.css` sets
`border-radius: 0` and hides `::before`/`::after`) since the window is opaque there, not a slab.
Without the `modernUI` class, a fallback rule swaps the elevation shadow for a flatter inset-seam
treatment (no gap for a floating card's shadow).

Widgets over chrome still get their own `backdrop-filter`, which reads as glass-on-glass if taken
literally — but Apple's stated reason for the rule ("glass can not sample other glass... inconsistent
behavior," WWDC25 323) doesn't map cleanly here: VS Glass filters sample raw rendered pixels, not a
`GlassEffectContainer`-style shared sampling region, because Chromium has no such primitive (§9).

Not every surface carries the same material, though: after review, small controls (activity-bar and
status-bar pills, secondary buttons, the active tab, sticky scroll) were moved onto a faint, clear light
film so they take on the colour of whatever sits behind them rather than reading as a grey body of their
own; only floating widgets (the ones this section is about) keep a fixed, smoky body, since they need to
stay legible over arbitrary content regardless of what's behind them.

**Real vs. simulated:** floating-pane geometry and shadows are real, rendered structures. **Gap:** no
shape-merging/morphing container equivalent (§9).

### 4.6 Concentric geometry

**Apple:** "concentric shapes calculate their radius by subtracting padding from the parent's."

**VS Glass:** `glass.css` §1 overrides VS Code's radius custom properties (`--vscode-cornerRadius-
small/medium/large/xLarge` → `--vsg-radius-inner/control/card/card+4px`); §6 hand-sets inner-element
radii relative to their container (list rows: `--vsg-radius-inner`; widget rows: `widget − 6px`;
inputs/buttons: `--vsg-radius-control`; notification toast rows: the toast's own `--vsg-radius-widget`
minus its border width; the Settings editor's search field: `--vsg-radius-control`, matching every
other input) — an authored approximation, since CSS has no native concentric-radius primitive (no
`.rect(corner: .containerConcentric)` equivalent).

**Real vs. simulated:** rendered radii are real and correctly nested. **Gap:** the relationship is
hard-coded per selector, not computed from actual padding.

### 4.7 Adaptive tint

**Apple:** "no inherent color... takes on colors from the content directly behind it."

**VS Glass:** the default material is colourless — hue-262 (§3) keeps every gray from reading as flat
neutral, but no hue or mesh is painted into the ground by default. The actual adaptive tint comes from
whichever mode is active:

- **Transparent-window mode (default):** Vibrancy's OS-level blur genuinely samples the user's real
  desktop picture behind the window and blurs it — the real adaptive-tint mechanism Apple describes,
  just supplied by the OS compositor, not CSS. VS Glass cannot see or process those pixels itself
  (§9); the base plane variables (`--vsg-plane-content/-chrome/-dim`, §3) are deliberately thin —
  almost clear at the tuned default — so the OS blur reads through; `--vsg-plane-widget` stays at its
  own fixed level regardless (§3).
- **Wallpaper mode (addon):** `glass-wallpaper.css` paints a neutral smoke backdrop — luminance-only
  grey plumes and darker pockets (`wallpaper.blobs` in `src/palette.ts`, §3), no hue — so every pane's
  `saturate()`/`brightness()`/`contrast()` backdrop stack has real pixels to process without
  introducing a colour of its own. Its amplitude was raised substantially after review found the earlier
  smoke too faint to give the lens real luminance structure to bend.
- **Tint addons (combinable with either mode):** `glass/tints/glass-tint-<id>.css` sets
  `--vsg-tint-rgb`/`--vsg-tint-a` from Apple's dark-grade system colours (the `TINTS` table in
  `src/palette.ts`); `--vsg-tint-film` is laid into every plane — window slab, cards, widgets, capsule
  buttons — as a fixed coloured film. This is a deliberate, explicit colour choice, not adaptive
  sampling, and it is opt-in.

**Real vs. simulated:** in transparent-window mode, the "adaptive" half is genuinely real — the OS
actually samples the desktop — but it happens entirely outside VS Glass's own CSS, which never touches
those pixels. In wallpaper mode, the saturate/lens pipeline genuinely processes real pixels, just
synthetic, neutral ones rather than the user's real desktop. Tint addons are a fixed film by design,
not sampling of anything.

### 4.8 Liquid response

**Apple:** "instantly flexing and energizing with light... scaling, bouncing, and shimmering,"
confirmed spring/elastic.

**VS Glass:** the most restrained of the eight optics, by explicit, twice-repeated owner direction.
An earlier build drifted the specular sheen's position on hover (`@property`-typed `--vsg-hl-x/-y/-a`,
transitioned toward a new value under the cursor); the owner rejected it a second time ("buttons shine
animations look like shit, make them just glass") and it is now gone everywhere, not just on buttons.
In 1.1.0 the sheen itself went too — no painted highlight on cards, widgets or buttons at all, only the
rim hairline and the lens (the owner: "no gradients and fake ass effects"). What *does* still respond:

- **Buttons** (`.monaco-text-button` pills): a capsule shape, a hairline rim, a bright 1 px top light
  where the curved body catches the room, one small shadow, and the backdrop bent at the rim by the lens
  filter (§4.1); primary buttons carry a light accent tint, secondary buttons are clear glass. Nothing moves on hover (`:hover { filter: none }`, stated explicitly to keep it that
  way); the only response is a quick `:active { transform: scale(0.97) }` press. Icon buttons and
  toolbar actions follow the same press-only rule.
- **Floating widgets** (quick input, suggest, parameter hints, hover, the action widget, context-view
  menus) pop in on open: `@keyframes vsg-pop`, a small scale-and-lift-in over `var(--vsg-motion-base)`
  (240ms) — an entrance, not a hover response.
- **List rows** get a focus glow on keyboard/selection focus: an accent-tinted inset ring plus a soft
  outer glow, replacing VS Code's default focus outline. Focus, not hover — moving the mouse over a row
  that isn't focused does nothing.

Nothing else animates on `:hover` anywhere in Layer 2. `--vsg-motion-fast`/`-base`/`-slow` still exist
as tokens (§3) and still drive the transitions above; they no longer drive a highlight sweep.

**Real vs. simulated:** the press scale, pop-in and focus glow are real, interpolated,
GPU-composited transitions. **Gap:** no hover-driven "flexing and energizing" at all — a deliberate,
owner-directed restraint, not an attempted-and-failed port; CSS `cubic-bezier` is a fixed-duration
ease regardless (`apple-liquid-glass.md` §6 confirms no spring constants are ever published); no
cross-element illumination propagation ("glow spreads... onto any Liquid Glass elements nearby").

---

## 5. Transparent-window mode (default) vs. wallpaper mode (addon)

Two Layer-2 configurations exist because of one directive and one constraint pulling opposite ways.
Directive (PROGRESS.md, restated at the maintainer's later direction): *"no colour, a multilayer plane
of glass with a limited smoky glass effect, everything liquid glass, the whole window and editor
visibly transparent, tint as an option."* Constraint (finding 6, §4.1): refraction ghosts unless the
backdrop it displaces is opaque — `backdrop-filter` cannot see the desktop, so genuine window
transparency can only come from the OS (Vibrancy's native blur), which is in tension with clean
in-page refraction on the same surface.

**Transparent-window mode** (`glass/glass.css` alone, default): assumes the window itself is
see-through — since 1.1.0 VS Glass's own window hook provides that (§5.1 below); Vibrancy Continued is
an alternative provider. `--vsg-plane-content/-chrome/-dim` (the base planes, §3) are set thin — almost clear —
generated per variant from each palette's `window: { content, chrome, widget, dim }` knob, so the OS
blur reads through the glass rather than fighting it; `--vsg-plane-widget` stays at its own fixed,
readable level regardless (§3), since floating widgets need a legible body over whatever the OS is
blurring. The window itself is painted as one rounded glass slab
(`--vsg-radius-window`: 20px; `.monaco-workbench::before` draws one hairline ring following the window
corners, brightest along the top, §4.2 — the earlier lens strips along the top and bottom edges bent the
title-bar and status-bar text and read as a glitch, so the window edge refracts nothing). No in-page ground is painted, so refraction reads wherever glass overlaps
in-page content — widgets over code, sticky scroll, card rims over the editor seam, the window's own
top/bottom edges — and cannot bend the desktop itself (§4.1, §9).

### 5.1 The window hook (1.1.0): how the window becomes see-through, and why settings are live

VS Code has no extension point for either a transparent window or workbench CSS. Every transparency
extension patches a bootstrap file; VS Glass patches exactly one, `out/main.js` (the main-process entry,
the one bootstrap file `product.json` does not checksum), with a marker-delimited block the extension
writes, backs up once and removes byte-exact. The block runs in Electron's main process and:

1. makes the window transparent **at creation**: VS Code builds its `BrowserWindow` options in the same
   `out/main.js` (`{backgroundColor:…, …, experimentalDarkMode:!0}`), and the extension splices one spread into
   that object — `...(globalThis.__vsGlassWindowOptions?…():{})` — which returns
   `{ transparent: true, backgroundColor: '#00000000', hasShadow: true }` when `state.json` asks for
   transparency and nothing otherwise. Creation-time matters: Electron's `transparent: true` is what makes the
   browser compositor clear the frame to transparent every paint; a window made transparent afterwards (the
   1.1.0 preview did `setBackgroundColor('#00000000')` on `browser-window-created`) keeps stale pixels wherever
   the page paints nothing — closed panels ghost through the near-clear editor, and a `backdrop-filter` over such
   a region re-samples its own previous output every frame until it is neon (Milos saw both). The hook still
   sets the vibrancy material (`win.setVibrancy(material)`) per window and wraps `setBackgroundColor` so VS
   Code's own theme-driven repaint keeps the window clear;
2. on every `dom-ready`, inserts the composed glass CSS with `webContents.insertCSS`. An inserted sheet is
   an *injected author stylesheet*: it cascades after all document stylesheets (so it wins ties against
   the theme's dynamic `<style>`), and it does not appear in `document.styleSheets`;
3. `fs.watch`es `<user-data>/vs-glass/`, where the extension writes `glass.css` (glass.css + tint, lens,
   aberration and density) and `state.json` (material, transparency). Any change is re-applied within
   ~120 ms to every window: `removeInsertedCSS` + `insertCSS`, `setVibrancy`. That is why Density, Tint,
   Material, Lens and Aberration are live in the Settings UI.

Two consequences worth stating. The OS material both blurs **and** darkens the desktop in a dark
appearance — the "too dark" the owner saw was mostly the material, not the CSS, so the material is a
live setting (19 values; `hud` lets the most through). And a perfectly clear, unblurred window is not
reachable: VS Code creates its windows opaque, `transparent: true` is a creation-time option we cannot
inject (the ESM/CJS interop snapshots `BrowserWindow` before our block runs), and only a vibrancy view
makes an opaque window see-through afterwards.

Webviews are the one surface the inserted CSS cannot reach: they are iframes that paint their own bodies
from theme colours. While the effects are on, the extension therefore keeps theme-scoped `[Glass …]`
blocks in `workbench.colorCustomizations` (generated with the CSS as `glass/webview-colors.json`) that
give `editor.background`, `sideBar.background`, `panel.background` and the strip colours the same
near-clear alphas as the planes, so Claude Code, Markdown preview and extension views sit in the glass
rather than on it. Removed with the effects.

**Why the editor needs its own clearing pass:** the directive above says "the whole window *and
editor* visibly transparent," and the editor is the one part of the workbench VS Code makes hardest to
see through. VS Code paints `editorPane.background` inline, directly on `.editor-container`'s own
`style` attribute, not through a stylesheet rule Layer 2 can simply out-rank with specificity — and
`.part.editor` itself ships opaque by default. Left alone, the editor would stay a solid slab no matter
what the rest of Layer 2 did to the chrome around it. `glass.css` clears this in two passes: overriding
the relevant `--vscode-*` variables to transparent (`editorPane`, `editorGutter`,
`editorGroup.emptyBackground`, the tab strip and its active/inactive backgrounds, breadcrumb, minimap,
terminal, panel, sideBar, activityBar, statusBar, titleBar, and the Settings editor's header), and
additionally forcing `.part.editor`, `.editor-container` and `.editor-instance` transparent directly,
since the inline style otherwise wins over a variable override. Only then does the editor card's own
`--vsg-plane-content` background (§3) become the one thing painting that plane — and because code now
sits on a genuinely see-through surface rather than an opaque one, editor lines, line numbers, terminal
rows and sticky-scroll lines get a soft legibility text-shadow so they stay readable over whatever
shows through (§6).

**Wallpaper mode** (`glass/glass-wallpaper.css`, addon, loaded after `glass.css`): for a window that
is NOT transparent. `@G { background: var(--vsg-wallpaper) !important; }` paints the neutral smoke
backdrop (§4.7, now substantially stronger, see below) into the window ground and re-points the
*base-alpha* half of the base planes' formula (§3) — `--vsg-plane-content-a`, `--vsg-plane-chrome-a`,
`--vsg-plane-dim-a`, and `--vsg-plane-widget-a` too (feeding `--vsg-widget-density`'s own multiplication)
— to wallpaper mode's denser starting point, so every surface has an opaque, ghost-free backdrop to
refract. Both the smoke and these base alphas lean smoky rather than solid, so the glass above them
still reads as glass rather than a flat wall — and because only the base alpha moves, `--vsg-density`
and `--vsg-widget-density` (below) still multiply on top exactly as they do in transparent-window mode.
It also disables the window rim and sets `border-radius: 0` — the window is opaque here, not a slab.

**Density** (`glass/density/glass-density-<percent>.css`, addon, loaded after `glass.css` and after
`glass-wallpaper.css` if used, works with either mode): six presets — `0`, `25`, `50`, `75`, `150`,
`200` — each just set `--vsg-density` to a new number (`100` is the tuned default and needs no file, so
there is no `glass-density-100.css`). `--vsg-density` scales only the **base** planes: the window film,
editor content, and chrome cards/strips. `0` is fully clear — a plane of glass with only its rims,
lensing and text left, no film at all; the tuned default (`1`) is now itself "almost clear," a
faint smoky film rather than a visible material; `200` is opaque-ish, the most legible over a bright or
busy backdrop. **Floating widgets are deliberately exempt** (§3, §9): after review found a bodiless
widget over a near-clear base window ghosts instead of reading as glass, `--vsg-plane-widget` was split
onto its own `--vsg-widget-density` knob (default `1`) with a floor, so the command palette, hovers,
suggest, notifications, dialogs and dropdown lists stay legible no matter how clear the base window
gets. Any value in between the presets (or beyond) works too for either variable — copy a preset and
edit the number, or set `--vsg-density`/`--vsg-widget-density` directly on `.monaco-workbench`.

**Trade-off:** wallpaper mode gains guaranteed clean refraction everywhere and a legible, designed
backdrop, at the cost of the window not actually being transparent. Transparent mode gains a
genuinely see-through window and whatever adaptive tint the user's real desktop supplies (§4.7), at
the cost of refraction only showing where glass overlaps in-page content — exactly where finding 11
says lensing is most visible anyway, but not everywhere. Tint addons (§4.7) layer a fixed coloured
film on top of either mode, and density presets scale legibility up or down on top of either mode,
without changing this trade-off.

---

### 5.2 The window slab (1.2.0): the OS's glass under the window

**The boundary.** Every optic in §4 works on pixels the page owns. A `backdrop-filter` samples the compositor surface
*behind the element within the same window*; the desktop, other windows and video are composited by the window
server after Chromium has produced its frame, so no CSS — and no Electron API (Electron 42 has no Liquid Glass
binding at all) — can bend them. The only things that touch behind-window pixels are the window server's own
backdrop effects: vibrancy (blur + tint, what 1.1.0 uses) and, on macOS 26, Liquid Glass.

**Where the glass lives.** An `NSGlassEffectView` cannot be added to VS Code's own window: its main process is a
hardened runtime with library validation, and a foreign `.node` is refused — measured against the shipped Electron 42
binary: "mapping process and mapped file (non-platform) have different Team IDs" (only the Plugin helper carries
`disable-library-validation`). So the slab is a window of its own, owned by `bin/vs-glass-helper`
(`native/vs-glass-helper.swift`, ~300 lines, universal, ad-hoc signed): transparent, `ignoresMouseEvents`, no shadow,
normal level, ordered with `order(.below, relativeTo:)` on the VS Code window's number — the window server honours
that across processes; the helper's report shows the two at z and z+1 — and kept on its frame from
`CGWindowListCreateDescriptionFromArray` (120 Hz while anything moves, 20 Hz at rest), with the full window list every
250 ms and at once on app activation for z-order, new windows, minimise and Spaces. One helper per VS Code instance
(a `flock` in `<user-data>/vs-glass`), parameters from `window-glass.json` which the extension rewrites live, exit when
VS Code's pid dies or the file says off. It idles at about 1 % of a core.

**What Apple's glass is made of** (read from a live `NSGlassEffectView` with a class dumper): a SwiftUI-hosted tree
whose working part is one `CABackdropLayer` (`windowServerAware = 1`, `scale = 0.5`) carrying a single
`glassBackground` `CAFilter` — inner refraction −60 over 20 pt, blur radius 10 (clear) or 4 (regular), a face colour
matrix (white 0.8 / black 0.05, fill white α 0.05 for clear; 0.6 / 0.2, black α 0.35 for regular) — with a
`CASDFLayer` named `@0` supplying the shape as a signed-distance field through `inputSourceSublayerName`. No
aberration anywhere in the stock material.

**The tuning.** The helper finds that backdrop layer and rewrites its filter — on a mutable copy, because
CoreAnimation skips the commit when the array holds the same object — blur 0, face opacity 0, `scale` 1, inner
refraction from `Lens` (soft −40 / 16 pt, default −60 / 20 pt, strong −100 / 28 pt). Then it appends
`chromaticAberrationMap` filters, four per level, one per edge, each with an `inputOffset` that pulls red toward the
centre and blue away along that edge's axis; their masks are live `CAShapeLayer` sublayers of the backdrop (again
`inputSourceSublayerName`), a ring of the rounded rectangle split into edge strips, so they resize with the window
without re-rendering an image. `Aberration` maps to offset and band width: off, 0.8 pt over 8 pt, 1.5 pt over 12 pt,
2.5 pt over 16 pt in two bands.

**Measured** (ScreenCaptureKit display captures of a random-column pattern behind a transparent stand-in window,
with and without the glass; numbers in 2× pixels, the pattern's column contrast is 73):

| configuration | body | rim band |
|---|---|---|
| stock clear glass (blur 10, scale 0.5) | contrast 73 → 4.5 | — |
| blur 0, face 0, scale 1, refraction 0 | mean abs diff 0.00 | 0.00 |
| + inner refraction −60 / 20 pt | 0.00 | bent over 0–40 px (= 20 pt), untouched beyond |
| + inner refraction −140 / 40 pt | 0.00 | bent over 0–80 px |
| + `chromaticAberration` 3 pt | red shifted −6 px, blue +6 px, green 0 | same |
| slab under a transparent window (helper, A/B) | contrast 72.2 / 72.2 | 20 pt band contrast 71.5 → 54.1, mean unchanged |

Also learned, and why the design is what it is: the map filters (`displacementMap`, `chromaticAberrationMap`) treat
their mask as a threshold at 0.5 — an alpha ramp gave a hard step at half width, not a gradient — so smooth rim
aberration is not available and the bands are hard-edged; `glassForeground`, the filter that does carry
`inputAberrationAmount`, produces black or nothing wherever it is placed, so Apple's own aberration path is not
usable from outside; and Apple's backdrop samples at half resolution, which alone drops the pattern's contrast from
73 to 40 until `scale` is 1.

**Limits.** Up to one frame of lag on a fast drag (the frame is polled, not shared); fullscreen windows are skipped
(nothing behind them, no rim on screen); the filter keys are undocumented and may change — the helper then exits with
status 3 and the window falls back to `none`. The compositor's per-frame cost is only paid while something behind the
window moves, exactly as for Apple's own glass.

## 6. Performance

**Method:** `scripts/perf.mjs` connects over CDP (`--remote-debugging-port`, default 9334) and runs
an in-page `requestAnimationFrame` sampler while synthetic `WheelEvent`s scroll the editor (~60
events/s, reversing every 40 ticks) — in-page so CDP round-trip latency doesn't skew results. Frames
are sampled with glass **ON**, then again with `.vs-glass-off` added to `.monaco-workbench` (the
`GUARD` kill-switch in `src/build.ts`), so the delta is the effects' cost.

**Numbers** (120 Hz display, 4 s per run, window visible — Chromium pauses `requestAnimationFrame`
entirely for occluded windows, which is what produced an earlier "no frames" result; `perf.mjs` now
refuses to measure a hidden window; re-measured after the window-edge lensing, the stronger lens knobs
(§3), and the legibility text-shadow below all landed):

| scenario | state | p50 | p95 |
|---|---|---|---|
| editor scroll | glass ON | 8.3 ms | 8.6 ms |
| editor scroll | glass OFF | 8.3 ms | 8.5 ms |
| scroll under open command palette | glass ON | 8.3 ms | 9.2 ms |

Editor scrolling is effectively unaffected: over a see-through window no base pane carries a filter at all
(1.1.0), so nothing re-filters while code moves; the numbers below were taken with the earlier, filtered
base panes and are therefore an upper bound. The previously-heaviest case, scrolling code
*beneath an open command palette* (re-running the palette's displacement + 22 px blur over a 600×420
CSS-px backdrop every frame), now lands at p95 9.2 ms — comfortably under the 16.7 ms (60 fps) budget,
despite the stronger lens knobs, because the frost blur dropped in the same pass (§3) and the text
legibility shadow (below) costs nothing extra to paint. Typing and scrolling with hovers, suggest
widgets or menus open behaves the same way (smaller backdrops, cheaper). Max and per-frame-overage
figures were not part of this re-measurement pass; see `scripts/perf.mjs` for the method to reproduce
the fuller table.

**Legibility text-shadow:** because clearing the editor's own paints (§5) puts code on a genuinely
see-through plane instead of an opaque one, `.view-lines`, the line-number gutter, `.xterm-rows`, and
sticky-scroll lines all get a soft dark `text-shadow` (Apple lifts labels off glass the same way, §4.4)
so they stay legible over whatever shows through. A `text-shadow` is compositor-cheap — no
`backdrop-filter`, no extra paint per scroll frame — which is why the numbers above show no measurable
cost from adding it.

**Backdrop budget:** `css-liquid-glass.md` §g — "budget SVG-displacement `backdrop-filter` for at
most a handful of chrome surfaces... do NOT apply... per list row... or inside a scrolling list."
Persistent-filter surfaces over a see-through window (1.1.0): **none** — the base panes (title bar,
status bar, activity bar, side bars, panel, sticky scroll) carry `backdrop-filter: none` there, because a
filter over a see-through region has nothing in-page to bend and re-samples stale pixels. In wallpaper mode
(opaque window, in-page smoke) the seven base surfaces filter as before. Widgets filter only while open
(not in the DOM otherwise); nothing inside a scrolling list carries its own filter; the editor's text is never filtered
(it gets the text-shadow above instead). Every filtered rule also sets `isolation: isolate` (§g: scopes
blend modes, gives the compositor a clean boundary) and none of these nests inside another's
backdrop-affected subtree, avoiding the "exponential degradation" nesting risk §g warns about.

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
| 1. Lensing | `feDisplacementMap` genuinely bends backdrop pixels | Static, low-res, shape-generic map per class, not per-frame Metal geometry; bends only in-page content — refracting what's actually behind the window (desktop, other windows, video) is impossible from CSS, not a gap to close (§9) — except through the 1.2.0 window slab on macOS 26 (§5.2), where the window's own rim bends what is actually behind the window via the OS compositor |
| 2. Specular highlight | Rendered conic-gradient hairline per elevation, plus the curvature light the filter computes from the map's normals | Fixed 225° light; no device-motion response (impossible — no accelerometer) |
| 3. Thickness | The lens bending and dispersing what is behind each rim; a drawn rim hairline | No drop shadows anywhere in 1.2.0; no content-aware shadow opacity; no elevation cue where the lens cannot reach |
| 4. Vibrancy | Real alpha compositing of label tiers | No per-instance light/dark flip; one fixed direction per theme |
| 5. Floating panes | Real floating-card geometry, shadows, gaps | No `GlassEffectContainer`-style shared sampling/merging |
| 6. Concentric geometry | Real nested rounded corners | Hand-authored per-selector radii, not computed from padding |
| 7. Adaptive tint | In transparent-window mode, the OS genuinely blurs the user's real desktop (outside VS Glass's own CSS); in wallpaper mode, real saturate/backdrop processing of the neutral smoke | Wallpaper mode's smoke is synthetic and colourless, not the user's real desktop; tint addons are a fixed film, not adaptive sampling |
| 8. Liquid response | Real interpolated CSS transitions for press scale, widget pop-in, and list-row focus glow | Deliberately minimal by owner direction: no sheen, no hover motion anywhere; fixed-duration ease, not a physical spring; no cross-element illumination propagation |

---

## 9. Open problems / future work

- **Refracting what's actually behind the window is impossible from CSS, not unimplemented, and stated
  plainly here because it is the single biggest gap between VS Glass and Apple's real material.** The
  renderer never receives those pixels at all — not "can't access them efficiently," literally never
  receives them. `backdrop-filter` only ever sees what the page itself painted; the desktop, another
  window, or a video playing underneath VS Code are not in that paint. macOS composites whatever is
  behind a window only after the page has already been drawn, one layer up from anything a web renderer
  can hook into, and Vibrancy Continued's behind-window materials (§5) — the mechanism this project's
  transparent-window mode depends on — only blur and saturate at the OS compositor level; they do not
  hand those pixels back to the app for the app to filter itself. So in transparent-window mode, the OS
  blur is the whole story wherever glass doesn't overlap in-page content, and no CSS change closes that
  gap. The one even-conceivable route is a native macOS 26 `NSGlassEffectView` experiment: it would need
  its own native module inside Electron's main process (a structurally different component from
  anything else in this project, well outside Layer 2's CSS-only scope, §1), and even then is unlikely
  to expose sampling of what's behind the window to that module — Apple's own materials do not document
  handing raw behind-window pixels to apps either. Out of scope; not attempted. **VS Glass deliberately
  ships no "desktop mirror" or other fake** — no painted copy of the wallpaper standing in for real
  refraction — because the owner ruled fakery out explicitly: the honest gap stays visible rather than
  being papered over.
- **A JS enhancer for exact per-element maps.** Six fixed aspect classes (§4.1) approximate every
  element of a rough shape; a `ResizeObserver`-driven enhancer could fit a map to each element's
  actual size/radius, and approximate `GlassEffectContainer`-style shared sampling/shape merging
  (§4.5) — deliberately deferred for v1 to keep Layer 2 CSS-only (§1), not architecturally blocked.
- **Content-aware shadows** (§4.3) — would need `elementsFromPoint`/`IntersectionObserver`-driven
  text-density detection; not attempted.
- **Device-motion highlights are impossible**, not unimplemented — Electron has no accelerometer and
  VS Code's window doesn't tilt. Permanent, structural.
- **Cheaper widget blur while scrolling** (§6) — the one remaining measurable cost is a 22 px SVG blur
  over the command palette while code scrolls beneath it (p95 9.2 ms after §3's frost thinning, already
  comfortably under the 16.7 ms budget). A smaller blur radius for the widget class, or `feGaussianBlur`
  at half resolution via `feImage`/`feTile` tricks, would buy further headroom on 60 Hz machines; not
  done because 120 Hz never dropped below 60 fps.
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

### Screenshot tooling

The evidence in `screenshots/` and `screenshots/transparent/` is produced by three scripts, not hand-captured:

| Script | What it does |
|---|---|
| `scripts/screenshots.mjs` | Drives a live VS Code over CDP and captures the wallpaper-mode matrix (`--addons`, `--out`, `--suffix` select variant/addon combinations and output naming); `--alpha` captures with a transparent page background instead, the raw material `composite-transparent.mjs` composites. |
| `scripts/composite-transparent.mjs` | Composites one `--alpha` capture over the maintainer's desktop picture, blurred the way Vibrancy's under-window material blurs it, producing the `screenshots/transparent/*.png` files (`--crop` trims the capture first). Simulated compositing, not a screen recording — every transparent-mode image and caption says so. |
| `scripts/transparent-shots.sh` | Orchestrates the two above for the full transparent-mode set: drives the captures, then runs the composite step for each, writing `screenshots/transparent/` and `screenshots/transparent/tints/`. |

**Test-bed note:** on macOS, the Vibrancy Continued test bed used for transparent-mode work does not
pick up a fresh `glass.css` automatically — its own patch inlines the `imports` files into the Electron
main process at patch time (§5, `glass/install.md` Route C), not at load time. After every build, the
maintainer runs **Reload Vibrancy** and restarts that instance before capturing anything; skipping this
step is a known way to get a screenshot run that silently shows stale CSS on that particular bed.

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

## Review history

Two adversarial review rounds (an independent reviewer judging screenshots against Apple's references, without access to the source or these docs) are archived in `research/review-round-1.md` and `research/review-round-2.md`; `PROGRESS.md` lists what changed after each. Round 1 scored the flagship ≈2/10 ("a competent translucent theme") and drove the second pass: the specular ring re-lit from the top-left, the activity-bar/sidebar seam removed, deeper thickness shadows, a more vivid and structured wallpaper so cards have something to refract, larger rim displacement, light-mode separation, balanced diff fills, and a denser Clear widget material.
