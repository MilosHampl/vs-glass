# VS Glass — PROGRESS

Durable state for the build. Updated at the end of every phase (and mid-phase when a decision is made).

## Environment (verified 2026-09-10)

- macOS Darwin 25.6.0 (macOS 26 Tahoe), arm64.
- VS Code 1.136.1 (commit a44adf7f). App dir owned by the user (no sudo needed to patch).
- Workbench HTML: `/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html`.
- Node 24.15.0, npm 12.0.2, `@vscode/vsce` 3.9.2 via npx, `tsx` via npx.
- `gh` authenticated as MilosHampl. Active token is `GITHUB_TOKEN` env (scopes: repo, user, read:packages — **no `workflow` scope**). A second keyring token has `workflow`. Pushing `.github/workflows/*` will need the keyring token (Phase 6 note).
- User already runs **Vibrancy Continued 1.1.93** (`vscode_vibrancy.type: mica`, `windowMode: frameless-transparent`) with theme "Tokyo Night Storm" and a block of `workbench.colorCustomizations` setting many chrome surfaces to low alpha. Vibrancy patches `main.js` (VIBRANCY-START/END markers) and supports `vscode_vibrancy.imports` (CSS/JS files inlined as `<style>`/`<script>` at patch time).
- The `code` shell command is a zsh function wrapping `open -b com.microsoft.VSCode`; the real CLI is `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 Scaffold | done | hand-written package.json + themes/ (generator is interactive; a color theme needs nothing else) |
| 1 Research | done | 6 agents, outputs in `research/`; key claims re-verified empirically (see below) |
| 2 Palette | done | `src/palette.ts` OKLCH ladder, 4 variants, `src/color.ts`, `src/lens.ts`, `src/png.ts`, `src/build.ts` |
| 3a Theme | done | 4 parallel modules (`src/colors/*.ts`) + `src/tokens.ts`/`src/semantic.ts`: 974/988 keys, 95 token rules, 50 semantic rules; 14 documented deliberate omissions |
| 3b Effects layer | done (tuning continues in Phase 4) | `src/glass/glass.css` → `glass/glass.css` (+ `glass-transparent.css` addon): frosted-centre/clear-rim lens with chromatic aberration, specular rings, thickness, wallpaper ground, floating cards, concentric radii, vibrancy blend, Control-Center-style glass buttons, liquid press response, reduced-motion/transparency guards |
| 4 Verify/iterate | in progress | audits written and passing (coverage 974/988 + 14 documented omissions; contrast PASS with 7/5/2/2 justified exceptions; schema PASS); perf (visible window, 120 Hz): editor scroll ON p50 8.3 / p95 10.2 ms vs OFF 8.3 / 9.8; scroll under open palette ON p50 8.3 / p95 16.7 ms (5.2 % > 16.7 ms) vs OFF 8.3 / 10.1; screenshot matrix (97 PNGs) done; adversarial review round 1 running |
| 5 Docs/packaging | in progress | CI/release workflows, issue/PR templates, LICENSE, CoC, CONTRIBUTING, CHANGELOG, glass/install.md, scripts/inject.sh, icon done; README, DESIGN.md, landing page pending |
| 6 Publish | pending | |

## Decisions made without asking

1. **Skipped the interactive `yo code` generator.** A color theme extension is `package.json` + `themes/*.json`; the generator adds nothing we would keep, and it blocks on prompts. Wrote the files by hand.
2. **Build toolchain: `tsx` (no compile step) + TypeScript for `src/palette.ts` / `src/build.ts`.** Simplest thing that gives typed palette code and a one-command build.
3. **Apple reference imagery is downloaded for the critique loop but NOT committed.** Apple's marketing/HIG images are copyrighted; the conservative call is to keep only a `research/reference/SOURCES.md` with URLs in the repo and gitignore the PNGs.
4. **Testing uses an isolated `--user-data-dir`** for controlled screenshots (the user's live profile has Vibrancy + `workbench.colorCustomizations` that would override theme keys). The real profile is only touched for the final end-to-end install verification, with backups in `.backup/`.

5. **Mid-build directives from the user (2026-09-10, received while Phase 3 ran) — adopted:**
   - *Study ruri.design/blog/liquid-glass for exaggerated effects.* The article is a client-rendered app; its blog chunk is a FAQ, but the Glass tool chunks contain the recipe: displacement map on the blurred backdrop **plus chromatic aberration** (R/G/B channels displaced by `scale±aberration`, re-added with `feComposite arithmetic`). Adopted as a per-variant `effects.aberration` token (Regular 0.7 px, Light 0.5 px, Clear 2.2 px, Opaque 0).
   - *The entire window should be transparent with the liquid glass effect.* CSS `backdrop-filter` cannot see the desktop, so window transparency comes from Vibrancy Continued (OS-level) and Layer 2 gains a **transparent-window mode** addon (`glass/glass-transparent.css`, loaded after `glass.css`): no in-page wallpaper, translucent content plane and chrome, dimming layer for legibility. Refraction stays wherever glass overlaps in-page content. This is the recommended setup on the user's machine (Vibrancy already installed).
   - *Buttons: exaggerated effect + hover/click animations* → **superseded** the same day by *"the button animations look retarded, revert and make it as true to macOS Liquid Glass as possible — the Control Center style buttons (Wi-Fi, BT etc.)"*. Final treatment: capsule glass toggles, thin top specular ring, tinted frosted fill for primary / neutral frosted for secondary, hover brightens the fill ~7 %, press scales to 0.96 with a fast ease-out return; no sheen sweeps, lifts, glows or overshoot. `effects.exaggeration` kept as a low-range token (0.3 / 0.3 / 0.5 / 0).

## Open questions (to resolve during research)

- Best Layer 2 injection route on this machine: Custom CSS & JS Loader vs. the already-installed Vibrancy Continued `imports` vs. direct workbench.html patch script of our own.
- Whether Chromium in Electron (VS Code 1.136) honours `backdrop-filter: url(#svgFilter)` with `feDisplacementMap`. This decides how lensing is implemented.
- Which color keys honour alpha in this VS Code version.

## Verified vs. assumed

- VERIFIED: environment facts above (ran the commands).
- ASSUMED (until Phase 1 returns): everything about CSS technique and selector names.

## Phase 1 — empirical findings (verified by me via CDP in the live workbench, 2026-09-10)

These override anything a research agent claimed to the contrary.

1. **VS Code 1.136.1 = Electron 42.10 / Chromium 148.** `--remote-debugging-port=<port>` works on stable (the tooling agent claimed it did not; it is a Chromium switch, not listed in `--help`). `scripts/cdp.mjs` drives screenshots (2× Retina), JS evaluation, key input, CSS injection and tracing over CDP.
2. **`backdrop-filter: url(#filter)` with `feDisplacementMap` WORKS in the workbench.** Verified with three variants: inline `<svg><filter>`, `feTurbulence` map, and a canvas-generated edge-lens map (prior-art agent claimed it "cannot run in Electron" — wrong).
3. **Data-URI SVG filters work in `backdrop-filter`**: `backdrop-filter: url("data:image/svg+xml;utf8,<svg>…<filter id='f'>…</filter></svg>#f")`. So Layer 2 can be **pure CSS**: no JS, no external SVG file, CSP-safe (`img-src data:` is allowed; `default-src 'none'` would block `file:` SVGs).
4. **Filter coordinate systems** (step-pattern test, 6 variants): `filterUnits`/`primitiveUnits` = `objectBoundingBox` with 0..1 values works; `userSpaceOnUse` with explicit px works with origin at the element's top-left; **percentages in userSpaceOnUse resolve against the (zero-size) SVG viewport and silently produce no output**. Never use `%`.
5. **Displacement folding**: if the displacement slope exceeds 1 (scale ÷ edge-zone width, times the map's derivative), the backdrop folds and text doubles. Keep |d(offset)/dx| < ~0.7 for a clean lens.
6. **Refraction needs an opaque in-page backdrop.** Under Vibrancy Continued (transparent window, 20 %-alpha editor) the displaced copy composites over the still-visible original → ghosting. On the pristine build (opaque editor) displacement is clean. ⇒ Layer 2 paints an opaque wallpaper-like backdrop on the workbench ground; Vibrancy's OS-level blur and CSS refraction are mutually exclusive on the same surface.
7. **Vibrancy patches the shared app bundle (`out/main.js`)**, so *every* instance of the installed app — any `--user-data-dir` — gets its CSS. A byte-modified copy of the app is SIGKILLed by macOS (code signature), even after ad-hoc re-signing. Solution: a pristine VS Code 1.136.1 downloaded to `scratch/VSCode-pristine.app` (run with its own `--user-data-dir`, debug port 9334) for all clean-baseline testing.
8. **Trusted Types** are enforced in the workbench (`require-trusted-types-for 'script'`): `innerHTML` and `DOMParser.parseFromString` throw; `createElement`/`createElementNS` + `setAttribute` + `textContent` are fine. Relevant only if a JS enhancer is ever shipped.
9. **The workbench ground is painted by the grid view**: `.monaco-grid-view { background-color: var(--modern-ui-shell-background, var(--vscode-titleBar-activeBackground)) }`. Translucent parts (sidebar, panel…) composite over **`titleBar.activeBackground`**. That key is therefore the Layer-1 "backdrop" colour.
10. **VS Code 1.136 has a native modern/floating layout**: settings `workbench.experimental.modernUI` and `workbench.experimental.floatingPanels` add `.monaco-workbench.floating-panels.modern-ui`, giving sidebar/panel/aux-bar margins, `border-radius: var(--vscode-cornerRadius-large)` and new theme keys: `surface.background/foreground/border`, `cornerRadius.xSmall|small|medium|large|xLarge|circle`, `modernActivityBar*`, `modernEditorTab.*`, `modernTab.*`. This is the natural substrate for optics items 5 (floating panes) and 6 (concentric geometry).
12. **`requestAnimationFrame` is paused for occluded windows.** Chromium reports `document.visibilityState === 'hidden'` for a VS Code window covered by another window; rAF stops entirely while CDP screenshots keep working. `scripts/perf.mjs` now calls `Page.bringToFront` and refuses to measure a hidden window — the earlier "no frames sampled" palette result was this, not the quick input.
11. DOM: `.part.sidebar` is `overflow:hidden; position:static` inside `.split-view-view` (`position:absolute; overflow:visible`) inside `.split-view-container` (`overflow:hidden`). Sidebar and editor are siblings, not overlapping — a sidebar `backdrop-filter` sees only the ground (grid view) behind it, not editor content. Overlays (quick input, hovers, suggest, notifications, menus, sticky scroll, find widget) genuinely overlap code and are where lensing is most visible.

## Phase 1 — synthesis: which layer implements each optical-signature item

| # | Optic | Layer | How |
|---|---|---|---|
| 1 | Lensing / refraction | **2** | `backdrop-filter: url("data:image/svg+xml,…#lens")` — SVG `feImage` (edge-only displacement PNG, generated by `src/build.ts`) → `feDisplacementMap`, bbox units, one filter per aspect class (square widgets, portrait sidebar, landscape panel, bars). Applied to overlays that overlap code (quick input, suggest, hovers, menus, notifications, find, sticky scroll, debug toolbar) and to the floating chrome cards, which refract the Layer-2 wallpaper ground. Layer 1 contributes low-alpha chrome and an opaque ground colour (`titleBar.activeBackground`). |
| 2 | Specular edge highlight | **2** | `::before` ring: `conic-gradient` from a top-left virtual light, cut to a 1–1.5 px ring with `mask-composite: exclude`; alphas from the palette specular ramp (per elevation). Layer 1 approximates with lighter top borders (`sideBarSectionHeader.border`, `widget.border`, `*.border` keys set to white-alpha). |
| 3 | Material thickness | **2** | Layered `box-shadow`: inset top light, inset bottom dark, interior falloff, soft + tight outer contact shadows. Layer 1: `widget.shadow`, `scrollbar.shadow`, `editorStickyScroll.shadow` in palette shadow colour. |
| 4 | Vibrancy | **1 + 2** | Layer 1: four label tiers as white/black-alpha (macOS ramp 85/55/26/10 %), so text composites with whatever is behind. Layer 2: `backdrop-filter: saturate() brightness()` on glass; `mix-blend-mode: plus-lighter` on separators/icons in chrome (never on editor text). |
| 5 | Floating layered panes | **1 + 2** | VS Code 1.136's `workbench.experimental.modernUI` (floating cards). Layer 1 sets `surface.*`, `modern*` keys and translucent card backgrounds. Layer 2 adds elevation shadows, outer glow, and a wallpaper ground in the gaps; degrades to shadow-only when the class is absent. |
| 6 | Concentric geometry | **2** | Override `--vscode-cornerRadius-{small,medium,large,xLarge}` tokens; inner elements get `radius = parent − padding` (list rows, inputs, tabs). Layer 1 cannot set radii (size tokens are not theme keys). |
| 7 | Adaptive tint | **1 + 2** | Layer 1: cool blue-violet cast baked into every gray (OKLCH hue ≈ 262, chroma 0.01–0.03), never neutral. Layer 2: wallpaper mesh in palette hues under low-alpha glass + saturate boost, so each pane picks up the hue behind it; `color-mix()` derives tints from `--vscode-*` vars. |
| 8 | Liquid response | **2** | `@property`-typed highlight position/alpha transitioned 220–300 ms with a damped ease-out on `:hover`/`:focus-within` (widgets, list rows, tabs, buttons); 1–1.5 % micro-scale on floating widgets; all disabled under `prefers-reduced-motion`. |

**Injection route decision:** ship `glass/glass.css` for three routes, documented in this order: (1) Custom CSS and JS Loader (`be5invis.vscode-custom-css`, the route the brief names, 1.19 M installs, reload-to-refresh; risk: it strips the workbench CSP); (2) our own `scripts/inject.sh` (appends the CSS to `workbench.desktop.main.css`, fixes `product.json` checksums, byte-exact backup + `uninstall`; zero CSP change); (3) Vibrancy Continued `vscode_vibrancy.imports` — works, but OS-level window transparency makes the in-page backdrop mostly transparent and refraction ghosts (finding 6), so it is documented as "compatible, reduced lensing". APC Customize UI++ is dead (last release Aug 2024) and is not recommended.

**Research-agent claims corrected by measurement:** tooling.md says `--remote-debugging-port` is unavailable (it works); prior-art.md says `feDisplacementMap` cannot run in VS Code's Electron (it does); css-liquid-glass.md recommends `userSpaceOnUse` px filters sized per surface (works, but needs JS for exact sizes — we use bbox units + aspect classes instead, CSS-only).
