VS Glass 1.2.0 — the window itself becomes glass.

## The window slab (macOS 26)

Everything in 1.1 bent what was *inside* the window: a `backdrop-filter` can only sample its own page, never the
windows or video behind it. On macOS 26 the compositor can, so `Window Material` gains **`liquid-glass`** (and a new
`auto` default that picks it where the OS supports it, `hud` elsewhere).

A small native helper, `bin/vs-glass-helper`, keeps a real Liquid Glass window — transparent, click-through,
shadowless — directly under every VS Code window, tuned so its **body is a pixel-exact pass-through** and only the
**rim refracts and colour-splits**. Other windows, video and the desktop bend under the window's edge, live. Nothing
is screen-captured; the window server composites it, and `Lens` and `Aberration` retune it like every other rim.

Measured against a pattern behind a transparent window: body difference 0.00, the rim bent over exactly the configured
width, red and blue split by exactly the configured offset. It exits with VS Code, with any other material, and with
**VS Glass: Remove**. DESIGN.md §5.2 has the anatomy, the numbers and the limits.

## The file overview as a lens

The minimap's viewport slider is a bare plane of clear, edge-curved glass that refracts the code lines under it as it
slides — no border, no shadow, no shine, just the optic. Pair it with `"editor.minimap.showSlider": "always"`.

## One interactive ladder

Editor tabs, panel tabs, list rows, activity-bar and status-bar capsules, toolbar and icon buttons, breadcrumbs, menu
titles and buttons all use the same film and hairline at the same alphas, the same press, and the same two corners.
A control now looks the same wherever it lives in the workbench.

## Also

- `Window Material: none` — no material at all, the clearest the window can be.
- Flat text everywhere (no `text-shadow`), gradient 1 px rims in the Apple manner, and no drop shadows anywhere.
- Tabs and rows paint an inset pill concentric with their container.

## Install

Download `vs-glass-1.2.0.vsix` below, then:

```
code --install-extension vs-glass-1.2.0.vsix
```

Pick a Glass theme (**Glass Regular Dark**, **Regular Light**, **Clear** or **Opaque**), answer **Apply** to the
one-time prompt, and quit and reopen VS Code once. After that every setting applies live. macOS gets the see-through
window; other platforms get the glass CSS over a wallpaper backdrop.

Not on the Marketplace. The extension patches one file inside VS Code (`out/main.js`, backed up first) and
**VS Glass: Remove** restores it byte-exact.
