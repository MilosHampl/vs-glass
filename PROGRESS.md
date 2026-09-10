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
| 1 Research | in progress | 6 agents launched concurrently, outputs in `research/` |
| 2 Palette | pending | |
| 3a Theme | pending | |
| 3b Effects layer | pending | |
| 4 Verify/iterate | pending | |
| 5 Docs/packaging | pending | |
| 6 Publish | pending | |

## Decisions made without asking

1. **Skipped the interactive `yo code` generator.** A color theme extension is `package.json` + `themes/*.json`; the generator adds nothing we would keep, and it blocks on prompts. Wrote the files by hand.
2. **Build toolchain: `tsx` (no compile step) + TypeScript for `src/palette.ts` / `src/build.ts`.** Simplest thing that gives typed palette code and a one-command build.
3. **Apple reference imagery is downloaded for the critique loop but NOT committed.** Apple's marketing/HIG images are copyrighted; the conservative call is to keep only a `research/reference/SOURCES.md` with URLs in the repo and gitignore the PNGs.
4. **Testing uses an isolated `--user-data-dir`** for controlled screenshots (the user's live profile has Vibrancy + `workbench.colorCustomizations` that would override theme keys). The real profile is only touched for the final end-to-end install verification, with backups in `.backup/`.

## Open questions (to resolve during research)

- Best Layer 2 injection route on this machine: Custom CSS & JS Loader vs. the already-installed Vibrancy Continued `imports` vs. direct workbench.html patch script of our own.
- Whether Chromium in Electron (VS Code 1.136) honours `backdrop-filter: url(#svgFilter)` with `feDisplacementMap`. This decides how lensing is implemented.
- Which color keys honour alpha in this VS Code version.

## Verified vs. assumed

- VERIFIED: environment facts above (ran the commands).
- ASSUMED (until Phase 1 returns): everything about CSS technique and selector names.
