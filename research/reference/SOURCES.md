# Reference image sources

All images in this folder were downloaded on 2026-09-10 directly from Apple's own developer
documentation (`developer.apple.com`), for **internal design comparison only** while building
VS Glass. They are Apple's copyrighted material (HIG figures / Technology Overview illustrations
and screenshots) and **must not be committed to the public repository or redistributed**. Keep
this folder out of version control (see repo `.gitignore`).

| File | Source URL | What it shows |
|---|---|---|
| `01-materials-liquid-glass-regular-over-light.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/materials-ios-liquid-glass-over-light@2x.png (embedded in [HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)) | HIG figure: the **Regular** Liquid Glass variant appearing lighter when the background content behind it is light — official caption: "A visual example of the regular variant of Liquid Glass, which appears lighter when there is a light background beneath it." |
| `02-materials-liquid-glass-regular-over-dark.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/materials-ios-liquid-glass-over-dark@2x.png (same HIG page) | HIG figure: the **Regular** variant appearing darker over a dark background — official caption: "...appears darker when there is a dark background beneath it." Pairs with file 01 to show Regular's light/dark adaptivity. |
| `03-materials-liquid-glass-clear-variant.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/materials-ios-liquid-glass-clear@2x.png (same HIG page) | HIG figure: the **Clear** Liquid Glass variant — official caption: "A visual example of the clear variant of Liquid Glass, which allows the visual detail of the background beneath it to show through." |
| `04-materials-legibility-vibrant-label.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/materials-legibility-primary-label@2x.png (same HIG page) | HIG figure: a Share button on translucent Liquid Glass using the **vibrant** label color — high contrast against the material. Pairs with file 05 to illustrate vibrancy's effect on legibility. |
| `05-materials-legibility-nonvibrant-label.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/materials-legibility-non-vibrant-label@2x.png (same HIG page) | HIG figure: the same Share button using a flat, **non-vibrant** `systemGray3` symbol color — official caption notes it is "difficult to see against the background material." Negative example. |
| `06-materials-tvos-liquid-glass-media-player.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/materials-tvos-media-player@2x.png (same HIG page) | Screenshot of the "Destination Video" sample tvOS app: Liquid Glass floating UI over a colorful, media-rich background image — real Liquid Glass over rich content, tvOS. |
| `07-hig-liquid-glass-components-illustration.png` | https://developer.apple.com/tutorials/images/com.apple.HIG/human-interface-guidelines-page-image-card@2x.png (HIG landing page card art) | Illustration of several Liquid Glass components (toggles, sliders, buttons) atop a neutral background, showing cast shadows, a colored slider track and toggle backing visible through the material — demonstrates the lensing effect. |
| `08-adoption-sidebar-background-extension-light.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/adoption-guide-extend-content-beneath-sidebar-correct@2x.png (embedded in [Adopting Liquid Glass](https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass)) | Screenshot of the Landmarks sample app (macOS Tahoe / iOS 26 era): a Liquid Glass **sidebar** with the "background extension effect" correctly applied — content appears to extend beneath the floating glass sidebar. Light appearance. |
| `09-adoption-sidebar-background-extension-dark.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/adoption-guide-extend-content-beneath-sidebar-correct~dark@2x.png (same page, dark asset variant) | Same Landmarks sidebar / background-extension-effect screenshot, **dark appearance** — pairs with file 08 for light/dark comparison. |
| `10-adoption-tabbar-liquid-glass-after-light.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/adoption-guide-tab-bar-after@2x.png (same "Adopting Liquid Glass" page) | Screenshot of an iPhone **tab bar** in the current (Liquid Glass) design, with a dedicated Search tab at the trailing end — "after" comparison shot. Light appearance. |
| `11-adoption-tabbar-liquid-glass-after-dark.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/adoption-guide-tab-bar-after~dark@2x.png (same page, dark asset variant) | Same tab bar screenshot, **dark appearance** — pairs with file 10. |
| `12-adoption-toolbar-items-grouping-correct.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/adoption-guide-toolbar-items-grouping-correct@2x.png (same "Adopting Liquid Glass" page) | Diagram of a **toolbar** with four buttons correctly split into two Liquid Glass groupings by function (Undo/Redo share a background; Markup/More share a separate background) — shows toolbar item grouping/spacing behavior. |
| `13-liquid-glass-tech-overview-abstract-light.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/liquid-glass.png (hero art on the [Liquid Glass technology overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) page) | Abstract illustration of an interface with a translucent Liquid Glass layer floating above a content layer — official caption: "An abstract representation of an interface with a translucent layer that appears above the content layer." Light asset. |
| `14-liquid-glass-tech-overview-abstract-dark.png` | https://developer.apple.com/tutorials/images/com.apple.TechnologyOverviews/liquid-glass~dark.png (same page, dark asset variant) | Same abstract Liquid Glass layering illustration, dark asset variant — pairs with file 13. |

## Notes

- All files were fetched with `curl -L -o` on 2026-09-10; no images failed to download in this batch.
- Underlying page: `developer.apple.com/tutorials/data/design/human-interface-guidelines/materials.json`
  and `.../tutorials/data/documentation/technologyoverviews/adopting-liquid-glass.json` (Apple's DocC
  JSON data endpoints) were used to locate each image's canonical filename, alt text, and caption —
  see `research/apple-liquid-glass.md` for how these were retrieved.
- Image asset base path discovered: `https://developer.apple.com/tutorials/images/<bundle>/<filename>`
  (the more commonly assumed `https://developer.apple.com/images/<bundle>/<filename>` 404s).
- These are **reference-only** assets for comparing our CSS effects against Apple's real renders —
  not for shipping, marketing, or redistribution.
