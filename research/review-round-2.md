# VS Glass — Adversarial Design Review, Round 2

**Reviewer brief:** judge the screenshots only, against the eight optical signatures of Apple's
Liquid Glass (WWDC 2025 / iOS 26 / macOS 26 Tahoe). No source, no docs were read; round 1
(`research/review-round-1.md`) was read for continuity only, and every score below was
re-derived from the round-2 images.
**Corpus:** 27 candidate PNGs in `scratch/review/round2/`, 14 official Apple figures in
`research/reference/`.
**Measurement note:** every coordinate is in the **native pixel space of the named file**
(`*-hero/-diff/-terminal/-notifications/-menu` are 2880×1800; `*-palette` are 1444×1052;
`glass-regular-dark-sidebar.png` is 728×1794; `transparent-window-mode-over-checkerboard.png`
is 1440×940; the `zoom-*` crops are 1:1 device-pixel crops, not 2×). `L` = Rec.709 luma on
0–255; "CSS px" = device px ÷ 2. Pixel values were sampled with PIL, not eyeballed.

---

## Scorecard

| # | Item | R1 | R2 | One-line verdict |
|---|------|:--:|:--:|------------------|
| 1 | Lensing / refraction | 1 | **1** | Still zero displacement anywhere; the palette interior is a dead-flat L 57.4 across 400×600 px, so there is not even anything behind it to bend. |
| 2 | Specular edge highlight | 3 | **5** | The light has been correctly moved to the top and every side of the palette now has *some* rim — but it blows out to L 246 and dies to Δ +0.0 for 800 px of the sidebar's trailing edge. |
| 3 | Material thickness | 2 | **5** | Real outer shadows have arrived (150–165 px deep); the terminal panel is still a 2005-era bevel and dark shadows are 12× weaker than light ones. |
| 4 | Vibrancy | 2 | **2** | Token hex is still fixed (`#f090c2` identical across all four variants); the only foreground shift is a tint *veil* that lowers contrast — the opposite of vibrancy. |
| 5 | Floating layered panes | 2 | **7** | The biggest win: real gaps, real shadows, real corners, a measurable transmission hierarchy. Undone at the two ends — the window shell has no rim and the toast is more opaque than the chrome. |
| 6 | Concentric geometry | 2 | **5** | A consistent ~11 CSS px radius token now exists, but it is too small for the panes, half the corners are still square, and toast buttons are *still* more rounded than the toast. |
| 7 | Adaptive tint | 4 | **6** | A genuine hue field now exists in all three variants including light, and the four variants are finally distinguishable — but adjacent panes run *different* tint programs, so it is plainly generated, not sampled. |
| 8 | Liquid response | 1 | **2** | Still a hard `#4987d5` 2 px ring as the only state change. The one capture that could have shown a transient surface (`glass-regular-dark-menu.png`) is *still* a hero shot with no menu. |

**Composite: 4.1 / 10** (round 1: 2.1 / 10). A near-doubling, driven almost entirely by items
3, 5, 6 and 7 — layout, depth and colour. The two items that define Liquid Glass as an *optical*
system rather than a styling system — lensing and vibrancy — did not move at all.

---

## The finding that frames everything else

Round 1's headline was that the effects layer did nothing to the two largest surfaces. Half of
that is fixed and half is not. Sampling `glass-regular-dark-hero.png` against
`glass-regular-dark-layer1-hero.png` at identical coordinates:

| Region | with effects | layer1 (no effects) | Δ L | R1 Δ |
|---|---|---|---|---|
| Activity bar (30, 300) | `#3e4676` L 71.8 | `#1f232b` L 34.7 | **37.1** | 1.0 |
| Tab strip (2650, 105) | `#242830` L 39.7 | `#14171e` L 22.9 | 16.8 | 13.9 |
| Title bar (1700, 36) | `#272d38` L 44.5 | `#1d212a` L 32.8 | 11.7 | 12.8 |
| Sidebar top (400, 200) | `#2f3443` L 52.0 | `#2a2e37` L 45.8 | 6.2 | — |
| Sidebar mid (400, 1000) | `#262a35` L 41.9 | `#272b34` L 42.8 | −0.9 | 1.0 |
| Status bar (1200, 1772) | `#1f2739` L 38.6 | `#1f232c` L 34.8 | 3.8 | 7.0 |
| **Editor (2000, 1500)** | `#13161f` L 22.0 | `#14171e` L 22.9 | **0.9** | **0.9** |

The activity bar has gone from untouched to transformed (ΔL 37, hue 220→231, saturation
0.28→0.47). The sidebar now carries a real vertical ramp (L 51.0 → 41.9 → 49.7 down the column
at x = 400, where layer1 is a flat 45.8/42.8). The **editor is still ΔL 0.9 — byte-for-byte
untouched by the effects layer, exactly as in round 1.**

The overlays are where the layer earns its keep. On `glass-regular-dark-palette.png` vs
`glass-regular-dark-layer1-palette.png` at x = 700:

- layer1 top rim: L 87.4 on an interior of 57.4 (**+30**), and below the pane the ground is L
  21.9→22.9, i.e. **no shadow at all**.
- effects top rim: L 191.9 on an interior of 98 (**+134**, absolute peak L 246 elsewhere on the
  same edge), and below the pane the ground drops to **L 10.3 and takes 150 px to recover to 21**.

So the effects layer is now doing real, visible, measurable work — on chrome and overlays. It
still does nothing to the editor, and it still transmits nothing anywhere.

**Three of the six `zoom-*` captures are broken, up from one in round 1.**
`zoom-sidebar-bottom-seam.png` is a **byte-identical copy** of `glass-regular-dark-hero.png`
(md5 `13adec8b71dbb00b56da79f648378652`). `zoom-palette-rim-bottom-left.png` is a
**byte-identical copy** of `glass-regular-dark-palette.png` (md5
`487cc6438bcd99cffa239dd838c83c4c`) — round 1 explicitly asked for this crop to be re-shot
because it contained no rim; it was duplicated instead. `zoom-sidebar-top-left.png` (760×520)
is a crop of the **editor** (`RefractiveIndex {`, `2.42,`, `1.76,`, `face MaterialProperties {`)
and contains no sidebar, no corner and no rim. Only
`zoom-palette-rim-top-right.png`, `zoom-panel-top-edge.png`, `zoom-tabstrip-titlebar.png` and
`zoom-notification-toast.png` show what their filenames claim.

---

## Per-item findings

### 1. Lensing / refraction — 1 / 10 (was 1)

Unchanged, and now provable three ways.

- **Nothing transmits, so nothing can bend.** In `glass-regular-dark-palette.png` the empty
  right-hand region of the panel (x 700–1300, y 350–780 — 400 × 600 device px, over live editor
  code) measures a **dead-flat L 57.4**: median 57.4, 5th percentile 57.4, 95th percentile 58.3.
  A single horizontal row (y = 500, x 900–1000) reads `57.4` twenty-five times consecutively.
  `glass-clear-palette.png` is the same panel at a flat **L 52.4** — the "Clear" variant is 5
  luma units from "Regular", and both are lids.
- **The transparent-window mode transmits but does not refract.** In
  `transparent-window-mode-over-checkerboard.png` the checker (period 20 px, `#a6a6a9` L 166.2 /
  `#747477` L 116.3) is plainly visible through the sidebar at 64 % opacity — and its **hard
  square edges run dead straight and unbroken through the sidebar body and across its rim**.
  No displacement, no compression, no magnification, no chromatic fringing. The transparency is
  straight alpha.
- **Every overlay boundary is still an occlusion cut.** `glass-regular-dark-hover.png`: the
  tooltip's left edge lands at x = 118 and `ce with` terminates dead at x ≈ 105 with the glyphs
  exactly where they would sit with no pane present. `glass-regular-dark-suggest.png`: `0 to 1`
  is sliced at the capsule's left cap — the place where a real lens shows its strongest
  displacement.

Compare Apple's `07-hig-liquid-glass-components-illustration.png`: the blue slider track passing
behind the toggle knob visibly **bows and thickens**, the rainbow track is compressed into an S
under the pill, and the large rounded rectangle at bottom-right carries **chromatic fringing
(pink/orange/cyan) along its top edge**. That bending and that fringing are the whole illusion,
and neither exists here in any of 27 files.

### 2. Specular edge highlight — 5 / 10 (was 3)

The direction has been corrected and the dead sides have been revived. The distribution is now
wrong in a new way.

Full perimeter walk of `glass-regular-dark-palette.png` (rim peak minus interior 12 px in;
glyph-contaminated samples on the clipped bottom row excluded):

| Edge / corner | Δ rim | R1 Δ |
|---|---|---|
| Top, x = 230–390 (peak) | **+152** | +15 |
| Top, x = 870–1270 | +77 to +80 | +15 |
| **TL corner** | **+113** | — |
| TR corner | +79 | — |
| Right, y = 130 → 770 | +52 → +23 | +4 |
| Bottom, x = 1210 → 490 | +21 → +2 | +7 |
| BR corner | +7 | — |
| **BL corner** | **−6.5** | — |
| Left, y = 60 → 300 → 780 | +46 → +11 → +8 | +110 |

Three things are right: the peak is now on the **top** edge; it sits **left of centre**
(x ≈ 230–390, not at the midpoint); and the **TL corner (+113) beats the TR corner (+79)**. The
same signature repeats on every pane — sidebar top rim +102 (L 183.2 at y = 72 over an interior
of 80.9), terminal panel top rim +99 (L 158.3 over 59), toast top rim +101 (L 174.9 over 73.7),
hover tooltip top rim +113 (L 174.4 over 61.4). Round 1's "lit almost side-on from the far left"
is gone.

Four things are wrong:

- **The rim does not survive the length of an edge.** Scanning the window/activity-bar left rim
  in `glass-regular-dark-hero.png` (max L in x 8–18, interior at x = 26):
  `y 100 → +110.7 | y 180 → +125.7 | y 260 → +128.5 | y 340 → +0.9 | y 420 → +1.2 | … | y 1700 → +2.1`.
  It falls off a cliff between y = 260 and y = 340 and then flatlines at +1 to +3 for **1400 px**.
  The sidebar's right rim is the same story: `y 100 → +47.8 | y 340 → +30.2 | y 660 → +0.0 |
  y 900–1460 → +0.0 | y 1700 → +6.6` — **exactly zero for 800 px of a 1600 px edge.** That is a
  short linear-gradient stroke that runs out, not a lit edge.
- **The falloff is top-*trailing*, not top-leading.** On the palette the right flank stays
  brighter than the left flank for the whole height (+52/+23 vs +11/+8). On the hover tooltip
  the same order holds: top +113 > **right +56** > **left +43** > bottom +28. Two independent
  elements agree. A top-left virtual light must give leading > trailing down the flanks.
- **It is blown out.** The palette's top rim hits **L 246 / 255** at x = 230–390; the window's
  left rim sits at a constant **L 204.6**. Apple's tab-bar pill in
  `11-adoption-tabbar-liquid-glass-after-dark.png` peaks at L 202 over an interior of L 136 —
  and its interior is more than twice as bright as this palette's.
- **It is achromatic.** Every rim measured here is neutral: `#bec0c5`, `#c2c4d5`, `#adafb4`,
  `#abafb3`. Apple's sidebar top rim in `09-adoption-sidebar-background-extension-dark.png` is
  `#ffa57c` — a warm orange, because it is sampling the cherry blossom behind it.

**The continuity benchmark.** A 24-point ray-cast perimeter trace of the Apple pill in figure 11
gives rim deltas of **+38 to +66 through 360°** — absolute 173 to 202 on an interior of 135, a
min/max of **0.58**. The palette here runs +152 to −6.5: **min/max ≈ −0.04**. Apple modulates the
rim by less than 2:1 and never lets it reach zero. This modulates it by more than 20:1 and lets
it go negative.

### 3. Material thickness — 5 / 10 (was 2)

Genuine progress on shadows; the bevels survive.

**Fixed:**
- **Palette outer shadow, dark.** Below the bottom rim at x = 700: L 10.3 at y = 824, recovering
  monotonically to 21.0 by y = 970 — **~150 px deep, floor ~11 L below the editor's ambient 22**.
  Round 1: 13 px, 3 L. To the right the same: L 14.3 at x = 1324 recovering to 19.2 by x = 1359.
- **Palette outer shadow, light.** `glass-regular-light-palette.png` at x = 700: L 246.1 at
  y = 820 → **123.4 at y = 825** → monotonic recovery to 244.0 by y = 990. A **165 px, 120 L**
  penumbra. Round 1's criterion (≥ 35 px, monotonic, visible at 100 %) is comfortably met.
- **Sidebar → editor gap, dark.** `glass-regular-dark-hero.png` at y = 1300, x 692–706:
  `43.6 → 35.8 → 40.5 → 14.6 → 15.4 → 15.5 → 16.5 → 43.8 → 22.9`. A real 8 px shadow trough at
  L 15 against an editor of 22.9, with the *editor pane* carrying its own leading rim (+20.9).
- **The toast's outward halo is gone.** `zoom-notification-toast.png`, scanning left from the
  toast at y = 380: `19.2 → 18.9 → 18.2 → 17.2 → 16.2 → 15.1` then the rim. Monotonically
  *decreasing* below ambient. Round 1 measured L 124.9 → 162.5 *outside* the rim here; that was
  called "the single most un-Apple pixel in the corpus" and it has been removed.
- **The palette's inner double-border is gone.** Inside the left rim, x 124 → 134 now runs
  53.8 → 58.1 smoothly instead of terminating in a hard step.
- **The hover tooltip is the best-constructed element in the corpus.** Its vertical profile
  (x = 500) reads: ambient 20.0 → shadow 18.3 → 4 px edge band 71.8–74.2 → inner specular
  174.4 → body gradient 80.0 decaying smoothly to 55.4 over 47 px → bottom inner specular 83.8 →
  edge band 73–74 → 50.6 → outer shadow 14.9 recovering to 18.2. Edge thickness, inner highlight,
  body gradient, bounce line and cast shadow, in order, symmetric top and bottom. This is what
  the rest of the product should look like.

**Not fixed:**
- **The terminal panel top is still a bevel.** `zoom-panel-top-edge.png`, x = 600 downward:
  `21.0 (editor) → 39.9 (bright hairline, y 166–167) → 23.2–26.0 (dark groove, y 168–175) →
  44–46 → 158.3 (rim, y 178–179) → 59–62 (interior)`. **Two local maxima either side of a local
  minimum.** Round 1's verify criterion — "monotonic and smooth; no local minimum darker than
  ambient sitting next to a local maximum" — still fails. The groove has been lifted from L 12.5
  to L 23–26 and narrowed from 8 px, so it is less crude, but it is still an incised channel with
  a highlight on each side. It also carries a distinct **teal** cast (`#101c20`) against a blue
  editor (`#12151e`) — a coloured seam.
- **The light sidebar/editor boundary is the same bevel.** `glass-regular-light-hero.png`,
  y = 1300, x 690 → 706: `235.4 → 196.9 → 247.8 → 144.4 → 168.3 → 225.0 → 250.1`. **Three
  reversals in sixteen pixels.** The separation reads, but as a drawn groove, not a cast shadow.
- **Dark shadows are 12× weaker than light ones.** Palette floor: L 120 below ambient in light,
  L 11 below ambient in dark. Round 1 said "the light palette is the one shot where a shadow is
  actually legible, which proves the recipe exists and is under-dialled in dark." That is still
  true, just at a higher absolute level.
- **There is no inner shadow anywhere.** Every top edge goes bright-line straight into a bright
  interior. A slab needs a dark inner lip under the highlight; none of the panes has one.
- **The sidebar casts no shadow upward.** Above its top rim (x = 400, y 60–70) the title bar sits
  at L 66–69, identical to its value elsewhere. The pane is outlined into the title bar, not
  floating over it.

### 4. Vibrancy — 2 / 10 (was 2)

The one item with no measurable movement.

- **Foreground colour is still fixed hex.** The keyword glyph at (2000, 565) measures **exactly
  `#f090c2` in all four variants** — `glass-regular-dark-hero`, `…-layer1-hero`, `glass-clear-hero`
  and `glass-opaque-layer1-hero`. The tab-strip `TS` icon is **exactly `#ef9690` in three of the
  four**, over grounds of L 39.7, 22.9 and 19.9.
- **What movement exists is a veil, not vibrancy.** The status-bar "UTF-8" glyph shifts from
  hsv(218, 0.04) over `#1c2129` (opaque) to hsv(262, 0.08) over `#7b3491` (clear). That is a
  low-alpha tint painted *on top of* the text, and it **costs contrast**: the glyph measures
  **4.28 : 1** against its ground in `glass-clear-hero.png` — below AA. Apple's
  `04-materials-legibility-vibrant-label.png` vs `05-…-nonvibrant-label.png` exists to teach the
  opposite: vibrancy *buys* legibility by deriving the foreground from the material and boosting
  saturation.
- **The clearest negative example is the activity bar's active chip.** In
  `glass-regular-dark-hero.png` the Explorer chip (bbox x 17–87, y 78–148) is a **neutral grey
  `#5b5e64`** sitting on a **saturated indigo `#383f7e` (hsv 233, 0.56)** column. A grey chip on
  violet glass is figure 05, shipped.
- **Separators are still flat rules.** The Outline / Timeline dividers in
  `glass-regular-dark-sidebar.png` and `glass-regular-dark-hero.png` are constant-value 1 px lines
  that do not pick up the material's vertical ramp underneath them.
- **The rims are achromatic** where Apple's are backdrop-derived (see item 2).
- **Where the material does thin out, legibility breaks instead of vibrancy saving it.** In
  `transparent-window-mode-over-checkerboard.png` the status bar sits at 42 % opacity and its
  error/warning icons and the `1 / 0` counts sit directly on the raw checkerboard with the
  checker's hard square edges cutting through the glyphs. The `lens.rs` and `refract.go` file
  icons in the 64 %-opaque sidebar nearly vanish against the light checker squares.

Two points, not zero, for the lively file-icon palette and the deliberate blue match-highlight —
the same two points as round 1, for the same two reasons.

### 5. Floating layered panes — 7 / 10 (was 2)

The transformation of the round. Round 1's "the window is a set of butted rectangles sharing
hairline edges" is simply no longer true.

**What now works:**
- **Real gaps with real shadows.** Sidebar → editor: an 8 px trough at L 15 against an editor of
  22.9, with the editor pane carrying its own leading rim at L 43.8. Sidebar → status bar
  (x = 400): interior 48.8 → rim 57.7 → shadow 22.0–28.1 over 10 px → status bar 53.3. Sidebar →
  tab strip: an 11 device px (5.5 CSS px) gap, clearly visible in the top-right crop.
- **Light mode is fixed.** Round 1: sidebar `#f3f7ff` vs editor `#f9fafe`, ΔL 3.4, a 1.04 : 1
  "contrast ratio". Round 2: a shadow reaching **L 144.4 against an editor of 250.1** — a 1.73 : 1
  step. The panes are unambiguously separate slabs.
- **The toast is inset and shadowed.** In `glass-regular-dark-notifications.png` the toast bbox is
  x 1960–2863, y 1438–1735 — **17 device px (8.5 CSS px) clear of the window's right edge**, with
  a monotonic shadow below it (L 21.3 at y = 1737 recovering to 34.5 by y = 1773).
- **A measurable transmission hierarchy exists.** From
  `transparent-window-mode-over-checkerboard.png`, alpha derived from checker amplitude
  (49.9 = fully transparent, 0 = fully opaque):

  | Surface | measured amplitude | ≈ opacity |
  |---|---:|---:|
  | Title bar | 0.0 | 100 % |
  | Editor body | 2.0 | 96 % |
  | Toast body | 1.0 | 98 % |
  | Tab strip | 9.0 | 82 % |
  | Sidebar body | 18.0 | 64 % |
  | Activity bar | 22.0 | 56 % |
  | Terminal panel | 22.0 | 56 % |
  | Minimap | 24.4 | 51 % |
  | Status bar | 29.0 | 42 % |

  Chrome at 42–82 % against a content plane at 96 % is a correct, readable, Apple-shaped
  separation. Round 1 had nothing like it.

**What still breaks it:**
- **The window shell has no glass identity at all.** Its outer edge in
  `glass-regular-dark-hero.png` is still `#0b0e16` (L 13.9) at (6, 900) and (2874, 900) —
  **darker than the editor (22.0) and the activity bar (34.9)**. A dark vignette where Apple puts
  the brightest hairline on screen. In the transparent capture it is worse: at y = 300 the right
  margin (x 1400–1434) is a **96 %-opaque L 26**, and at x = 1435 it cuts straight to the pure
  checker at L 166 — **no rim, no radius, no shadow, no transparency**.
- **The widget tier is inverted.** The toast is 98 % opaque — *more solid than every piece of
  chrome and effectively as solid as the editor*. Apple's rule is the reverse: the higher an
  element floats, the glassier it is. Figure 09's floating back-chevron button is markedly more
  transparent than the sidebar behind it; here the highest element is the most opaque.
- **A piece of the content plane is floating.** The minimap measures 51 % transparent inside a
  96 %-opaque editor. Whatever produced that is a bug.
- **The activity bar and sidebar have zero separation** (see question (c) below).
- **The sidebar is three flat bands, not one gradient.** In `glass-regular-dark-sidebar.png` the
  Explorer header, the "samples" row and the tree body are three distinct tones with hard steps
  at y ≈ 130 and y ≈ 183. Real glass over a continuous backdrop cannot step.

### 6. Concentric geometry — 5 / 10 (was 2)

A radius token now exists and is broadly obeyed. It is the wrong size, half-applied, and still
inverted in one place.

Measured radii (device px → CSS px):

| Element | r (device) | r (CSS) |
|---|---:|---:|
| Activity bar, TL and BL | 24 | 12 |
| Activity bar, TR and BR | 0 | 0 |
| Sidebar, TR and BR | 22 | 11 |
| Sidebar, TL and BL | 0 | 0 |
| Command palette (all four) | ~20 | ~10 |
| Notification toast | 22 | 11 |
| Hover tooltip (with effects) | 24 | 12 |
| Hover tooltip (layer1) | 12 | 6 |
| Activity-bar active chip | ~20 | ~10 |
| **Toast buttons (Yes/Always/Never)** | **~34** | **~17** |

- **Good:** round 1's 0 / 20 / 7 / 12 / 6 chaos has collapsed to a consistent ~11 CSS px. The
  activity-bar chip (~10) is now smaller than its parent (12) — correct direction, and the
  round-1 inversion is not repeated there. Sidebar, panel, tab strip and editor pane all have
  corners where they had none.
- **Too small.** 11 CSS px on a 297 × 830 CSS px sidebar and on a 600 × 405 CSS px command
  palette is a web-app radius. Apple's macOS sidebars run ~20–26 pt and its overlay panels more;
  figure 09's sidebar reads at roughly twice this relative to its size, and figure 07's
  construction circles are drawing radii comparable to the *height* of the elements.
- **Half the corners are square.** The activity bar is rounded left / square right; the sidebar
  is square left / rounded right. Together their outline is one rounded rectangle — which is a
  legitimate composition, but only if the two halves read as one material, and they do not (see
  (c)).
- **The toast still inverts the rule.** Toast radius 11 CSS px; its Yes / Always / Never buttons
  are 68 device px tall full pills, r ≈ 17 CSS px. **Child radius exceeds parent radius**, exactly
  as in round 1, unchanged. Apple's rule (child = parent − inset) is what
  `11-adoption-tabbar-liquid-glass-after-dark.png` shows and what figure 07's construction
  circles are drawing.
- **Square children inside rounded parents persist.** The diff's word-level insert boxes
  (`#355f3b`) are hard rectangles; the palette's selected row is still square and full-bleed
  inside a ~10 px-rounded parent.

### 7. Adaptive tint — 6 / 10 (was 4)

The second-biggest improvement, and now the item where the *mechanism* is most visibly wrong.

**What works:**
- **A genuine two-axis hue field.** In `glass-regular-dark-hero.png` the title bar runs
  `#384080` hsv(233, 0.56) at x = 200 to `#22404a` hsv(195, 0.54) at x = 2700 — indigo to teal
  across the top. The status bar runs blue (`#1f395c`, hue 217) at x = 400 through neutral at
  x = 1450–1600 to violet (`#4b2f5b`, hue ~280) at x = 2650. Layer1 is a flat hue 220–224 at
  saturation 0.24–0.33 everywhere.
- **Light mode has tint now.** Round 1: `#f3f7ff` / `#f9fafe`, "functionally neutral". Round 2:
  title bar `#e3eafd` hsv(224, 0.10) → `#ddf5fa` hsv(190, 0.12); ground hsv(209, 0.09) →
  hsv(191, 0.11). Subtle, but a real warm/cool axis where there was none.
- **The variants are finally distinguishable.** Round 1's damning line — "a reviewer handed these
  four files unlabelled could not sort them" — no longer holds. Clear runs at saturation
  0.68–0.86 (`#4454d6`, `#156a77`, `#144990`), Regular at 0.47–0.56, Opaque at a flat
  `#1c2129` everywhere. Any reviewer sorts these in a second.

**What does not:**
- **It is generated, not sampled, and two adjacent panes prove it.** Down the activity bar
  (x = 30) the tint runs hsv(231, 0.47) at y = 300 → hsv(222, 0.36) at y = 900 → hsv(217, 0.15)
  at y = 1600. Down the sidebar immediately beside it (x = 400) it runs hsv(225, 0.30) →
  hsv(224, 0.28) → hsv(217, 0.43). **Saturation falls by two-thirds on one pane and rises by half
  on the other, over the same notional backdrop, separated by two pixels.** Two sheets of glass
  in front of the same wall cannot pick up different colours. Contrast Apple's figure 09, where
  the sidebar's tint tracks the photograph behind it point for point: hsv(265, 0.12) at y = 140 →
  hsv(7, 0.28) → **hsv(352, 0.44)** → hsv(349, 0.38) → hsv(344, 0.22) → hsv(340, 0.05). That is a
  blurred image, not a gradient.
- **Clear still does not deliver its brief.** Apple's caption for
  `03-materials-liquid-glass-clear-variant.png` is that Clear "allows the visual detail of the
  background beneath it to show through" — the brick courses are readable through the disc. Here
  the Clear palette's interior is a flat **L 52.4** against Regular's flat **L 57.4**. Clear is
  more *saturated*, not more *transparent*; its sidebar body at (400, 900) is `#1e212c` L 33.2 —
  **darker and more opaque than Regular's `#262a35` L 41.9**. The variant axis is a colour knob,
  not a transmission knob.
- **The stronger tint has cost legibility.** The Clear status bar's ground reaches `#7b3491`
  (saturation 0.64) under text that was not re-derived: "UTF-8" measures **4.28 : 1**.

### 8. Liquid response — 2 / 10 (was 1)

- **The only state change in 27 files is still a hard saturated stroke.** `#4987d5`, 2 device px,
  uniform: around the notification body in `zoom-notification-toast.png` (x = 82 at y = 380;
  y = 270 and y = 492–493 at x = 500), around the selected `glass.ts` row in
  `glass-regular-dark-sidebar.png`, and around the palette input in every palette shot. A binary
  stroke toggle is the opposite of a damped material flex.
- **`glass-regular-dark-menu.png` still contains no menu.** It is a hero shot. Round 1 flagged
  this and asked for a re-capture; it was not re-captured. The one surface class that would show
  a transient, appearing, flexing element is absent from the corpus for the second round running.
- **No pressed state, no hover state, no pointer-position evidence** anywhere. The Yes / Always /
  Never buttons are all in the same rest state; there is no second capture of any element.
- Two points, not one, because the effects layer now gives the hover tooltip a real material
  construction (edge band → inner specular → body gradient → bounce line) and doubles its radius
  from 6 to 12 CSS px versus layer1, and because the palette's selected row is now a fill rather
  than a stroke. Static evidence of a material that *could* respond — but no evidence that it does.

---

## Answers to the four direct questions

### (a) Fixed / persisting / worse

**Fixed (17):** light-mode pane separation (ΔL 3.4 → a 106 L shadow); light-mode line-number
contrast (4.12 → **4.75 : 1**, now above AA); light-mode tint (neutral → hsv 190–224 at
saturation 0.10–0.12); palette outer shadow (13 px / 3 L → 150 px / 11 L dark, 165 px / 120 L
light, both monotonic); rim direction (left-lit → top-lit, TL corner +113 > TR +79); the two dead
rim sides (right +4 → **+44**, bottom +7 → **+21**); the toast's outward halo (L 162 outside the
rim → a monotonic dark shadow); the toast's zero corner margin (→ 8.5 CSS px); diff insert/delete
imbalance (5.5× → **1.7×**: +16.0 L vs +9.3 L, |Δ| = 6.7, meeting round 1's ≤ 8 criterion); the
invisible word-level diff box (1 L → **+45.5 L** above the line fill, meeting the ≥ 15 criterion);
the diff gutter hue clash (maroon under a green line → green `#21342b` under green, maroon
`#362026` under maroon); the merge-conflict flood in the notifications shot; sidebar radius
(0 → 11 CSS px on the trailing corners) and panel / tab-strip corners; radius-scale consistency
(0/20/7/12/6 → a single ~11 CSS token); the palette's inner double-border (hard step at x = 134 →
a smooth 10 px ramp); the four variants being indistinguishable; and the transparent-window
capture, which is now a genuinely useful demo with a stand-in backdrop and a measurable per-surface
alpha table.

**Persisting (13):** zero lensing anywhere; the editor untouched by the effects layer (ΔL 0.9,
identical to round 1); overlays that transmit nothing (palette interior a flat L 57.4); Clear
failing its HIG brief (52.4 vs 57.4, both opaque); the Clear palette's text ghosting — editor code
(`const [state, setState] = React.useState<T>(props)`) still overprints
`Problems: Focus on Problems View` at y ≈ 800 in `glass-clear-palette.png`; the palette's last row
still clipped mid-glyph with no fade mask in **all three** variants
(`Reset choice for 'File operation needs preview'` in dark, `Problems: Focus on Problems View` in
light and clear); the toast's flat opaque body (`#37547a` — one hex unit from round 1's
`#37557a`), its clashing grey header (L 73.7→63.7) and its buttons being more rounded than itself;
the hard `#4987d5` focus rings as the only state change; the window edge as a dark vignette
(`#0b0e16` L 13.9); `glass-regular-dark-menu.png` containing no menu; flat separators; fixed
foreground hex (`#f090c2` in all four variants); the terminal panel's bevelled top edge; and the
Opaque variant's activity bar, sidebar and status bar being literally the same hex (`#1c2129`).

**Worse (7):**
1. **Broken captures went from one to three.** Two `zoom-*` files are now byte-identical
   duplicates of full screenshots and a third is a crop of the wrong region. Round 1 asked for
   `zoom-palette-rim-bottom-left.png` specifically to be re-shot; it was duplicated instead.
2. **The rim's dynamic range got worse in the other direction.** Round 1: left +110, right +4.
   Round 2: top +152, sidebar trailing edge **exactly +0.0 for 800 px**, BL corner **−6.5**. Round
   1's verify criterion — "minimum never below ~25 % of peak" — was missed by a factor of ∞.
3. **Rim over-brightness is new.** L 246 / 255 on the palette's top rim and a constant L 204.6 on
   the window's left rim. Apple's never exceeds ~202, over a much brighter interior.
4. **The activity-bar / sidebar seam gained a colour clash.** Round 1 had a four-value double
   border; round 2 has a clean two-pixel step, but now across a **12 L and 0.17 saturation**
   difference (`#353c74` hsv(231,0.47) → `#2e3341` hsv(225,0.30) at y = 300), with no gap, no
   shadow and a +2 rim.
5. **Dark line numbers dropped below AA**: **4.27 : 1** against `#13161f`. Round 1 flagged this
   only in light mode; light is now fixed and dark has fallen below.
6. **Clear-mode status text fell below AA**: **4.28 : 1** over `#7b3491`, a direct consequence of
   turning the tint up without re-deriving the foreground.
7. **The widget tier inverted.** The toast is 98 % opaque while the chrome is 42–82 % — the
   element that floats highest is now the most solid thing in the window.

### (b) Is the rim now lit from the top-left?

**From the top, yes; from the top-*left*, only at the corners.**

The direction is fixed at the top: every pane's top edge is now its brightest — palette +152
(peak at x ≈ 230–390, correctly left of centre), sidebar +102, terminal panel +99, toast +101,
hover tooltip +113. The **TL corner (+113) beats the TR corner (+79)** on the palette, which is
the right relationship.

Below the corners the model inverts. On the palette the right flank runs +52 → +23 while the left
flank runs +11 → +8 for the same 600 px of height. On the hover tooltip the order is top +113 >
**right +56** > **left +43** > bottom +28. Two independent elements put the trailing edge above
the leading edge, which is a top-*trailing* light. And on long vertical edges the rim exists only
for the top ~15 % and then vanishes: the window's left rim is +128.5 at y = 260 and **+0.9 at
y = 340**, holding +1 to +3 for the next 1360 px; the sidebar's right rim is +47.8 at y = 100 and
**+0.0 from y = 660 to y = 1460**. Apple's pill holds +38 to +66 through all 360°.

So: the *aim* has been corrected, the *falloff* has not. A designer would read "there is a
highlight at the top" rather than "there is a light source above and to the left of this window".

### (c) Do the activity bar and sidebar read as one pane?

**No — and the construction makes it read worse than either alternative.**

Geometrically they are built as one. The activity bar is rounded on its left (r = 12 CSS px, arc
traced from (33, 72) to (10, 96) in `glass-regular-dark-hero.png`) and square on its right; the
sidebar is square on its left and rounded on its right (r = 11 CSS px). Their combined silhouette
is a single rounded rectangle.

Tonally they are two. The seam at x = 96 → 100 reads, at four heights:

| y | activity bar (x = 96) | rim (x = 98) | sidebar (x = 100) | ΔL | Δsat |
|---|---|---|---|---:|---:|
| 300 | `#353b73` L 62.4 hsv(231,0.47) | `#2f3542` L 53.8 | `#2e3341` L 51.0 hsv(225,0.30) | −11.4 | −0.17 |
| 700 | `#212637` L 35.9 | `#2c303a` L 48.4 | `#2a2f38` L 46.8 | +10.9 | — |
| 1100 | `#1f2330` L 35.2 | `#2c313a` L 48.7 | `#262a34` L 42.0 | +6.8 | — |
| 1500 | `#1f2e45` L 44.4 | `#2c3441` L 51.4 | `#262d3c` L 45.4 | +1.0 | — |

There is **no gap, no shadow, and a rim worth +2 to +7** — and the sign of the value step
*reverses* down the height (the activity bar is 11 L brighter at the top and 11 L darker at
mid-height). Add the divergent tint programs from item 7 (activity bar saturation 0.47 → 0.15
descending; sidebar 0.30 → 0.43 ascending) and the eye reads one silhouette containing two
different materials welded together. That is the least convincing of the three available
readings — worse than an honest gap, and worse than a truly uniform pane.

### (d) Does the transparent capture show a coherent glass hierarchy?

**A correct two-tier hierarchy, with the widget tier inverted and the window shell missing.**

The chrome-versus-content separation is real and measures well (table in item 5): chrome at
42–82 % opacity against a content plane at 96 %. That is Apple's rule — content is opaque, chrome
is glass — and it is the first time this product has demonstrated it. The sidebar at 64 % keeps
filenames legible; the tab strip at 82 % and the title bar at 100 % correctly step up in solidity
as they approach the content.

Three things break the hierarchy:

1. **The toast is 98 % opaque.** The element that floats highest, and which in Apple's system is
   the glassiest thing on screen, is the most solid thing in the window — more solid than the
   sidebar it floats over and effectively as solid as the editor.
2. **The minimap is 51 % transparent inside a 96 %-opaque editor.** A piece of the content plane
   is floating.
3. **The window shell has no glass identity.** At y = 300 the right margin (x 1400–1434) is a
   96 %-opaque L 26 that terminates at x = 1435 in a hard cut to the pure checker at L 166 — no
   rim, no radius, no shadow, no transparency. The outermost slab, the one the OS would blur the
   desktop behind, is a flat dark rectangle.

And the capture confirms the item-1 verdict: the checkerboard's hard square edges run **dead
straight and unbroken** through the sidebar body and across its rim. Whatever the material does,
it does not bend light.

---

## The 10 most valuable changes remaining, in priority order

**1. Make the overlays transmit, then bend what they transmit.**
The command palette's interior is a flat L 57.4 across 400 × 600 device px with live code behind
it; Clear's is a flat L 52.4. Raise transmission on the palette, hover, suggest and toast until
the backdrop is legible-but-attenuated, then apply an edge-normal displacement confined to the
outer 12–16 device px — strongest at the boundary, zero by ~24 px in, with a slight magnification
just inside the rim and a 1–2 px chromatic split (see the pink/orange/cyan fringe on figure 07's
bottom-right rectangle).
*Where visible:* `glass-regular-dark-palette.png` (code at x < 120 currently just stops);
`glass-regular-dark-hover.png` (`ce with` sliced at x ≈ 105); `glass-clear-palette.png`, which is
supposed to be the transmissive variant and is 5 L from Regular.
*Expected effect:* the single change that converts "well-built translucent panel" into "Liquid
Glass". Everything else on this list is polish by comparison.
*Verify:* open the palette over a file containing a long unbroken horizontal rule or box-drawing
line so it passes under the pane edge; capture at 4×. The line must remain **continuous** and
visibly **kink or compress within 12 px of the rim**. Then re-measure the palette interior over
the empty right-hand region: the 5th-to-95th-percentile spread must exceed 15 L, not 0.9 L.

**2. Fix the rim's falloff so it survives the length of an edge.**
The window's left rim is +128.5 at y = 260 and +0.9 at y = 340; the sidebar's right rim is exactly
+0.0 from y = 660 to y = 1460. The rim currently behaves like a short linear gradient anchored to
the top of the element rather than a function of surface normal and light direction.
*Where visible:* every long edge in `glass-regular-dark-hero.png` and
`glass-regular-dark-sidebar.png`.
*Expected effect:* panes gain a continuous lit outline instead of a highlight that evaporates —
the thing Apple's tab-bar pill has and this does not.
*Verify:* script a perimeter walk sampling rim peak minus interior every 20 px around each pane
and plot it. Target Apple's figure-11 profile: a **single smooth peak, min/max ≥ 0.4**, minimum
never zero. Today the palette runs +152 to −6.5 (min/max ≈ −0.04) and the sidebar's trailing edge
sits at exactly 0.0 for half its length.

**3. Re-aim the flanks to top-*leading*, cap the peak, and make the rim chromatic.**
Below the corners the trailing edge is currently brighter than the leading edge on both the
palette (+52/+23 right vs +11/+8 left) and the hover tooltip (right +56 vs left +43). The peak is
also blown out at L 246/255 (palette top) and a constant L 204.6 (window left) — Apple never
exceeds ~202 over a brighter interior. And every rim here is neutral grey where Apple's is
`#ffa57c`, sampled from the backdrop.
*Where visible:* `glass-regular-dark-palette.png` perimeter; `glass-regular-dark-hover.png`
x = 123 vs x = 880; compare `09-adoption-sidebar-background-extension-dark.png` y = 82.
*Expected effect:* the light stops reading as "a white line stuck to the top" and starts reading
as a physical source above and left of the window.
*Verify:* leading-flank Δ must exceed trailing-flank Δ at every height below the corner arc; no
rim pixel above L 215; rim hue must track the local backdrop hue within ±30°.

**4. Weld the activity bar and sidebar into one material, or separate them honestly.**
They share one rounded-rectangle silhouette but carry a 12 L / 0.17-saturation step across a
two-pixel seam with no gap, no shadow and a +2 rim — and their tint programs diverge (activity bar
saturation 0.47 → 0.15 descending, sidebar 0.30 → 0.43 ascending).
*Where visible:* `glass-regular-dark-hero.png` x 96–100 at y = 300/700/1100/1500;
`zoom-sidebar-top-left.png` was presumably meant to show this and shows the editor instead.
*Expected effect:* removes the most conspicuous "two CSS rules, one shape" tell in the product.
*Choose one:* (a) one pane — same tint field, same opacity, a hairline divider at most; or (b) two
panes — an 8–12 CSS px gap, a real shadow trough, and all four corners rounded on each.
*Verify:* a horizontal scan across the seam must be either monotonic within 3 L (one pane) or show
a shadow trough at least 6 L below the darker neighbour (two panes). Tint hue and saturation must
match within 5° / 0.05 at every height.

**5. Replace the last two bevels with a single monotonic profile, and bring dark shadows up to
light.**
The terminal panel's top edge still runs `21.0 → 39.9 → 23.2 → 44 → 158.3 → 59` — two local maxima
around a local minimum. The light sidebar/editor boundary runs
`235.4 → 196.9 → 247.8 → 144.4 → 250.1` — three reversals. Meanwhile the dark palette's shadow
floor is 11 L below ambient and the light one is 120 L below.
*Where visible:* `zoom-panel-top-edge.png` x = 600, y 160–185; `glass-regular-light-hero.png`
y = 1300, x 690–706; `glass-regular-dark-palette.png` y 820–970 vs
`glass-regular-light-palette.png` y 820–990.
*Expected effect:* the two remaining "engraved line" artefacts disappear and the dark variant
gains the depth the light variant already has.
*Verify:* a 40 px perpendicular profile across every boundary must be **monotonic** apart from the
single rim spike — no local minimum darker than ambient sitting next to a local maximum. The dark
palette's shadow floor must reach ≥ 40 L below the editor ground.

**6. Derive foreground colour from the local material.**
`#f090c2` is byte-identical in all four variants. The one shift that exists (status text
hsv 218 → 262 in Clear) is a veil that costs contrast. Blend token and UI colours toward the local
backdrop hue *and boost saturation* so the same token renders differently on the L 44 sidebar and
the L 22 editor; make separators vibrant rather than flat rules; give the activity-bar chip the
column's hue instead of neutral grey.
*Where visible:* keyword glyph at (2000, 565) across all four variants; the grey `#5b5e64` chip on
the indigo `#383f7e` activity bar; the flat Outline/Timeline dividers.
*Expected effect:* this is what Apple's figure 04 vs 05 pair exists to teach, and it fixes three
contrast failures for free (below).
*Verify:* sample the same token in the editor and in a peek/sidebar preview — the hex must differ
and both must clear 4.5 : 1. Then fix the three measured failures: **dark line numbers 4.27 : 1**
against `#13161f`, **Clear status text 4.28 : 1** over `#7b3491`, and the transparent-mode status
bar and file icons over the 42 %/64 % surfaces.

**7. Rebuild the toast as glass — it is still the least Apple element in the product.**
The halo is gone, which was the big win, but the body is still a **flat opaque `#37547a`** with
zero gradient over its entire area (98 % opaque in the alpha capture), the header is a
desaturated grey-blue (L 73.7 → 63.7) hard-seamed against it, the buttons are r ≈ 17 CSS pills
inside an r = 11 CSS parent, and a hard saturated `#4987d5` 2 px stroke rings the whole body.
*Where visible:* `zoom-notification-toast.png`; `glass-regular-dark-notifications.png` bbox
x 1960–2863, y 1438–1735.
*Expected effect:* the floating tier finally becomes the glassiest tier instead of the most solid.
*Verify:* the toast body's opacity in the transparent capture must fall below the sidebar's 64 %;
its interior must carry a top-to-bottom gradient of ≥ 15 L; header and body must share one
material with no seam; button radius must be ≤ parent radius − inset; the blue stroke must be
replaced by a rim that varies around the perimeter.

**8. Give the window shell a rim, a radius and a transmission.**
The outermost slab is currently `#0b0e16` (L 13.9) — darker than everything it contains — and in
the transparent capture its right margin is 96 % opaque and terminates at x = 1435 in a hard cut
to the desktop with no rim, no radius and no shadow.
*Where visible:* `glass-regular-dark-hero.png` (6, 900) and (2874, 900);
`transparent-window-mode-over-checkerboard.png` y = 300, x 1400–1439.
*Expected effect:* the window stops being a dark box containing glass and becomes the outermost
sheet of glass, which is the whole premise of the transparent-window mode.
*Verify:* the window's outer boundary must carry the brightest hairline in the frame, a radius
≥ 12 CSS px on all four corners, and a transmission at least as high as the tab strip's.

**9. Enlarge the radius token and finish the corners.**
11 CSS px on a 297 × 830 CSS px sidebar and a 600 × 405 CSS px palette is a web radius. Move
panes to 16–20 CSS px, overlays to 20–24, and give every pane four corners rather than two.
*Where visible:* sidebar TL/BL = 0 and activity bar TR/BR = 0 in `glass-regular-dark-hero.png`;
palette ~10 CSS px in all three variants; the diff's square word-level boxes; the palette's square
full-bleed selected row.
*Expected effect:* removes the residual "this is a web page" signal that the correct radii on the
trailing corners currently only half-suppress.
*Verify:* a 4× crop of all four corners of every pane plus one nested child, side by side. Every
arc must be visibly parallel to its parent's, no child radius may exceed its parent's, and no pane
may present a square corner adjacent to a rounded one on the same edge.

**10. Re-shoot the four broken captures and fix the two persistent text defects.**
`zoom-sidebar-bottom-seam.png` and `zoom-palette-rim-bottom-left.png` are byte-identical
duplicates of the full hero and palette shots; `zoom-sidebar-top-left.png` is a crop of the
editor; `glass-regular-dark-menu.png` still has no menu open — the fourth round-2 file that
documents nothing. Separately, the palette's last row is still clipped mid-glyph in all three
variants and `glass-clear-palette.png` still overprints editor code onto
`Problems: Focus on Problems View` at y ≈ 800.
*Expected effect:* the review corpus starts proving things instead of asserting them, and the
"unfinished" read that undercuts the genuinely good work in items 3, 5 and 7 goes away.
*Verify:* every `zoom-*` file must have a distinct md5 from every full screenshot and must contain
the feature its filename names. No glyph in any capture may be intersected by a pane edge (add
bottom padding or a fade mask at the list's scroll boundary). No two text runs may overlap
anywhere. Re-capture the menu with a menu actually open, and add a hover-state and pressed-state
pair for at least one control so item 8 becomes judgeable.

---

## Overall verdict

A designer who knows Liquid Glass would now stop and look twice — and would still not call it
Liquid Glass. The three-second read has changed: the sidebar has corners, there are real gaps
between panes with real shadows in them, the light comes from the top, the light variant is no
longer an unfinished draft, the diff no longer shouts, the toast no longer glows outward, and the
transparent-window capture finally shows a defensible chrome-versus-content transmission
hierarchy. Round 1's verdict was "blur and alpha"; that is no longer fair. What is here now is a
carefully composed, correctly layered, tinted, shadowed **stack of opaque slabs** — and the hover
tooltip in `glass-regular-dark-hover.png`, with its edge band, inner specular, body gradient,
bounce line and cast shadow in the right order, proves the team knows exactly what a glass edge
is made of. The problem is that they have built the *frame* of the material and not the material.
Nothing in 27 files bends, magnifies or displaces anything behind it; the command palette's
interior is a dead-flat L 57.4 over live code, so there is not even a backdrop for the optics to
act on; `#f090c2` is the same hex in every variant, so no foreground has ever heard of the surface
under it; and the two adjacent panes at x = 96 and x = 100 carry tint programs running in opposite
directions, which is the tell that the colour is painted on rather than picked up. The rim,
meanwhile, has swung from wrong-direction-and-mostly-absent to right-direction-and-wildly-
over-modulated: L 246 out of 255 on the palette's top edge, and exactly +0.0 for 800 px of the
sidebar's trailing edge, against Apple's steady +38-to-+66 through all 360°. The gap is no longer
amplitude, which was round 1's diagnosis and has been largely closed; it is now **physics and
provenance** — light that passes *through* the pane, and colour that comes *from* behind it.
Ship transmission plus edge displacement on the three overlays, hold the rim between +30 and +70
all the way round, and derive one foreground colour from the material, and this becomes a
credible Liquid Glass port. Until then it is the most convincing translucent theme I have
measured, which is a real compliment and still the wrong category.
