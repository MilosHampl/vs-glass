VS Glass 1.3.3 — VS Code 1.141 support: windows are see-through from the moment they open.

- VS Code 1.141 moved its main process (window options included) from `out/main.js` into `out/mainImpl.js`, so VS Glass
  showed "This VS Code build lays its window options out differently…": windows turned transparent only after opening,
  which can leave stale pixels where panels closed, and losing focus snapped before the fade. VS Glass now splices its
  window options into `mainImpl.js` on those builds — backed up first and restored byte-exact by **VS Glass: Remove**
  and by uninstalling, like main.js. Older VS Code builds are unchanged.
- That warning, where it still applies, shows once per VS Code version instead of after every settings change.

After updating, quit and reopen VS Code once. See
[CHANGELOG.md](https://github.com/MilosHampl/vs-glass/blob/main/CHANGELOG.md).
