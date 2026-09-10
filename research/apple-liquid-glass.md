# Apple Liquid Glass — Design & Optical Reference

Compiled 2026-09-10 for the VS Glass project. Every claim below is sourced from Apple's own
developer documentation (Human Interface Guidelines, Technology Overviews, WWDC25 session
transcripts) fetched live for this document, or — where Apple no longer publishes a number —
from a clearly marked, well-sourced secondary reference. This is the spec the visual design of
VS Glass should be built against.

**Primary sources fetched:**
- HIG "Materials" — https://developer.apple.com/design/human-interface-guidelines/materials (page changelog shows it was last updated **September 9, 2025**, "Updated guidance for Liquid Glass")
- HIG "Color" — https://developer.apple.com/design/human-interface-guidelines/color (changelog: **December 16, 2025**, "Updated guidance for Liquid Glass"; **June 9, 2025**, "Updated system color values")
- HIG "Dark Mode" — https://developer.apple.com/design/human-interface-guidelines/dark-mode
- "Adopting Liquid Glass" — https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass
- "Liquid Glass" technology overview — https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- "Applying Liquid Glass to custom views" (SwiftUI) — https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views
- WWDC25 session 219, "Meet Liquid Glass" — https://developer.apple.com/videos/play/wwdc2025/219/ (full verbatim transcript retrieved)
- WWDC25 session 356, "Get to know the new design system" — https://developer.apple.com/videos/play/wwdc2025/356/ (full verbatim transcript retrieved)
- WWDC25 session 323, "Build a SwiftUI app with the new design" — https://developer.apple.com/videos/play/wwdc2025/323/ (full verbatim transcript retrieved)

**Method note:** the HIG and Technology Overview pages are JavaScript-rendered single-page apps;
static `curl` only returns an empty shell. The actual content — including exact system-color RGB
values encoded as image `alt` text — was retrieved from Apple's own DocC JSON data endpoints
(`https://developer.apple.com/tutorials/data/...`), which are the same JSON the live page fetches
client-side. WWDC transcripts were retrieved from the `#transcript-content` block server-rendered
into the video page's HTML. This is a legitimate way of reading Apple's own published page content,
not a workaround of any paywall or auth.

---

## 1. HIG "Materials" — Liquid Glass

Source: https://developer.apple.com/design/human-interface-guidelines/materials

> "Apple platforms feature two types of materials: Liquid Glass, and standard materials. Liquid
> Glass is a dynamic material that unifies the design language across Apple platforms, allowing
> you to present controls and navigation without obscuring underlying content."

### Liquid Glass as a functional layer

> "Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab
> bars and sidebars — that floats above the content layer, establishing a clear visual hierarchy
> between functional elements and content. Liquid Glass allows content to scroll and peek through
> from beneath these elements to give the interface a sense of dynamism and depth, all while
> maintaining legibility for controls and navigation."

- **Don't use Liquid Glass in the content layer.** Use Standard materials there instead. The
  documented exception: "controls in the content layer with a transient interactive element like
  Sliders and Toggles" — these *do* take on a Liquid Glass appearance while a person is actively
  interacting with them.
- **Use Liquid Glass effects sparingly** on custom controls — "overusing this material in multiple
  custom controls can provide a subpar user experience by distracting from that content."

### Regular vs. Clear variants

> "Liquid Glass provides two variants — regular and clear — that you can choose when building
> custom components or styling some system components."

- **Regular**: "blurs and adjusts the luminosity of background content to maintain legibility of
  text and other foreground elements. Scroll edge effects further enhance legibility... Most
  system components use this variant. Use the regular variant when background content might create
  legibility issues, or when components have a significant amount of text, such as alerts,
  sidebars, or popovers."
- **Clear**: "is highly translucent, which is ideal for prioritizing the visibility of the
  underlying content and ensuring visually rich background elements remain prominent. Use this
  variant for components that float above media backgrounds — such as photos and videos — to
  create a more immersive content experience." **Only use clear Liquid Glass for components that
  appear over visually rich backgrounds.**

### The dimming layer Clear requires

> "For optimal contrast and legibility, determine whether to add a dimming layer behind components
> with clear Liquid Glass:
> - If the underlying content is bright, consider adding a dark dimming layer of **35% opacity**.
>   For developer guidance, see clear.
> - If the underlying content is sufficiently dark, or if you use standard media playback controls
>   from AVKit that provide their own dimming layer, you don't need to apply a dimming layer."

(WWDC25 219 restates and sharpens this: "To provide enough legibility for symbols or labels, it
needs a dimming layer to darken the underlying content. Without it, legibility gets noticeably
worse." — see §3 below for the full three-condition rule for when Clear is allowed at all.)

### Layering rule (never glass-on-glass)

The Materials page itself doesn't restate "no glass-on-glass" verbatim (that phrasing is from
WWDC25 219, quoted in §3), but it does establish the underlying layering model: Liquid Glass is
"a distinct functional layer... that floats above the content layer." Elements placed *on top of*
Liquid Glass (labels, symbols, fills) are governed separately — see vibrancy/legibility guidance
in "Liquid Glass color" below and §5.

### Adapting to light/dark and to content behind it

From the companion "Liquid Glass color" section of the HIG Color page (directly relevant here):

> "By default, Liquid Glass has no inherent color, and instead takes on colors from the content
> directly behind it... For smaller elements like toolbars and tab bars, the system can adapt
> Liquid Glass between a light and dark appearance in response to the underlying content. By
> default, symbols and text on these elements follow a monochromatic color scheme, becoming darker
> when the underlying content is light, and lighter when it's dark. Liquid Glass appears more
> opaque in larger elements like sidebars to preserve legibility over complex backgrounds and
> accommodate richer content on the material's surface."

### Concentric corner geometry

The Materials page doesn't itself define the concentric-radius math (that's covered fully in
WWDC25 356, quoted verbatim in §3/§7), but it cross-references the mechanism and developer API
(`glassEffect(_:in:)`, concentric rectangle shapes) via "Adopting Liquid Glass."

### Platform-specific notes (Materials page)

- **iOS/iPadOS**: alongside Liquid Glass, four standard materials remain (ultraThin, thin, regular,
  thick) for the *content* layer. Vibrancy for labels/fills has levels named by contrast: "The name
  of a level indicates the relative amount of contrast between an element and the background: The
  default level has the highest contrast, whereas quaternary (when it exists) has the lowest
  contrast." Quaternary should generally be avoided on `thin`/`ultraThin` materials — "the contrast
  is too low."
- **macOS**: standard materials plus "vibrant versions of all Specifications" via
  `NSVisualEffectView`; two blending modes, "behind window" and "within window."
- **tvOS**: "Liquid Glass appears throughout navigation elements and system experiences such as Top
  Shelf and Control Center. Certain interface elements, like image views and buttons, adopt Liquid
  Glass when they gain focus."
- **visionOS**: uses a distinct, system-defined material called *glass* (lowercase — conceptually
  related but a separate spec from Liquid Glass): "helps people stay grounded by letting light, the
  current Environment, virtual content, and objects in people's surroundings show through... Glass
  is an adaptive material that limits the range of background color information so a window can
  continue to provide contrast for app content while becoming brighter or darker depending on
  people's physical surroundings." Note: "visionOS doesn't have a distinct Dark Mode setting.
  Instead, glass automatically adapts to the luminance of the objects and colors behind it."
- **watchOS**: material layers provide context/orientation in full-screen modal views; avoid
  removing the default material background for modal sheets.

---

## 2. "Adopting Liquid Glass" + "Liquid Glass" technology overview

Sources: https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass and
https://developer.apple.com/documentation/technologyoverviews/liquid-glass

### Optical description

> "Interfaces across Apple platforms feature a new dynamic Materials called Liquid Glass, which
> combines the optical properties of glass with a sense of fluidity. This material forms a distinct
> functional layer for controls and navigation elements. It affects how the interface looks, feels,
> and moves, adapting in response to a variety of factors to help bring focus to the underlying
> content."

### Lensing/refraction and sampling (developer-level detail not in the HIG)

The SwiftUI companion article "Applying Liquid Glass to custom views" (developer documentation,
https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) gives the
clearest technical description of *how* the refraction/lensing is implemented as a rendering
effect:

> "Liquid Glass is a material that blurs content behind it, reflects color and light of surrounding
> content, and reacts to touch and pointer interactions in real time."

> "Use `GlassEffectContainer` when applying Liquid Glass effects on multiple views to achieve the
> best rendering performance. A container also allows views with Liquid Glass effects to blend
> their shapes together and to morph in and out of each other during transitions."

> "Customize the spacing on the container to control how the Liquid Glass effects behind views
> interact with one another. The larger the spacing value on the container, the sooner the Liquid
> Glass effects behind views blend together and merge the shapes during a transition."

WWDC25 323 makes the sampling mechanism explicit (see §3): glass "reflects and refracts light,
picking colors from nearby content," achieved "by sampling content from an area **larger than
itself**," and critically: **"glass can not sample other glass"** — nearby glass elements in
different containers produce inconsistent results, which is the technical root of the HIG's
"avoid glass on glass" rule.

### App icons (layered rendering, also lensing-adjacent)

> "The system automatically applies effects like reflection, refraction, shadow, blur, and
> highlights to your icon layers." App icons now ship default (light), dark, clear, and tinted
> appearance variants.

### Motion / reaction to interaction

> "For controls like sliders and toggles, the knob transforms into Liquid Glass during interaction,
> and Buttons fluidly morph into menus and popovers."

### Tint/color adaptation

> "Be judicious with your use of Color in controls and navigation so they stay legible. If you do
> apply color to these elements, leverage system colors, or define a custom color with light and
> dark variants, and an increased contrast option for each variant."

### Vibrancy of text/symbols

> "SwiftUI automatically uses a vibrant text color that adapts to maintain legibility against
> colorful backgrounds" (from "Applying Liquid Glass to custom views"); and per Adopting Liquid
> Glass: "just like text within a glass effect, the tint also uses a vibrant color that adapts to
> the content behind it."

### Other structural guidance from "Adopting Liquid Glass" worth carrying into VS Glass

- **Navigation**: "Liquid Glass applies to the topmost layer of the interface, where you define
  your navigation. Key navigation elements like Tab bars and Sidebars float in this Liquid Glass
  layer."
- **Background extension effect**: "creates a sense of extending a background under a sidebar or
  inspector, without actually scrolling or placing content under it... mirrors the adjacent content
  to give the impression of stretching it under the sidebar, and applies a blur to maintain
  legibility."
- **Windows/modals**: "Windows adopt rounder corners to fit controls and navigation elements...
  Sheets feature an increased corner radius, and half sheets are inset from the edge of the display
  to allow content to peek through from beneath them. When a half sheet expands to full height, it
  transitions to a more opaque appearance to help maintain focus on the task."
- **Organization/layout**: "organizational components like lists, tables, and forms have a larger
  row height and padding. Sections have an increased corner radius to match the curvature of
  controls across the system."
- **Performance**: "Combine custom Liquid Glass effects to improve rendering performance... using a
  `GlassEffectContainer`, which helps optimize performance while fluidly morphing Liquid Glass
  shapes into each other." tvOS: "Apple TV 4K (2nd generation) and newer models support Liquid
  Glass effects. On older devices, your app maintains its current appearance" — confirms Liquid
  Glass rendering is GPU-cost-aware and has a documented fallback tier.

---

## 3. WWDC25 sessions — key optical/motion statements (verbatim transcript excerpts)

Full transcripts were retrieved for all three sessions; only the passages most relevant to VS
Glass's optical/motion model are quoted here (with light editing only to drop filler/false starts).

### Session 219 — "Meet Liquid Glass"
https://developer.apple.com/videos/play/wwdc2025/219/

**Lensing (the core optical mechanism):**
> "The primary way Liquid Glass visually defines itself is through something called Lensing...
> Through this experience we've all gained an intuitive understanding of how the warping and
> bending of light of a transparent object communicates to us its presence, its motion, and form.
> Liquid Glass uses these instinctive visual cues to provide separation and communicate layering in
> a new way while letting content shine through underneath it. Where as previous materials
> scattered light, this new set of materials dynamically bends, shapes, and concentrates light in
> real time. This provides definition against the background content while still feeling visually
> grounded in our experience of the natural world. By sculpting light like this, controls can feel
> ultra lightweight and transparent while still being visually distinguishable."

**Materialization (not a fade):**
> "Instead of fading, Liquid Glass objects materialize in and out by gradually modulating the light
> bending and lensing, ensuring a graceful transition that preserves the optical integrity of the
> material."

**Specular highlights follow a virtual light source, and react to device motion:**
> "Liquid Glass lives inside an environment that behaves like the world around us. Light sources
> inside of this environment shine on the material producing highlights that respond to geometry
> just as you'd expect. On interactions, such as locking and unlocking your phone, these lights
> move in space, causing light to travel around the material, defining its silhouette. And in some
> cases, the lighting responds to device motion, making it feel like Liquid Glass is aware of its
> position in the real world."

**Shadow behavior is content-aware:**
> "Shadows also play an important role in helping elements feel grounded and defined... The element
> is aware of what's behind it and increases the opacity of its shadow when it is over text.
> Conversely, it lowers the opacity of its shadow when it is over a solid light background. This
> provides separation from the content to make sure elements are always easy to spot."

**Illumination-from-within feedback on touch:**
> "When you interact with Liquid Glass, the material illuminates from within as a form of feedback.
> Starting right under your fingertips, the glow spreads throughout the element and onto any Liquid
> Glass elements nearby, interacting with the flexible properties of the material in a way that
> feels natural and fluid."

**Thickness/shadow scaling when glass grows (e.g. presenting a menu):**
> "When glass flexes and morphs to larger sizes – like when presenting a menu from a toolbar button
> – its material characteristics change to simulate a thicker, more substantial material. It casts
> deeper, richer shadows, has more pronounced lensing and refraction effects, and a softer
> scattering of light."

**Ambient color bleed on large surfaces (sidebars):**
> "On larger elements, like sidebars, the appearance of Liquid Glass is informed by the ambient
> environment within the app. Light from colorful content nearby can subtly spill onto its surface,
> reinforcing the material's context and its sense of elevation within the interface. And the
> effect isn't limited to the surface, the light reflects, scatters, and bleeds into the shadow as
> well – much like it would in the physical world."

**Concentric geometry (nesting into window/device corners):**
> "Glass controls nest perfectly into the rounded corners of windows, maintaining concentricity
> throughout the UI."

**Motion / "liquid" flex on interaction:**
> "How the material feels and behaves is just as important as the way it looks... To this effect,
> Liquid Glass responds to interaction by instantly flexing and energizing with light. This makes
> the interface feel responsive, satisfying, and alive. And it has an inherent gel-like flexibility
> to it that communicates its transient and malleable nature, as it moves in tandem with your
> interaction."

**Morphing between states (the "singular floating plane" concept):**
> "As you go between states in an app, Liquid Glass dynamically morphs between the controls in each
> context. This maintains the concept of having a singular floating plane that the controls live
> on. And it makes transitions between different sections of an app feel fluid and seamless, as the
> controls continually shape shift."

**Never glass-on-glass (explicit rule):**
> "Similarly, always avoid glass on glass. Stacking Liquid Glass elements on top of each other can
> quickly make the interface feel cluttered and confusing. When placing elements on top of Liquid
> Glass, avoid applying the material to both layers. Instead, use fills, transparency, and vibrancy
> for the top elements to make them feel like a thin overlay that is part of the material."

**Don't use Liquid Glass in the content layer:**
> "You may be tempted to use Liquid Glass everywhere but it is best reserved for the navigation
> layer that floats above the content of your app. Consider this tableview: making it Liquid Glass
> would make it compete with other elements and muddy the hierarchy. So keep it in the content
> layer instead to ensure clarity."

**Regular vs. Clear, and the exact three-condition rule for Clear:**
> "There are two [variants] to choose from: Regular and Clear. They should never be mixed, as they
> each have their own characteristics and specific use cases. Regular is the most versatile...
> gives you all the visual and adaptive effects we've talked about, and provides legibility
> regardless of context. It works in any size, over any content and anything can be placed on top
> of it. Clear, on the other hand, does not have adaptive behaviors. It is permanently more
> transparent... To provide enough legibility for symbols or labels, it needs a dimming layer to
> darken the underlying content. Without it, legibility gets noticeably worse. If Liquid Glass
> elements in your app have a smaller footprint, you can use localized dimming and allow the
> content to retain more of its original vibrancy. To recap, whereas the Regular variant can work
> anywhere, Clear should only be used when these 3 conditions are met. First, the element you're
> applying it to is over media-rich content. Second, your content layer won't be negatively
> affected by introducing a dimming layer. And lastly, the content sitting above it is bold and
> bright."

**Legibility flip (light↔dark) for small vs. big elements:**
> "Small elements like navbars and tabbars, constantly adapt their appearance depending on what's
> behind them. They also flip from light to dark based on the background to make sure the material
> looks as good as possible and is easily discernible. Bigger elements, like menus or sidebars also
> adapt based on context, but they don't flip from light to dark. Their surface area is too big and
> transitions like these would be distracting. To maintain legibility, symbols and glyphs on top of
> Liquid Glass, do the same. They flip from light to dark and vice versa, mirroring the glass's
> behavior to maximize contrast. All content placed on the Regular variant will automatically
> receive this treatment."

**Tinting mechanism (content-aware colored glass):**
> "Liquid Glass introduces a new way of tinting elements that respects the principles of the
> material and maximizes legibility... Selecting a color generates a range of tones that are mapped
> to content brightness underneath the tinted element. It draws inspiration from how colored glass
> works in reality: changing its hue, brightness and saturation depending on whats behind without
> deviating too much from the intended color. Not only does this emphasize the physicality of the
> material, but it also helps legibility and contrast... tinting is natively compatible with all
> the behaviors of glass."

**Accessibility modifiers (the only place durations/behavior toggles are named, though not
quantified):**
> "Reduced Transparency, makes Liquid Glass frostier and obscures more of the content behind it.
> Increased contrast, makes elements predominantly black or white and highlights them with a
> contrasting border and Reduced Motion decreases the intensity of some effects and disables any
> elastic properties for the material."

### Session 356 — "Get to know the new design system"
https://developer.apple.com/videos/play/wwdc2025/356/

**Concentricity — the exact geometric rule (three shape types):**
> "There's a quiet geometry to how our shapes fit together, driven by concentricity. By aligning
> radii and margins around a shared center, shapes can comfortably nest within each other. And to
> preserve optical balance, views are mathematically centered when it makes sense— and subtly
> offset when it doesn't. We use three shape types to build concentric layouts: **fixed shapes have
> a constant corner radius. Capsules use a radius that's half the height of the container. And
> concentric shapes calculate their radius by subtracting padding from the parent's.**"

**Liquid Glass as a functional layer (restated with the "never steals focus" framing):**
> "Liquid Glass defines a new functional layer in the UI, floating above your content to bring
> structure and clarity, without ever stealing focus."

**Separation requirement (no glass directly on content):**
> "Elements using Liquid Glass require clear separation from content to maintain legibility. Like
> in Safari today, controls sit on top of a system material, not directly on content. Without that
> separation, contrast can suffer."

**Material variation signals focus/depth changes:**
> "Liquid Glass helps reflect navigation focus by introducing subtle material variation that
> reinforces intent as navigation deepens or shifts... when focus shifts, like dragging a sheet
> upward, Liquid Glass subtly recedes, becoming more opaque and gently growing in size to signal a
> deeper level of engagement."

**Scroll edge effects (soft vs. hard):**
> "Soft is the default and the one you'll use in most cases, especially on iOS and iPadOS. It
> provides a subtle transition and works well for interactive elements, like buttons or inputs,
> using Liquid Glass. Hard is mostly used on macOS. It creates a stronger, more opaque
> boundary—ideal for interactive text, controls without backgrounds, or pinned table headers that
> need extra clarity."

### Session 323 — "Build a SwiftUI app with the new design"
https://developer.apple.com/videos/play/wwdc2025/323/

**Adaptivity while scrolling:**
> "As you scroll through content, the glass automatically adapts to the content underneath,
> changing from light to dark."

**Controls "come alive" during interaction:**
> "Controls like toggles, segmented pickers, and sliders now transform into liquid glass during
> interaction, creating a delightful experience!"

**Sampling / lensing implementation detail, and why glass can't be stacked on glass:**
> "The glass material reflects and refracts lights, picking colors from nearby content. This
> effect is achieved by sampling content from an area larger than itself. However, glass can not
> sample other glass, so having nearby glass elements in different containers will result in
> inconsistent behavior... Using a glass container allows these elements to share their sampling
> region, providing a consistent visual result."

**Interactive reaction — the concrete verbs for the "liquid" motion response:**
> "On iOS, for custom controls or for containers with interactive elements, add the interactive
> modifier to the glass effect. Glass reacts to user interaction by **scaling, bouncing, and
> shimmering**, matching the effect provided by toolbar buttons and sliders."

**Morphing via `GlassEffectContainer` + `glassEffectID`:**
> "To combine multiple glass elements, use the GlassEffectContainer... When expanding my badges, I
> get this wonderful fluid morphing! Add these transitions to your own glass container by using the
> glassEffectID modifier."

**Concentric rectangle shape (developer API matching the §3/356 geometric rule):**
> "Many of our controls have their corners aligned perfectly within their containers, even if the
> container is your iPhone! This is called corner concentricity... To build views that
> automatically maintain concentricity with their container, use the concentric rectangle shape.
> Pass the containerConcentric configuration to the corner parameter of a rectangle and the shape
> will automatically match its container across different displays and window shapes."
> Code: `CustomControl().background(.tint, in: .rect(corner: .containerConcentric))`

**Tint vibrancy on custom glass:**
> "For especially important views, use a tint modifier... just like text within a glass effect, the
> tint also uses a vibrant color that adapts to the content behind it."

---

## 4. Apple system colors

Source: HIG "Color" — https://developer.apple.com/design/human-interface-guidelines/color. As of
this page's current text, Apple explicitly warns designers not to hard-code these ("Documented
color values are for your reference during the app design process. The actual color values may
fluctuate from release to release... Use APIs like `Color` to apply system colors"), but the page
still ships a "Specifications" section with color swatches per named color. **The visible-in-markup
table cells are blank** (the values are conveyed as swatch *images*, not text) — however, each
swatch image's accessibility `alt` text encodes the exact RGB value (e.g. `alt="R-255,G-56,B-60"`
for the "Red / Default (light)" swatch). That alt text is the source for every value below,
extracted directly from Apple's own DocC JSON for the Color page (fetched 2026-09-10; page
changelog dates this data to the **June 9, 2025** "Updated system color values" revision, still
current per the **December 16, 2025** changelog entry which only updated *guidance*, not values).

### Unified system colors (iOS, iPadOS, macOS; visionOS uses the "Default (dark)" column)

These are Apple's "unified" accent colors — a single named set now shared across platforms as part
of the 2025 Liquid Glass redesign (previously iOS and macOS shipped slightly different RGB values
for some of these names; per HIG Color: "visionOS system colors use the default dark color
values").

| Color | SwiftUI API | Default (light) | Default (dark) | Increased Contrast (light) | Increased Contrast (dark) |
|---|---|---|---|---|---|
| Red | `.red` | `#FF383C` | `#FF4245` | `#E9152D` | `#FF6165` |
| Orange | `.orange` | `#FF8D28` | `#FF9230` | `#C55300` | `#FFA056` |
| Yellow | `.yellow` | `#FFCC00` | `#FFD600` | `#A16A00` | `#FEDF43` |
| Green | `.green` | `#34C759` | `#30D158` | `#008932` | `#4AD968` |
| Mint | `.mint` | `#00C8B3` | `#00DAC3` | `#008575` | `#54DFCB` |
| Teal | `.teal` | `#00C3D0` | `#00D2E0` | `#008198` | `#3BDDEC` |
| Cyan | `.cyan` | `#00C0E8` | `#3CD3FE` | `#007EAE` | `#6DD9FF` |
| Blue | `.blue` | `#0088FF` | `#0091FF` | `#1E6EF4` | `#5CB8FF` |
| Indigo | `.indigo` | `#6155F5` | `#6D7CFF` | `#564ADE` | `#A7AAFF` |
| Purple | `.purple` | `#CB30E0` | `#DB34F2` | `#B02FC2` | `#EA8DFF` |
| Pink | `.pink` | `#FF2D55` | `#FF375F` | `#E7124D` | `#FF8AC4` |
| Brown | `.brown` | `#AC7F5E` | `#B78A66` | `#956D51` | `#DBA679` |

### iOS, iPadOS system gray colors

| Name | UIKit API | Default (light) | Default (dark) | Increased Contrast (light) | Increased Contrast (dark) |
|---|---|---|---|---|---|
| Gray | `systemGray` | `#8E8E93` | `#8E8E93` | `#6C6C70` | `#AEAEB2` |
| Gray (2) | `systemGray2` | `#AEAEB2` | `#636366` | `#8E8E93` | `#7C7C80` |
| Gray (3) | `systemGray3` | `#C7C7CC` | `#48484A` | `#AEAEB2` | `#545456` |
| Gray (4) | `systemGray4` | `#D1D1D6` | `#3A3A3C` | `#BCBCC0` | `#444446` |
| Gray (5) | `systemGray5` | `#E5E5EA` | `#2C2C2E` | `#D8D8DC` | `#363638` |
| Gray (6) | `systemGray6` | `#F2F2F7` | `#1C1C1E` | `#EBEBF0` | `#242426` |

Note the base `Gray`/`systemGray` swatch is one of very few cases where Apple's own light and dark
default values are identical (`#8E8E93` both); this is confirmed directly in the source alt text,
not an extraction error. "In SwiftUI, the equivalent of `systemGray` is `gray`." (HIG Color page.)

### macOS system grays — gap, marked as such

**The current HIG Color page does not publish a numbered macOS gray-swatch table.** Only a section
titled "iOS, iPadOS system gray colors" exists; macOS/AppKit's `NSColor` does not define
`systemGray2`–`systemGray6` equivalents at all — that numbered-gray concept is iOS/iPadOS-specific.
AppKit instead exposes a single adaptive `NSColor.systemGray` plus a large set of *semantic* colors
(`labelColor`, `controlBackgroundColor`, `windowBackgroundColor`, etc. — see the full AppKit table
transcribed from the Color page in the raw research fetch) whose RGB values Apple does not publish
on this page either. For the single `NSColor.systemGray` value, a secondary, well-sourced reference
(swiftuicolors.com, an independent Apple-system-colors reference site) gives **light `#8E8E93`,
dark `#989899`** — noticeably different from iOS's dark-mode `#8E8E93`. This is **not an
Apple-published number**; treat it as an approximation only. See "Confidence / gaps."

### "Vibrant" / "accessible" variants noted on the page

The HIG Color specifications table itself only exposes two axes — **Default** and **Increased
Contrast** (each in light/dark) — there is no separate "vibrant" column in the Specifications
tables. "Vibrant" is instead a *behavioral* concept applied when a color/label sits on a material
(see §5): the HIG Materials page states iOS/iPadOS "define vibrant colors for labels, fills, and
separators that are specifically designed to work with each material," and macOS materials provide
"vibrant versions of all Specifications" via `NSVisualEffectView` — i.e. vibrancy is a *rendering
mode* applied to these same base colors when placed over blur, not a fifth documented color value.

---

## 5. Typography / labels

Sources: HIG "Materials," HIG "Dark Mode" (https://developer.apple.com/design/human-interface-guidelines/dark-mode).

### The four label levels (as named by Apple)

From HIG Dark Mode: **"Use the system-provided label colors for labels. The primary, secondary,
tertiary, and quaternary label colors adapt automatically to the light and dark appearances."**

From HIG Color's iOS foreground-colors table, the UIKit APIs are: `label`, `secondaryLabel`,
`tertiaryLabel`, `quaternaryLabel` (plus `placeholderText`, `separator`, `opaqueSeparator`, `link`).
macOS/AppKit equivalents: `labelColor`, `secondaryLabelColor`, `tertiaryLabelColor`,
`quaternaryLabelColor`.

From HIG Materials (iOS/iPadOS platform section): **"The name of a level indicates the relative
amount of contrast between an element and the background: The default level has the highest
contrast, whereas quaternary (when it exists) has the lowest contrast... In general, avoid using
quaternary on top of the thin and ultraThin materials, because the contrast is too low."**

**Apple does not publish exact alpha percentages for these four levels on any current HIG or
developer-documentation page fetched for this research.** The numbers below are from
well-sourced, independently-verified secondary references (developer blog posts that read the
values directly from `UIColor`/`NSColor` at runtime); they are **not an official Apple table** and
should be treated as approximate / subject to per-OS-version drift:

**iOS `UIColor` (light/dark), base color + alpha** — source:
https://noahgilmore.com/blog/dark-mode-uicolor-compatibility

| Level | Light mode | Dark mode |
|---|---|---|
| `label` | black, 100% | white, 100% |
| `secondaryLabel` | rgb(60,60,67), 60% | rgb(235,235,245), 60% |
| `tertiaryLabel` | rgb(60,60,67), 30% | rgb(235,235,245), 30% |
| `quaternaryLabel` | rgb(60,60,67), 18% | rgb(235,235,245), 18% |

**macOS `NSColor` (light/dark), base color + alpha** — source:
https://gist.github.com/andrejilderda/8677c565cddc969e6aae7df48622d47c (values reported to be
consistent across macOS Big Sur 11.2.3 and Monterey 12.0.1; not re-verified against macOS Tahoe
for this research — see gaps)

| Level | Light mode | Dark mode |
|---|---|---|
| `labelColor` | black, 84.7% | white, 84.7% |
| `secondaryLabelColor` | black, 49.8% | white, 54.9% |
| `tertiaryLabelColor` | black, 25.9% | white, 24.7% |
| `quaternaryLabelColor` | black, 9.8% | white, 9.8% |

Note macOS labels are *never* full 100% opacity even at the primary level (84.7%) — a real,
documented-by-community difference from iOS, where `label` is opaque black/white. VS Glass should
treat these as two genuinely distinct alpha ramps per platform archetype rather than assuming iOS
values apply everywhere.

### What vibrancy does to labels on materials

From HIG Materials: **"To ensure foreground content remains legible when it displays on top of a
material, visionOS applies vibrancy to text, symbols, and fills. Vibrancy enhances the sense of
depth by pulling light and color forward from both virtual and physical surroundings."**
visionOS defines three vibrancy levels (label / secondaryLabel / tertiaryLabel — no quaternary).

From WWDC25 219 ("Meet Liquid Glass"): **"To maintain legibility, symbols and glyphs on top of
Liquid Glass... flip from light to dark and vice versa, mirroring the glass's behavior to maximize
contrast. All content placed on the Regular variant will automatically receive this treatment."**
This is the Liquid Glass-era mechanism: rather than (or in addition to) simple alpha compositing,
vibrant content on Regular glass can invert its base luminance entirely to track the material's own
light/dark state.

Mechanically (per HIG Materials, standard-materials section, applicable to the content layer under
glass): "When you use system-defined vibrant colors, you don't need to worry about colors seeming
too dark, bright, saturated, or low contrast in different contexts... use vibrant colors on top of
[materials]" regardless of which material is chosen. Vibrancy is implemented as a real-time,
content-aware color remapping (historically: a combination of increased saturation and
luminance-contrast boost relative to the sampled backdrop), not a fixed opacity — Apple's own
copy consistently describes it functionally ("maximizes legibility," "pulls light and color
forward") rather than quantitatively.

---

## 6. Motion

Sources: WWDC25 219, 356, 323 (quoted fully in §3); "Applying Liquid Glass to custom views."

**No Apple source fetched for this research publishes numeric spring/duration/damping constants
for Liquid Glass motion.** All guidance is qualitative. What is documented:

- **Interactive response verbs** (WWDC25 323, developer-level, tied to the `.glassEffect(.regular.interactive())` API): glass "reacts to user interaction by **scaling, bouncing, and shimmering**, matching the effect provided by toolbar buttons and sliders."
- **"Instant" onset, illumination feedback** (WWDC25 219): "Liquid Glass responds to interaction by instantly flexing and energizing with light... it has an inherent gel-like flexibility to it that communicates its transient and malleable nature, as it moves in tandem with your interaction." Touch feedback is described as a glow that "starts right under your fingertips" and "spreads throughout the element and onto any Liquid Glass elements nearby."
- **Morphing between UI states** (WWDC25 219 + 323): transitions are not simple cross-fades. "Liquid Glass dynamically morphs between the controls in each context... maintains the concept of having a singular floating plane." Developer mechanism: `GlassEffectContainer` + `glassEffectID(_:in:)` for matched-geometry morphs between named glass shapes; "Applying Liquid Glass to custom views" names two specific transition types — **`matchedGeometry`** (default, used when shapes being added/removed are within the container's configured spacing) and **`materialize`** (for shapes farther apart than the container spacing, or for simpler/custom transitions, paired with `withAnimation(_:_:)`).
- **Materialization instead of fading** (WWDC25 219): "Instead of fading, Liquid Glass objects materialize in and out by gradually modulating the light bending and lensing" — i.e. appearance/disappearance is modeled as the optical effect ramping up/down, not an opacity tween.
- **Focus/depth-state transitions** (WWDC25 356): "when focus shifts, like dragging a sheet upward, Liquid Glass subtly recedes, becoming more opaque and gently growing in size to signal a deeper level of engagement" — a coupled opacity+scale response to interaction state, again with no numbers given.
- **Reduced Motion accessibility behavior** (WWDC25 219): **"Reduced Motion decreases the intensity of some effects and disables any elastic properties for the material."** This confirms the interactive motion model is explicitly elastic/spring-based under the hood (hence "elastic properties" to disable), even though the spring parameters themselves are never named.
- **Container spacing controls morph threshold, not motion timing** ("Applying Liquid Glass to custom views"): "The larger the spacing value on the container, the sooner the Liquid Glass effects behind views blend together and merge the shapes during a transition" — this is a geometry/distance threshold, not a duration.

**Practical implication for VS Glass:** since Apple never publishes concrete numbers, any
spring/duration/easing values VS Glass adopts (e.g. a CSS `cubic-bezier`, transition duration, or
`transform: scale()` bounce amount) will necessarily be an *interpretation* of this qualitative
language ("instant," "gel-like," "energizing," "subtly recedes... gently growing") rather than a
verified reproduction of Apple's actual spring constants. Treat any numeric motion parameters in
the VS Glass CSS layer as original design decisions, not ports of an Apple constant.

---

## 7. Optical signature checklist

The eight properties the VS Glass CSS effects layer should be built against, each with Apple's own
language and citation.

### 1. Lensing / refraction
> "The primary way Liquid Glass visually defines itself is through something called Lensing...
> this new set of materials dynamically bends, shapes, and concentrates light in real time."
— WWDC25 219. Mechanically: "The glass material reflects and refracts lights, picking colors from
nearby content. This effect is achieved by sampling content from an area larger than itself." —
WWDC25 323. Glass cannot sample other glass — refraction is content-relative, not glass-relative,
which is why stacked glass elements must share a `GlassEffectContainer` sampling region.

### 2. Specular edge highlight
> "Light sources inside of this environment shine on the material producing highlights that
> respond to geometry just as you'd expect. On interactions... these lights move in space, causing
> light to travel around the material, defining its silhouette. And in some cases, the lighting
> responds to device motion, making it feel like Liquid Glass is aware of its position in the real
> world." — WWDC25 219. The highlight is modeled as a virtual, environment-anchored light source
> that traces the element's silhouette on interaction/device-motion, not a static top-edge gradient.

### 3. Material thickness / shadows
> "When glass flexes and morphs to larger sizes... its material characteristics change to simulate
> a thicker, more substantial material. It casts deeper, richer shadows, has more pronounced
> lensing and refraction effects, and a softer scattering of light." Shadows are also
> content-aware: "increases the opacity of its shadow when it is over text. Conversely, it lowers
> the opacity of its shadow when it is over a solid light background." — both WWDC25 219. So
> "thickness" is not a fixed property of a component — it scales with the component's *current
> size* (bigger = optically thicker), and shadow opacity scales with *what's directly behind it*.

### 4. Vibrancy
> "To maintain legibility, symbols and glyphs on top of Liquid Glass... flip from light to dark and
> vice versa, mirroring the glass's behavior to maximize contrast. All content placed on the
> Regular variant will automatically receive this treatment." — WWDC25 219. Also: "Vibrancy
> enhances the sense of depth by pulling light and color forward from both virtual and physical
> surroundings." — HIG Materials (visionOS). See §5 for the (secondary-sourced) alpha ramps this
> sits on top of.

### 5. Floating layered panes
> "Liquid Glass forms a distinct functional layer for controls and navigation elements... that
> floats above the content layer, establishing a clear visual hierarchy between functional elements
> and content." — HIG Materials. And the explicit anti-pattern: **"always avoid glass on glass.
> Stacking Liquid Glass elements on top of each other can quickly make the interface feel cluttered
> and confusing... use fills, transparency, and vibrancy for the top elements to make them feel like
> a thin overlay that is part of the material [instead]."** — WWDC25 219.

### 6. Concentric geometry
> "We use three shape types to build concentric layouts: **fixed shapes have a constant corner
> radius. Capsules use a radius that's half the height of the container. And concentric shapes
> calculate their radius by subtracting padding from the parent's.**" — WWDC25 356. Restated at the
> API level: "a button that is positioned at the bottom of a sheet should share the same corner
> center with the corners of the sheet. To build views that automatically maintain concentricity
> with their container, use the concentric rectangle shape... the shape will automatically match
> its container across different displays and window shapes." — WWDC25 323. Also: "Glass controls
> nest perfectly into the rounded corners of windows, maintaining concentricity throughout the UI."
> — WWDC25 219.

### 7. Adaptive tint
> "By default, Liquid Glass has no inherent color, and instead takes on colors from the content
> directly behind it... symbols and text on these elements follow a monochromatic color scheme,
> becoming darker when the underlying content is light, and lighter when it's dark." — HIG Color.
> When an explicit tint is applied: "Selecting a color generates a range of tones that are mapped
> to content brightness underneath the tinted element. It draws inspiration from how colored glass
> works in reality: changing its hue, brightness and saturation depending on whats behind without
> deviating too much from the intended color." — WWDC25 219.

### 8. Liquid response (motion)
> "Liquid Glass responds to interaction by instantly flexing and energizing with light... it has an
> inherent gel-like flexibility to it that communicates its transient and malleable nature, as it
> moves in tandem with your interaction." — WWDC25 219. At the API level: glass "reacts to user
> interaction by scaling, bouncing, and shimmering." — WWDC25 323. Confirmed to be spring/elastic
> under the hood, since "Reduced Motion... disables any elastic properties for the material." — WWDC25 219. No numeric spring constants are published anywhere (see §6).

---

## Confidence / gaps

**High confidence (direct Apple primary source, verbatim):**
- HIG Materials page content in full (§1) — retrieved via Apple's own DocC JSON endpoint, not a paraphrase.
- HIG Color page content and the *exact* system-color RGB values in §4's two tables — sourced from the accessibility `alt` text Apple itself embeds on each color swatch image, not OCR or a third party.
- All three WWDC25 transcripts (219, 356, 323) — retrieved as the full server-rendered transcript block from each session's own video page, not summarized by an intermediate model. Direct quotes in §3/§7 can be trusted as verbatim Apple speaker text (light cleanup of stutters/false starts only).
- "Adopting Liquid Glass," the "Liquid Glass" technology overview, and "Applying Liquid Glass to custom views" — same DocC JSON method, full page text obtained.

**Medium confidence / explicitly marked as secondary-sourced, not Apple's own numbers:**
- **Label-color alpha percentages** in §5 (iOS `UIColor` and macOS `NSColor` tables). Apple's own HIG/Dark Mode pages confirm the *existence* of four label levels and that they "adapt automatically," but never publish alpha numbers. The tables given come from two independent developer references (noahgilmore.com and a public gist) whose values agree with widely-cited community knowledge, but were **not independently re-verified against a live macOS Tahoe / iOS 26 instance** for this research — treat as approximate, and re-verify empirically (e.g. sampling real screenshots) before hard-coding into VS Glass CSS.
- **macOS `NSColor.systemGray` hex value** (§4) — one secondary source only (swiftuicolors.com), not cross-checked against a second independent source. The discrepancy noted (macOS dark `#989899` vs. iOS dark `#8E8E93`) is plausible (platforms have historically had different gray ramps) but unconfirmed by Apple.
- macOS `NSColor.systemGray2`–`systemGray6` **do not exist** as a concept — this is a structural fact from the current HIG Color page (only an "iOS, iPadOS system gray colors" section is present, no macOS equivalent), not a research gap, but flagged in case VS Glass wants a macOS-flavored numbered gray ramp — one would have to be interpolated/designed rather than sourced from Apple.

**Explicit gaps — nothing found in any source fetched:**
- **No numeric motion constants.** No spring stiffness/damping ratio, no transition duration in milliseconds, no named easing curve (e.g. no `cubic-bezier(...)` equivalent) is published by Apple for Liquid Glass anywhere in the HIG, the Technology Overview docs, or any of the three WWDC25 sessions researched. Apple's language throughout is qualitative ("instantly," "gel-like," "subtly," "gently"). §6 documents everything that *is* said; there is no further primary source to chase for exact numbers as of this research date.
- **The "35% opacity" dimming-layer figure (§1) is the only concrete numeric optical constant Apple publishes anywhere in this research.** Everything else in the optical model (shadow opacity deltas, lensing intensity change with size, highlight travel behavior) is described relatively/qualitatively, never with numbers.
- Other WWDC25 sessions that likely also touch Liquid Glass (e.g. any AppKit-specific or Catalyst-specific talks) were **not researched** — only the three sessions named in the task brief (219, 356, 323) were fetched. If more optical detail is needed later, session numbers to check next would be anything under the "Design" or "UIKit"/"AppKit" tracks of WWDC25.
- Values in §4/§5 are dated by their HIG changelog entries (system colors: June 9 2025; guidance: Sept 9 2025 for Materials, Dec 16 2025 for Color) but Apple explicitly disclaims stability ("actual color values may fluctuate from release to release") — these should be spot-checked again if VS Glass development spans a long timeline past 2026-09-10, in case Apple revises them further.

## Reference images

12–14 representative Liquid Glass screenshots/figures (official Apple HIG figures and Technology
Overview illustrations, light+dark pairs where available, covering Regular vs. Clear, vibrancy,
sidebars, tab bars, toolbars, and tvOS) were downloaded to `research/reference/`. See
`research/reference/SOURCES.md` for the full file-by-file source list and captions. **These images
are Apple's copyrighted material, kept for internal comparison only, and must not be committed to
the public repository** (the repo's current `.gitignore` does not yet exclude `research/reference/`
— that should be added before any commit that touches this folder).
