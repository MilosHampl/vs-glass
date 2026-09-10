# Liquid Glass refraction/lensing in CSS — what actually works today (Chromium / VS Code Electron)

Research date: 2026-09-10. Target runtime: VS Code 1.136.1 on macOS, which bundles **Electron 42.10.0 / Chromium 148.0.7778.280** ([ewanharris/vscode-versions](https://github.com/ewanharris/vscode-versions)). All hands-on verification below was done with locally installed **Google Chrome 152.0.7977.83** (a few versions ahead of VS Code's bundled Chromium, same engine generation — findings should transfer).

Runnable test bed: [`css-tests/lensing-test.html`](./css-tests/lensing-test.html), rendered proof: [`css-tests/lensing-test.png`](./css-tests/lensing-test.png). See "Testing" section near the end for exactly how it was produced and what it shows.

---

## a. Does Chromium honour `backdrop-filter: url(#svgFilter)` with `feDisplacementMap`?

**Findings.** Yes — and this is Chromium's genuinely distinguishing capability here. `backdrop-filter` accepts the same `<filter-value-list>` grammar as `filter` ([MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)): `url()` references to an SVG `<filter>` can be mixed with CSS filter functions, e.g. `backdrop-filter: url('filters.svg#filter') blur(4px) saturate(150%);`. Chromium is the only engine that actually resolves an SVG filter (including `feDisplacementMap`) when it's referenced from `backdrop-filter`; WebKit tracks this as an explicit non-support bug ([WebKit #245510](https://bugs.webkit.org/show_bug.cgi?id=245510): "`backdrop-filter: url(#some-svg-filter)` doesn't work with SVG filters like `feDisplacementMap`"), and Firefox doesn't support SVG filters in `backdrop-filter` either. This is corroborated across nearly every 2025/2026 write-up on the technique ([kube.io](https://kube.io/blog/liquid-glass-css-svg/), [webtricks.dev](https://webtricks.dev/blog/liquid-glass-css), [LogRocket](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/), [shuding/liquid-glass](https://github.com/shuding/liquid-glass)) and by the open W3C SVG WG interoperability issue ([w3c/svgwg#1142](https://github.com/w3c/svgwg/issues/1142), "define interoperable backdrop displacement/refraction for 'liquid glass' UI" — filed precisely because only Chromium works and authors have to fall back to DOM-cloning tricks in Safari/Firefox).

**Known bugs / quirks, evidence-backed:**
1. **External SVG file references were long broken for other SVG-referencing properties** (`fill`, `stroke`, `clip-path`, `mask`, `filter` attribute) — [Chromium #109212](https://bugs.chromium.org/p/chromium/issues/detail?id=109212) / [#40134477](https://issues.chromium.org/issues/40134477), open since 2012, "SVG filters from external files not applied." **This does *not* currently block `backdrop-filter: url('external.svg#id')`** — we tested it directly (pane 3 of the test page) and it rendered correctly in Chrome 152. Treat this as **verified for `backdrop-filter` specifically, on this Chromium version**, but keep the inline variant as the safer default given the long history of the general external-reference bug family.
2. **`color-interpolation-filters` matters.** Chrome's default for filter primitives is `linearRGB`; nearly every liquid-glass writeup explicitly sets `color-interpolation-filters="sRGB"` on the `<filter>` to get correct-looking (non-washed-out) displacement/color math ([kube.io](https://kube.io/blog/liquid-glass-css-svg/)). Our test filter sets this explicitly.
3. **Filter region / `filterUnits` ambiguity.** Multiple sources warn that the default `objectBoundingBox` units + percentage `x/y/width/height` on `<filter>`/`feImage` cause clipping or mis-scaling once the filter is used as a `backdrop-filter` (as opposed to a plain `filter`) — recommendation across sources (LeonardSEO/liquid-glass-react, kube.io) is to pin `filterUnits="userSpaceOnUse"` and give the filter and `feImage` explicit pixel dimensions matching the element's box. We followed this in the test and it rendered correctly; leaving units at the default is the most commonly cited cause of a filter that "does nothing" or clips at the wrong box.
4. **A live, currently-open Chromium regression**: [issues.chromium.org/issues/41496487](https://issues.chromium.org/issues/41496487) — titled "backdrop-filter has changed the way SVG [filters are clipped/regioned]" (full body requires a Google sign-in to view, so we could not confirm exact repro steps, but the title and its co-listing alongside [#415354762](https://issues.chromium.org/issues/415354762) "Scaling nested element with backdrop-filter within another element removes the filter" indicates real, currently-tracked fragility around `backdrop-filter` + SVG filter regions when transforms/scaling are involved. **Practical implication for VS Glass: avoid `transform: scale()` on an ancestor of a lensed pane, and re-test whenever Electron's Chromium is bumped.**
5. **Scroll/paint flicker**: independent of SVG filters, plain `backdrop-filter: blur()` has open flicker bugs on scroll ([Chromium #339841685](https://issues.chromium.org/issues/339841685), [#41471914](https://issues.chromium.org/issues/41471914)) — relevant to a VS Code sidebar since it scrolls; mitigate with `will-change: backdrop-filter` and `contain: paint` (see section g).
6. **Dynamic resize is expensive.** kube.io explicitly notes: "dynamic shape/size changes are currently costly because nearly every tweak forces a full displacement-map rebuild" — animate `feDisplacementMap`'s `scale` attribute (or swap `backdrop-filter` filter-function lists, which Chromium interpolates natively) rather than resizing the element.

```css
/* Minimal working reference (see full inline/external test in lensing-test.html) */
.glass {
  backdrop-filter: url('#edgeLens') blur(1.5px) saturate(160%) brightness(1.05);
  -webkit-backdrop-filter: url('#edgeLens') blur(1.5px) saturate(160%) brightness(1.05);
}
```
```xml
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="edgeLens"
          filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
          x="0" y="0" width="560" height="320"
          color-interpolation-filters="sRGB">
    <feImage href="displacement-edge.png" x="0" y="0" width="560" height="320"
             result="dispMap" preserveAspectRatio="none"/>
    <feDisplacementMap in="SourceGraphic" in2="dispMap" scale="70"
                        xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

**Chromium status:** Supported (inline *and*, per our own test, external `.svg` file references) as of Chrome 152 / matches VS Code 1.136.1's Chromium 148. WebKit/Safari and Firefox: unsupported (spec gap tracked at w3c/svgwg#1142). At least one open Chromium regression around SVG-filter + `backdrop-filter` + transforms (#41496487) — not fully diagnosable from public search snippets, re-test on Electron upgrades.

**Perf cost:** Each `url()`-filtered `backdrop-filter` element forces its own compositor backdrop pass (see section g) *plus* an SVG filter raster pass per frame if animated. Static (non-animated) SVG-filter backdrops are re-rastered only when the pane's backdrop content changes (e.g. editor scroll) — acceptable for a handful of surfaces, not for every list row.

---

## b. Producing edge-only lensing (strong near the border, ~zero in the centre)

**Findings — options evaluated:**

| Approach | Verdict | Why |
|---|---|---|
| `feTurbulence` + `feDisplacementMap` | **Wrong look** | Procedural noise displaces the *whole* surface uniformly/randomly — reads as "wobbly water," not a lens. Used by simpler demos ([webtricks.dev](https://webtricks.dev/blog/liquid-glass-css), [dpawlikowski/liquid-glass](https://github.com/dpawlikowski/liquid-glass)) as a cheap stylistic effect, not real refraction. |
| Linear-gradient displacement map | **Wrong** | Explicitly called out by [LeonardSEO/liquid-glass-react](https://github.com/LeonardSEO/liquid-glass-react) as "uniform diagonal shift across the whole element — looks like a UI bug" — no edge concentration at all. |
| **Precomputed SDF (signed-distance-field) displacement map, rendered to a PNG and loaded via `feImage`** | **Best available technique** | Used by shuding/liquid-glass, LeonardSEO/liquid-glass-react, and the physically-derived kube.io approach. Encodes, per pixel, the direction *and magnitude* of an outward push that is ~0 in the shape interior and ramps up only within a narrow rim near the border — this is what actually reads as "glass bending light near its edge." |
| Live magnified copy via `backdrop-filter` + `scale()` masked to edges only | **Not viable in pure CSS** | `backdrop-filter` has no scale/zoom filter function, and cloning the DOM behind an element (the workaround w3c/svgwg#1142 lists for Safari/Firefox) requires JS to counter-position a "magnifier" clone, which is out of scope for a CSS-only recipe and reintroduces scroll-sync bugs. |

**Our implementation** (built for this research and physically verified — see Testing): a Python/numpy script computes a rounded-rect signed-distance field, takes its numerical gradient to get the outward normal at every pixel, and multiplies that normal by a `smoothstep` falloff that is `1.0` at the boundary and `0.0` at `rim` px inside it (34px, for a 28px corner radius). The result is encoded as `R = 128 + nx·127`, `G = 128 + ny·127` (128 = no displacement, matching `feDisplacementMap`'s neutral midpoint), and written out as a real PNG (raw zlib/PNG writer, no external imaging library needed). This is exactly the technique LeonardSEO's `generate-displacement-map.py` describes ("for every pixel, computes the signed distance to the rounded-rect border and the outward normal direction, and encodes … into the R/G channels").

```python
# research/css-tests/gen_displacement.py (full script; excerpt of the core)
def build(w, h, radius, rim, max_push):
    X, Y = np.meshgrid(np.arange(w) + 0.5, np.arange(h) + 0.5)
    dist = sdf_rounded_rect(X, Y, w, h, radius)     # 0 at edge, <0 inside, >0 outside
    d_inward = -dist
    strength = max_push * (1.0 - smoothstep(0.0, rim, d_inward))
    strength = np.where(d_inward < -rim, 0.0, strength)   # fully neutral deep inside
    eps = 1.0
    nx = (sdf_rounded_rect(X+eps, Y, w, h, radius) - sdf_rounded_rect(X-eps, Y, w, h, radius)) / (2*eps)
    ny = (sdf_rounded_rect(X, Y+eps, w, h, radius) - sdf_rounded_rect(X, Y-eps, w, h, radius)) / (2*eps)
    norm = np.sqrt(nx**2 + ny**2) + 1e-6
    nx, ny = nx/norm, ny/norm
    r = np.clip(128 + nx*strength*127, 0, 255).astype(np.uint8)   # X displacement
    g = np.clip(128 + ny*strength*127, 0, 255).astype(np.uint8)   # Y displacement
    return np.dstack([r, g, np.full((h,w),128,np.uint8), np.full((h,w),255,np.uint8)])
```

The generated map (visually verified, see below) is flat mid-grey `(128,128,128)` across the whole interior and only gains colour — i.e. only encodes displacement — within the outer ~34px rim, with hue rotating around the shape to always point outward (magenta at top, cyan at left, salmon at right, green at bottom — R/G-encoded outward normals).

```xml
<feImage href="data:image/png;base64,…" x="0" y="0" width="560" height="320"
         result="dispMap" preserveAspectRatio="none"/>
<feDisplacementMap in="SourceGraphic" in2="dispMap" scale="70"
                    xChannelSelector="R" yChannelSelector="G"/>
```

For a physically-motivated (Snell's-law) version of the same idea — computing the map from a height field (`convex squircle`, `y = ⁴√(1 - (1-x)⁴)`, Apple's preferred profile per kube.io) rather than a flat SDF ramp — see [kube.io's writeup](https://kube.io/blog/liquid-glass-css-svg/); it's the same "PNG loaded via `feImage`" mechanism, only the map-generation math differs and it produces a rounder, more convex-lens-like falloff than our linear ramp. Worth adopting if VS Glass wants a more "bulgy" look; our simpler linear-ramp SDF was sufficient to prove the mechanism and is cheaper to compute.

**Chromium status:** Works as tested (see Testing section — verified via rendered screenshot, both inline and external-file variants).

**Perf cost:** One-time cost is the PNG generation (offline, not runtime). At runtime it's identical to any other `feImage`-driven `feDisplacementMap` — one extra image decode + one displacement raster pass per repaint of that backdrop. Because the map is edge-concentrated, Chromium doesn't get a shortcut for the flat centre (the filter still processes the whole filter region); do not expect edge-only maps to be meaningfully cheaper than full-surface ones.

---

## c. Specular edge highlight (non-uniform, brightest top-left)

**Findings.** The standard, GPU-cheap technique layers two things: a **gradient border via the double-background/`mask-composite: exclude` trick** (padding-box vs border-box subtraction; [freefrontend round-up](https://freefrontend.com/css-liquid-glass/), [robbowen.digital](https://robbowen.digital/wrote-about/css-blend-mode-shaders/) both describe variants), and a **soft `radial-gradient` sheen blended with `mix-blend-mode: plus-lighter`** so it lightens without flattening the underlying content the way `normal`/`screen` blending would over saturated glass tints. `box-shadow: inset` is the low-cost alternative when a masked pseudo-element is too expensive (see thickness recipe in section d) but can't vary hue/opacity around the ring the way a `conic-gradient` can.

```css
.glass {
  position: relative;
  isolation: isolate;      /* keep blend modes scoped to this pane */
  border-radius: 24px;
}

/* Ring highlight: conic-gradient, brightest at ~top-left (28% 22%),
   built as a 1.5px ring via mask-composite: exclude (two same-shape
   layers, one inset by the padding, XORed together). */
.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(from 220deg at 28% 22%,
    rgba(255,255,255,.95) 0deg,
    rgba(255,255,255,.55) 55deg,
    rgba(255,255,255,.05) 130deg,
    rgba(255,255,255,0)   190deg,
    rgba(255,255,255,.12) 300deg,
    rgba(255,255,255,.95) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Soft top-left sheen glow, additive over the glass */
.glass::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 20% 18%, rgba(255,255,255,.35), transparent 55%);
  mix-blend-mode: plus-lighter;
  pointer-events: none;
}
```

This is directly evidenced in the test page (pane 4) — see Testing section for the rendered look: a bright rim that peaks top-left and fades smoothly to near-zero opposite it, plus a soft glow pooled in the same corner.

**Chromium status:** `mask-composite: exclude`/`-webkit-mask-composite: xor`, `conic-gradient()`, and `mix-blend-mode: plus-lighter` are all shipped, unprefixed-usable in Chromium (`plus-lighter` per [MDN mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode), useful specifically because it avoids the "double-lightened" flash other additive-ish modes give when two opacity-animated layers cross). Verified rendering in our screenshot test.

**Perf cost:** Two extra pseudo-elements per pane, each a cheap gradient paint (no filter/blur on them) — negligible next to the `backdrop-filter` cost of the pane itself. `isolation: isolate` on the pane is required for `mix-blend-mode` to stay scoped to that pane rather than blending with the whole page stacking context; it's cheap but does establish a new stacking context, so apply it at the pane level, not globally.

---

## d. Material thickness (layered box-shadow slab recipe)

**Findings.** Multiple sources converge on the same shape: an **inset "light catches the top edge" highlight**, an **inset "shadow pools at the bottom" darkening**, thin inset side shadows for the bevel, and a **soft outer contact shadow** for the surface's separation from the page — e.g. Josh Comeau's [Next-level frosted glass](https://www.joshwcomeau.com/css/backdrop-filter/) and the general pattern described at [silentlad.com](https://silentlad.com/frosted-glass-effect-using-css) ("inset box-shadow on the top edge simulates the light catching the glass").

```css
.glass-thickness {
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.65),   /* top edge catches light */
    inset 0 -1px 1px rgba(0,0,0,.40),        /* bottom edge pools shadow */
    inset 1px 0 1px rgba(255,255,255,.15),   /* left bevel */
    inset -1px 0 1px rgba(0,0,0,.20),        /* right bevel */
    inset 0 0 22px rgba(0,0,0,.12),          /* interior falloff = "slab" depth */
    0 10px 26px rgba(0,0,0,.45),             /* outer contact shadow, soft */
    0 2px 6px rgba(0,0,0,.30);               /* outer contact shadow, tight */
}
```

Rendered and visually confirmed in pane 5 of the test page — reads as a beveled slab rather than a flat translucent rectangle.

**Chromium status:** Trivial/universal — `box-shadow` with multiple comma-separated inset+outer shadows has been supported since Chrome's earliest CSS3 support; no version concerns.

**Perf cost:** Very low. Multiple box-shadows are composited cheaply relative to filters; they do NOT force an extra backdrop pass. The only caveat is that a large blur radius on many stacked shadows across many elements adds up on paint — keep blur radii in the 1–26px range used above, not 60px+.

---

## e. Adaptive tint / vibrancy

**Findings.**
- **Vibrancy via `backdrop-filter` chaining**: `saturate() brightness() contrast()` stacked after the displacement `url()` is the near-universal pattern in every source reviewed (shuding: `blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`; webtricks.dev: `blur(8px) saturate(180%) brightness(1.1)`). Saturate boosts make the blurred backdrop colour "pop" instead of graying out; brightness lifts it slightly so text stays legible over dark backdrops; contrast above 1 adds "punch."
- **`color-mix()` with `currentColor`**: confirmed workable for opacity-only tricks — `color-mix(in srgb, currentColor 50%, transparent)` — useful for making a tint track the current theme's foreground/accent colour without hand-authoring an alpha channel ([blog.kizu.dev](https://blog.kizu.dev/color-mix-current-color/), MDN color-mix() via Context7). It does **not** by itself pull colour *from the backdrop* — `color-mix()` operates on two CSS `<color>` values you supply, it has no notion of "the pixels behind this element."
- **Foreground text picking up backdrop colour** is a *different* mechanism than `color-mix()`: it requires the text itself to sit in front of a `backdrop-filter` layer with `mix-blend-mode` set on the text (or a masked duplicate text layer) so the compositor blends glyph coverage against the blurred/saturated backdrop beneath it. `mix-blend-mode: plus-lighter` (light text on dark blurred glass, avoids muddying) or `overlay`/`color-dodge` (more contrast-preserving, content-dependent) are the practical choices; `background-blend-mode` is the wrong property here — it blends an element's own background layers against each other, not against a `backdrop-filter`'d surface. **Caveat:** any blend mode aggressive enough to visibly "pick up" backdrop colour also erodes WCAG contrast — test against both a light-mode and dark-mode busy backdrop before shipping, and provide a `prefers-reduced-transparency`/`prefers-contrast: more` fallback that drops the blend mode and backdrop tint in favour of a flat, opaque, high-contrast background.

```css
/* Adaptive tint stack */
.glass {
  --tint: color-mix(in oklch, currentColor 12%, transparent);
  background: var(--tint);
  backdrop-filter: url('#edgeLens') blur(16px) saturate(180%) brightness(1.08) contrast(1.05);
  -webkit-backdrop-filter: url('#edgeLens') blur(16px) saturate(180%) brightness(1.08) contrast(1.05);
}

/* Text that visibly picks up backdrop colour/luminance */
.glass .vibrant-text {
  mix-blend-mode: plus-lighter;   /* try 'overlay' for a lower-contrast, moodier look */
  color: white;
}
```

**Chromium status:** `backdrop-filter` filter chaining, `color-mix()`, `mix-blend-mode: plus-lighter` all shipped and stable in current Chromium (148/152). No known Chromium bugs specific to this combination beyond the general `backdrop-filter` scroll-flicker issue noted in (a).

**Perf cost:** Chaining more CSS filter functions onto an existing `backdrop-filter` url() is nearly free relative to the SVG filter itself — they run in the same raster pass. `mix-blend-mode` on text forces the text's paint into the isolated blending group of its stacking context — cheap for small amounts of UI copy, avoid applying it to large scrolling text regions (e.g. don't blend-mode an entire editor's text layer).

---

## f. Liquid response — `@property` + `transition`

**Findings.** `@property` (Houdini "typed custom properties," [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@property) via Context7) is required to `transition`/`animate` a custom property whose value is a `<percentage>`, `<length>`, `<color>`, `<number>`, etc. — untyped `var()` custom properties are treated as opaque strings and never interpolate. Registering `--hl-x`/`--hl-y` as `<percentage>` lets a `radial-gradient(circle at var(--hl-x) var(--hl-y), …)` sheen glide smoothly to the cursor/focus position instead of snapping. Separately (and worth calling out because it's easy to over-engineer): **`backdrop-filter` and `filter` themselves already interpolate natively** in Chromium when the two filter-function lists match in function order/type — so `backdrop-filter: url(#f) blur(2px) saturate(140%)` → `url(#f) blur(1px) saturate(190%)` transitions smoothly with a plain `transition: backdrop-filter 320ms …`, no `@property` plumbing needed for that part. `@property` is only strictly required for the parts of the effect driven by custom properties (gradient centre position, tint alpha, etc.) — not for the filter chain itself.

Recommended timing for "fast, subtle, damped": **280–360ms**, `cubic-bezier(.2,.8,.2,1)` (a slight overshoot-free ease-out, closer to macOS's own UI spring feel than `ease`/`ease-in-out`) for hover/focus response; keep press/active feedback faster (~120–150ms) so it reads as responsive rather than sluggish. Avoid linear or long (>500ms) durations — they read as "laggy," which undercuts the "liquid" framing this whole effect is going for.

```css
@property --hl-x { syntax: '<percentage>'; inherits: false; initial-value: 25%; }
@property --hl-y { syntax: '<percentage>'; inherits: false; initial-value: 20%; }
@property --hl-alpha { syntax: '<number>'; inherits: false; initial-value: 0.25; }

.glass {
  --hl-x: 25%; --hl-y: 20%; --hl-alpha: .25;
  backdrop-filter: url('#edgeLens') blur(2px) saturate(140%) brightness(1);
  transition:
    backdrop-filter 320ms cubic-bezier(.2,.8,.2,1),
    transform 320ms cubic-bezier(.2,.8,.2,1),
    --hl-x 320ms cubic-bezier(.2,.8,.2,1),
    --hl-y 320ms cubic-bezier(.2,.8,.2,1),
    --hl-alpha 320ms cubic-bezier(.2,.8,.2,1);
}
.glass:hover {
  --hl-x: 70%; --hl-y: 65%; --hl-alpha: .5;
  backdrop-filter: url('#edgeLens') blur(1px) saturate(190%) brightness(1.1);
  transform: translateY(-4px) scale(1.015);
}
.glass::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(circle at var(--hl-x) var(--hl-y),
    rgba(255,255,255,var(--hl-alpha)), transparent 55%);
  mix-blend-mode: plus-lighter;
}
```

Rendered in pane 6 of the test page (default/unhovered state confirmed to render without errors; the hover-triggered state was **not** captured — headless `--screenshot` takes a single static frame with no pointer, so the `:hover` transition itself is CSS-verified but not visually re-confirmed. See "Verified / Unverified" list.)

**Chromium status:** `@property` shipped since Chrome 85 (long stable by Chromium 148/152); native filter-list interpolation likewise long-stable. No open bugs found specific to this combination.

**Perf cost:** Animating `--hl-x`/`--hl-y`/`--hl-alpha` repaints only the gradient pseudo-element, not the whole backdrop-filter stack — cheap, main-thread/compositor-friendly. Animating the `backdrop-filter` filter list itself (as in the `:hover` rule above) is **not** compositor-only — Chromium has to re-run the filter chain (including the SVG displacement pass) on every animated frame, which is the more expensive part of this recipe; keep such transitions short (≤350ms) and don't run more than a few concurrently (see section g).

---

## g. Performance

**Findings.**
- **Each `backdrop-filter` element establishes its own "backdrop root."** This is the load-bearing concept: Chromium introduced backdrop roots specifically to stop nested `backdrop-filter` elements from recursively re-compositing everything beneath each ancestor ([w3c/fxtf-drafts discussion](https://lists.w3.org/Archives/Public/public-fxtf-archive/2023Mar/0005.html)); even so, a 2D-transform/scale on an ancestor can force an extra render surface and, per a live Chromium bug, sometimes drops nested backdrop-filter descendants entirely ([#415354762](https://issues.chromium.org/issues/415354762)). **Rule of thumb: never nest one `backdrop-filter` pane inside another one's backdrop-affected subtree**, and don't wrap a lensed pane in an ancestor with `transform: scale(...)`.
- **GPU vs CPU raster for the SVG `url()` path.** Chromium's filter pipeline has historically had two rendering paths — a GPU-accelerated path that's "currently only triggered for source elements that are already in a composited layer" (canvas/WebGL/video/3D-transformed content) and a software (Skia CPU raster, multi-threaded) path used otherwise ([chromium.org filter design doc](https://www.chromium.org/developers/design-documents/image-filters/)). A plain HTML pane with `backdrop-filter: url(#svgFilter)` does **not** automatically qualify for the GPU-only path the way a `<canvas>` does — expect it to run on Skia's CPU/multi-thread raster path unless the element is otherwise already composited (e.g. via a `transform` or `will-change`). This matches the community consensus that SVG `url()` filters are the heaviest option in the `filter`/`backdrop-filter` family, not the "GPU-shader-cheap" one intuition might suggest.
- **`will-change: backdrop-filter`** promotes the element to its own compositor layer ahead of time, trading memory for avoiding a layer-promotion stall on first use — recommended for a persistent sidebar/chrome surface, not for many ephemeral elements (each promoted layer costs GPU memory).
- **`contain: paint`** scopes the pane's painting to its own box, which helps the browser avoid unnecessarily re-rastering unrelated content when the pane repaints (useful since a lensed pane's backdrop-filter output depends on paint underneath it) and gives a cheap containment boundary without the stacking-context side effects of `contain: layout` or `content-visibility`.
- **`isolation: isolate`** creates a new stacking context so `mix-blend-mode`/blend-sensitive layers inside the pane don't leak into blending with siblings outside it — required correctness-wise for section (c)/(e)'s blend-mode tricks, and incidentally gives the compositor a clean boundary too.
- **Nesting cost is effectively multiplicative, not additive**: sources describe it as "exponential degradation" risk for nested `backdrop-filter` stacks, each level re-triggering paint of everything beneath it (see backdrop-root discussion above) — treat "how many surfaces can afford displacement" as a *small, fixed, deliberately-placed set*, not a general-purpose panel style.

**Concrete guidance for VS Glass**: budget **SVG-displacement `backdrop-filter` for at most a handful of chrome surfaces that are visually "anchored" and rarely resize/rescroll simultaneously** — e.g. the activity bar, a floating quick-input widget, a command palette, maybe the outermost sidebar container. Do **not** apply displacement per list row, per tab, or to anything inside a scrolling list — use plain `blur()+saturate()` (no `url()`) there instead, which is meaningfully cheaper (native CSS filter functions, no SVG raster pass) and still reads as "glassy" for small, fast-moving chrome.

**Chromium status:** Backdrop-root containment shipped and iterating (ongoing bug reports against edge cases like scaled ancestors). GPU/CPU raster split behavior is long-standing Blink/Skia architecture, still current as of the sources reviewed (no evidence found that plain-DOM `backdrop-filter: url()` gained a dedicated GPU fast path as of 2026).

**Perf cost:** (rolled into findings above — no separate measurement was run; we did not have a way to profile frame timings for this research pass, see Unverified list.)

---

## h. `prefers-reduced-transparency` / `prefers-reduced-motion`

**Findings.** `prefers-reduced-transparency` is a Media Queries Level 5 feature, shipped in Chromium **since Chrome 118** ([Chrome for Developers blog](https://developer.chrome.com/blog/css-prefers-reduced-transparency), [chromestatus.com/feature/5191066147356672](https://chromestatus.com/feature/5191066147356672)) and reflects the OS-level "Reduce transparency" toggle (present on macOS under Accessibility → Display). It is well past shipped by Chromium 148/152, so VS Code 1.136.1 has it available. `prefers-reduced-motion` is long-standing (shipped since ~Chrome 74) and universally supported. Both should gate the liquid-glass effect:

```css
.glass {
  backdrop-filter: url('#edgeLens') blur(16px) saturate(180%);
  transition: backdrop-filter 320ms cubic-bezier(.2,.8,.2,1), transform 320ms cubic-bezier(.2,.8,.2,1);
}

@media (prefers-reduced-transparency: reduce) {
  .glass {
    backdrop-filter: none;
    background: var(--vs-glass-opaque-fallback, #1e1e1eee);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glass { transition: none; }
}
```

**Chromium status:** Both shipped and stable (`prefers-reduced-transparency` since Chrome 118, comfortably inside Chromium 148/152's range).

**Perf cost:** Negligible — a media query gate; the `reduce` branch is strictly *cheaper* than the default (drops the filter chain entirely), so this doubles as a good perf escape hatch for low-power devices even independent of its accessibility purpose.

---

## Testing

`research/css-tests/lensing-test.html` — a single 1400×900 static page (no build step) containing:
- a **busy background**: crossed grid-line stripes (`repeating-linear-gradient`), 45°-angled overlay stripes blended with `mix-blend-mode: overlay`, four colour-blob `radial-gradient`s, and a wrapped "text wall" of large bold words/numbers — chosen specifically so any lensing shows up as visibly bent lines or warped letters near a pane's edge.
- **Pane 1** — blur-only control: `backdrop-filter: blur(16px) saturate(150%)`, no SVG filter.
- **Pane 2** — `feDisplacementMap` edge lensing via an SVG `<filter>` defined **inline** in the same HTML document, `feImage` fed by a base64 `data:` URI of the generated displacement PNG.
- **Pane 3** — the identical filter, but defined in a **separate `external.svg` file** (`research/css-tests/external.svg`) and referenced as `backdrop-filter: url('external.svg#edgeLensExt') …`.
- **Pane 4** — specular highlight pseudo-elements (section c recipe).
- **Pane 5** — thickness box-shadow recipe (section d recipe).
- **Pane 6** — `@property`-driven hover sheen + native `backdrop-filter` transition (section f recipe).

Displacement map generation: `research/css-tests/gen_displacement.py` (pure `numpy` + a hand-rolled PNG writer using `zlib`/`struct` — no Pillow dependency, since none was installed in this environment). It writes `displacement-edge.png` (used inline as base64) and `displacement-edge-ext.png` (used by `external.svg`), both 560×320px, 28px corner radius, 34px rim. Visually inspecting the generated map confirmed the intended encoding: flat mid-grey (128,128,128 = zero displacement) through the entire interior, with colour — i.e. displacement — appearing only in the outer rim, hue-rotating around the shape to encode the outward normal (magenta-ish at top, cyan at left, salmon at right, green at bottom, matching R/G = 128±127·normal).

**Chrome was present** (`/Applications/Google Chrome.app`, version 152.0.7977.83) and was run headless:
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu \
  --screenshot=research/css-tests/lensing-test.png \
  --window-size=1400,900 --hide-scrollbars --virtual-time-budget=3000 \
  file:///…/research/css-tests/lensing-test.html
```
This produced `research/css-tests/lensing-test.png` (rendered without errors, `1319496` bytes). Note `--disable-gpu` was used (headless-new + macOS sandboxing quirk); this forces Chromium's software/Skia raster path for everything including `backdrop-filter`, which per section (g) is close to the normal-case path for a plain DOM `backdrop-filter: url()` anyway — so this test is a reasonable proxy for on-screen behavior, though it does **not** exercise the GPU-composited path.

**What the screenshot shows, on inspection (cropped 5× nearest-neighbour zooms of each pane's left edge, where the background's diagonal stripes and grid lines cross into the pane):**
- **Pane 1 (blur control):** the diagonal stripe pattern continues **perfectly straight** through the pane boundary, merely softened — exactly the expected "no geometric displacement" result.
- **Pane 2 (inline SVG filter):** the background grid/stripe pattern is **not** continuous with the outside — near the left edge, a background glyph ("1", from the "0123456789" text-wall word) appears enlarged and displaced compared to its un-lensed size outside the pane, and the grid lines show visible discontinuity/warping right at the boundary, unlike pane 1's clean pass-through. Also, despite a *smaller* blur (1.5px vs pane 1's 16px), background detail through pane 2 is comparably soft/colour-shifted, consistent with the displacement map's own smoothing plus the `saturate(160%) brightness(1.05)` stack.
- **Pane 3 (external SVG file):** shows the same class of effect as pane 2 — a background glyph ("A") appears magnified/warped near the edge, and grid lines bend rather than passing straight through — **confirming the external-file `backdrop-filter: url('external.svg#id')` reference resolved and the filter executed**, not just that the file loaded inertly.
- **Pane 4 (specular):** a clear bright rim, strongest at the top-left corner as designed, fading smoothly around the shape, plus a soft pooled highlight in the same corner.
- **Pane 5 (thickness):** visibly reads as a beveled slab (lighter top edge, darker bottom/sides, soft outer contact shadow) rather than a flat translucent rectangle.
- **Pane 6 (hover):** rendered correctly in its default (unhovered) state; the `:hover`-triggered transition was not captured (see Unverified list — headless `--screenshot` has no pointer/interaction).

This is genuine visual evidence — not inferred from source reading — that: (1) Chromium executes `feDisplacementMap`-based `backdrop-filter` SVG filters from both inline and external `.svg` sources, and (2) the SDF-based displacement map produces edge-concentrated lensing (bent/magnified background detail near the rim) as opposed to blur-only's uniform, non-geometric softening.

---

## Recommended recipe for VS Glass

Layered structure (apply to both the 280px sidebar and the 600px quick-input widget; values below differ per surface where noted):

**On the element itself (`.vs-glass`):**
```css
.vs-glass {
  position: relative;
  isolation: isolate;                 /* scope blend modes + give compositor a clean boundary */
  contain: paint;                     /* cheap paint containment */
  border-radius: var(--vs-glass-radius);
  border: 1px solid rgba(255,255,255,.14);
  background: color-mix(in oklch, canvas 82%, transparent); /* base tint, theme-aware */
  backdrop-filter: url('#vsGlassLens') blur(var(--vs-glass-blur)) saturate(170%) brightness(1.05) contrast(1.03);
  -webkit-backdrop-filter: url('#vsGlassLens') blur(var(--vs-glass-blur)) saturate(170%) brightness(1.05) contrast(1.03);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.55),
    inset 0 -1px 1px rgba(0,0,0,.35),
    inset 0 0 18px rgba(0,0,0,.10),
    0 8px 22px rgba(0,0,0,.40);
  transition: backdrop-filter 300ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms cubic-bezier(.2,.8,.2,1);
}
@media (prefers-reduced-transparency: reduce) {
  .vs-glass { backdrop-filter: none; background: var(--vscode-sideBar-background); }
}
@media (prefers-reduced-motion: reduce) {
  .vs-glass { transition: none; }
}
```

**On `::before` (specular ring, section c) and `::after` (sheen glow + optional animated hover highlight, section f):**
```css
@property --hl-x { syntax: '<percentage>'; inherits: false; initial-value: 25%; }
@property --hl-y { syntax: '<percentage>'; inherits: false; initial-value: 15%; }

.vs-glass::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1.25px;
  background: conic-gradient(from 220deg at 26% 18%,
    rgba(255,255,255,.9) 0deg, rgba(255,255,255,.45) 55deg,
    rgba(255,255,255,.05) 130deg, rgba(255,255,255,0) 190deg,
    rgba(255,255,255,.10) 300deg, rgba(255,255,255,.9) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
}
.vs-glass::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(circle at var(--hl-x) var(--hl-y), rgba(255,255,255,.30), transparent 55%);
  mix-blend-mode: plus-lighter; pointer-events: none;
  transition: --hl-x 300ms cubic-bezier(.2,.8,.2,1), --hl-y 300ms cubic-bezier(.2,.8,.2,1);
}
.vs-glass:hover::after, .vs-glass:focus-within::after { --hl-x: 65%; --hl-y: 55%; }
```

**SVG filter (define once, reuse via `filterUnits="userSpaceOnUse"` sized per surface — do not share one filter element across differently-sized surfaces; generate one displacement PNG + `<filter>` per distinct size):**
```xml
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="vsGlassLens" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
          x="0" y="0" width="{W}" height="{H}" color-interpolation-filters="sRGB">
    <feImage href="vs-glass-displacement-{W}x{H}.png" x="0" y="0" width="{W}" height="{H}"
             result="dispMap" preserveAspectRatio="none"/>
    <feDisplacementMap in="SourceGraphic" in2="dispMap" scale="{SCALE}"
                        xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

**Suggested per-surface values** (generate the displacement map with `gen_displacement.py W H RADIUS RIM`, tune `SCALE` live since `feDisplacementMap`'s `scale` is cheap to animate/tweak without regenerating the map):

| Surface | W×H | Corner radius | Rim | `scale` | `--vs-glass-blur` | Notes |
|---|---|---|---|---|---|---|
| **Sidebar** (280px wide) | 280×(viewport height) | 0 (flush edges) or 12px if floating | 24px | 30–40 | 20px | Tall, narrow — generate the map for the visible viewport height, not full document height; lens only the two long vertical edges meaningfully (a 24px rim reads fine on a 280px width without eating the whole panel into "all edge"). Given section (g)'s nesting warning, this should be the *only* displaced surface inside the sidebar — don't also lens list rows within it. |
| **Quick-input widget** (600px wide) | 600×~50-300 (depends on result list) | 8px | 20px | 50–70 | 16px | Regenerate/resize the map when the result list changes the widget's height (per section a/b: resizing is the expensive case) — debounce so you're not rebuilding the map every keystroke; the values used in `lensing-test.html` (560×320, radius 28, rim 34, scale 70) are a good starting point for a compact, boxier surface like this one before debounce/height changes settle. |

**Verified / Unverified**

Verified (this session, by direct code reading and/or rendering `lensing-test.html` in Chrome 152 headless and visually inspecting the output):
- `backdrop-filter: url(#id)` with an **inline** SVG `feDisplacementMap` filter executes in Chromium and produces edge-concentrated lensing distinct from plain blur (pane 1 vs pane 2 comparison).
- `backdrop-filter: url('external.svg#id')` with the filter in a **separate .svg file** also executes correctly (pane 3) — external-file SVG filter references are **not** blocked for `backdrop-filter` the way the general "SVG from external files" Chromium bug family affects other properties.
- The SDF-based edge-only displacement map generator produces the intended encoding (flat 128/128/128 centre, outward-normal-encoded rim) — visually confirmed by inspecting the raw PNG.
- Specular conic-gradient ring (mask-composite: exclude) and thickness box-shadow recipes render as designed (panes 4 and 5).
- `@property`-typed custom properties compile and the pane renders correctly in its default (pre-hover) state (pane 6).
- `filterUnits="userSpaceOnUse"` + explicit pixel dimensions + `color-interpolation-filters="sRGB"` avoids the clipping/scaling problems repeatedly warned about in prior art — confirmed indirectly (the filter worked) rather than by testing the broken/default-units case for contrast.
- `prefers-reduced-transparency` shipped since Chrome 118 (source: [Chrome for Developers](https://developer.chrome.com/blog/css-prefers-reduced-transparency), [chromestatus.com](https://chromestatus.com/feature/5191066147356672)) — comfortably supported by VS Code 1.136.1's Chromium 148.
- VS Code 1.136.1 bundles Electron 42.10.0 / Chromium 148.0.7778.280 (source: [ewanharris/vscode-versions](https://github.com/ewanharris/vscode-versions)).

Unverified / could not confirm from available sources:
- The exact content of live Chromium bug [#41496487](https://issues.chromium.org/issues/41496487) ("backdrop-filter has changed the way SVG…") — the issue tracker required Google sign-in and WebFetch could not retrieve the body; only the title and its neighboring-issue context were available. Re-check this issue directly before shipping if displacement panes sit inside any transformed/scaled ancestor.
- Actual frame-timing/profiler numbers for the SVG-displacement `backdrop-filter` cost — no profiling tool was run in this research pass; guidance in section (g) is based on architecture descriptions (backdrop-root, GPU/CPU raster split) from Chromium's own design docs and third-party writeups, not first-party measurement.
- Whether Chromium's GPU-accelerated filter path (vs. Skia CPU raster) is ever engaged for a plain DOM element's `backdrop-filter: url()` specifically — sources describe the GPU path as gated on the source already being a composited layer (canvas/WebGL/video/3D-transform), but no source directly confirmed or denied whether `will-change`-promoted DOM `backdrop-filter` panes count.
- The `:hover`-triggered animated state of pane 6 — not visually captured, since headless `--screenshot` renders one static frame with no synthetic pointer interaction. The CSS itself is standard and should work, but the actual on-screen "liquid" feel (timing, sheen travel) was not eyeballed.
- Cross-check against VS Code 1.136.1's *actual* bundled Chromium (148.0.7778.280) — all rendering verification used a locally installed Google Chrome 152.0.7977.83 instead, since that's what was available in this environment; the two are close in engine generation but not identical builds.
- Whether `--disable-gpu` (required to get headless Chrome to screenshot reliably in this sandboxed environment) changed the *visual* result compared to Chromium's normal GPU-composited path — architecturally it shouldn't for filter correctness, but this was not cross-checked against a non-headless, GPU-enabled render.
