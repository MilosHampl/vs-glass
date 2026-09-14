VS Glass 1.2.3 — readability over effect, and webviews.

- **`auto` window material is real vibrancy again (`under-window`).** The Liquid Glass slab needs the OS blur off to be
  seen, and over a plain wallpaper it has nothing to refract: the window became a clear hole with unreadable code. The
  slab stays available by name (`liquid-glass`), with the trade-off spelled out in its description.
- **The Claude Code composer is glass.** Hook V7 adopts a webview sheet into every webview frame (CSSOM, so the
  webview's CSP does not apply): the composer gets the minimap slider's optic at its own proportions over a film dense
  enough to type on; your messages are the same pill as a selected tab.
- **Buttons follow the controls**: film + gradient rim at the control corner, no lens, hairline focus everywhere.
- **New levels**: `extreme` lens and aberration; `frosted` window glass style. More lens surfaces: debug hover,
  terminal find, editor overlay message, side-bar and panel scrollbars.
- **Never a hook that does not parse**: the extension compiles the hook before writing it, and `scripts/fix-hook.mjs`
  repairs or restores `main.js` from a shell if a window will not start.
- Fixed: the hook's watcher re-inserted the whole stylesheet on every unrelated file change in its folder.

After updating, quit and reopen VS Code once (the hook runs in the main process). See
[CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
