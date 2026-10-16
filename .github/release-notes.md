VS Glass 1.3.2 — the focus fade now follows live setting changes, not only focus.

- Switching an unfocused window to the `none` material or Liquid Glass drops its opaque veil at once; choosing a
  vibrancy material in an unfocused window fades it and switches its live blur off, as losing focus does; a window
  whose blur was parked gets its material back whenever one is chosen again.
- A window opened with Window Transparency off no longer snaps to the flat inactive fill once glass is switched on live.

After updating, quit and reopen VS Code once (hook V10 runs in the main process). The 1.3.1 notes — the focus fade and
Claude Code's tool rows — still apply. See [CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
