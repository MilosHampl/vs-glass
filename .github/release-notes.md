VS Glass 1.3.1 — a window that loses focus fades, and Claude Code's tool output is back.

- **Focus fades instead of snapping.** macOS flips a window's vibrancy to its flat inactive fill the instant the window
  loses focus. VS Glass now keeps the material active and fades an opaque ground in behind the window's content over
  1.4 s (and out again on focus); once the fade is done that window's live blur is switched off, so a stack of
  unfocused windows costs the window server less than before, not more.
- **Claude Code's tool calls are readable again.** Their IN and OUT rows are clipped with a fade drawn in the
  background colour, which the glass makes clear — so the rows vanished. Fixed in the webview sheet; applies live.

After updating, quit and reopen VS Code once (hook V9 runs in the main process). See
[CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
