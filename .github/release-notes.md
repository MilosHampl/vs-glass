VS Glass 1.4.1 — unfocused windows stay covered after the update.

- **Fixed:** after updating from 1.3.x, unfocused windows turned fully see-through (the bare desktop, no blur) until VS
  Code was restarted a second time. The first launch after an update still runs the 1.3 window hook, which removes an
  unfocused window's blur; the sheet now covers such a window at once, the way macOS's own inactive look does, until the
  next quit and reopen loads the current hook.

See [CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
