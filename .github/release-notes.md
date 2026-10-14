VS Glass 1.3.0 — the glass that was broken now works, and the work planes have a body.

The first release since 1.2.2, so it carries 1.2.3 as well (webview glass for the Claude Code composer, `extreme`
lens and aberration, the `frosted` window glass style, a hook that refuses to be written unless it parses).

- **Dense work planes in a clear frame.** The editor, side bars, panel and activity bar carry a real body, and
  **Density** moves only them; the title bar, status bar and the gaps between the panes stay near-clear. If you had
  lowered Density to see more of the old, almost empty planes, raise it again.
- **Every lens is drawn in CSS pixels**, so a rim is the same width on a tooltip and on the palette. The old maps were
  stretched over each surface, and Chromium bends both axes by the surface's width: wide, short surfaces (the Claude
  Code composer, toasts, the find bar) were bent several times too hard and showed the text behind them twice, split
  into colours. Tooltips and short bars get narrow rims of their own.
- **Widgets hide what is behind them.** Over a see-through window the sharp text under every menu and hover showed
  through the frost; a base inside the filter now hides it while the frost and the bend stay visible.
- **Lens + Aberration now combine** (before, the second setting silently replaced the first).
- **The Liquid Glass window slab works.** With any aberration but `off` it drew nothing at all; the slab is now
  Apple's material with the rim retuned by Lens.
- **Extension icons in the activity bar** (Claude Code and others) were invisible until hovered — fixed. Inputs and
  buttons lose a bright diagonal wash, the minimap slider and scrollbars lose a dark slab, tooltips lose their dark
  pointer.
- **Hook V8**: running `code <path>` from a terminal no longer makes VS Code ask to be restarted on every change or
  withhold the webview glass; the hook does nothing at all when nothing changed. Remove/uninstall after a VS Code
  update can no longer put an old `main.js` back.
- Smaller: the sheet inserted into every window is 206 KB (was 275 KB).

After updating, quit and reopen VS Code once (the hook runs in the main process). See
[CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
