# Installing Layer 2 (the glass effects)

## 1. What Layer 2 is

VS Glass ships in two layers. **Layer 1** is the color theme (`Glass Regular Dark`, `Glass Regular Light`,
`Glass Clear`, `Glass Opaque`) — installed the normal way, from the Marketplace or a `.vsix`, no extra steps.
**Layer 2** is `glass/glass.css`: injected CSS that produces the refraction (lensing at the edges of
widgets), specular highlights, material-thickness shadows, and a restrained press response (§5 of
`DESIGN.md` — nothing moves on hover, by the owner's explicit direction). The theme alone gives you the
right *colors*; without Layer 2 those colors sit on flat rectangles — no bending, no shine, no depth. If
all you want is the palette, stop after installing the theme. If you want the glass to actually look like
glass, keep reading.

**`glass.css` is transparent-first.** Loaded alone, it assumes the window itself is see-through (Vibrancy
Continued) and paints only a thin smoky film plus the optional tint; the window is one rounded glass slab.
Five optional addon families, all loaded after `glass.css`: `glass/glass-wallpaper.css` (a neutral smoke
backdrop, no hue, for a window that is NOT transparent), `glass/tints/glass-tint-<id>.css` (a thin
coloured film — eight choices: `graphite`, `blue`, `indigo`, `violet`, `teal`, `mint`, `rose`, `amber`),
`glass/density/glass-density-<percent>.css` (turns density itself into a knob — six presets: `0`, `25`,
`50`, `75`, `150`, `200`; `100` is the tuned default and needs no file), and `glass/lens/glass-lens-<id>.css`
plus `glass/aberration/glass-aberration-<id>.css` (retune the lens filters themselves — see "Lens and
aberration presets" below). Default material is colourless and thin; every addon is opt-in. §3 and §4
below cover exactly where each addon goes for each route.

### Lens and aberration presets

Two more generated addon families, both real: they re-emit the same SVG lens filters `glass.css` already
uses, just with a multiplier applied.

- `glass/lens/glass-lens-soft.css` and `-strong.css` scale rim bend strength ×0.7 (soft, a gentler bend)
  or ×1.4 (strong, a heavier bend). Displacement and rim width scale together, so the slope, and the
  folding limit it stays under (`DESIGN.md` §4.1), are unchanged either way.
- `glass/aberration/glass-aberration-off.css`, `-subtle.css` (×0.5, half the default fringing) and
  `-strong.css` (×2.5, heavy red-to-blue fringing, like thick crystal) scale the chromatic-aberration
  offset.

Load either (or both) after `glass.css`, in any order relative to the other addons above, as long as they
all come after `glass.css` itself. See §2/§3/§4 below for exactly where to add the path for each route.

### Density

`glass/density/glass-density-<percent>.css` turns density itself into a knob for the **base** planes —
the window film, editor content, and chrome cards and strips (plus the dim behind chrome text) — all one
base value multiplied by a single CSS variable, `--vsg-density` (default `1`). Six presets exist:

| File | `--vsg-density` | Look |
|---|---|---|
| `glass-density-0.css` | `0` | fully clear — a plane of glass with only its rims, bevels, lensing and text |
| `glass-density-25.css` | `0.25` | a breath of smoke |
| `glass-density-50.css` | `0.5` | half the default film |
| `glass-density-75.css` | `0.75` | a little thinner than the default |
| *(no file — this is the default)* | `1` | the tuned default — now itself almost clear, a faint smoky film |
| `glass-density-150.css` | `1.5` | denser, for bright desktops |
| `glass-density-200.css` | `2` | opaque-ish, the most legible |

**Floating widgets are exempt on purpose.** The command palette, hovers, suggest, notifications, dialogs
and dropdown lists keep a fixed, readable body of their own and don't scale with `--vsg-density` at all —
a widget with no body left over an already-clear base window has nothing to frost against and ghosts
instead of reading as glass. Their density has its own knob, `--vsg-widget-density` (default `1`,
independent of the presets above), with a floor under it so they never go fully transparent either. There
is no preset file for it; set `--vsg-widget-density: <value>` directly on `.monaco-workbench` if you want
to tune it (see the note on copying a preset, below).

Load a preset **after** `glass.css` (and after `glass-wallpaper.css` and/or a tint addon, if you're using
those — order between the addons themselves doesn't matter, only that all of them come after `glass.css`).
It works in both transparent-window mode and wallpaper mode: wallpaper mode only swaps the *base* alpha
each plane starts from, so `--vsg-density` still multiplies on top of it exactly the same way. Any value
in between the presets (or beyond `200`) works too — copy one of the files above and edit the number; it's
the one line the whole file contains. See §2/§3/§4 below for exactly where to add the path for each route.

**Prerequisite:** one of the four VS Glass themes must be the active color theme. Every Layer 2 selector is
scoped to VS Glass's own theme classes, so the effects switch off automatically the moment you pick a
different theme — nothing to toggle by hand. **`Glass Opaque` is the one exception: it never gets Layer 2
effects, by design.** It's the flat, distraction-free variant of the palette, meant for screen-sharing,
recording, or anyone who just wants the colors without the motion.

There are three independent ways to get Layer 2's CSS into VS Code. VS Code has no supported extension
point for this (see `research/vscode-injection.md` Part A5), so every route works by **patching a file
inside VS Code's own installation** — and every one of them trips VS Code's own file-integrity check, which
shows a harmless but attention-grabbing **"Your Code installation appears to be corrupt"** notice the first
time. That is expected, not a sign anything is actually broken; each route below says exactly how to make
it go away. Pick one route — they can coexist, but there's no reason to run more than one at a time:

- **Route C** (Vibrancy Continued) — the intended setup: the only route that makes the *whole window*
  genuinely see-through, using native OS blur. `glass.css` alone is built for this route.
- **Route B** (`scripts/inject.sh`) — the lowest-risk route for day-to-day use: no extension, no CSP
  change, and it fixes VS Code's own corrupt-install checksum for you.
- **Route A** (Custom CSS and JS Loader) — best if you're actively editing `glass.css` and want the
  fastest edit-reload-look loop.

---

## 2. Route C — Vibrancy Continued (the intended setup)

**Extension:** [`illixion.vscode-vibrancy-continued`](https://marketplace.visualstudio.com/items?itemName=illixion.vscode-vibrancy-continued).
This is the setup Layer 2 is designed around: `glass.css` alone already assumes the window itself is
see-through, and Vibrancy is what actually makes it see-through, with the OS blurring your desktop behind
it — the native macOS/Windows vibrancy material, not something CSS alone can produce.

**Trade-off, stated up front:** `backdrop-filter` in CSS can only refract what the *page itself* has
painted behind an element — it has no access to the desktop or other windows behind VS Code. Once the
window is genuinely transparent, most of what's behind any given pane is the desktop, which CSS cannot see
or bend. So under Vibrancy:

- The native OS blur (Vibrancy's job) makes the *whole window* translucent, uniformly, and — because it's
  blurring your real desktop picture — supplies whatever adaptive tint that picture happens to carry.
- Layer 2's lensing/refraction (CSS's job) still shows, but **only where glass overlaps something VS Code
  itself painted** — a hover widget sitting over code, sticky scroll over the lines beneath it, the seam
  between two floating cards, a capsule button. It does not, and cannot, bend the desktop behind the window.

If your window can't be made transparent (no Vibrancy available, or a platform it doesn't support well),
load the `glass/glass-wallpaper.css` addon after `glass.css` instead (Route B or A below) — it paints a
neutral smoke backdrop so every rim still has something to refract. Either way, if you want a fixed
coloured film over the glass, add one of the eight `glass/tints/glass-tint-<id>.css` addons after
`glass.css` (and after `glass-wallpaper.css`, if you're using it). If the default is too thin over a
bright desktop, add a `glass/density/glass-density-<percent>.css` preset (§1) after that.

**Settings:**

```json
{
  "vscode_vibrancy.theme": "Custom theme (use imports)",
  "vscode_vibrancy.imports": [
    "/ABSOLUTE/PATH/vs-glass/glass/glass.css"
  ],
  "vscode_vibrancy.type": "under-window",
  "window.titleBarStyle": "custom",
  "terminal.integrated.gpuAcceleration": "off"
}
```

Add a tint, density, lens and/or aberration addon path after `glass.css` in `imports` if you want them,
e.g. `/ABSOLUTE/PATH/vs-glass/glass/tints/glass-tint-indigo.css`,
`/ABSOLUTE/PATH/vs-glass/glass/density/glass-density-150.css`,
`/ABSOLUTE/PATH/vs-glass/glass/lens/glass-lens-strong.css`, and/or
`/ABSOLUTE/PATH/vs-glass/glass/aberration/glass-aberration-subtle.css`.

Notes on each setting:

- **`vscode_vibrancy.imports` takes plain file paths, not `file://` URLs** — this is the opposite
  convention from Route A's `vscode_custom_css.imports`, and mixing them up is the single most common
  mistake here.
- **`vscode_vibrancy.theme` must be `"Custom theme (use imports)"`** — this tells Vibrancy to skip its own
  bundled themes and rely entirely on your `imports`.
- **`vscode_vibrancy.type`** — the native material. On macOS, `"under-window"` or `"hud"` both work well
  with Layer 2's design; on Windows, prefer `"mica"` (Windows 11, low GPU/battery cost) or `"acrylic"` (a
  true continuous blur of whatever's behind the window, more GPU cost). On Linux, Vibrancy gives
  transparency only — blur depends on your compositor (KWin, Hyprland, Picom).
- **`terminal.integrated.gpuAcceleration: "off"`** is Vibrancy's own recommendation — without it, the
  integrated terminal's GPU-accelerated renderer can paint over the vibrancy material incorrectly.

**Install:**

1. Install `illixion.vscode-vibrancy-continued`.
2. Add the settings above (with your real absolute paths).
3. Run **`Reload Vibrancy`** from the Command Palette.
4. **Fully restart VS Code** — Vibrancy patches the Electron main process (`out/main.js`), which is only
   read at app launch. A window reload is not enough; you must quit and reopen.

**What to expect:** the same corrupt-installation notice as every other route (click the gear → **Don't
Show Again**, or install `RimuruChan.vscode-fix-checksums-next`). Vibrancy's own README documents this
plainly and is a good source of macOS-specific troubleshooting (App Translocation/`EROFS` errors, full
screen losing vibrancy, etc.) beyond what's covered here.

**Uninstall:** run **`Disable Vibrancy`** from the Command Palette (or uninstall the extension and restart —
both auto-remove the patch), then remove the `vscode_vibrancy.*` settings above.

---

## 3. Route B — `scripts/inject.sh`

**What it is:** a bash script in this repo, macOS-first (Linux paths supported, untested by us on Linux).
No extension required. It appends `glass.css` directly to VS Code's own `workbench.desktop.main.css` —
the same stylesheet the workbench already loads — so, unlike Routes A and C, **it needs no CSP or
trusted-types workaround at all**: `style-src 'self' 'unsafe-inline'` already permits it. This is the
smallest, most auditable change of the three routes (see `research/vscode-injection.md` Part A4 for the
full reasoning).

**Risk, stated up front:** it directly edits two files inside your VS Code.app bundle
(`workbench.desktop.main.css` and `product.json`). It keeps a byte-exact backup of both before it ever
writes to them, and `uninstall` restores from that backup — but it is still a script modifying an app
bundle you didn't build, and it needs to be re-run after every VS Code update or the patch silently
disappears (see §7).

**What it touches:**

- `.../Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css` — `glass.css` (and, with
  `--wallpaper`, `glass-wallpaper.css` too; with `--tint NAME`, `glass/tints/glass-tint-NAME.css`; with
  `--density PERCENT`, `glass/density/glass-density-PERCENT.css`; with `--lens L`,
  `glass/lens/glass-lens-L.css`; and with `--aberration A`, `glass/aberration/glass-aberration-A.css`) is
  appended inside a `/* VS-GLASS-START */ … /* VS-GLASS-END */` marker block, with a header recording the
  VS Glass and VS Code versions it was installed against.
- `.../Contents/Resources/app/product.json` — the `checksums["vs/workbench/workbench.desktop.main.css"]`
  entry is recomputed and rewritten to match the patched file, so VS Code's own integrity check passes and
  **the corrupt-installation notice should not appear at all** with this route.

**Install:**

```sh
cd vs-glass
bash scripts/inject.sh install                          # transparent-window mode (pairs with Route C / Vibrancy)
bash scripts/inject.sh install --wallpaper               # wallpaper mode, for a window that isn't transparent
bash scripts/inject.sh install --wallpaper --tint indigo # wallpaper mode + a tint addon
bash scripts/inject.sh install --tint graphite           # transparent-window mode + a tint addon
bash scripts/inject.sh install --density 150             # either mode + a denser preset, for a bright desktop
bash scripts/inject.sh install --lens soft               # either mode + a gentler rim bend
bash scripts/inject.sh install --aberration strong       # either mode + heavier colour fringing
```

`--wallpaper` appends `glass/glass-wallpaper.css` after `glass.css`. `--tint NAME` appends
`glass/tints/glass-tint-NAME.css` (`graphite`, `blue`, `indigo`, `violet`, `teal`, `mint`, `rose`, `amber`).
`--density PERCENT` appends `glass/density/glass-density-PERCENT.css` (`0`, `25`, `50`, `75`, `150`, `200`;
`100` is the default and needs no flag). `--lens soft|strong` appends `glass/lens/glass-lens-L.css`.
`--aberration off|subtle|strong` appends `glass/aberration/glass-aberration-A.css`. All five flags combine
freely, appended in that order after `glass.css`. `--transparent` is still accepted for old install
commands but is now the default behaviour and the flag is ignored, with a warning — use `--wallpaper`
instead if you want the opaque-window addon.

Then **quit VS Code fully (⌘Q, not just close the window)** and reopen it.

**Check it:**

```sh
bash scripts/inject.sh status
```

Reports whether the patch is present, the VS Glass/VS Code versions it was installed against vs. what's
installed now (so drift after a VS Code update is visible at a glance), whether backups exist, and whether
the CSS checksum in `product.json` matches the file on disk.

**Uninstall:**

```sh
bash scripts/inject.sh uninstall
```

Restores both files byte-exact from the backups made on install, then deletes the backups.

**Notes:**

- Safe to run `install` repeatedly (including switching between the default transparent-window mode,
  `--wallpaper`, and different `--tint`/`--density`/`--lens`/`--aberration` values) — it strips any
  previous VS-GLASS block before appending a fresh one every time.
- It never calls `sudo` itself. If your VS Code install directory isn't writable (a root-owned or
  MDM-managed install), it prints the exact `chown`/`sudo` command to run.
- By default it looks in `/Applications/Visual Studio Code.app`, then
  `~/Applications/Visual Studio Code.app`, then `/Applications/Visual Studio Code - Insiders.app` (then, on
  Linux, `/usr/share/code/resources/app`). Override with `VSCODE_APP_PATH=/path/to/Visual\ Studio\ Code.app`.
  Run `bash scripts/inject.sh --help` for the full reference.

---

## 4. Route A — Custom CSS and JS Loader

**Extension:** [`be5invis.vscode-custom-css`](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css)
(the most commonly installed way to do this — 1.19M+ installs).

**Risk, stated up front:** while enabled, this extension deletes the workbench's entire Content-Security-Policy
meta tag — not narrows it, removes it — for the lifetime of the window. That's how it gets its injected
`<style>`/`<script>` tags to run without a trusted-types policy. It's a real, if narrow (main renderer
window only, not webviews or the extension host), reduction in defense-in-depth for as long as the patch is
active. This is a legitimate, actively maintained tool and the trade-off is a reasonable one to accept
deliberately — just don't accept it accidentally.

**Install:**

1. Install `be5invis.vscode-custom-css` from the Marketplace.
2. Add to `settings.json` (use an absolute path, and note the `file://` prefix — this extension wants a
   URL, not a plain path). Custom CSS and JS Loader does not make the window transparent — your window
   stays opaque on this route — so add `glass-wallpaper.css` **second**, after `glass.css`:

   ```json
   "vscode_custom_css.imports": [
     "file:///ABSOLUTE/PATH/vs-glass/glass/glass.css",
     "file:///ABSOLUTE/PATH/vs-glass/glass/glass-wallpaper.css"
   ]
   ```

   For example, with this repo cloned to `/Users/you/Repos/vs-glass`:

   ```json
   "vscode_custom_css.imports": [
     "file:///Users/you/Repos/vs-glass/glass/glass.css",
     "file:///Users/you/Repos/vs-glass/glass/glass-wallpaper.css"
   ]
   ```

   Add a tint, density, lens and/or aberration addon path last if you want them, e.g.
   `"file:///Users/you/Repos/vs-glass/glass/tints/glass-tint-indigo.css"`,
   `"file:///Users/you/Repos/vs-glass/glass/density/glass-density-150.css"`,
   `"file:///Users/you/Repos/vs-glass/glass/lens/glass-lens-strong.css"`, and/or
   `"file:///Users/you/Repos/vs-glass/glass/aberration/glass-aberration-subtle.css"`.

3. Run **`Enable Custom CSS and JS`** from the Command Palette.
4. Restart VS Code (a full quit, not just a reload — see the note below).

**What to expect:**

- **The corrupt-installation notice will appear.** Click the gear icon on the notification and choose
  **Don't Show Again** — it's cosmetic, caused by the same file patch that makes the effects work. If your
  VS Code build doesn't offer that option, install
  [`RimuruChan.vscode-fix-checksums-next`](https://marketplace.visualstudio.com/items?itemName=RimuruChan.vscode-fix-checksums-next)
  ("Fix VSCode Checksums Next") and run its Apply command.
- **It re-patches on every `Reload Custom CSS and JS`.** If you edit `glass.css` yourself, re-run that
  command (not a full restart) to pick up the change — this is the fast edit-reload-look loop this route is
  good for.
- **It must be re-enabled after every VS Code update.** VS Code's updater overwrites the patched
  `workbench.html`; the extension doesn't detect this automatically. Re-run `Enable Custom CSS and JS`.
- **It must be re-enabled after any settings change**, including editing the `imports` array itself.

**Uninstall:** run **`Disable Custom CSS and JS`** from the Command Palette, then remove the
`vscode_custom_css.imports` setting. Uninstalling the extension without running `Disable` first does *not*
revert the patch on its own.

---

## 5. Recommended companion settings

Layer 2 is designed around VS Code's floating-card "Modern UI" layout and a handful of motion/rendering
settings. None of these are required — the effects degrade gracefully without them — but they're what the
screenshots in this repo were taken with:

```json
{
  "workbench.experimental.modernUI": true,
  "window.titleBarStyle": "custom",
  "editor.fontFamily": "'SF Mono', 'JetBrains Mono', Menlo, monospace",
  "editor.fontLigatures": true,
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.smoothScrolling": true,
  "workbench.list.smoothScrolling": true,
  "editor.minimap.renderCharacters": false,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active"
}
```

- **`workbench.experimental.modernUI`** turns the sidebar/panel/auxiliary bar into floating, rounded cards
  with gaps between them — Layer 2's elevation shadows, outer glow, and concentric corner radii are built
  for this layout specifically. Without it, VS Code's classic flush layout still gets Layer 2's colors and
  most of its effects, just without the "floating panes" look.
- **`editor.fontFamily`** — `SF Mono` is Apple's system monospace font and is **not bundled with VS Glass
  or VS Code**; it's only available if you're on macOS with Xcode/developer tools installed, or you've
  installed it separately. `JetBrains Mono` is the first cross-platform fallback in the list.
- The rest are standard VS Code settings that make hover/scroll/caret motion feel continuous rather than
  stepped, which complements Layer 2's own transition timing.

---

## 6. Troubleshooting

**Nothing changed after installing.**
- Is one of the four VS Glass themes actually the active color theme? (`Glass Opaque` never shows effects
  — that's by design, not a bug; pick one of the other three to confirm Layer 2 is working at all.)
- Did you **fully quit** VS Code (⌘Q) after installing, not just reload the window or close and reopen a
  window? Routes B and C in particular only take effect after a full relaunch.
- Is the path in your settings absolute, and does it actually point at `glass.css` inside this repo?
  A relative path or a typo'd path fails silently — no error, just no effect.

**The window doesn't look transparent, just a plain colour.**
`glass.css` alone assumes Vibrancy (or an equivalent OS-level transparency tool) is making the window
see-through. If you're not running Route C, the window stays opaque and `glass.css` alone shows the
Electron window's own background colour behind the glass — add the `glass/glass-wallpaper.css` addon
(Routes A/B) for a neutral smoke backdrop instead.

**Text is hard to read over a bright desktop (Route C).** A see-through window over a bright picture can
wash out low-contrast UI. Load a `glass/density/glass-density-150.css` or `-200.css` preset after
`glass.css` (Density above) to thicken every base plane at once, load the `graphite` tint addon (a denser
smoky film — see §1) after `glass.css`, or switch to the `glass/glass-wallpaper.css` addon for an opaque,
designed backdrop instead. All three combine. (Floating widgets — the command palette, hovers, suggest,
notifications — already keep a fixed, readable body on their own, by design; density only affects the
base window around them.) Layer 1's own colours are unchanged and already pass the contrast audit on
their own; this is about the material in front of them, not the theme.

**Text looks blurry.**
This should never happen — Layer 2 deliberately never applies a filter to editor text (code, line numbers,
and terminal rows get a soft legibility shadow instead, since they now sit on a see-through plane). If you
see blurry text anywhere, please report it as a bug; it's not an intended trade-off of any route.

**Context (right-click) menus don't look like glass.** This is expected, not a bug. On macOS, VS Code
shows native OS context menus by default, with zero DOM presence CSS could ever reach; with
`window.menuStyle: "custom"` it renders its own menus instead, but inside an isolated shadow root that
injected CSS still cannot penetrate. Either way, context menus always show the theme's plain `menu.*`
colours, never a lens or a glass rim. Dropdown lists, the action widget, and every other overlay are
unaffected and do get the full Layer 2 treatment.

**Performance / it feels slow.**
Check macOS **System Settings → Accessibility → Display → Reduce Transparency**. Layer 2 respects
`prefers-reduced-transparency` and switches every `backdrop-filter` off automatically when it's on — this
is the fastest way to confirm whether the effects layer is the cause of any slowdown, and a legitimate way
to keep the theme's colors without the compositing cost. Separately, `prefers-reduced-motion` (macOS
Accessibility → Display → Reduce Motion) disables the remaining press/pop-in/focus-glow response,
independent of transparency.

**I just want it off, right now, without touching settings.**
Open DevTools (`Help → Toggle Developer Tools`) and add the class `vs-glass-off` to `.monaco-workbench` in
the console:

```js
document.querySelector('.monaco-workbench').classList.add('vs-glass-off')
```

This is a live, in-session toggle (lost on reload) — useful for isolating whether Layer 2 is responsible
for something you're seeing. Switching to a different theme (including `Glass Opaque`) is the persistent
equivalent.

---

## 7. Updating after a VS Code upgrade

VS Code's updater replaces the exact files every route patches. **All three routes need to be re-applied
after every VS Code update** — this is not a one-time setup step, it's ongoing maintenance:

- **Route C:** re-run `Reload Vibrancy`, then fully restart VS Code.
- **Route B:** re-run `bash scripts/inject.sh install` (add `--wallpaper`/`--tint NAME` again if you were
  using them). Run `bash scripts/inject.sh status` first if you want to confirm drift before re-installing
  — it will show the VS Code version the patch was installed against vs. what's running now.
- **Route A:** re-run `Enable Custom CSS and JS`.

## Full uninstall

To remove Layer 2 entirely:

- **Route C:** `Disable Vibrancy`, then remove the `vscode_vibrancy.*` settings from `settings.json`.
- **Route B:** `bash scripts/inject.sh uninstall`.
- **Route A:** `Disable Custom CSS and JS`, then remove `vscode_custom_css.imports` from `settings.json`.

To remove VS Glass entirely (theme included):

```sh
code --uninstall-extension MilosHampl.vs-glass
```

(and, if installed, `illixion.vscode-vibrancy-continued` and/or `be5invis.vscode-custom-css`, if you don't
use them for anything else).
