VS Glass 1.2.2 — the window is Apple's glass now.

- **`liquid-glass` shows the system's Liquid Glass as the system draws it.** 1.2.0 zeroed the material's blur and
  face tint to make the body a pixel-exact pass-through, leaving a rim refraction that on a window filling the screen
  had nothing beyond it to bend — so the window read as plain translucency. The slab now carries Apple's own Clear
  material by default. New `vsGlass.windowGlassStyle`: `apple-clear`, `apple-regular` (the heavier material) or
  `clear-plane` (the 1.2.0 behaviour). Lens and Aberration still retune the rim.
- **Never glass over the editor.** The helper checks the z-order every quarter second and hides a slab the window
  server placed above its window (native full screen does this) until the window moves or resizes.
- With Apple's frost in the body, a lower **Density** (40–70) usually looks better than the old 100.

See [CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md) for 1.2.0 and 1.2.1.

## Install

Download `vs-glass-1.2.2.vsix` below, then in VS Code: **Extensions** → the `…` menu → **Install from VSIX…**.
From a terminal on macOS, use the full path:

```
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension vs-glass-1.2.2.vsix
```

Then pick a Glass theme, answer **Apply**, and quit with ⌘Q and reopen once. Upgrading from 1.2.x needs only a window
reload; the running slab picks the new material up on its own.
