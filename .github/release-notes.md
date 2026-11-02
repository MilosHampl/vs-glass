VS Glass 1.4.0 — frosted glass that keeps up.

- **Faster, everywhere.** Floating widgets are frosted glass (a blur over a base), not a refracting rim over a frost;
  Settings and other modal editors carry no backdrop filter at all (it re-ran over the whole window on every scroll
  frame); the window and pane rings paint under the content instead of as composited mask layers above every list.
- **The Claude Code composer is clear, darker glass**: the conversation stays sharp behind it and bends and fringes at
  its rim. Lens and Aberration now tune the composer and the minimap slider only.
- **Removed:** the Liquid Glass window slab (`liquid-glass` material, Window Glass Style, the helper process — a
  leftover value falls back to `auto`) and the focus fade (an unfocused window takes macOS's own inactive look again).

After updating, quit and reopen VS Code once. See
[CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
