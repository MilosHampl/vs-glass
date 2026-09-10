#!/usr/bin/env node
/**
 * validate-schema — structural validation of each theme JSON plus the extension's package.json,
 * against the VS Code color-theme contract documented in research/vscode-theme-keys.md §1.
 *
 * Errors fail the run (exit 1). A small number of checks are documented as "warn only" per the
 * task brief (duplicate tokenColors scopes with conflicting foregrounds; a missing icon file) —
 * those are printed but never fail the run.
 *
 * Usage: node scripts/validate-schema.mjs [--json] [--theme <id>]
 *   --theme limits the *theme JSON* checks to one theme; package.json is always fully validated
 *   (it's one file describing all themes) unless it has no entry for the requested theme.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEX_RE } from './lib/color.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = path.join(ROOT, 'themes');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const themeIdx = args.indexOf('--theme');
const onlyTheme = themeIdx >= 0 ? args[themeIdx + 1] : null;

const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'all-color-keys.json'), 'utf8'));
const inventorySet = new Set(inventory.keys.map((k) => k.id));

const THEME_TYPES = ['dark', 'light', 'hcDark', 'hcLight'];
// package.json's contributes.themes[].uiTheme <-> theme JSON's own `type` field.
const UITHEME_TO_TYPE = { vs: 'light', 'vs-dark': 'dark', 'hc-black': 'hcDark', 'hc-light': 'hcLight' };
const FONT_STYLE_WORDS = new Set(['italic', 'bold', 'underline', 'strikethrough']);
const SEMANTIC_OPTIONAL_PROPS = new Set(['foreground', 'fontStyle', 'bold', 'italic', 'underline', 'strikethrough']);
const TOKEN_SETTINGS_PROPS = new Set(['foreground', 'background', 'fontStyle']);
// Real VS Code schema also allows these (research/vscode-theme-keys.md §1.2) even though the
// task's simplified settings shape doesn't list them — warn, don't error, if seen.
const TOKEN_SETTINGS_EXTRA_KNOWN = new Set(['fontFamily', 'fontSize', 'lineHeight']);

function isHex(v) { return typeof v === 'string' && HEX_RE.test(v); }

function isValidFontStyle(v) {
  if (typeof v !== 'string') return false;
  if (v.trim() === '') return true;
  return v.trim().split(/\s+/).every((w) => FONT_STYLE_WORDS.has(w));
}

/** Validate one theme JSON. Returns { errors: string[], warnings: string[] }. */
function validateTheme(id, theme) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  // name
  if (typeof theme.name !== 'string' || theme.name.length === 0) err(`name: expected a non-empty string, got ${JSON.stringify(theme.name)}`);

  // type
  if (!THEME_TYPES.includes(theme.type)) err(`type: expected one of ${THEME_TYPES.join('/')}, got ${JSON.stringify(theme.type)}`);

  // semanticHighlighting
  if (typeof theme.semanticHighlighting !== 'boolean') err(`semanticHighlighting: expected boolean, got ${JSON.stringify(theme.semanticHighlighting)}`);

  // colors
  if (typeof theme.colors !== 'object' || theme.colors === null || Array.isArray(theme.colors)) {
    err(`colors: expected an object, got ${JSON.stringify(theme.colors)}`);
  } else {
    for (const [k, v] of Object.entries(theme.colors)) {
      if (!isHex(v)) err(`colors["${k}"]: expected #rrggbb/#rrggbbaa hex, got ${JSON.stringify(v)}`);
      if (!inventorySet.has(k)) err(`colors["${k}"]: unknown key (not in the 988-key inventory — typo?)`);
    }
  }

  // tokenColors
  const scopeToForeground = new Map(); // scope string -> Set<foreground>
  if (!Array.isArray(theme.tokenColors)) {
    err(`tokenColors: expected an array, got ${JSON.stringify(theme.tokenColors)}`);
  } else {
    theme.tokenColors.forEach((rule, i) => {
      const where = `tokenColors[${i}]${rule && rule.name ? ` (${rule.name})` : ''}`;
      if (typeof rule !== 'object' || rule === null) { err(`${where}: expected an object`); return; }
      if ('name' in rule && typeof rule.name !== 'string') err(`${where}.name: expected string, got ${JSON.stringify(rule.name)}`);
      const scopes = Array.isArray(rule.scope) ? rule.scope : typeof rule.scope === 'string' ? [rule.scope] : null;
      if (scopes === null) err(`${where}.scope: expected a string or array of strings, got ${JSON.stringify(rule.scope)}`);
      else if (scopes.length === 0) err(`${where}.scope: empty`);
      else if (!scopes.every((s) => typeof s === 'string')) err(`${where}.scope: array must contain only strings`);

      if (typeof rule.settings !== 'object' || rule.settings === null) {
        err(`${where}.settings: required object, got ${JSON.stringify(rule.settings)}`);
      } else {
        const s = rule.settings;
        if ('foreground' in s && !isHex(s.foreground)) err(`${where}.settings.foreground: expected hex, got ${JSON.stringify(s.foreground)}`);
        if ('background' in s && !isHex(s.background)) err(`${where}.settings.background: expected hex, got ${JSON.stringify(s.background)}`);
        if ('fontStyle' in s && !isValidFontStyle(s.fontStyle)) err(`${where}.settings.fontStyle: words must be from {italic,bold,underline,strikethrough} or '', got ${JSON.stringify(s.fontStyle)}`);
        for (const k of Object.keys(s)) {
          if (!TOKEN_SETTINGS_PROPS.has(k) && !TOKEN_SETTINGS_EXTRA_KNOWN.has(k)) warn(`${where}.settings: unexpected property "${k}"`);
        }
        if (scopes && s.foreground) {
          for (const sc of scopes) {
            if (!scopeToForeground.has(sc)) scopeToForeground.set(sc, new Set());
            scopeToForeground.get(sc).add(s.foreground);
          }
        }
      }
    });
  }
  // duplicate scopes with conflicting foregrounds — warn only, per the brief.
  for (const [scope, fgs] of scopeToForeground) {
    if (fgs.size > 1) warn(`tokenColors: scope "${scope}" set with conflicting foregrounds: ${[...fgs].join(', ')}`);
  }

  // semanticTokenColors
  if (typeof theme.semanticTokenColors !== 'object' || theme.semanticTokenColors === null || Array.isArray(theme.semanticTokenColors)) {
    err(`semanticTokenColors: expected an object, got ${JSON.stringify(theme.semanticTokenColors)}`);
  } else {
    for (const [selector, val] of Object.entries(theme.semanticTokenColors)) {
      const where = `semanticTokenColors["${selector}"]`;
      if (typeof val === 'string') {
        if (!isHex(val)) err(`${where}: expected hex string, got ${JSON.stringify(val)}`);
      } else if (typeof val === 'object' && val !== null) {
        if ('foreground' in val && !isHex(val.foreground)) err(`${where}.foreground: expected hex, got ${JSON.stringify(val.foreground)}`);
        if ('fontStyle' in val && !isValidFontStyle(val.fontStyle)) err(`${where}.fontStyle: words must be from {italic,bold,underline,strikethrough} or '', got ${JSON.stringify(val.fontStyle)}`);
        for (const b of ['bold', 'italic', 'underline', 'strikethrough']) {
          if (b in val && typeof val[b] !== 'boolean') err(`${where}.${b}: expected boolean, got ${JSON.stringify(val[b])}`);
        }
        for (const k of Object.keys(val)) {
          if (!SEMANTIC_OPTIONAL_PROPS.has(k)) warn(`${where}: unexpected property "${k}"`);
        }
      } else {
        err(`${where}: expected a hex string or an object, got ${JSON.stringify(val)}`);
      }
    }
  }

  return { errors, warnings };
}

/** Validate package.json's theme contributions. Returns { errors: string[], warnings: string[] }. */
function validatePackageJson(themesById) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (pkg.publisher !== 'MilosHampl') err(`package.json publisher: expected "MilosHampl", got ${JSON.stringify(pkg.publisher)}`);
  if (!pkg.engines || typeof pkg.engines.vscode !== 'string' || pkg.engines.vscode.length === 0) err(`package.json engines.vscode: required, got ${JSON.stringify(pkg.engines && pkg.engines.vscode)}`);

  if (pkg.icon) {
    const iconPath = path.join(ROOT, pkg.icon);
    if (!fs.existsSync(iconPath)) warn(`package.json icon: "${pkg.icon}" does not exist yet (generated later)`);
  }

  const contributedThemes = (pkg.contributes && pkg.contributes.themes) || [];
  if (!Array.isArray(contributedThemes) || contributedThemes.length === 0) {
    err('package.json contributes.themes: expected a non-empty array');
    return { errors, warnings };
  }

  for (const [i, entry] of contributedThemes.entries()) {
    const where = `package.json contributes.themes[${i}]`;
    const themePath = path.join(ROOT, entry.path || '');
    if (!entry.path || !fs.existsSync(themePath)) { err(`${where}.path: "${entry.path}" does not exist`); continue; }

    const themeId = path.basename(entry.path).replace(/-color-theme\.json$/, '');
    if (onlyTheme && themeId !== onlyTheme) continue; // scoping is theme-file focused; still validated if referenced

    const theme = themesById.get(themeId) || JSON.parse(fs.readFileSync(themePath, 'utf8'));

    if (entry.label !== theme.name) err(`${where}.label ("${entry.label}") does not match name in ${entry.path} ("${theme.name}")`);

    const expectedType = UITHEME_TO_TYPE[entry.uiTheme];
    if (!expectedType) err(`${where}.uiTheme: unrecognised value ${JSON.stringify(entry.uiTheme)}`);
    else if (theme.type !== expectedType) err(`${where}.uiTheme ("${entry.uiTheme}") implies type "${expectedType}" but ${entry.path} has type ${JSON.stringify(theme.type)}`);
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------
let themeFiles = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('-color-theme.json')).sort();
if (onlyTheme) {
  const want = `${onlyTheme}-color-theme.json`;
  themeFiles = themeFiles.filter((f) => f === want);
  if (themeFiles.length === 0) {
    console.error(`validate-schema: no theme file for --theme ${onlyTheme} (looked for themes/${want})`);
    process.exit(1);
  }
}

const themesById = new Map();
const results = [];
let anyError = false;

for (const file of themeFiles) {
  const id = file.replace(/-color-theme\.json$/, '');
  const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf8'));
  themesById.set(id, theme);
  const { errors, warnings } = validateTheme(id, theme);
  if (errors.length > 0) anyError = true;
  results.push({ id, errors, warnings });
}

// package.json always loads every theme file referenced (not just --theme) so cross-checks (label/uiTheme) are meaningful.
const allThemeFiles = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('-color-theme.json'));
for (const file of allThemeFiles) {
  const id = file.replace(/-color-theme\.json$/, '');
  if (!themesById.has(id)) themesById.set(id, JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf8')));
}
const pkgResult = validatePackageJson(themesById);
if (pkgResult.errors.length > 0) anyError = true;

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------
if (asJson) {
  console.log(JSON.stringify({ ok: !anyError, themes: results, packageJson: pkgResult }, null, 2));
} else {
  for (const r of results) {
    console.log(`${r.id}: ${r.errors.length === 0 ? 'OK' : `${r.errors.length} error(s)`}${r.warnings.length ? `, ${r.warnings.length} warning(s)` : ''}`);
    for (const e of r.errors) console.log(`  ✗ ${e}`);
    for (const w of r.warnings) console.log(`  ⚠ ${w}`);
  }
  console.log(`package.json: ${pkgResult.errors.length === 0 ? 'OK' : `${pkgResult.errors.length} error(s)`}${pkgResult.warnings.length ? `, ${pkgResult.warnings.length} warning(s)` : ''}`);
  for (const e of pkgResult.errors) console.log(`  ✗ ${e}`);
  for (const w of pkgResult.warnings) console.log(`  ⚠ ${w}`);
  console.log('');
  console.log(anyError ? 'FAIL' : 'PASS');
}

process.exit(anyError ? 1 : 0);
