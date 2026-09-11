VS Glass 1.2.1 — installing it is the whole point of this one.

- **Install from VSIX is the documented path now.** On macOS `code` is often not on `PATH` at all, and a `code`
  shell alias that wraps `open -b com.microsoft.VSCode` swallows `--install-extension` without a word: it opens a
  window and installs nothing. The README leads with **Extensions → `…` → Install from VSIX…**, gives the absolute
  CLI path, and has a short "Nothing happened?" section.
- **A first-run nudge.** Installed but no Glass theme picked looked exactly like a failed install. VS Glass now says
  so once and offers the theme picker.
- **Conflicting patchers are caught before the patch.** If Vibrancy Continued is patched into your VS Code, VS Glass
  refuses and tells you to disable it first, instead of patching on top and explaining afterwards.
- **A permission failure now carries the exact `chown` command.**

Everything from 1.2.0 is here too: the macOS 26 window slab, the minimap lens, and one interactive ladder for every
control. See [CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).

## Install

Download `vs-glass-1.2.1.vsix` below, then in VS Code: **Extensions** → the `…` menu → **Install from VSIX…**.
From a terminal on macOS, use the full path:

```
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension vs-glass-1.2.1.vsix
```

Then pick a Glass theme, answer **Apply**, and quit with ⌘Q and reopen once.
