# Installing Layer 2 (the glass effects)

## 1. What Layer 2 is

VS Glass ships in two layers. **Layer 1** is the color theme (`Glass Regular Dark`, `Glass Regular Light`,
`Glass Clear`, `Glass Opaque`) — installed the normal way, from the Marketplace or a `.vsix`, no extra steps.
**Layer 2** is `glass/glass.css`: injected CSS that produces the refraction (lensing at the edges of
widgets), specular highlights, material-thickness shadows, and liquid hover/press motion. The theme alone
gives you the right *colors*; without Layer 2 those colors sit on flat rectangles — no bending, no shine,
no depth. If all you want is the palette, stop after installing the theme. If you want the glass to actually
look like glass, keep reading.

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

- **Route A** (Custom CSS and JS Loader) — best if you're actively editing `glass.css` and want the
  fastest edit-reload-look loop.
- **Route B** (`scripts/inject.sh`) — the lowest-risk route for day-to-day use: no extension, no CSP
  change, and it fixes VS Code's own corrupt-install checksum for you.
- **Route C** (Vibrancy Continued) — the only route that makes the *whole window* see-through, using
  native OS blur. Read its trade-off section before choosing it.

---

## 2. Route A — Custom CSS and JS Loader

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
   URL, not a plain path):

   ```json
   "vscode_custom_css.imports": [
     "file:///ABSOLUTE/PATH/vs-glass/glass/glass.css"
   ]
   ```

   For example, with this repo cloned to `/Users/you/Repos/vs-glass`:

   ```json
   "vscode_custom_css.imports": [
     "file:///Users/you/Repos/vs-glass/glass/glass.css"
   ]
   ```

   For the transparent-window mode (only meaningful together with Vibrancy Continued — see Route C), add
   `glass-transparent.css` **second**, after `glass.css`:

   ```json
   "vscode_custom_css.imports": [
     "file:///Users/you/Repos/vs-glass/glass/glass.css",
     "file:///Users/you/Repos/vs-glass/glass/glass-transparent.css"
   ]
   ```

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
  `--transparent`, `glass-transparent.css` too) is appended inside a
  `/* VS-GLASS-START */ … /* VS-GLASS-END */` marker block, with a header recording the VS Glass and VS
  Code versions it was installed against.
- `.../Contents/Resources/app/product.json` — the `checksums["vs/workbench/workbench.desktop.main.css"]`
  entry is recomputed and rewritten to match the patched file, so VS Code's own integrity check passes and
  **the corrupt-installation notice should not appear at all** with this route.

**Install:**

```sh
cd vs-glass
bash scripts/inject.sh install               # wallpaper mode
bash scripts/inject.sh install --transparent  # transparent-window mode (pairs with Route C / Vibrancy)
```

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

- Safe to run `install` repeatedly (including switching between plain and `--transparent`) — it strips any
  previous VS-GLASS block before appending a fresh one every time.
- It never calls `sudo` itself. If your VS Code install directory isn't writable (a root-owned or
  MDM-managed install), it prints the exact `chown`/`sudo` command to run.
- By default it looks in `/Applications/Visual Studio Code.app`, then
  `~/Applications/Visual Studio Code.app`, then `/Applications/Visual Studio Code - Insiders.app` (then, on
  Linux, `/usr/share/code/resources/app`). Override with `VSCODE_APP_PATH=/path/to/Visual\ Studio\ Code.app`.
  Run `bash scripts/inject.sh --help` for the full reference.

---

## 4. Route C — Vibrancy Continued (transparent window)

**Extension:** [`illixion.vscode-vibrancy-continued`](https://marketplace.visualstudio.com/items?itemName=illixion.vscode-vibrancy-continued).
Use this route if you want the *whole VS Code window* to be see-through, with the OS blurring your desktop
behind it — the native macOS/Windows vibrancy material, not something CSS alone can produce.

**Risk and trade-off, stated up front:** this route changes what "glass" even means for you. `backdrop-filter`
in CSS can only refract what the *page itself* has painted behind an element — it has no access to the
desktop or other windows behind VS Code. Once the window is genuinely transparent, most of what's behind
any given pane is the desktop, which CSS cannot see or bend. So under Vibrancy:

- The native OS blur (Vibrancy's job) makes the *whole window* translucent, uniformly.
- Layer 2's lensing/refraction (CSS's job) still shows, but **only where glass overlaps something VS Code
  itself painted** — a hover widget sitting over code, sticky scroll over the lines beneath it, the seam
  between two floating cards. It does not, and cannot, bend the desktop wallpaper behind the window.
- Layer 2's normal in-page wallpaper background (the colorful mesh gradient you see in wallpaper mode) is
  **disabled** in this mode — there's no point painting a wallpaper the OS is about to make translucent.

If you want the full lensing effect over a consistent, colorful backdrop, prefer wallpaper mode (Route A or
B, without `--transparent`). If you want the desktop itself to show through, this is the only route that
does that, with lensing appearing wherever content genuinely overlaps.

**Settings:**

```json
{
  "vscode_vibrancy.theme": "Custom theme (use imports)",
  "vscode_vibrancy.imports": [
    "/ABSOLUTE/PATH/vs-glass/glass/glass.css",
    "/ABSOLUTE/PATH/vs-glass/glass/glass-transparent.css"
  ],
  "vscode_vibrancy.type": "under-window",
  "window.titleBarStyle": "custom",
  "terminal.integrated.gpuAcceleration": "off"
}
```

Notes on each setting:

- **`vscode_vibrancy.imports` takes plain file paths, not `file://` URLs** — this is the opposite
  convention from Route A's `vscode_custom_css.imports`, and mixing them up is the single most common
  mistake here. Load `glass.css` first, `glass-transparent.css` second (it must be loaded after `glass.css`
  — it overrides selectors `glass.css` defines).
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

**Text looks blurry.**
This should never happen — Layer 2 deliberately never applies a filter to editor text. If you see blurry
text anywhere, please report it as a bug; it's not an intended trade-off of any route.

**Performance / it feels slow.**
Check macOS **System Settings → Accessibility → Display → Reduce Transparency**. Layer 2 respects
`prefers-reduced-transparency` and switches every `backdrop-filter` off automatically when it's on — this
is the fastest way to confirm whether the effects layer is the cause of any slowdown, and a legitimate way
to keep the theme's colors without the compositing cost. Separately, `prefers-reduced-motion` (macOS
Accessibility → Display → Reduce Motion) disables the liquid hover/press response, independent of
transparency.

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

- **Route A:** re-run `Enable Custom CSS and JS`.
- **Route B:** re-run `bash scripts/inject.sh install` (add `--transparent` again if you were using it).
  Run `bash scripts/inject.sh status` first if you want to confirm drift before re-installing — it will
  show the VS Code version the patch was installed against vs. what's running now.
- **Route C:** re-run `Reload Vibrancy`, then fully restart VS Code.

## Full uninstall

To remove Layer 2 entirely:

- **Route A:** `Disable Custom CSS and JS`, then remove `vscode_custom_css.imports` from `settings.json`.
- **Route B:** `bash scripts/inject.sh uninstall`.
- **Route C:** `Disable Vibrancy`, then remove the `vscode_vibrancy.*` settings from `settings.json`.

To remove VS Glass entirely (theme included):

```sh
code --uninstall-extension MilosHampl.vs-glass
```

(and, if installed, `illixion.vscode-vibrancy-continued` and/or `be5invis.vscode-custom-css`, if you don't
use them for anything else).
