#!/usr/bin/env node
/**
 * audit-coverage — for each built theme, compares the keys in `colors` against the 988-key
 * inventory in research/all-color-keys.json.
 *
 * A key can be missing from `colors` for two reasons:
 *   - "deliberate": the owning src/colors/*.ts module documents (in a `DELIBERATELY UNSET`
 *     comment block) that it intentionally does not set this key, with a reason.
 *   - "unintentional gap": missing, but no module claims it — this is a real bug (exit 1).
 *
 * Also flags:
 *   - "unknown key": a key present in `colors` that isn't in the 988-key inventory (typo).
 *   - "bad hex": a colors value that isn't `#rrggbb` / `#rrggbbaa`.
 *
 * Usage: node scripts/audit-coverage.mjs [--json] [--theme <id>]
 *   <id> is a theme id, e.g. "glass-regular-dark" (the themes/<id>-color-theme.json filename minus suffix).
 * Exit 0 if every theme is clean, exit 1 otherwise.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEX_RE } from './lib/color.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = path.join(ROOT, 'themes');
const COLORS_DIR = path.join(ROOT, 'src', 'colors');

// ---------------------------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const themeIdx = args.indexOf('--theme');
const onlyTheme = themeIdx >= 0 ? args[themeIdx + 1] : null;

// ---------------------------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------------------------
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'research', 'all-color-keys.json'), 'utf8'));
const inventoryKeys = inventory.keys.map((k) => k.id);
const inventorySet = new Set(inventoryKeys);
const groupOf = new Map(inventory.keys.map((k) => [k.id, k.group]));

// ---------------------------------------------------------------------------------------------
// Parse `DELIBERATELY UNSET` comment blocks out of src/colors/*.ts.
//
// Format is not rigidly specified (module authors write these by hand), so this parser is
// deliberately tolerant: it finds any line containing the literal marker "DELIBERATELY UNSET",
// then keeps consuming lines for as long as they remain *comment* lines (start with `//`, `*`,
// `/**`, `/*`, or are a bare `*/`) — this naturally bounds the block to the enclosing comment
// (JSDoc block or a run of `//` lines) without needing to guess a specific bullet syntax. Every
// key-shaped token (`[a-zA-Z]+(\.[a-zA-Z0-9]+)+`) found in those lines — including in surrounding
// prose/reasons, not just an assumed bullet format — is added to that file's deliberately-unset
// set. Over-matching prose text (e.g. a key mentioned only as context, not as an omission) is
// harmless here: this set is only ever intersected with keys that are *actually missing* from
// a theme's `colors`, so a spurious entry for a key that IS set simply never gets looked up.
// ---------------------------------------------------------------------------------------------
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/**') || t.startsWith('/*') || t.startsWith('*') || t === '*/';
}

const KEY_TOKEN_RE = /[a-zA-Z]+(?:\.[a-zA-Z0-9]+)+/g;

function parseDeliberatelyUnset(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const keys = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('DELIBERATELY UNSET')) continue;
    // consume this line + subsequent comment lines
    let j = i;
    while (j < lines.length && isCommentLine(lines[j])) {
      const tokens = lines[j].match(KEY_TOKEN_RE) || [];
      for (const t of tokens) keys.add(t);
      j++;
    }
  }
  return keys;
}

const colorModules = fs.readdirSync(COLORS_DIR).filter((f) => f.endsWith('.ts'));
/** key -> Set<moduleFileName> that claim it as deliberately unset (for reporting). */
const deliberateSources = new Map();
for (const mod of colorModules) {
  const keys = parseDeliberatelyUnset(path.join(COLORS_DIR, mod));
  for (const k of keys) {
    if (!deliberateSources.has(k)) deliberateSources.set(k, new Set());
    deliberateSources.get(k).add(mod);
  }
}

// ---------------------------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------------------------
let themeFiles = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('-color-theme.json')).sort();
if (onlyTheme) {
  const want = `${onlyTheme}-color-theme.json`;
  themeFiles = themeFiles.filter((f) => f === want);
  if (themeFiles.length === 0) {
    console.error(`audit-coverage: no theme file for --theme ${onlyTheme} (looked for themes/${want})`);
    process.exit(1);
  }
}

const results = [];
let anyFailure = false;

for (const file of themeFiles) {
  const id = file.replace(/-color-theme\.json$/, '');
  const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), 'utf8'));
  const colors = theme.colors || {};
  const colorKeys = Object.keys(colors);
  const colorKeySet = new Set(colorKeys);

  const missing = inventoryKeys.filter((k) => !colorKeySet.has(k));
  const unknown = colorKeys.filter((k) => !inventorySet.has(k)).sort();
  const badHex = colorKeys.filter((k) => typeof colors[k] !== 'string' || !HEX_RE.test(colors[k])).sort();

  const deliberate = missing.filter((k) => deliberateSources.has(k)).sort();
  const unintentional = missing.filter((k) => !deliberateSources.has(k)).sort();

  const failed = unintentional.length > 0 || unknown.length > 0 || badHex.length > 0;
  if (failed) anyFailure = true;

  results.push({
    id,
    total: colorKeys.length,
    inventoryTotal: inventoryKeys.length,
    deliberate: deliberate.map((k) => ({ key: k, group: groupOf.get(k) || null, sources: [...deliberateSources.get(k)] })),
    unintentional: unintentional.map((k) => ({ key: k, group: groupOf.get(k) || null })),
    unknown,
    badHex: badHex.map((k) => ({ key: k, value: colors[k] })),
    failed,
  });
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------
if (asJson) {
  console.log(JSON.stringify({ ok: !anyFailure, themes: results }, null, 2));
} else {
  for (const r of results) {
    console.log(`${r.id}: ${r.total}/${r.inventoryTotal} set, ${r.deliberate.length} deliberate omissions, ${r.unintentional.length} unintentional gaps`);

    if (r.deliberate.length > 0) {
      const byGroup = groupBy(r.deliberate, (d) => d.group || '(ungrouped)');
      console.log('  deliberate omissions (documented in src/colors/*.ts):');
      for (const [group, items] of byGroup) {
        for (const d of items) console.log(`    [${group}] ${d.key}  (${d.sources.join(', ')})`);
      }
    }

    if (r.unintentional.length > 0) {
      const byGroup = groupBy(r.unintentional, (d) => d.group || '(ungrouped)');
      console.log('  ✗ UNINTENTIONAL GAPS (missing from colors, not documented as deliberate anywhere):');
      for (const [group, items] of byGroup) {
        for (const d of items) console.log(`    [${group}] ${d.key}`);
      }
    }

    if (r.unknown.length > 0) {
      console.log('  ✗ UNKNOWN KEYS (present in colors, not in the 988-key inventory — likely a typo):');
      for (const k of r.unknown) console.log(`    ${k}`);
    }

    if (r.badHex.length > 0) {
      console.log('  ✗ BAD HEX VALUES (not #rrggbb / #rrggbbaa):');
      for (const b of r.badHex) console.log(`    ${b.key} = ${JSON.stringify(b.value)}`);
    }
  }
  console.log('');
  console.log(anyFailure ? 'FAIL' : 'PASS');
}

function groupBy(arr, fn) {
  const m = new Map();
  for (const item of arr) {
    const k = fn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

process.exit(anyFailure ? 1 : 0);
