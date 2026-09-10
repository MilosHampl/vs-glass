# Changelog

All notable changes to VS Glass are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-10

### Added

- Four theme variants: **Glass Regular Dark**, **Glass Regular Light**, **Glass Clear**, and
  **Glass Opaque**, generated from a single OKLCH palette.
- Generated palette pipeline (`src/palette.ts` → `npm run build` → `themes/*.json`) covering the
  VS Code color-theme key set, plus TextMate `tokenColors` and `semanticTokenColors`.
- Layer 2 glass effects (`glass/glass.css`), applied on top of the theme by injecting CSS into
  the workbench:
  - Lensing/refraction via an SVG displacement map (`glass/glass-filters.svg`) in
    `backdrop-filter: url(#...)`.
  - Specular edge highlight rings.
  - Material-thickness shadows (layered inset + contact shadows).
  - Vibrancy blend (`saturate()`/`brightness()` plus `mix-blend-mode: plus-lighter` on chrome).
  - Concentric corner-radius geometry across nested surfaces.
  - Liquid hover/press response (animated highlight position/alpha, micro-scale on floating
    widgets; disabled under `prefers-reduced-motion`).
  - Chromatic aberration on the lens, tuned per variant.
- Transparent-window addon (`glass/glass-transparent.css`), for use alongside an OS-level
  vibrancy/transparency tool (e.g. Vibrancy Continued), loaded after `glass.css`.
- Install/uninstall scripts for the Layer 2 effects layer (`scripts/inject.sh`).
- Verification audits: `npm run validate` (theme JSON schema), `npm run audit:coverage` (color
  key coverage against the full VS Code key inventory), `npm run audit:contrast` (WCAG contrast).
- Project documentation: README, DESIGN.md, and this CHANGELOG.

[Unreleased]: https://github.com/MilosHampl/vs-glass/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MilosHampl/vs-glass/releases/tag/v1.0.0
