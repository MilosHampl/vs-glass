# Reference pens — Liquid Glass technique research

Sources the project owner pointed at for control-element (Control-Center-style toggle) and window/editor
transparency look. Raw material saved under `research/reference-pens/`.

## Fetch status

| Source | Method | Result |
|---|---|---|
| `ruri.design/glass` (live page) | `curl` | 200, but it's a Vue SPA shell (Cloudflare-fronted) — no rendered DOM/CSS without executing JS. `WebFetch` confirmed same (shell only, no JS execution). **Marked NOT independently renderable.** |
| `ruri.design/assets/GlassView-ddcf7437.js` | `curl` w/ browser UA | 200, 48,750 bytes, saved as `research/reference-pens/ruri-GlassView-ddcf7437.js`. This is the actual Vue component source (unminified variable names, readable) — used for all ruri findings below. |
| `codepen.io/daftplug/pen/QwbaYGO{.html,.css,.js}` | `curl` | 403 (Cloudflare). |
| `codepen.io/daftplug/pen/QwbaYGO` | `WebFetch` | 403. |
| `cdpn.io/daftplug/fullpage/QwbaYGO` | `curl` w/ browser UA | 200 — full rendered page (`<iframe srcdoc>` containing the pen's actual compiled HTML/CSS/JS). Decoded and split into `daftplug-QwbaYGO.{html,css,js}` + `daftplug-QwbaYGO-displacement-map.png` (the embedded base64 PNG). |
| `codepen.io/Mikhail-Bespalov/pen/MYwrMNy{.html,.css,.js}` | `curl` | 403. Same `cdpn.io/…/fullpage/…` fallback worked → `Mikhail-Bespalov-MYwrMNy.{html,css,js}` + displacement-map PNG. |
| `codepen.io/Petr-Knoll/pen/QwWLZdx{.html,.css,.js}` | `curl` | 403. Same fallback worked → `Petr-Knoll-QwWLZdx.{html,css,js}`. |

All three CodePen `.js` panels are effectively empty (`window.console = window.console || function(t){}` — CodePen's own shim); none of the three pens ship author JS. Titles found via web search: daftplug's pen title is **"Pure CSS iOS 26 Liquid Glass Effect"**; Mikhail Bespalov's is **"Liquid Glass"**; Petr Knoll's is **"Glass Button"**.

---

## 1. ruri.design — "Glass" tool

**(a) What it shows.** A browser-based parameter tool (not a fixed demo): a draggable ~320–400 px glass shape (default an "X"/plus SVG, swappable for uploaded SVGs or images) floating over a photo background, with a side panel of sliders (blur, displacement, chromatic aberration, bevel size/thickness, light azimuth/elevation, surface scale, red/blue "shadow" offsets, border weight/gradient) and a code-export panel (HTML+CSS "Main"/Chrome-only or "Fallback" mode). It's explicitly a *distortion-preview/export* tool, not a restrained UI control — PROGRESS.md already flags it as "exaggerated effects," confirmed by the numbers below.

**(b) Technique.** Filter graph, straight from the component source (`svgBody()` in the bundle):

```html
<filter id="liquid-glass-filter" primitiveUnits="objectBoundingBox">
  <feImage href="${generatedMap}" preserveAspectRatio="none" x="0" y="0" width="1" height="1" result="map"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="${values.stdDeviation}" result="blur"/>
  <feColorMatrix in="blur" type="matrix" result="red_channel"
      values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
  <feDisplacementMap in="red_channel" in2="map" scale="${scale+aberration}" xChannelSelector="B" yChannelSelector="R" result="red_displaced"/>
  <feColorMatrix in="blur" type="matrix" result="green_channel" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
  <feDisplacementMap in="green_channel" in2="map" scale="${scale}" xChannelSelector="B" yChannelSelector="R" result="green_displaced"/>
  <feColorMatrix in="blur" type="matrix" result="blue_channel" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
  <feDisplacementMap in="blue_channel" in2="map" scale="${scale-aberration}" xChannelSelector="B" yChannelSelector="R" result="blue_displaced"/>
  <feComposite in="red_displaced" in2="green_displaced" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg_added" />
  <feComposite in="rg_added" in2="blue_displaced" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
</filter>
```

Note: **blurs the whole `SourceGraphic` first, then splits into R/G/B and displaces each blurred channel** (displacement happens *after* blur, on already-soft pixels — unlike our approach, see §Compared). Also note the unusual `xChannelSelector="B" yChannelSelector="R"` (daftplug/Mikhail's pens and our own code use the conventional `R`=x `G`=y).

Exported CSS (Chrome path):
```css
.glass {
  background-color: rgba(255, 255, 255, 0.08);
  backdrop-filter: url(#liquid-glass-filter);
  -webkit-backdrop-filter: url(#liquid-glass-filter);
  mask: url(#shape-mask); -webkit-mask: url(#shape-mask);
  border-radius: 9999px;
}
```
Non-Chrome fallback: `backdrop-filter: blur(${simpleBlur}px)` + a plain gradient background, `clip-path` instead of the SVG mask. The map itself (`generatedMap`) is produced by a **separate lazy-loaded child component** (props: `bevelSize/Thickness`, `lightAzimuth/Elevation`, `surfaceScale`, `useRedShadow`/`useBlueShadow` with per-channel offset/blur/color/opacity) — that component's source isn't in this bundle chunk, so the exact bevel/emboss math (almost certainly a canvas bump-map + colored inner-shadow bake, given the red/blue "shadow" naming) **could not be fetched**.

**(c) Numeric parameters** (from the component's live `values` object; the slider widgets' own `default` attribute sometimes disagrees with the live starting value — both given):

| Param | Live default | Slider range | Slider's `default` attr |
|---|---|---|---|
| `stdDeviation` (blur, bbox fraction) | **0** | 0.001–2 | 0.01 |
| `scale` (displacement, bbox fraction) | **0.4** | 0–1 | 0.4 |
| `aberration` (bbox fraction) | **0.02** | 0–0.1 | 0.01 |
| `bevelSize` / `bevelThickness` | 0 / 1 | 0–10 / 0–10 | 2 / 3 |
| `lightAzimuth` / `lightElevation` | 45 / 45 | 0–360 / 0–90 | 45 / 45 |
| `surfaceScale` | 5 | 0–10 | 5 |
| red-shadow offset X/Y/blur/opacity | 2.8 / 3.6 / 3 / 0.8 | — | −2 / −2 / 3 / 0.8 |
| blue-shadow offset X/Y/blur/opacity | −2.8 / −1.7 / 3 / 0.8 | — | 2 / 2 / 3 / 0.8 |
| `borderWeight` / `borderOpacity` / `borderGradientAngle` | 0.2 / 0.3 / 360 | 0–2 / 0–1 / 0–360 | 2 / 0.3 / 0 |
| fallback `simpleBlur` | 8px | — | — |

On a ~320 px default shape, `scale=0.4` (bbox fraction) is ≈ **128 px of raw displacement** and `aberration=0.02` ≈ **6.4 px** per-channel fringe — both far past anything usable on a real UI control; this is a "how far can the material stretch" showcase, not a toggle spec.

**(d) Liquid vs frosted.** The red/blue "shadow" pair baked into the bump/normal map (plus bevel size/thickness/light azimuth/elevation/surface scale — an actual Phong-style relief light model) is what pushes this past flat frosted blur into a *modeled 3-D lens edge*; the exported filter's per-channel scale spread (`scale±aberration`) is the chromatic fringe. Blurring before displacing softens the fringe into a painterly smear rather than a crisp prism edge.

**(e) Performance.** Client-side, interactive (every slider drag regenerates the map + rebuilds the filter string reactively) — fine for a one-shot design tool, irrelevant model for us since we bake everything at build time. The filter itself is 3 `feColorMatrix` + 3 `feDisplacementMap` + 2 `feComposite` (8 primitives) plus one `feGaussianBlur`, comparable in cost to our lens.ts aberration path (also 3 displacement passes + 2 composites, 10 primitives incl. rim compositing).

---

## 2. daftplug — "Pure CSS iOS 26 Liquid Glass Effect" (`codepen.io/daftplug/pen/QwbaYGO`)

**(a) What it shows.** A single circular "+" icon button (70×70 px, 24×24 icon) centered inside a 300×200 px rounded-rect glass panel (30 px radius), both floating over an animated flower-photo background that auto-scrolls (`animation: moveBackground 60s linear infinite`, vertical pan). Static demo: **no hover/press states defined at all** — it's a "look" screenshot-in-motion, not an interactive control. CSS explicitly credits `lucasromerodb/liquid-glass-effect-macos` (background image URL) — this pen is a fork/remix of that well-known reference.

**(b) Technique.** Two SVG filters, both consumed through a notable **double-property trick**: `backdrop-filter: blur(0px)` (forces Chromium to capture a backdrop image without actually blurring it) combined with a plain `filter: url(#id)` on the same pseudo-element, so `SourceGraphic` inside the SVG filter becomes the captured backdrop:
```css
.glassContainer::after {
  backdrop-filter: blur(0px);
  filter: url(#container-glass);
  isolation: isolate;
}
```
```html
<filter id="container-glass" x="0%" y="0%" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
  <feGaussianBlur in="noise" stdDeviation="0.02" result="blur" />
  <feDisplacementMap in="SourceGraphic" in2="blur" scale="77" xChannelSelector="R" yChannelSelector="G" />
</filter>
<filter id="btn-glass" primitiveUnits="objectBoundingBox">
  <feImage href="data:image/png;base64,…" x="0" y="0" width="1" height="1" result="map"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur"/>
  <feDisplacementMap in="blur" in2="map" scale="1" xChannelSelector="R" yChannelSelector="G" />
</filter>
```
The container filter uses **procedural `feTurbulence` noise** (no baked asset) for a wavy "melted glass" warp of the whole 300×200 backdrop. The button filter uses a **baked 200×200 RGBA PNG** (saved as `daftplug-QwbaYGO-displacement-map.png`) — visually a smooth radial sphere/normal-map gradient (R/G ramp continuously across the *entire* disc, not just an edge band — a true convex "ball lens" profile). Visible surface: no `background` on the container beyond the filtered backdrop; a `::before` supplies the only "glass body" cue via box-shadow only:
```css
.glassContainer::before, .glassBtn::before {
  box-shadow: inset 2px 2px 0px -2px rgba(255,255,255,.7), inset 0 0 3px 1px rgba(255,255,255,.7);
}
```

**(c) Numeric parameters.** Container filter (`userSpaceOnUse`, raw px): `feTurbulence baseFrequency 0.008, numOctaves 2, seed 92`; blur `stdDeviation 0.02`; displacement `scale 77` (px — very large, matches the visibly swirly panel warp). Button filter (`objectBoundingBox`): blur `stdDeviation 0.02` (≈1.4 px on a 70 px button); displacement `scale 1` (=100% of bbox, tempered by the map's own amplitude to roughly ±25–30 px effective bulge). Border radius 30 px / 9999px. **No transitions, no motion at all.**

**(d) Liquid vs frosted.** The whole-disc continuous convex gradient (not edge-only) is the single biggest "liquid" cue — it reads as looking *through a lens*, bending more toward the rim and less at the centre, the way a real glass bead refracts. The hard 2px diagonal inset highlight (not a smooth ring) mimics a thick bevel catching one directional light.

**(e) Performance.** Zero JS, no animation. `feTurbulence` is the only per-evaluation-cost primitive (GPU-cheap, cached since nothing invalidates it); the baked PNG is decoded once. Cheaper than our aberration path (no chromatic-aberration splitting) but the same order of magnitude as our non-aberrated filters.

---

## 3. Mikhail Bespalov — "Liquid Glass" (`codepen.io/Mikhail-Bespalov/pen/MYwrMNy`)

**(a) What it shows.** A large (20rem / 320 px) circular frosted button pinned `position: fixed` at screen centre over a tall (500vh) scrollable page tiled with a watercolor "meadow" photo — scrolling the page visibly changes what refracts through the fixed glass. The button shows a white "+" made from two `::before/::after` bars. **On hover the glass itself visibly bulges more** (see below); no press/active state.

**(b) Technique.** Same filter skeleton as daftplug's button (identical 200×200 baked sphere map, byte-identical PNG — both forked from the same shared asset), but drives the displacement **scale via native SVG SMIL, not CSS**, bound directly to the button's own DOM events:
```html
<filter id="frosted" primitiveUnits="objectBoundingBox">
  <feImage href="data:image/png;base64,…" x="0" y="0" width="1" height="1" result="map"/>
  <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur"/>
  <feDisplacementMap id="disp" in="blur" in2="map" scale="1" xChannelSelector="R" yChannelSelector="G">
    <animate attributeName="scale" to="1.4" dur="0.3s" begin="btn.mouseover" fill="freeze"/>
    <animate attributeName="scale" to="1" dur="0.3s" begin="btn.mouseout" fill="freeze"/>
  </feDisplacementMap>
</filter>
```
```css
.glass {
  background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 2px rgba(255,255,255,.6), 0 16px 32px rgba(0,0,0,.12);
  backdrop-filter: url(#frosted);
}
```

**(c) Numeric parameters.** Displacement scale **1 → 1.4 (+40%) over 300ms** on hover, back to 1 over 300ms on mouseout, **linear pacing** (SMIL `<animate>` has no easing here — unlike our `cubic-bezier(.2,.8,.2,1)`). Blur `stdDeviation` fixed 0.02 bbox fraction (≈6.4 px absolute on the 320 px button — 4–5× daftplug's absolute blur on its 70 px button, from the *same* bbox-fraction value: a clean illustration of why bbox units need per-class compensation, which our `lens.ts` already does explicitly). Ring: flat 2 px solid `box-shadow`, no gradient. Shadow: 16 px offset / 32 px blur / 12% alpha.

**(d) Liquid vs frosted.** The animated growth of the displacement scale itself — the material visibly *swells* under the cursor like a droplet reacting to touch — is a stronger, more literal "liquid" signature than any static bulge; it's the only one of the four references where the *lens strength itself* is the hover response (versus everyone else animating only the surrounding chrome).

**(e) Performance.** Zero JS. Animating a `feDisplacementMap` attribute forces Chromium to re-rasterize the whole filter chain every frame for the 300ms burst (SMIL isn't compositor-only, unlike a CSS transform/opacity animation) — costlier per-frame than a CSS-only hover, but bounded to interaction bursts, not continuous.

---

## 4. Petr Knoll — "Glass Button" (`codepen.io/Petr-Knoll/pen/QwWLZdx`)

**(a) What it shows.** A single pill "Generate" text button centered over a plain light-gray dotted-grid background. **No SVG filter, no refraction at all** — the "glass" read comes entirely from layered box-shadows, a rotating conic-gradient border ring, and a moving internal sheen. On hover: the button shrinks slightly (`scale(0.975)`, not grows), the border ring's highlight visibly *rotates* around the rim, a diagonal light streak inside the label slides and re-angles, and the backdrop blur nearly vanishes. On press: the whole assembly **tilts in 3-D** (`rotate3d(1,0,0,25deg)`) as if physically pushed, the ring snaps to a different angle, the sheen jumps position, and the shadow tightens/dims.

**(b) Technique.** No `feDisplacementMap` anywhere. Three independently interesting constructions:
- **Border ring** — same generic `mask-composite: exclude` technique our own `::before` rings already use, but driven by an *animated* `conic-gradient` via a typed `@property --angle-1`:
```css
@property --angle-1 { syntax: "<angle>"; inherits: false; initial-value: -75deg; }
button::after {
  background: conic-gradient(from var(--angle-1) at 50% 50%,
      rgba(0,0,0,.5), rgba(0,0,0,0) 5% 40%, rgba(0,0,0,.5) 50%, rgba(0,0,0,0) 60% 95%, rgba(0,0,0,.5)),
    linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.5));
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}
button:hover::after { --angle-1: -125deg; }     /* ring visibly rotates 50° */
button:active::after { --angle-1: -75deg; }
```
- **Sheen sweep** — a `mix-blend-mode: screen` diagonal gradient on `span::after`, slid via `background-position` + a second typed angle `--angle-2` (-45deg idle → -15deg on `:active`).
- **Thickness stack** — inverts the usual "bright top / dark bottom" assumption: the *bottom* inset shadow is the brighter one:
```css
box-shadow: inset 0 0.125em 0.125em rgba(0,0,0,.05),
  inset 0 -0.125em 0.125em rgba(255,255,255,.5),
  0 0.25em 0.125em -0.125em rgba(0,0,0,.2),
  0 0 0.1em 0.25em inset rgba(255,255,255,.2),
  0 0 0 0 rgba(255,255,255,1);
backdrop-filter: blur(clamp(1px, 0.125em, 4px));
```
Drop shadow lives on a *separate* blurred pseudo-element (`.button-shadow::after`), not a `box-shadow` on the button itself, so its blur radius and offset can animate independently on hover/press.

**(c) Numeric parameters.** `--anim--hover-time: 400ms`, `--anim--hover-ease: cubic-bezier(0.25,1,0.5,1)` (snappy ease-out, same family as our `cubic-bezier(.2,.8,.2,1)`). Hover: `scale(0.975)` (2.5% shrink, not a lift), backdrop blur idle `clamp(1px,0.125em,4px)` → **`0.01em` (~0) on hover** (glass gets *more* transparent on hover, not less), ring sweeps −75°→−125° (50°). Press: `rotate3d(1,0,0,25deg)` tilt, ring snaps to −75°, shadow blur clamp(2px,0.125em,12px)→ opacity 0.75.

**(d) Liquid vs frosted.** No lensing at all — this is "frosted acrylic with dramatic stage lighting," not refraction. The 5-layer box-shadow recipe is the most elaborate "material thickness" construction of the four references, but the 3-D press tilt, rotating ring, and traveling sheen are **exactly the class of cue the project owner explicitly rejected** for buttons ("the button animations look retarded… no sheen sweeps, lifts, glows or overshoot").

**(e) Performance.** The costliest of the four: animating a `conic-gradient` (`@property`-typed angle) forces gradient + mask + composite repaint every frame for 400ms on every hover *and* every press, stacked with an animated `backdrop-filter` blur radius (also forces re-blur every frame) and a 3-D transform. All CSS/compositor work, no JS, but the two animated gradients + animated blur make this heavier per-interaction than the SVG-filter pens above, purely from the choreography, not the base glass look.

---

## Compared with VS Glass today

Current implementation, for reference: `src/lens.ts` builds one small baked PNG per aspect class (`LENS_CLASSES`: widget/menu/sidebar/panel/column/strip) with a **flat centre + edge-only rim** profile (`profile()`, power=2 by default, feathered over `edgePx`), composites a **blurred "frost" body** with a **sharp-then-displaced "rim"** (masked by the map's B channel), and layers R/G/B chromatic aberration via 3×`feDisplacementMap` + 2×`feComposite arithmetic` (same primitive family as ruri's, `R`/`G` channel selectors matching daftplug/Mikhail's convention, not ruri's `B`/`R`). Per-variant tokens (`src/palette.ts`): Regular `blur18 lensScale10 lensEdge26 aberration0.7`; Light `blur22 lensScale9 lensEdge26 aberration0.5`; Clear `blur8 lensScale13 lensEdge30 aberration2.2 dim0.35`; Opaque all 0. Motion: `fast120/base240/slow320ms, ease cubic-bezier(.2,.8,.2,1)`. Radii: `card14 widget12 control8 inner6 pill999`. `glass.css` §4/5 give cards/widgets a conic-gradient specular ring (`--vsg-ring-chrome/widget`, mask-exclude) plus a hover-only radial highlight that nudges typed properties `--vsg-hl-x/y/a`. §10 buttons instead get a **flat top-to-bottom `linear-gradient` rim**, a static top-light `::after`, hover = `filter: brightness(1.07)` only (no highlight movement), press = `scale(0.96)` + `brightness(0.96)`, 60ms. §11 activity/status items get the box-shadow thickness stack on hover/checked but **no ring pseudo-element at all**. `glass-transparent.css` never filters `.monaco-editor` — text always sits on a flat `background-color`, never inside a displaced/blurred region.

### What to change (minimal, faithful to Control Center — nothing flashy)

**A. Unify the button rim with the conic ring already used elsewhere.** Every reference pen that has a rim (Petr-Knoll's is the clearest) builds it as a rotationally-asymmetric gradient (conic, one light direction) via the exact `mask-composite: exclude` technique our `--vsg-ring-chrome` already uses — our buttons are the one glass surface still using a flat linear rim, an inconsistency none of the references share.
```css
@G .monaco-button.monaco-text-button::before {
  background: var(--vsg-ring-chrome); /* was: linear-gradient(to bottom, …) */
}
```
*Payoff:* medium — visual consistency across every glass surface, single light source read. *Cost:* zero (reuses an already-computed token; same one gradient-paint the old rule already cost).

**B. Give buttons the same hover specular nudge cards/widgets already have**, instead of a flat `brightness()`. This is the cheap, already-approved analogue to Mikhail's "material responds to touch" cue (animating displacement scale) — same restrained mechanism (`--vsg-hl-*`), just not yet applied to §10.
```css
@G .monaco-button.monaco-text-button::after {
  background: radial-gradient(120% 60% at var(--vsg-hl-x) var(--vsg-hl-y),
    rgba(var(--vsg-spec-rgb), var(--vsg-hl-a)), transparent 60%),
    linear-gradient(to bottom, rgba(var(--vsg-spec-rgb), 0.16), rgba(var(--vsg-spec-rgb), 0) 55%);
  transition: --vsg-hl-x var(--vsg-motion-slow) var(--vsg-ease),
    --vsg-hl-y var(--vsg-motion-slow) var(--vsg-ease), --vsg-hl-a var(--vsg-motion-slow) var(--vsg-ease);
}
@G .monaco-button.monaco-text-button:hover { --vsg-hl-x: 32%; --vsg-hl-y: 8%; --vsg-hl-a: 0.14; }
```
*Payoff:* medium-high — a genuine "liquid responds to touch" cue with zero new visual vocabulary (same radial highlight already on cards §4). *Cost:* negligible — one extra gradient repaint on hover only, no filter re-evaluation (we deliberately skip Mikhail's animated-`feDisplacementMap` route: it needs real inline `<svg><filter>` DOM elements instead of data-URI filters, plus SMIL, and forces filter re-rasterization every frame for 300ms — disproportionate cost/architecture change for a button hover).

**C. Give small icon-only capsules (activity-bar / status-bar pills, Control-Center-style toggles) a continuous convex profile instead of reusing the wide `menu` class edge-rim.** The single biggest technique difference across all four references vs. us: every one of them displaces the *entire* shape with a smooth convex (ball-lens) gradient, not just an edge band — our flat-centre design exists specifically to protect *text* from distortion, but icon-only pills carry no text and can afford it.
```ts
// src/lens.ts — new small class for icon-only pill controls, used only where there is no label
{ name: 'capsule', w: 28, h: 28, mw: 28, mh: 28, axes: 'xy', rim: 1.0 }
// call profile(dist, edgePx = cls.w/2, power = 1.3) — i.e. edge = full radius, gentler ramp than power=2
```
*Payoff:* high specifically for the "macOS Control Center toggle" read the owner asked for. *Cost:* low — one more small build-time PNG + filter (`build.ts` already generates these offline; no runtime/per-frame cost). *Guardrail:* must stay scoped to icon-only, no-text controls — none of the four references put readable text under full-shape displacement (Petr-Knoll's "Generate" label sits under zero displacement for exactly this reason).

**D. Dial Clear-variant aberration back slightly.** Ours: 0.7/10≈7% (Regular), 2.2/13≈17% (Clear) aberration-to-displacement ratio; even ruri's own tool — which PROGRESS.md already flags as "exaggerated effects" — defaults to aberration/scale ≈ 0.02/0.4 = 5%. Clear currently sits ~3× past ruri's own showcase-tool ratio.
```ts
// src/palette.ts — Clear variant
effects: { …, aberration: 1.4 /* was 2.2 */, … }
```
*Payoff:* low-medium, easy eyeball win toward restraint. *Cost:* zero (constant only).

**E. Add the missing ring to activity-bar/status-bar hover & checked states** (§11) — currently the only glass surface with *no* rim pseudo-element at all, relying on box-shadow alone; every reference pen with a rim treats it as essential to reading as "glass edge" rather than just "material."
```css
@G .part.activitybar .monaco-action-bar .action-item.checked .action-label,
@G .part.activitybar .monaco-action-bar .action-item:hover .action-label {
  position: relative;
}
@G .part.activitybar .monaco-action-bar .action-item.checked .action-label::before,
@G .part.activitybar .monaco-action-bar .action-item:hover .action-label::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: var(--vsg-ring-chrome);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
  pointer-events: none;
}
```
*Payoff:* medium — closes the most visible construction gap vs. the references. *Cost:* negligible, same cheap pattern used at scale already.

**F. Editor/content plane: no change — cross-reference confirms the current rule.** None of the four references put text inside a displaced or heavily blurred region: daftplug/Mikhail's labels are plain shapes composited *outside* the filter via `::before/::after`; Petr-Knoll's "Generate" text sits under zero displacement and only a light `blur(≤4px)`; ruri's tool filters a decorative shape, never body copy. This matches `glass.css`'s own header rule ("refraction/blur applies only to what is BEHIND glass, never to editor text") and `glass-transparent.css`'s editor plane (flat `--vsg-content-bg-window`, no filter on `.monaco-editor`). No proposal here — recorded as validation, not a gap.

### What NOT to adopt (owner already rejected this class of cue)
Petr-Knoll's rotating conic-ring-on-hover, traveling `mix-blend-mode: screen` sheen, and `rotate3d` press-tilt are precisely "sheen sweeps / lifts / glows / overshoot" — keep our current restrained hover (`brightness`) / press (`scale(0.96)`, 60ms, no tilt) as-is aside from proposal B above. Ruri's and the two CodePen buttons' raw displacement/aberration magnitudes (77px turbulence scale, 100%-bbox displacement, 40% scale swell) are calibrated for a showcase/preview, not a toggle — none of the numeric values above should be copied directly, only the *shape* of the technique (convex profile, ring construction, restrained hover-highlight).
