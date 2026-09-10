# VS Glass, round 3 adversarial review

Judged only from the round 3 evidence pack in `scratch/review/round3/`. No source was read. All pixel
coordinates below are in the coordinate space of the named PNG. Where I made my own crops to check
something, the crop rectangle is given so it can be reproduced with `ffmpeg -vf crop=w:h:x:y`.

Measurement method: PNGs decoded to raw RGB, luminance as 0.2126R + 0.7152G + 0.0722B on 0 to 255,
contrast ratios computed on properly linearised sRGB per WCAG.

---

## 1. Scorecard

| # | Optic | Score | One line justification |
|---|-------|-------|------------------------|
| 1 | Lensing / refraction | **4 / 10** | A real lens exists and is visible at two widget rims (palette left edge, roughly 28 px of compressed, colour split backdrop; palette bottom edge, backdrop pushed down about 6 to 7 px with a 1.5 px red to blue channel split), but it ghosts as a double image, and it is completely absent where the eye looks first: the window frame, the editor card bottom edge, the hover and suggest widgets. |
| 2 | Specular edge highlight | **6 / 10** | Widget hairlines are continuous around the silhouette and correctly modulated by angle (hover widget peak luminance 156 top, 110 to 123 sides, 80 bottom, over a 41 to 62 interior), but the window's own hairline collapses from 180 at the top to about 40 at the bottom over a 31 interior, so the window's lower silhouette dissolves, and a 1 px dark groove sits immediately inboard of the top hairline. |
| 3 | Material thickness | **5 / 10** | Drop shadows are genuinely good (background under the palette falls from 19.7 to 10.3 and recovers over roughly 55 px), but there is no bevel: the edge cross section reads 180, 85, 44, 62, that is hairline, falloff, dark groove, body, which is a drawn stroke with an inner shadow rather than a lit chamfer, and there is no tight contact shadow under the broad one. |
| 4 | Vibrancy | **5 / 10** | The window really is see through and colour behind really does reach the material (editor median luminance 73 over the bright part of the wallpaper versus 22 over the dark part), but this is straight alpha plus blur, not vibrancy: nothing remaps the backdrop's luminance or saturation, so bright desktop swamps text, and sibling panes carry visibly different densities (wallpaper mode medians: editor 20.7, sidebar 33.7, panel 39.7, title bar 44.7). |
| 5 | Floating layered panes | **7 / 10** | The strongest optic in the pack: distinct rounded cards for sidebar, editor, panel, widgets, with real gaps, real shadows and the activity bar icons floating directly on the base glass; marked down because the sidebar to editor gutter is only about 6 px, so two hairlines with a dark trough between them read as one seam, and the settings pane is two stacked shapes with a mismatched corner. |
| 6 | Concentric geometry | **5 / 10** | The tab inside the editor card is nearly textbook (card radius about 13, inset 5, tab radius about 10), but three places break the rule badly: the focused notification row (radius about 6, inset about 1, inside a radius 15 container), the settings search focus ring (radius about 2 inside a heavily rounded pane), and the suggest widget's selected row (inner radius equals outer radius at about 2 px inset). |
| 7 | Adaptive tint | **4 / 10** | Three tints exist and are distinguishable, but they are constant colour films, not adaptive, their strengths are wildly unmatched (mean absolute difference against the untinted hero: graphite 9.7, teal 26.1, indigo 25.7 on 0 to 255), and graphite, the one that ought to buy legibility, actually lowers contrast on the dark parts of the frame while barely touching the bright parts. |
| 8 | Liquid response | **3 / 10** | Motion cannot be seen in stills, so this is scored on what the stills imply, and what they imply is that every interactive state is a flat colour swap: the palette row, sidebar row, notification row and suggest row all go saturated blue with no change to the material, no rim brightening, no local bulge, no tint pickup, which is what a theme does, not what a material does. |

**Overall: 4.9 / 10, rounded to 5 / 10.**

### Verdict

Over a real desktop the flagship (`transparent-glass-regular-dark-hero.png`) reads as an unusually
well built translucent theme, not as Liquid Glass. It gets the *architecture* right, which is not
nothing: rounded floating cards with correct gaps, honest shadows, a directional specular that knows
where the light is, and a genuinely see through window. What it does not have is the one thing that
makes Apple's material register as glass rather than as tinted plastic: an edge that visibly bends
what is behind it. The pack proves the maintainer can build that lens, because it exists and works on
the palette's left edge, but it is switched off on every large, high traffic edge in the product: the
whole window frame, the editor card bottom, the hover widget, the suggest widget. Where it is on, it
ghosts, so it reads as a smear rather than a lens. Against the owner's stated target, the score is
mixed: colourless base yes, visible transparency yes, consistent rounded corners mostly yes, no
flashy motion yes, tinted glass as an option yes but badly calibrated, visible refraction on the
edges of the window and of elements largely no, buttons like Control Center toggles no. And two
things actively fight the target: saturated VS Code blue punching through the glass in five separate
places, and code over the bright parts of the desktop dropping to a 1.75 : 1 contrast ratio, which is
not a taste question, it is unreadable.

---

## 2. Findings, ranked by visual impact

### F1. Code over the bright part of the desktop is unreadable, and graphite does not fix it

**What I see.** `transparent-glass-regular-dark-hero.png`, line 4, the tail of the JSDoc comment
`...system with refraction and caustics`, roughly x 850 to 1160, y 163 to 178. My 4x crop of
`crop=330:34:830:152` shows light grey glyphs on a mid grey wash. Measured contrast ratio of that
comment against its own backdrop: **1.75 : 1** in Regular Dark and **1.46 : 1** in Clear
(`transparent-glass-clear-hero.png`). The other comment lines in the same frame run 3.02, 3.63,
4.23, 4.30 : 1. Bright identifiers are fine at 5.1 to 7.2 : 1.

**Why it is wrong.** WCAG asks 4.5 : 1 for body text. 1.75 : 1 means the text is a ghost. Apple's
material never lets this happen because vibrancy is not alpha: the material remaps the backdrop into
a compressed luminance band before content is drawn on it, so a white desktop and a black desktop
land within a few percent of each other behind the same pane.

**Graphite does not solve it.** `transparent-tint-graphite.png` moves the same line from 1.75 to
**1.81 : 1**, which is nothing, and it makes the dark parts *worse*: line 33 falls 4.23 to 3.50 and
line 39 falls 4.30 to 3.35, because graphite lifts the black floor (backdrop relative luminance
0.0109 to 0.0277) instead of pulling down the highlights. Teal and indigo are worse still (line 11:
3.63 down to 2.49 and 2.65).

**Fix.** Add a luminance clamp to the editor pane's backdrop, not a tint: raise the backdrop through
`brightness()` plus `contrast()` so no backdrop pixel exceeds about 0.06 relative luminance behind
text, or drop a neutral scrim at 25 to 35 percent under the text layer only, leaving the window
chrome fully transparent. Testable acceptance: every comment coloured glyph in the hero measures at
least 4.5 : 1 against the pixel directly beneath it, on both the bright and the dark half of the
wallpaper.

### F2. The window's top and bottom edge strips do not refract at all

**What I see.** My crops `crop=300:40:420:0` and `crop=300:40:1150:964` of the hero, plus
`zoom-window-top-left.png` and `zoom-window-bottom-right.png`. The title bar arrows and the word
`samples`, and the status bar string `Ln 1, Col 1  Spaces: 2  UTF-8  LF  { } TypeScript`, are
pixel straight, unfringed and unsqueezed right up to the frame. What is there instead is a flat
1 px hairline on the top (luminance 180, uniform across x = 100 to 1500) and essentially nothing on
the bottom (about 40 against a 31 interior).

**Why it is wrong.** These strips are exactly where in page refraction *is* physically possible under
the CSS constraint, and they are the largest, most persistent glass edges in the product. Reference
image (2), the Generate pill, gets its whole read from a thick rim that bends a grid; here the
equivalent rim bends nothing.

**Fix.** Apply the same displacement filter that already works on the palette's left edge to a 12 px
inner strip along the window's top and bottom, so the title bar and status bar glyphs compress and
fringe as they approach the frame. Testable: the baseline of `Ln 1, Col 1` measured at x = 1200 and
at x = 1560 must differ, and the glyph advance width in the last 12 px must be 10 to 20 percent
narrower.

### F3. The edge lens that does exist ghosts instead of refracting

**What I see.** `zoom-palette-rim.png`, and my crop `crop=700:120:300:820` of
`transparent-glass-regular-dark-palette.png`. At the palette's bottom edge the code line
`[state, setState] = React.useState<T>(props);` appears **twice**: once in place, dim and blurred,
and once about 6 to 7 px lower, brighter and strongly colour split. Per channel row centroids in the
band x 850 to 1050: red 893.3, green 892.8, blue 891.8, so a 1.5 px red to blue separation. Line 16
should sit at y = 886 given the 44 px line pitch, so the lensed copy is displaced 6 to 7 px down and
out.

The same thing happens on the palette's **left** edge, where it works better:
`crop=120:500:128:300` shows about 28 px of genuinely compressed, colour fringed backdrop inside the
rim. This is the single best piece of optics in the whole pack.

**Why it is wrong.** A lens replaces what is behind it; it does not add a second copy. Reference
image (1) warps the text under the slab into one distorted image, and reference (2) bends the dot
grid into one bent grid. Double exposure reads as a compositing bug, and at 1x it just makes the
bottom of the palette look dirty.

**Fix.** Mask the undisplaced backdrop layer to zero inside the lens strip so the displaced copy is
the only thing visible there, rather than compositing the strip over the top. Separately, cut the
chromatic offset from about 1.5 px to 0.4 to 0.6 px; the current amount is more than Apple ever uses
and it is what makes the strip look smeared rather than refractive.

### F4. The editor card's bottom edge slices the last code line instead of bending it

**What I see.** `zoom-editor-bottom-edge.png` (a 2x crop) and my `crop=480:45:430:945` of the hero.
There is a soft light band 18 device rows tall, so 9 CSS px, peaking at +30 luminance over a base of
28, at rows 264 to 282 of the zoom. Inside it the last code line simply fades and is cut through the
middle of its glyphs. Line to line pitch above the band measures 40, 40, 40 device px, that is, no
compression whatsoever, and there is no colour fringing.

**Why it is wrong.** A soft brightness wash over a clipped line is the single most common tell of a
fake glass edge. The brief for this edge is precisely to bend the last lines, and it does not.

**Fix.** Replace the gradient wash with the F3 lens strip, and add 8 px of bottom padding to the
editor's scroll area so the strip has a whole line of glyphs to work on rather than a half clipped
one. Testable: line pitch in the last 12 px must be 10 to 20 percent smaller than the 40 px steady
state.

### F5. The hover widget is transparent only in a narrow left gutter, with a hard vertical seam

**What I see.** `transparent-glass-regular-dark-hover.png` and
`wallpaper-glass-regular-dark-hover.png`. The code behind the widget shows through only from the
widget's left rim to a vertical light line at about x = 300 (transparent scene) and x = 265
(wallpaper scene); to the right of that line the widget is opaque. My crop `crop=260:230:210:195`
makes it unmistakable: `with typ`, `terfa`, `nam` bleed through the gutter column and are then
sliced mid glyph by a 1 px vertical line running the full height of the widget.

**Why it is wrong.** It is a rendering bug, and it is the one place in the product where a widget
sits over dense code, that is, the best available opportunity for refraction. Instead the widget
reads as a dark panel with an odd stripe.

**Fix.** Remove the opaque background from the hover content element and put the material on the
outermost hover container only, so one backdrop covers the whole widget. Testable: no vertical
luminance step greater than 3 anywhere inside the widget body.

### F6. The buttons are not Control Center toggles

**What I see.** `transparent-glass-regular-dark-notifications.png`. The `Yes / Always / Never` group
at roughly x 1425 to 1590, y 938 to 962 (my `crop=190:60:1410:925`) and `Reload` at about
x 1520 to 1590, y 723 to 748 (`crop=200:60:1400:715`). `Always` and `Never` are dark capsules with a
1 px hairline and a slight vertical gradient, which is close. `Yes` is a flat saturated accent blue
pill with **no rim at all**. `Reload` is a glossy blue vertical gradient with a bright top edge, which
is Aqua, not Liquid Glass. The settings `User / Workspace` segmented control is a flat grey rounded
rect chip.

**Why it is wrong.** A Control Center toggle is one recipe in two states: a translucent capsule with
a light top biased hairline and a soft inner bevel, whose "on" state is the *same* capsule filled
with tinted glass, not a different, opaque, saturated widget. Right now the on state and the off
state are made of two different materials, and the on state has no material at all.

**Fix.** One capsule recipe everywhere: fill of white at 12 to 18 percent over the pane material,
1 px hairline that is brightest at the top and drops to about 40 percent at the bottom, 2 to 3 px
inner bevel, radius equal to half the height. For the on state, keep every one of those and add the
accent as a 25 to 35 percent tint over the material instead of replacing it. Remove the vertical
gloss gradient on `Reload`.

### F7. Saturated blue blocks punch through the glass in five places

**What I see.** The focused notification row (`crop=200:130:1108:645`, a solid blue slab with a blue
1 px border filling the container edge to edge), the palette's selected row in
`transparent-glass-regular-dark-palette.png` y about 108 to 148, the entire suggest widget in
`transparent-glass-regular-dark-suggest.png` which is one blue gradient lozenge, the settings search
focus ring in `transparent-glass-regular-dark-settings.png` (`crop=360:130:165:115`), and the sidebar
selected row in `transparent-glass-regular-dark-sidebar.png`.

**Why it is wrong.** The stated target is a "colourless multilayer plane of glass". These are the
brightest, most saturated objects in every frame, they are opaque, and they sit on top of the
material rather than being made of it. The suggest widget in particular no longer reads as glass at
all: it reads as a blue button.

**Fix.** Replace selection and focus *fills* with a neutral wash (white at 10 to 14 percent over the
material) plus a brighter rim on the selected row, and keep accent colour for the 1 px focus outline
and for text only. Testable: no interactive state fill may exceed 20 percent chroma against the
surrounding material.

### F8. Radius collisions and inconsistent corners

**What I measured.** Window radius 21.5 px (circle fit to the top left rim arc of the hero, rows 0
to 23). Editor card radius about 13. Notification container radius about 15. Active tab radius about
10 at an inset of 5 inside the radius 13 editor card, which is very close to the concentric ideal of
8, and is the best corner relationship in the pack.

The three failures:
* Focused notification row: radius about 6, inset about 1 px inside a radius 15 container, so the
  row's tight corner visibly crosses the container's wide corner and the row's blue border lands
  directly on top of the container's specular hairline. Two borders, 1 px apart, in the same place.
* Settings search field focus ring: radius about 2, effectively a rectangle, inside a pane whose
  every other corner is 10 or more.
* Suggest widget: the selected row's radius is a full capsule at an inset of about 2 px inside the
  widget, so inner radius is equal to or greater than outer radius, which is anti concentric.

**Fix.** One rule, applied by token: `inner_radius = outer_radius - inset`, floored at 6. Retire the
2 px focus ring radius. Give the focused notification row an inset of at least 6 px so its corner has
room.

### F9. The window's rim dies at the bottom, and there is a dark groove instead of a bevel

**What I measured.** Hero, at x = 800: top edge cross section is 180, 85, **44**, 62, 65, 59, that is
hairline, falloff, a 1 px dark line, then the body. At x = 0, y = 500: 82, 39, **21**, 26, 24, 31,
same pattern. Bottom edge at x = 800, rows 999 to 1003: 31, 31, 24, 30, 38, a ramp of about +8 with
no hairline at all. So the top rim is roughly 13x the contrast of the bottom rim.

**Why it is wrong.** The dark groove immediately inboard of the hairline is the opposite of a bevel;
a real chamfer gets *brighter* just inside the highlight before settling into the body, which is what
gives Apple's panes their thickness. And while a light from above model is correct, Apple never lets
the far edge fall to zero, because the silhouette then breaks: here the bottom of the window simply
dissolves into the desktop.

**Fix.** Raise the bottom rim to 25 to 30 percent of the top rim's contrast, and replace the 1 px
dark line with a 3 to 4 px inner bevel that ramps down from the hairline into the body rather than
undershooting it.

### F10. "Clear" is not a distinct variant, and wallpaper mode's smoke is invisible

**What I measured.** `transparent-glass-clear-hero.png` against
`transparent-glass-regular-dark-hero.png`: mean absolute difference 6.7 on 0 to 255, 95th percentile
15. Side by side they are the same picture with slightly different exposure. In wallpaper mode the
two are nearly indistinguishable from the no effects baseline.

For the smoke: in `wallpaper-glass-regular-dark-hero.png` the editor background across
x 1000 to 1560, y 400 to 640 spans luminance 20.7 to 30.7 with a standard deviation of **1.25**. The
same region in the transparent hero spans 40.4 to 101.5 with a standard deviation of 9.34. The
baseline `wallpaper-glass-regular-dark-layer1-hero.png` is dead flat at 22.9, standard deviation 0.
So the smoke is real but its amplitude is about 4 percent, roughly one seventh of what the desktop
provides. Lifting the wallpaper hero by 9x over a black point of 16 does resolve two soft elliptical
blobs and some diagonal wisps, so the generator works; the amplitude is simply far too low.

**Fix.** Drop Clear's material alpha by about 40 percent and halve its blur radius so the two
variants are unmistakable at a glance. Raise the wallpaper smoke to about plus or minus 18 luminance
with feature sizes in the 200 to 400 px range, so the lens has structure to bend and the mode looks
deliberate rather than broken.

### F11. Sibling panes are made of different glass

**What I measured.** Wallpaper mode medians, so the backdrop is constant: editor 20.7, sidebar 33.7,
status bar 34.9, panel 39.7, title bar 44.7. In the transparent terminal scene the editor reads 75.5
and the terminal panel 34.7 over comparable backdrops.

**Why it is wrong.** Panes at the same depth in a layered glass system must be the same material.
Here the editor is visibly the densest surface in the window and the title bar the thinnest, which
breaks the illusion that they are all sheets of one substance.

**Fix.** One material token for all same depth panes; vary only by depth (base, card, popover,
overlay), with a documented alpha and blur per level.

### F12. The settings pane is too transparent for the content it carries

**What I see.** `transparent-glass-regular-dark-settings.png`, my `crop=360:130:165:115`. The code
behind the pane is not merely present, it is *readable*: `interface Gla`, `readonly ti`,
`refractionI`, `onRender?:` all resolve through the pane, and an orange `1` from the file tree sits
inside the search field so it reads as `Search settings 1`. The pane's title band and its body card
are also two separate shapes with a step at the left where the rounded corner starts under a square
cornered band.

**Fix.** Raise the modal or editor overlay layer's opacity so behind content resolves as texture, not
as text: target no legible glyph edges behind the pane, which in practice means roughly doubling the
blur radius and raising the fill by 10 to 15 percentage points at that layer only. Merge the title
band into the card so there is one silhouette with one radius.

### F13. Outer bloom above the hover widget

**What I measured.** `transparent-glass-regular-dark-hover.png` at x = 800: rows 200 to 209 read 44
to 48, rows 211 to 217 read 54 to 73, then the hairline at 218 to 221 reads 149 to 156. So there is a
7 px light halo *outside* the widget's top edge.

**Why it is wrong.** Glass casts a shadow, it does not emit a glow. The halo reads as bloom and it
softens the silhouette exactly where the specular should make it crisp.

**Fix.** Remove the outer glow; keep the drop shadow, which is already good.

---

## 3. Specific checks

**(a) Is refraction actually visible in the zoom crops, and how strong relative to the references?**

Partly, and unevenly.

* `zoom-palette-rim.png`: yes, but as the ghost described in F3. The backdrop copy is displaced
  6 to 7 px and split 1.5 px between red and blue. Visible at 1x, but it reads as a smear.
* Palette left edge (not in the pack; `crop=120:500:128:300` of
  `transparent-glass-regular-dark-palette.png`): yes, and this is the good one. About 28 px of
  compressed, colour fringed backdrop with a clear squeeze toward the rim. This is the closest the
  project gets to reference (2).
* `zoom-hover-rim.png`: no. The widget is effectively opaque there, so there is nothing to bend. What
  the crop shows is a 2 px near neutral hairline at luminance 86 plus a secondary line at 59, which
  is a border, not a lens.
* `zoom-editor-bottom-edge.png`: no. A 9 px brightness wash, zero displacement (line pitch stays at
  40, 40, 40), zero fringing.
* `zoom-window-top-left.png`, `zoom-window-bottom-right.png`: no. Title bar and status bar glyphs are
  perfectly straight.

Relative to the references: reference (1) warps text so hard it is barely readable inside the slab
and the fringe is a deliberate feature of a single distorted image. Reference (2) bends a whole dot
grid through a thick rim with a clean, continuous gradient of displacement. The palette's left edge
is at maybe 30 to 40 percent of reference (2)'s strength and is dirtied by the excessive chromatic
split; everything else in the pack is at zero. Note also that the "2x" zoom crops are nearest
neighbour upscales of the 1600 px composite, so they carry no extra detail; a real device resolution
capture would make this evaluation sharper.

**(b) Do the window edges read as a glass slab, or as a plain rounded window?**

As a plain rounded window with a good top highlight. In favour: a genuine 21.5 px corner radius, a
crisp 1 px hairline that follows the corner arc and falls off correctly from top (180) to left (78),
and the desktop visibly present through the body. Against: the bottom rim is effectively gone (about
40 over a 31 interior), there is a 1 px dark groove where a bevel should be, and no edge bends
anything. A slab has thickness you can see at the edge; this has a stroke you can see at the edge.

**(c) Radius collisions and inconsistent corners?**

Yes, three real ones and one near miss. Details and numbers in F8. Summary: window 21.5, editor card
about 13, notification container about 15, tab about 10 at inset 5 (good), focused notification row
about 6 at inset about 1 (collision, plus a doubled border on the container's hairline), settings
search focus ring about 2 (out of system entirely), suggest selected row at or above the outer radius
at about 2 px inset (anti concentric). Near miss: the sidebar to editor gutter is about 6 px, which is
too tight to read as two floating panes; the two hairlines at x = 335 and x = 341 with a dark trough
between them (measured at y = 300, 500, 700 in the hero) look like one badly drawn double border.

**(d) Are the notification and settings buttons Control Center like?**

No. `Always` and `Never` are close in shape (full capsules with a hairline) but are opaque dark, not
translucent, and have no inner bevel. `Yes` is a flat saturated blue pill with no rim at all, and
`Reload` is a glossy blue vertical gradient, which is Aqua. The `User / Workspace` segmented control
in settings is a flat grey chip. The critical failure is that the on state is a different material
from the off state, where Control Center uses one material in two tints. See F6.

**(e) Tints: worth choosing, too faint, or too strong?**

Badly calibrated as a set. Mean absolute difference against the untinted flagship: graphite 9.7,
teal 26.1, indigo 25.7 on a 0 to 255 scale. Graphite is close to a no op and it does not buy
legibility (F1); teal and indigo are colour films laid over everything including the code, closer to
a screen filter than to tinted glass, and they cost 20 to 30 percent of the code's contrast. Pick one
strength, land all three on it (something near 15 to 18 would be a sensible midpoint), and make the
tint act on the *backdrop* before the material rather than on the whole composited window, so code
colours stay untinted.

**(f) Wallpaper mode: does the smoke give the lens enough to bend, and does it look intentional?**

No, and no. Measured amplitude is about 10 luminance levels peak to peak with a standard deviation of
1.25, against 9.34 for the real desktop. At normal exposure the mode is indistinguishable from a flat
dark theme; the effects layer only becomes visible when the image is lifted 9x, at which point two
soft blobs and some diagonal wisps do appear, so the generator is working and the amplitude is simply
too low by roughly a factor of five. As shipped, `wallpaper-glass-regular-dark-hero.png` is very hard
to tell from the no effects baseline `wallpaper-glass-regular-dark-layer1-hero.png` except by the
card rims, which makes the mode read as broken rather than as a deliberate choice. Note also that the
wallpaper hero was captured with the terminal panel open while the clear and layer1 heroes were not,
so that trio is not directly comparable.

**(g) Anything that looks like a rendering bug?**

Yes, six:
1. **Ghosted double image** at the palette's bottom lens strip (F3). The most damaging one.
2. **Hover widget transparent only in the left gutter**, with a hard 1 px vertical seam slicing
   through the backdrop glyphs (F5).
3. **Doubled border** at the focused notification row, where the row's blue 1 px border lands
   directly on the container's specular hairline, about 1 px apart (F8).
4. **Dark 1 px groove** immediately inboard of the window's hairline on every edge, reading as a
   second, darker border (F9).
5. **Outer bloom** 7 px above the hover widget's top edge (F13).
6. **Last code line sliced mid glyph** at the editor card's bottom edge with no lens and no padding
   (F4). Also visible as a stray short bright horizontal segment inside the hover widget near its
   bottom left, in `crop=260:230:210:195` of the hover scene.

---

## 4. What is clearly working, do not regress it

1. **The floating card architecture.** Sidebar, editor, panel and widgets are genuinely separate
   rounded panes with real gaps, and the activity bar icons float directly on the base glass. This is
   the part that already looks like macOS 26.
2. **The drop shadows.** Measured in wallpaper mode against a flat 19.7 backdrop, the palette drops
   the background to 10.3 immediately beneath it and recovers over about 55 px; the hover widget does
   the same. Generous, soft, correctly sized. Do not shrink these while fixing the rim.
3. **The directional specular on widgets.** The hover widget's hairline runs 156 at the top, 110 to
   123 at the sides and 80 at the bottom over a 41 to 62 interior. That is a correct, continuous
   angular falloff around the silhouette and it is the single most Apple thing in the pack. Extend
   this model to the window frame rather than replacing it.
4. **The tab inside the editor card.** Card radius about 13, inset 5, tab radius about 10. Use this
   as the reference relationship for every other nested corner.
5. **The palette's left edge lens.** About 28 px of genuinely compressed, fringed backdrop. Fix the
   ghosting and the excessive chromatic split, but do not remove the displacement itself; this is the
   proof the technique works in this codebase.
6. **The colourless base.** The untinted material adds no hue of its own; what colour appears in the
   frame is the desktop's. That matches the target exactly and should survive every fix above.
7. **The restraint.** No decorative gradients, no glow chrome, no motion tells in the stills. The
   places that look wrong look wrong because of missing optics, not because of added noise.
