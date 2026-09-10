# VS Glass 1.1.1

Glass optics for VS Code: a see-through window, refracting edges, specular rims and near-clear translucent planes — standalone, live-tunable. Unofficial; not affiliated with Apple.

## What's new

**One extension does everything.** VS Glass makes the window itself see-through and applies the glass CSS with no other extension: it adds one marker-delimited, backed-up hook to VS Code's main-process bootstrap (`out/main.js`, the bootstrap file VS Code does not checksum). The hook sets a transparent window background plus a macOS vibrancy material, inserts the glass CSS into every window with Electron's `insertCSS`, and watches `<user-data>/vs-glass/` so **every setting applies live** — change Density, Tint, Material, Lens or Aberration in Settings and the window changes as you type. One quit-and-reopen after the first Apply; never again. `VS Glass: Remove` restores `main.js` byte-exact.

**Clear glass, not frosted chrome.** The planes went from ~20 % to ~7 % (editor) and 6 % (side bars, panel, strips), the window film to 5 %; the OS material supplies the frost. Every painted gradient is gone — no sheens, no bevel bands, no inner shading, no drop shadows under base cards. Edges are a hairline of light where the curved rim catches the room. Lensing and chromatic aberration (real SVG displacement of what sits behind) stay on every inside element: palette, menus, hovers, suggest, notifications, dialogs, modal editors, buttons, pills. Base panes carry no filter over the see-through window (nothing in-page behind them; a filter there only re-samples stale pixels), and windows are created transparent rather than made transparent later, so closed panels no longer ghost through the editor.

**Settings** (⌘, → "VS Glass"): Effects · Window Transparency · Window Material (19 macOS materials, live) · Density 0–200 (0 = absolutely clear, 200 = opaque) · Widget Density · Tint (8 films) · Lens · Aberration · Wallpaper · Auto Apply. Commands: Apply, Remove, Status, Open Settings.

**Webviews match.** Theme-scoped `[Glass …]` colour blocks are added to `workbench.colorCustomizations` while the effects are on, so Claude Code, Markdown preview and other webviews — which paint from theme colours no CSS can reach — carry the same near-clear alphas. Removed with Remove.

## 1.1.1

One material for every control, from a design review over the regenerated screenshots: list selection, focus and quick-input rows are an accent film with a ring instead of a solid blue bar; inputs, dropdowns and checkboxes are light films with a hairline; badges are accent pills; the focus ring is a soft accent; scrollbar sliders are white films; diff decorations are thin films with a 2 px edge accent; minimap marks are toned down; the active editor tab and the active panel tab share one light film. The editor card lost the ring that doubled the side bar's edge at the seam; a wider text halo keeps code, tabs and labels legible over bright desktops; widgets carry a 78 % body; mint and amber tints fixed.

## Assets
`vs-glass-1.1.1.vsix` (theme + extension), and the plain CSS for people who inject by other means: `glass.css`, `glass-wallpaper.css`, `tints/*.css` (8), `density/*.css` (6), `lens/*.css` (2), `aberration/*.css` (3), `glass-filters.svg`.

## Install

```sh
code --install-extension vs-glass-1.1.1.vsix
```
Pick **Glass Regular Dark** (⌘K ⌘T), answer **Apply** to the one-time prompt, quit and reopen once. Recommended companion setting: `"workbench.experimental.modernUI": true`.

## Known limitations
- The hook lives in a VS Code core file (every window-transparency extension has to do this). VS Code updates overwrite it; VS Glass notices and offers to re-apply.
- macOS only for the see-through window (Electron vibrancy). Elsewhere the wallpaper addon paints a neutral smoke backdrop instead.
- The OS material always blurs and tints the desktop; a perfectly clear, unblurred window is not reachable from a hook (VS Code creates its windows opaque, and only a vibrancy material makes them see-through afterwards). `hud` lets the most desktop through; the material list is live, so try them.
- Refracting what is behind the window (desktop, another window, a video) is impossible from CSS: the renderer never receives those pixels. Lensing bends in-page content only — widgets over code, pills, card rims.
- Context menus: native on macOS by default, and in an isolated shadow root with `window.menuStyle: "custom"`; they keep the theme's plain colours.
- Not published to the Marketplace.

Full details: `README.md`, `DESIGN.md`, `glass/install.md`, `CHANGELOG.md`.
