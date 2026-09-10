# VS Code Theme Contract, Alpha Handling, and Contrast Pairs — Research Notes

Companion data file: [`all-color-keys.json`](./all-color-keys.json) (988 color keys, group/description/defaults/source per key, plus a `pairs` array with all 165 fg/bg pairs referenced in §3 below).

Target: **VS Code 1.136.1**, commit `a44adf7f53e00964ab890f9f8758a334f1fc15bc` (stable), installed at `/Applications/Visual Studio Code.app`. Research date: **2026-09-10**.

Primary artifacts inspected on disk (all read-only, all paths absolute):
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js` (19,399,403 bytes) — the renderer/workbench bundle. Contains the color registry (`registerColor`), the JSON schema for color-theme files, the CSS-variable emission code, and the `.monaco-workbench` background rule.
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css` (1,568,985 bytes) — the static stylesheet.
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/main.js` (1,317,373 bytes) — the Electron **main process** bundle (window creation, `ThemeMainService`).
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/nls.messages.json` — a flat, 0-indexed array of every localized string in the app (23,882 entries). The minified bundle's `d(NUM,null)` calls index directly into this array; verified by spot-checking multiple indices against known descriptions (e.g. index `3353` → `"Editor background color."`, matching `editor.background`).
- `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/theme-defaults/themes/*.json` — the real, shipped built-in themes (`2026-dark.json`, `2026-light.json`, `dark_modern.json`, `dark_plus.json`, `dark_vs.json`, `light_vs.json`, `hc_black.json`, `hc_light.json`, `light_modern.json`) and their `package.json` — used as ground truth for "what a real theme file actually contains."
- `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/{typescript-basics,python,rust,go,json,yaml,markdown-basics,css,sql,shellscript}/syntaxes/*.tmLanguage.json` — the actual built-in TextMate grammars, used to verify the per-language scope tables in §1.4.
- https://code.visualstudio.com/api/references/theme-color — fetched in full (177,432 bytes of HTML, footer dated **9/9/2026**) and parsed with BeautifulSoup for every `<code>`-wrapped key under every `<h2>` section. **910 unique color ids**, grouped into 57 sections. (No default hex swatches are shown on this page in the current site design — confirmed by grep: zero `background-color:#` / swatch markup in the fetched HTML — so `all-color-keys.json`'s `defaults` field comes from the bundle cross-check, not from this page.)
- https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide — semantic token types/modifiers/selector syntax.

---

## 1. Theme JSON file contract

### 1.1 Top-level shape, verified against the actual JSON Schema in the bundle

The `vscode://schemas/color-theme` schema is a real object in the bundle (`workbench.desktop.main.js`), assigned to a variable I'll call `xQn` in its minified form, keyed by the schema-id string `w5i="vscode://schemas/color-theme"`:

```js
w5i = "vscode://schemas/color-theme"
xQn = {
  type: "object",
  allowComments: true,          // JSONC — comments and trailing commas are allowed
  allowTrailingCommas: true,
  properties: {
    colors:               { $ref: nfe /* the full color-id map, additionalProperties:false */ },
    tokenColors:          { anyOf: [ {type:"string"} /* path to a .tmTheme file */, {$ref: qgt} ] },
    semanticHighlighting: { type: "boolean" },
    semanticTokenColors:  { type: "object", $ref: mOe },
  },
}
```

Grep used: search for the literal string `vscode://schemas/color-theme` in `workbench.desktop.main.js`, then balanced-brace-extract the object literal assigned to the preceding identifier.

**Important nuance**: `name` and `type` are **not** part of this formal schema's `properties` list. They are tolerated (JSON Schema defaults to `additionalProperties: true` when unspecified at this level) but not validated. This matches what real shipped theme files do — see below. The authoritative place the theme's *kind* (dark/light/hc-black/hc-light) is declared is the extension's `package.json`, via `contributes.themes[].uiTheme`, not the theme JSON's own `type` field.

Confirmed against the real, shipped `theme-defaults` extension (`/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/theme-defaults/`):

| file | `$schema` | `name` | `type` | `include` | other keys present |
|---|---|---|---|---|---|
| `2026-dark.json` | `vscode://schemas/color-theme` | `"2026 Dark"` | `"dark"` | — | colors, tokenColors, semanticHighlighting |
| `2026-light.json` | same | `"2026 Light"` | `"light"` | `./light_modern.json` | colors, tokenColors, semanticHighlighting |
| `dark_modern.json` | same | present | *(omitted)* | `./dark_plus.json` | colors only (rest inherited via `include`) |
| `light_modern.json` | same | present | *(omitted)* | `./light_plus.json` | colors only |
| `hc_black.json` | same | present | *(omitted — kind comes from `uiTheme:"hc-black"` in package.json)* | — | colors, tokenColors, semanticHighlighting, semanticTokenColors |
| `dark_vs.json` / `light_vs.json` | same | present | *(omitted)* | — | colors, tokenColors, semanticHighlighting, semanticTokenColors |

`package.json`'s `contributes.themes[]` for this extension uses `uiTheme` values `"vs"` (light), `"vs-dark"` (dark), `"hc-black"`, `"hc-light"` — **these are the actual four enum strings VS Code uses to classify a contributed theme**, not `dark`/`light`/`hcDark`/`hcLight` (that camelCase form is used *inside the color registry's own default-value objects* in source, e.g. `{dark:..., light:..., hcDark:..., hcLight:...}` — see §2 — which is a different, internal concept from the theme file's own optional `type` field).

**`include`** (undocumented in the task prompt, discovered from real files): a theme JSON can set `"include": "./otherTheme.json"` to layer its `colors`/`tokenColors`/`semanticTokenColors` on top of another theme file's. `dark_modern.json` → includes `dark_plus.json`; `light_modern.json` → includes `light_plus.json`; `2026-light.json` → includes `light_modern.json` (a 2-hop chain). Useful technique for a 4-variant theme family like VS Glass: a "base" JSON with the full contract, and per-variant JSONs that `include` it and only override the handful of keys that differ.

### 1.2 `tokenColors` — exact schema, straight from the bundle

The schema referenced by `qgt` (id `vscode://schemas/textmate-colors`):

```js
{
  type: "array",
  items: {
    type: "object",
    properties: {
      name:  { type: "string" },                 // optional label, cosmetic only
      scope: { anyOf: [
        { enum: H4o },              // the 100 "well-known" scopes, see §1.3 — autocomplete only, any string is valid
        { type: "string" },
        { type: "array", items: { enum: H4o } },
        { type: "array", items: { type: "string" } },
      ] },
      settings: { $ref: "#/definitions/settings" },
    },
    required: ["settings"],
    additionalProperties: false,
  },
  definitions: {
    settings: {
      type: "object",
      properties: {
        foreground: { type: "string", format: "color-hex", default: "#ff0000" },
        background: { type: "string", deprecationMessage: /* nls */ },   // ← DEPRECATED, see §4
        fontStyle:  { type: "string",
          pattern: "^(\\s*\\b(italic|bold|underline|strikethrough))*\\s*$",
          defaultSnippets: [
            { label: /* "Clear" */, bodyText: '""' },   // ← empty string is an offered, intentional value
            { body: "italic" }, { body: "bold" }, { body: "underline" }, { body: "strikethrough" },
            { body: "italic bold" }, /* ...and all other 2-3 word combinations */
          ],
        },
        fontFamily: { type: "string" },   // undocumented on the public reference page, but real & schema-valid
        fontSize:   { type: "number" },   // ditto
        lineHeight: { type: "number" },   // ditto
      },
      additionalProperties: false,
    },
  },
}
```

`format: "color-hex"` is the **same** hex-color format validator used for `colors.*` (§2), so 3/4/6/8-digit hex — including the 8-digit `#RRGGBBAA` alpha form — validates for `tokenColors[].settings.foreground` exactly as it does for workbench colors. See §2 for the alpha proof (the whole app funnels through one `Color` parser regardless of which JSON field the string came from).

### 1.3 The 100 "well-known" TextMate scopes (verified, from the schema's own autocomplete enum)

This is the literal `H4o` array from the bundle — the canonical, general-purpose scope list VS Code itself offers for autocomplete in `tokenColors[].scope`. It is *not* exhaustive (grammars can and do use far more specific scopes — see §1.4) but it is the authoritative "starter set" a theme should have opinions about:

```
comment  comment.block  comment.block.documentation  comment.line
constant  constant.character  constant.character.escape  constant.numeric
constant.numeric.integer  constant.numeric.float  constant.numeric.hex  constant.numeric.octal
constant.other  constant.regexp  constant.rgb-value
emphasis
entity  entity.name  entity.name.class  entity.name.function  entity.name.method
entity.name.section  entity.name.selector  entity.name.tag  entity.name.type
entity.other  entity.other.attribute-name  entity.other.inherited-class
invalid  invalid.deprecated  invalid.illegal
keyword  keyword.control  keyword.operator  keyword.operator.new
keyword.operator.assignment  keyword.operator.arithmetic  keyword.operator.logical  keyword.other
markup  markup.bold  markup.changed  markup.deleted  markup.heading  markup.inline.raw
markup.inserted  markup.italic  markup.list  markup.list.numbered  markup.list.unnumbered
markup.other  markup.quote  markup.raw  markup.underline  markup.underline.link
meta  meta.block  meta.cast  meta.class  meta.function  meta.function-call
meta.preprocessor  meta.return-type  meta.selector  meta.tag  meta.type.annotation  meta.type
punctuation.definition.string.begin  punctuation.definition.string.end
punctuation.separator  punctuation.separator.continuation  punctuation.terminator
storage  storage.modifier  storage.type
string  string.interpolated  string.other  string.quoted  string.quoted.double
string.quoted.other  string.quoted.single  string.quoted.triple  string.regexp  string.unquoted
strong
support  support.class  support.constant  support.function  support.other  support.type
support.type.property-name  support.variable
variable  variable.language  variable.name  variable.other  variable.other.readwrite  variable.parameter
```

### 1.4 Most important scopes per language (verified against the actual installed grammars)

Extracted with a script that collects every `"name": "…"` value out of each built-in `.tmLanguage.json` grammar file (these *are* the TextMate scopes that grammar assigns to tokens), then hand-picked the ~6 most theme-relevant per language — favoring scopes that differentiate keywords/types/functions/strings/comments/operators from the generic §1.3 set. Grammar files used (all under `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/`):

| Language | Grammar file | Unique scopes found |
|---|---|---|
| TypeScript | `typescript-basics/syntaxes/TypeScript.tmLanguage.json` | 253 |
| TSX | `typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json` | 266 |
| Python | `python/syntaxes/MagicPython.tmLanguage.json` | 158 |
| Rust | `rust/syntaxes/rust.tmLanguage.json` | 94 |
| Go | `go/syntaxes/go.tmLanguage.json` | 95 |
| JSON | `json/syntaxes/JSON.tmLanguage.json` | 25 |
| YAML | `yaml/syntaxes/yaml.tmLanguage.json` | 6 (YAML leans almost entirely on the generic §1.3 scopes) |
| Markdown | `markdown-basics/syntaxes/markdown.tmLanguage.json` | 73 |
| CSS | `css/syntaxes/css.tmLanguage.json` | 178 |
| SQL | `sql/syntaxes/sql.tmLanguage.json` | 72 |
| Shell | `shellscript/syntaxes/shell-unix-bash.tmLanguage.json` | 120 |

Curated ~60-scope table (all confirmed present in the grammar file listed):

**TypeScript / TSX** — `storage.modifier.ts` (`readonly`/`public`/…), `storage.modifier.async.ts`, `keyword.control.export.ts`, `keyword.operator.rest.ts`, `keyword.operator.optional.ts`, `punctuation.accessor.ts` (`.` / `?.`), `meta.object.member.ts`, `variable.parameter.ts`, `keyword.control.as.ts` (type assertion), `keyword.control.type.ts`, `storage.type.numeric.bigint.ts`, `entity.name.type.instance.jsdoc` — JSX adds no new *root* scopes (it reuses `entity.name.tag`/`entity.other.attribute-name` from §1.3, suffixed `.tsx`).

**Python** — `storage.type.string.python` (`str`/f-string markers), `meta.fstring.python`, `punctuation.definition.string.begin/end.python`, `keyword.control.flow.python`, `keyword.control.import.python`, `storage.type.function.lambda.python`, `variable.parameter.function.language.python` (`self`/`cls`), `comment.line.number-sign.python`, `constant.character.format.placeholder.other.python` (`{}` in f-strings), `invalid.illegal.newline.python` (unterminated-string diagnostics — themes rarely style this, but it exists).

**Rust** — `storage.type.rust`, `storage.modifier.visibility.rust` (`pub`), `entity.name.function.rust`, `entity.name.function.macro.rust` / `entity.name.type.macro.rust` (`vec!`, `println!`), `keyword.operator.macro.dollar.rust`, `keyword.other.crate.rust`, `variable.other.metavariable.specifier.rust`, `constant.other.caps.rust` (SCREAMING_CASE consts), `punctuation.brackets.angle.rust` (generics `<T>`).

**Go** — `entity.name.type.go`, `keyword.type.go`, `keyword.function.go`, `keyword.interface.go`, `variable.other.property.go`, `variable.other.assignment.go`, `constant.numeric.hexadecimal.go` / `constant.numeric.decimal.go`, `keyword.other.unit.imaginary.go` (complex-number `i` suffix).

**JSON** — `support.type.property-name.begin/end.json` (object keys, the scope a JSON theme should treat distinctly from string *values*), `constant.language.json` (`true`/`false`/`null`), `meta.structure.dictionary.value.json`, `punctuation.support.type.property-name.begin/end.json`, `punctuation.separator.dictionary.key-value.json` (the `:`).

**YAML** — leans on generic `string.unquoted`/`comment.line`/`punctuation.definition.string.*` from §1.3; the only YAML-specific ones present are `punctuation.definition.string.begin/end.yaml` and `constant.character.escape.single-quote.yaml`. (Key vs. value distinction in YAML is handled at the `meta.*` level, not via dedicated scope names — a notable gotcha if you expect a `variable.other.yaml`-style key scope; it doesn't exist in this grammar.)

**Markdown** — `punctuation.definition.markdown` (the single busiest scope in the whole grammar — every `*`, `_`, `#`, `` ` `` delimiter), `markup.fenced_code.block.markdown` + `fenced_code.block.language.markdown` (the ```lang fence and its language tag), `punctuation.definition.heading.markdown`, `entity.name.section.markdown` (heading text), `markup.underline.link.markdown`, `string.other.link.description.title.markdown`.

**CSS** — `punctuation.section.function.begin/end.bracket.round.css` (`url(`/`rgb(`…), `punctuation.definition.keyword.css`, `entity.other.attribute-name.pseudo-class.css` (`:hover`), `support.type.property-name.media.css`, `support.constant.property-value.css`, `keyword.control.at-rule.css` (`@media`), `entity.other.namespace-prefix.css`.

**SQL** — `storage.type.sql` (column types), `keyword.other.create.sql` / `keyword.other.DML.sql`, `entity.name.function.sql`, `string.quoted.other.backtick.sql` (identifiers), `constant.numeric.sql`, `keyword.other.cascade.sql`.

**Shell** — `variable.other.assignment.shell`, `variable.other.normal.shell` (`$VAR`), `punctuation.definition.string.heredoc.delimiter.shell`, `keyword.operator.heredoc.shell` / `keyword.operator.herestring.shell`, `keyword.control.shell`, `punctuation.definition.logical-expression.shell` (`[[ ]]`).

### 1.5 `semanticTokenColors`

Source: https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide (fetched 2026-09-10).

**Standard token types** (23): `namespace, class, enum, interface, struct, typeParameter, type, parameter, variable, property, enumMember, decorator, event, function, method, macro, label, comment, string, keyword, number, regexp, operator`

**Standard modifiers** (10): `declaration, definition, readonly, static, deprecated, abstract, async, modification, documentation, defaultLibrary`

**Selector syntax**, quoted exactly from the doc: `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?` — i.e. a type or `*`, followed by zero or more dot-joined modifiers, followed by an optional `:language` scope. Examples from the doc: `"*.declaration"` (any declaration, any type), `"class:java"` (only in Java), `"variable.readonly"`. A theme requesting only the modifier (`"*.declaration"`) matches every token type that carries that modifier — this is the idiom for e.g. dimming every read-only binding regardless of whether it's a `variable`, `property`, or `parameter`.

Example block from the doc:
```json
{
  "name": "Red Theme",
  "tokenColors": [ { "scope": "comment", "settings": { "foreground": "#dd0000", "fontStyle": "italic" } } ],
  "semanticHighlighting": true,
  "semanticTokenColors": { "variable.readonly:java": "#ff0011" }
}
```

`semanticTokenColors` values can be either a plain hex-string shorthand (foreground only) or a `{foreground, fontStyle, bold, italic, underline, strikethrough}` object.

**Gotcha, observed in a real file, not in the public doc**: `dark_vs.json`'s `semanticTokenColors` block uses keys `newOperator`, `stringLiteral`, `customLiteral`, `numberLiteral` — none of which are in the 23 standard types above. These are legacy classification names from VS Code's original (pre-LSP-semantic-tokens) TypeScript "classifier" API, carried forward in the old Visual-Studio-ported theme for backward compatibility. **Lesson for VS Glass**: don't assume `semanticTokenColors` keys are drawn only from the 23-type list — some built-in and third-party language services register additional custom types/legends via their own `contributes.semanticTokenTypes` (checked `typescript-language-features/package.json`: none registered there in 1.136.1, so this specific quartet is likely a compatibility shim rather than a live legend entry — treat as low-value and skip in VS Glass unless targeting the classic "Visual Studio Dark" look specifically).

---

## 2. Alpha handling — `#RRGGBBAA` and which surfaces honour it

### 2.1 Every color is parsed to RGBA and emitted uniformly — VERIFIED

`workbench.desktop.main.js` contains one `Color`/`RGBA` implementation used for **every** color that flows through the registry, regardless of source (a theme's `colors` object, `tokenColors[].settings.foreground`, or a hardcoded default). The CSS-variable-name function and the RGB(A) formatters:

```js
function CH(s){ return `--vscode-${s.replace(/\./g,"-")}` }      // "editor.background" -> "--vscode-editor-background"
function Lt(s){ return `var(${CH(s)})` }
function vD(s,o){ return `var(${CH(s)}, ${o})` }                  // with fallback

// inside the Color.Format.CSS namespace:
function formatRGB(color)  { return color.rgba.a === 1 ? `rgb(${r}, ${g}, ${b})` : formatRGBA(color) }
function formatRGBA(color) { return `rgba(${r}, ${g}, ${b}, ${+color.rgba.a.toFixed(2)})` }
```

This confirms, precisely:
- **Every** registered color id becomes a CSS custom property `--vscode-<id-with-dots-as-dashes>` (e.g. `editor.background` → `--vscode-editor-background`), consumed via `var(--vscode-…)` in the stylesheet.
- Alpha is preserved end-to-end: if a theme's hex value (workbench `colors.*` *or* `tokenColors[].settings.foreground`, both validated with the same `format:"color-hex"` JSON-schema rule — see §1.2) has an alpha channel `< 1`, the property is emitted as `rgba(r, g, b, a)` with alpha rounded to 2 decimals; if alpha is exactly `1`, it's emitted as the shorter `rgb(r, g, b)`. There is **no per-key opt-out or special-casing** in this code path — alpha support is a property of the shared `Color` parser, not of individual `registerColor()` calls. This directly confirms task fact (i).
- There is no equivalent CSS-variable emission visible for `tokenColors` (those are applied by the editor's tokenizer directly as inline styles / decoration classes on `.mtk*` spans, not as `--vscode-*` custom properties), but the *parsing* of the hex string (including alpha) goes through the same `Color.Format.CSS.parseHex` used everywhere else, per the shared `format:"color-hex"` schema rule.

### 2.2 Surfaces that are canvas-drawn or otherwise composited differently — PARTIALLY VERIFIED

Grep for 2D canvas context creation in `workbench.desktop.main.js` found:
```js
getContext("2d", { willReadFrequently: true, alpha: this._antiAliasing === "greyscale" })
```
This is the text/minimap character-cache canvas. **It defaults to an *opaque* canvas backing (`alpha:false`) unless the editor's font antialiasing mode is explicitly `"greyscale"`** — meaning glass/translucency effects placed *behind* rendered character glyphs on this canvas will not show through in the default ("subpixel"/"default") antialiasing mode, only in greyscale mode. This is a concrete, citable constraint for VS Glass's editor-text layer.

The terminal (`xterm.js`) and its WebGL/canvas renderer addons are **not** present in `workbench.desktop.main.js` as a `getContext("webgl…")` call (0 matches) — they load from a separate lazily-loaded contribution not included in this single bundle file. This part of task fact (ii) — terminal canvas compositing behavior — is **Assumed** (well-established public knowledge of xterm.js's canvas/WebGL renderers), not verified against this specific bundle.

### 2.3 `editor.background` alpha lets the workbench show through — VERIFIED (mechanism identified precisely)

This is true, but *not* because `.monaco-workbench` itself paints `editor.background` — it doesn't (see §2.4). The mechanism is layering: `.monaco-editor` and `.monaco-editor-background` set `background-color: var(--vscode-editor-background)` directly (confirmed in the static CSS bundle), so wherever the editor part paints, an alpha-carrying `editor.background` shows whatever is *beneath the editor DOM element* — which, per §2.5, is ultimately the native (and by default transparent + vibrancy-active) Electron window, not a solid workbench-painted color, **provided** every intermediate layer (the fixed `.monaco-workbench` fill in §2.4, any part backgrounds) is also made transparent/low-alpha or removed. This is exactly the mechanism third-party "vibrancy" patches (e.g. the user's already-installed Vibrancy Continued extension, per `PROGRESS.md`) rely on.

### 2.4 Which key paints `.monaco-workbench` itself — VERIFIED, and it is *not* a themeable key at all

Grep of the **static** CSS bundle (`workbench.desktop.main.css`) for the exact selector `.monaco-workbench{` (6 occurrences) found **no `background`/`background-color` declaration on any of them** — the main workbench rule only sets `color: var(--vscode-foreground)`, layout, and shadow custom properties, never a background.

The actual background rule is injected **at runtime**, as a theme-change listener in `workbench.desktop.main.js`, and it does **not** read `editor.background` (or any other user-themeable color key) at all:

```js
function CB(theme) {
  switch (theme.type) {
    case "light":   return Color.fromHex("#F3F3F3");
    case "hcLight": return Color.fromHex("#FFFFFF");
    case "hcDark":  return Color.fromHex("#000000");
    default:        return Color.fromHex("#252526");   // dark (and anything else)
  }
}
registerThemingParticipant((theme, collector) => {
  const bg = CB(theme);
  collector.addRule(`.monaco-workbench { background-color: ${bg}; }`);
  const sel = theme.getColor(selectionBackgroundColorId);   // "selection.background"
  if (sel) collector.addRule(`.monaco-workbench ::selection { background-color: ${sel}; }`);
  /* ...macOS-only meta theme-color tag update... */
});
```

**This is the single most important finding for VS Glass's transparency plan**: the outermost workbench background is a **hardcoded, per-base-theme-kind, fully-opaque constant** (`#252526` for essentially all dark themes, `#F3F3F3` for light, pure black/white for the two high-contrast kinds) — it is emitted as a plain `background-color: #rrggbb` (6-digit, alpha always 1), completely independent of the active theme's `colors` object. **No color key controls it, and `workbench.colorCustomizations` cannot touch it either** (there is no id for it in the registry — confirmed absent from all 988 keys in `all-color-keys.json`). To get true glass/vibrancy on macOS, this specific injected `.monaco-workbench { background-color: … }` rule must be neutralized (e.g. via a Custom-CSS-loader-style patch, or the same technique Vibrancy Continued already uses per `PROGRESS.md`) — setting `editor.background` (or any other key) to a low-alpha value is not sufficient on its own, since this opaque fill sits underneath every part and above the native window.

Citations: selector search `grep -n '\.monaco-workbench{'` → 6 rule bodies in `workbench.desktop.main.css`; runtime rule found via string search for the literal template fragment `` `.monaco-workbench { background-color: ${`` in `workbench.desktop.main.js`; the `CB` fallback-color function immediately precedes it in the same statement.

### 2.5 Native window transparency / vibrancy — VERIFIED, and already default-on in 1.136.1

In `main.js` (Electron **main process**, not the renderer), the function that builds every `BrowserWindow`'s construction options (`ql(...)`) sets, **unconditionally, before any platform branch**:

```js
c = {
  backgroundColor: themeMainService.getBackgroundColor(),
  ...
  visualEffectState: "active",
  frame: false,
  transparent: true,
  experimentalDarkMode: true,
}
```

i.e. **every VS Code 1.136.1 main window is already created as a frameless, `transparent:true` Electron window with `visualEffectState:"active"`** (the macOS-specific Electron option that keeps the window's `NSVisualEffectView`/vibrancy material live even when the window isn't key). This is not something a third-party extension has to add — it's the shipping default. (`visualEffectState` has no effect on Windows/Linux; `transparent:true` behavior is platform-dependent per Electron's own docs, but on macOS this is the direct enabler of the "see-through-to-desktop" look before any renderer content paints.)

`backgroundColor` (the Electron-native fallback paint color shown before the renderer's own CSS takes over, and the color a *transparent* window blends toward when nothing else is drawn) comes from `ThemeMainService.getBackgroundColor()`:

```js
getBackgroundColor() {
  const preferred = this.getPreferredBaseTheme(), stored = this.getStoredBaseTheme();
  if (preferred === undefined || preferred === stored) {
    const saved = this.stateService.getItem("themeBackground", null);
    if (saved) return saved;                 // persisted actual color from the last window
  }
  switch (preferred ?? stored) {
    case "vs":       return "#FFFFFF";
    case "hc-black":  return "#000000";
    case "hc-light":  return "#FFFFFF";
    default:          return "#1F1F1F";       // dark
  }
}
```

The `"themeBackground"` storage key is written by `saveWindowSplash(...)`, called with `colorInfo.background` sent from the **renderer** to the main process (i.e. the renderer computes/observes its own actual resolved background — the "window splash" screen color — and hands it to the main process so the *next* window launch can paint the correct native background before any HTML loads, avoiding a flash of the wrong color). This confirms the full loop: renderer resolves the effective visible background → persists it → main process seeds the native window's `backgroundColor` from it on next launch, while `transparent:true`/`visualEffectState:"active"` mean the true visible "ground" the user sees through any translucent layer is the OS-composited vibrancy material, not a flat color at all.

Citations: `main.js`, functions/constants (minified names in the September 2026 build) `ql` (window-options builder), `ThemeMainService.getBackgroundColor`/`getStoredBaseTheme`/`saveWindowSplash`, constants `d8="#FFFFFF"`, `u8="#1F1F1F"`, `p8="#000000"`, `f8="#FFFFFF"`, `BL="theme"`, `VL="themeBackground"`.

### 2.6 `window.systemColorTheme` / `window.titleBarStyle` interplay — VERIFIED (setting exists, mechanism identified) / Assumed (exact enum, from public docs)

`window.systemColorTheme` (`Cr.SYSTEM_COLOR_THEME`, default value `"default"`) is a real, registered setting read by `ThemeMainService.updateSystemColorTheme()`:

```js
updateSystemColorTheme() {
  if (isLinux || this.isAutoDetectColorScheme()) { nativeTheme.themeSource = "system"; return; }
  switch (SYSTEM_COLOR_THEME.getValue(configurationService)) {
    case "dark":  nativeTheme.themeSource = "dark";  break;
    case "light": nativeTheme.themeSource = "light"; break;
    case "auto":
      switch (this.getPreferredBaseTheme() ?? this.getStoredBaseTheme()) {
        case "vs":      nativeTheme.themeSource = "light"; break;
        case "vs-dark": nativeTheme.themeSource = "dark";  break;
        default:        nativeTheme.themeSource = "system";
      }
      break;
    default: nativeTheme.themeSource = "system";
  }
}
```

This sets Electron's `nativeTheme.themeSource`, which governs **native OS chrome** — the macOS traffic-light buttons, native context menus, and (per task prompt, consistent with public VS Code docs — Assumed, not independently re-derived from this grep) the native title bar's own light/dark tint **when `window.titleBarStyle` is `"native"`**. When `window.titleBarStyle` is `"custom"` (the default on macOS since VS Code draws its own title bar to host the Command Center / menu), the title bar is an ordinary themed DOM element painted by `titleBar.activeBackground`/`titleBar.activeForeground` etc. (see the pairs list in §3) and `window.systemColorTheme` has no visible effect on it — only on the traffic-light buttons' own light/dark rendering and any native menu popups. This means: **for VS Glass, `titleBarStyle:"custom"` is the path that makes the title bar themeable/glassable at all**; `window.systemColorTheme` is a separate, macOS-native-chrome-only concern.

---

## 3. Contrast / accessibility pairing list

165 foreground/background pairs, generated by (a) an automatic `*Foreground` ↔ `*Background` / `.foreground` ↔ `.background` suffix-swap over all 988 keys in `all-color-keys.json`, validating both sides actually exist (131 pairs), plus (b) 34 hand-curated pairs for surfaces whose foreground/background don't share a literal name (e.g. `panelTitle.activeForeground` is painted over `panel.background`, not a nonexistent `panelTitle.activeBackground`). Classified `"text"` (regular readable text — target **4.5:1** per WCAG 2.1 SC 1.4.3) vs `"ui"` (icons, badges, cursors, checkboxes/radios, gutter indicators, avatars — target **3:1** per SC 1.4.11 non-text contrast) by inspecting what each pair actually renders. 131 "text" pairs, 34 "ui" pairs. The identical, complete list (with `note` fields where present) is also available as the top-level `"pairs"` array in `all-color-keys.json`, for the audit script to consume directly without re-parsing this document.

```json
[
  {"fg": "activeSessionView.foreground", "bg": "activeSessionView.background", "kind": "text"},
  {"fg": "activityBar.foreground", "bg": "activityBar.background", "kind": "text"},
  {"fg": "activityBarBadge.foreground", "bg": "activityBarBadge.background", "kind": "ui"},
  {"fg": "activityBarTop.foreground", "bg": "activityBarTop.background", "kind": "text"},
  {"fg": "activityErrorBadge.foreground", "bg": "activityErrorBadge.background", "kind": "ui"},
  {"fg": "activityWarningBadge.foreground", "bg": "activityWarningBadge.background", "kind": "ui"},
  {"fg": "agentsBadge.foreground", "bg": "agentsBadge.background", "kind": "ui"},
  {"fg": "agentsChatInput.foreground", "bg": "agentsChatInput.background", "kind": "text"},
  {"fg": "agentsNewSessionButton.foreground", "bg": "agentsNewSessionButton.background", "kind": "text"},
  {"fg": "agentsPanel.foreground", "bg": "agentsPanel.background", "kind": "text"},
  {"fg": "agentsUnreadBadge.foreground", "bg": "agentsUnreadBadge.background", "kind": "ui"},
  {"fg": "agentsVoice.speakingForeground", "bg": "agentsVoice.speakingBackground", "kind": "text"},
  {"fg": "badge.foreground", "bg": "badge.background", "kind": "text"},
  {"fg": "banner.foreground", "bg": "banner.background", "kind": "text"},
  {"fg": "breadcrumb.foreground", "bg": "breadcrumb.background", "kind": "text"},
  {"fg": "button.foreground", "bg": "button.background", "kind": "text"},
  {"fg": "button.secondaryForeground", "bg": "button.secondaryBackground", "kind": "text"},
  {"fg": "chat.avatarForeground", "bg": "chat.avatarBackground", "kind": "ui"},
  {"fg": "chat.slashCommandForeground", "bg": "chat.slashCommandBackground", "kind": "ui"},
  {"fg": "checkbox.disabled.foreground", "bg": "checkbox.disabled.background", "kind": "ui"},
  {"fg": "checkbox.foreground", "bg": "checkbox.background", "kind": "ui"},
  {"fg": "commandCenter.activeForeground", "bg": "commandCenter.activeBackground", "kind": "ui"},
  {"fg": "commandCenter.foreground", "bg": "commandCenter.background", "kind": "ui"},
  {"fg": "debugView.exceptionLabelForeground", "bg": "debugView.exceptionLabelBackground", "kind": "text"},
  {"fg": "debugView.stateLabelForeground", "bg": "debugView.stateLabelBackground", "kind": "text"},
  {"fg": "diffEditor.unchangedRegionForeground", "bg": "diffEditor.unchangedRegionBackground", "kind": "text"},
  {"fg": "dropdown.foreground", "bg": "dropdown.background", "kind": "text"},
  {"fg": "editor.findMatchForeground", "bg": "editor.findMatchBackground", "kind": "text"},
  {"fg": "editor.findMatchHighlightForeground", "bg": "editor.findMatchHighlightBackground", "kind": "text"},
  {"fg": "editor.foreground", "bg": "editor.background", "kind": "text"},
  {"fg": "editor.inlineValuesForeground", "bg": "editor.inlineValuesBackground", "kind": "text"},
  {"fg": "editor.selectionForeground", "bg": "editor.selectionBackground", "kind": "text"},
  {"fg": "editorActionList.focusForeground", "bg": "editorActionList.focusBackground", "kind": "text"},
  {"fg": "editorActionList.foreground", "bg": "editorActionList.background", "kind": "text"},
  {"fg": "editorBracketMatch.foreground", "bg": "editorBracketMatch.background", "kind": "text"},
  {"fg": "editorCursor.foreground", "bg": "editorCursor.background", "kind": "ui"},
  {"fg": "editorError.foreground", "bg": "editorError.background", "kind": "text"},
  {"fg": "editorGhostText.foreground", "bg": "editorGhostText.background", "kind": "text"},
  {"fg": "editorGroup.dropIntoPromptForeground", "bg": "editorGroup.dropIntoPromptBackground", "kind": "ui"},
  {"fg": "editorHoverWidget.foreground", "bg": "editorHoverWidget.background", "kind": "text"},
  {"fg": "editorInfo.foreground", "bg": "editorInfo.background", "kind": "text"},
  {"fg": "editorInlayHint.foreground", "bg": "editorInlayHint.background", "kind": "text"},
  {"fg": "editorInlayHint.parameterForeground", "bg": "editorInlayHint.parameterBackground", "kind": "text"},
  {"fg": "editorInlayHint.typeForeground", "bg": "editorInlayHint.typeBackground", "kind": "text"},
  {"fg": "editorMultiCursor.primary.foreground", "bg": "editorMultiCursor.primary.background", "kind": "ui"},
  {"fg": "editorMultiCursor.secondary.foreground", "bg": "editorMultiCursor.secondary.background", "kind": "ui"},
  {"fg": "editorSuggestWidget.foreground", "bg": "editorSuggestWidget.background", "kind": "text"},
  {"fg": "editorSuggestWidget.selectedForeground", "bg": "editorSuggestWidget.selectedBackground", "kind": "text"},
  {"fg": "editorWarning.foreground", "bg": "editorWarning.background", "kind": "text"},
  {"fg": "editorWidget.foreground", "bg": "editorWidget.background", "kind": "text"},
  {"fg": "extensionBadge.remoteForeground", "bg": "extensionBadge.remoteBackground", "kind": "ui"},
  {"fg": "extensionButton.foreground", "bg": "extensionButton.background", "kind": "text"},
  {"fg": "extensionButton.prominentForeground", "bg": "extensionButton.prominentBackground", "kind": "text"},
  {"fg": "gauge.errorForeground", "bg": "gauge.errorBackground", "kind": "text"},
  {"fg": "gauge.foreground", "bg": "gauge.background", "kind": "text"},
  {"fg": "gauge.warningForeground", "bg": "gauge.warningBackground", "kind": "text"},
  {"fg": "inactiveSessionView.foreground", "bg": "inactiveSessionView.background", "kind": "text"},
  {"fg": "inlineChat.foreground", "bg": "inlineChat.background", "kind": "text"},
  {"fg": "inlineEdit.gutterIndicator.primaryForeground", "bg": "inlineEdit.gutterIndicator.primaryBackground", "kind": "ui"},
  {"fg": "inlineEdit.gutterIndicator.secondaryForeground", "bg": "inlineEdit.gutterIndicator.secondaryBackground", "kind": "ui"},
  {"fg": "inlineEdit.gutterIndicator.successfulForeground", "bg": "inlineEdit.gutterIndicator.successfulBackground", "kind": "ui"},
  {"fg": "input.foreground", "bg": "input.background", "kind": "text"},
  {"fg": "inputOption.activeForeground", "bg": "inputOption.activeBackground", "kind": "ui"},
  {"fg": "inputValidation.errorForeground", "bg": "inputValidation.errorBackground", "kind": "text"},
  {"fg": "inputValidation.infoForeground", "bg": "inputValidation.infoBackground", "kind": "text"},
  {"fg": "inputValidation.warningForeground", "bg": "inputValidation.warningBackground", "kind": "text"},
  {"fg": "keybindingLabel.foreground", "bg": "keybindingLabel.background", "kind": "text"},
  {"fg": "list.activeSelectionForeground", "bg": "list.activeSelectionBackground", "kind": "text"},
  {"fg": "list.focusForeground", "bg": "list.focusBackground", "kind": "text"},
  {"fg": "list.hoverForeground", "bg": "list.hoverBackground", "kind": "text"},
  {"fg": "list.inactiveSelectionForeground", "bg": "list.inactiveSelectionBackground", "kind": "text"},
  {"fg": "menu.foreground", "bg": "menu.background", "kind": "text"},
  {"fg": "menu.selectionForeground", "bg": "menu.selectionBackground", "kind": "text"},
  {"fg": "menubar.selectionForeground", "bg": "menubar.selectionBackground", "kind": "text"},
  {"fg": "modernActivityBar.activeForeground", "bg": "modernActivityBar.activeBackground", "kind": "text"},
  {"fg": "modernActivityBar.hoverForeground", "bg": "modernActivityBar.hoverBackground", "kind": "text"},
  {"fg": "modernActivityBarItem.activeForeground", "bg": "modernActivityBarItem.activeBackground", "kind": "text"},
  {"fg": "modernActivityBarItem.hoverForeground", "bg": "modernActivityBarItem.hoverBackground", "kind": "text"},
  {"fg": "modernEditorTab.activeForeground", "bg": "modernEditorTab.activeBackground", "kind": "text"},
  {"fg": "modernEditorTab.hoverForeground", "bg": "modernEditorTab.hoverBackground", "kind": "text"},
  {"fg": "modernTab.activeForeground", "bg": "modernTab.activeBackground", "kind": "text"},
  {"fg": "modernTab.hoverForeground", "bg": "modernTab.hoverBackground", "kind": "text"},
  {"fg": "notificationCenterHeader.foreground", "bg": "notificationCenterHeader.background", "kind": "text"},
  {"fg": "notifications.foreground", "bg": "notifications.background", "kind": "text"},
  {"fg": "panelSectionHeader.foreground", "bg": "panelSectionHeader.background", "kind": "text"},
  {"fg": "panelTitleBadge.foreground", "bg": "panelTitleBadge.background", "kind": "ui"},
  {"fg": "peekViewResult.selectionForeground", "bg": "peekViewResult.selectionBackground", "kind": "text"},
  {"fg": "profileBadge.foreground", "bg": "profileBadge.background", "kind": "ui"},
  {"fg": "quickInput.foreground", "bg": "quickInput.background", "kind": "text"},
  {"fg": "quickInputList.focusForeground", "bg": "quickInputList.focusBackground", "kind": "text"},
  {"fg": "radio.activeForeground", "bg": "radio.activeBackground", "kind": "ui"},
  {"fg": "radio.inactiveForeground", "bg": "radio.inactiveBackground", "kind": "ui"},
  {"fg": "scmGraph.historyItemHoverDefaultLabelForeground", "bg": "scmGraph.historyItemHoverDefaultLabelBackground", "kind": "text"},
  {"fg": "settings.checkboxForeground", "bg": "settings.checkboxBackground", "kind": "ui"},
  {"fg": "settings.dropdownForeground", "bg": "settings.dropdownBackground", "kind": "text"},
  {"fg": "settings.numberInputForeground", "bg": "settings.numberInputBackground", "kind": "text"},
  {"fg": "settings.textInputForeground", "bg": "settings.textInputBackground", "kind": "text"},
  {"fg": "sideBar.foreground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "sideBarSectionHeader.foreground", "bg": "sideBarSectionHeader.background", "kind": "text"},
  {"fg": "sideBarTitle.foreground", "bg": "sideBarTitle.background", "kind": "text"},
  {"fg": "statusBar.debuggingForeground", "bg": "statusBar.debuggingBackground", "kind": "text"},
  {"fg": "statusBar.foreground", "bg": "statusBar.background", "kind": "text"},
  {"fg": "statusBar.noFolderForeground", "bg": "statusBar.noFolderBackground", "kind": "text"},
  {"fg": "statusBarItem.errorForeground", "bg": "statusBarItem.errorBackground", "kind": "text"},
  {"fg": "statusBarItem.errorHoverForeground", "bg": "statusBarItem.errorHoverBackground", "kind": "text"},
  {"fg": "statusBarItem.hoverForeground", "bg": "statusBarItem.hoverBackground", "kind": "text"},
  {"fg": "statusBarItem.offlineForeground", "bg": "statusBarItem.offlineBackground", "kind": "text"},
  {"fg": "statusBarItem.offlineHoverForeground", "bg": "statusBarItem.offlineHoverBackground", "kind": "text"},
  {"fg": "statusBarItem.prominentForeground", "bg": "statusBarItem.prominentBackground", "kind": "text"},
  {"fg": "statusBarItem.prominentHoverForeground", "bg": "statusBarItem.prominentHoverBackground", "kind": "text"},
  {"fg": "statusBarItem.remoteForeground", "bg": "statusBarItem.remoteBackground", "kind": "text"},
  {"fg": "statusBarItem.remoteHoverForeground", "bg": "statusBarItem.remoteHoverBackground", "kind": "text"},
  {"fg": "statusBarItem.warningForeground", "bg": "statusBarItem.warningBackground", "kind": "text"},
  {"fg": "statusBarItem.warningHoverForeground", "bg": "statusBarItem.warningHoverBackground", "kind": "text"},
  {"fg": "surface.foreground", "bg": "surface.background", "kind": "text"},
  {"fg": "tab.activeForeground", "bg": "tab.activeBackground", "kind": "text"},
  {"fg": "tab.hoverForeground", "bg": "tab.hoverBackground", "kind": "text"},
  {"fg": "tab.inactiveForeground", "bg": "tab.inactiveBackground", "kind": "text"},
  {"fg": "tab.selectedForeground", "bg": "tab.selectedBackground", "kind": "text"},
  {"fg": "tab.unfocusedActiveForeground", "bg": "tab.unfocusedActiveBackground", "kind": "text"},
  {"fg": "tab.unfocusedHoverForeground", "bg": "tab.unfocusedHoverBackground", "kind": "text"},
  {"fg": "tab.unfocusedInactiveForeground", "bg": "tab.unfocusedInactiveBackground", "kind": "text"},
  {"fg": "terminal.foreground", "bg": "terminal.background", "kind": "text"},
  {"fg": "terminal.selectionForeground", "bg": "terminal.selectionBackground", "kind": "text"},
  {"fg": "terminalCursor.foreground", "bg": "terminalCursor.background", "kind": "ui"},
  {"fg": "testing.coverCountBadgeForeground", "bg": "testing.coverCountBadgeBackground", "kind": "ui"},
  {"fg": "testing.message.error.badgeForeground", "bg": "testing.message.error.badgeBackground", "kind": "text"},
  {"fg": "textPreformat.foreground", "bg": "textPreformat.background", "kind": "text"},
  {"fg": "titleBar.activeForeground", "bg": "titleBar.activeBackground", "kind": "text"},
  {"fg": "titleBar.inactiveForeground", "bg": "titleBar.inactiveBackground", "kind": "text"},
  {"fg": "welcomePage.progress.foreground", "bg": "welcomePage.progress.background", "kind": "text"},
  {"fg": "panelTitle.activeForeground", "bg": "panel.background", "kind": "text"},
  {"fg": "panelTitle.inactiveForeground", "bg": "panel.background", "kind": "text"},
  {"fg": "peekViewTitleLabel.foreground", "bg": "peekViewTitle.background", "kind": "text"},
  {"fg": "peekViewResult.lineForeground", "bg": "peekViewResult.background", "kind": "text"},
  {"fg": "peekViewResult.fileForeground", "bg": "peekViewResult.background", "kind": "text"},
  {"fg": "pickerGroup.foreground", "bg": "quickInput.background", "kind": "ui"},
  {"fg": "list.highlightForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "list.deemphasizedForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "editorLineNumber.foreground", "bg": "editor.background", "kind": "ui"},
  {"fg": "editorLineNumber.activeForeground", "bg": "editor.background", "kind": "ui"},
  {"fg": "notificationLink.foreground", "bg": "notifications.background", "kind": "text"},
  {"fg": "textLink.foreground", "bg": "editor.background", "kind": "text"},
  {"fg": "textLink.activeForeground", "bg": "editor.background", "kind": "text"},
  {"fg": "textBlockQuote.background", "bg": "editor.background", "kind": "ui"},
  {"fg": "breadcrumb.focusForeground", "bg": "breadcrumb.background", "kind": "text"},
  {"fg": "settings.headerForeground", "bg": "editor.background", "kind": "text"},
  {"fg": "charts.foreground", "bg": "editor.background", "kind": "ui"},
  {"fg": "debugConsole.infoForeground", "bg": "panel.background", "kind": "text"},
  {"fg": "debugConsole.warningForeground", "bg": "panel.background", "kind": "text"},
  {"fg": "debugConsole.errorForeground", "bg": "panel.background", "kind": "text"},
  {"fg": "debugConsole.sourceForeground", "bg": "panel.background", "kind": "text"},
  {"fg": "debugTokenExpression.string", "bg": "sideBar.background", "kind": "text"},
  {"fg": "debugTokenExpression.number", "bg": "sideBar.background", "kind": "text"},
  {"fg": "debugTokenExpression.boolean", "bg": "sideBar.background", "kind": "text"},
  {"fg": "gitDecoration.modifiedResourceForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "gitDecoration.addedResourceForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "gitDecoration.deletedResourceForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "gitDecoration.untrackedResourceForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "descriptionForeground", "bg": "sideBar.background", "kind": "text"},
  {"fg": "errorForeground", "bg": "editor.background", "kind": "text"},
  {"fg": "foreground", "bg": "editor.background", "kind": "text"},
  {"fg": "disabledForeground", "bg": "editor.background", "kind": "text"},
  {"fg": "symbolIcon.classForeground", "bg": "editorSuggestWidget.background", "kind": "ui"},
  {"fg": "gauge.background", "bg": "editor.background", "kind": "ui"}
]
```

Notes on specific pairs:
- `list.*` has no generic `list.background` key — Lists/Trees inherit whichever container they're hosted in (Explorer → `sideBar.background`, Peek results → `peekView*.background`, suggest widget → its own `editorSuggestWidget.background`). The `list.highlightForeground`/`list.deemphasizedForeground` rows above use `sideBar.background` as a representative default; re-check against the actual host background when auditing a specific surface.
- `welcomePage.progress.foreground`/`welcomePage.progress.background`: the **official docs description text has the names swapped** (`welcomePage.progress.background`'s doc string is "Foreground color…" and vice versa) — a known quirk in the upstream docs, not in our data; the pair itself (which two colors visually sit on top of each other) is still correct.
- `descriptionForeground`, `errorForeground`, `foreground`, `disabledForeground` are base/global colors with no dedicated background counterpart; paired here against `editor.background`/`sideBar.background` as the most common hosting surfaces — re-verify per actual usage site when auditing.

---

## 4. `tokenColors` gotchas

1. **`fontStyle: ""` is the documented way to *reset/clear* inherited styling**, not merely "leave unset." Verified two ways: (a) the JSON schema's own `fontStyle` property offers a `defaultSnippets` entry labeled "Clear" with `bodyText: '""'` — i.e., VS Code's own autocomplete explicitly suggests the empty string as an intentional value; (b) the schema's `pattern` (`^(\s*\b(italic|bold|underline|strikethrough))*\s*$`) mathematically accepts zero repetitions, so `""` (and any all-whitespace string) is valid and means "no style flags," which for a *later, more specific* scope rule overrides an *earlier, broader* rule's `bold`/`italic`/etc. — this is the standard TextMate-theme cascade behavior (last matching rule with a more specific scope wins per property, and `fontStyle:""` is how you explicitly stop inheriting a style rather than just omitting the field, which instead leaves the previous value in place).
2. **`settings.foreground` supports the full hex-alpha range** (`format:"color-hex"`, the same validator used for `colors.*`, which itself is proven alpha-aware end-to-end — §2.1). An 8-digit `#RRGGBBAA` in a `tokenColors[]` rule is valid and will render with transparency.
3. **`settings.background` is deprecated** (carries a `deprecationMessage` in the schema) — VS Code's tokenizer never actually painted per-token backgrounds from `tokenColors` in any recent version; only `editor.*` workbench colors and a handful of decoration-specific keys (`editor.findMatchBackground`, etc.) paint backgrounds. Don't rely on it.
4. **`fontFamily`, `fontSize`, and `lineHeight` are valid `tokenColors[].settings` keys**, schema-confirmed, but undocumented on the public reference page — useful for e.g. giving comments a different (monospace-adjacent but distinguishable) face, though most themes never touch these.
5. **`editor.tokenColorCustomizations` and `editor.semanticTokenColorCustomizations` are separate, real, registered settings** (confirmed in the bundle's configuration registration, `Q4o = {"editor.tokenColorCustomizations": …, "editor.semanticTokenColorCustomizations": …}`), and both support the `"[Theme Name]": {...}` bracket-prefixed key syntax to scope overrides to one specific active theme (confirmed via the `patternProperties:{"^\\[":{}}` clause and the separate `k5i="^\\[[^\\]]*(\\]\\s*\\[[^\\]]*)*\\]$"` pattern used for multi-theme-bracket keys elsewhere in the same configuration block). These customizations are **merged on top of**, not a replacement for, the active theme's own `tokenColors`/`semanticTokenColors` — last-matching-rule-wins per the normal TextMate cascade.
6. **`include`** (§1.1) lets a theme JSON inherit another file's `colors`/`tokenColors`/`semanticTokenColors` wholesale, with the includer's own keys overriding. Confirmed in three of the ten shipped built-in themes. A practical pattern for a 4-variant family like VS Glass.
7. **`semanticTokenColors` keys are not guaranteed to be drawn only from the 23 standard types** — see §1.5's `dark_vs.json` example (`newOperator`, `stringLiteral`, etc.). Harmless to include extras (unknown keys are presumably ignored by consumers that don't register that legend entry), but don't assume the 23-type/10-modifier list from §1.5 is exhaustive across every possible language server.
8. **Scope specificity, not array order, determines precedence** within `tokenColors` (standard TextMate-theme semantics: the rule with the most specific/longest matching scope wins for a given property; among equally-specific matches, later-declared rules win) — this is inherited TextMate behavior and not re-derived from the VS Code source in this pass (**Assumed**, standard, well-established behavior, consistent with every shipped built-in theme's own rule ordering, e.g. `dark_vs.json` puts the broad `{"foreground":"#D4D4D4"}` catch-all rule *first* and more specific rules after it).

---

## 5. Key counts

From `all-color-keys.json`:

| Metric | Count |
|---|---|
| Unique color keys, total | **988** |
| Listed on the official docs page (`code.visualstudio.com/api/references/theme-color`) | 910 |
| Confirmed in both docs *and* the installed bundle (`source: "docs+bundle"`) | 890 |
| Docs-listed but **not** found as a static string literal in this bundle file (`source: "docs"`) | 20 |
| Found in the bundle but **not yet on the docs page** as of 2026-09-10 (`source: "bundle"`) | 78 |
| fg/bg contrast pairs generated | 165 (131 `"text"`, 34 `"ui"`) |

The 20 docs-only keys break down as:
- **10** `gitDecoration.*` + `git.blame.editorDecorationForeground` (11 total) — contributed by the **built-in `git` extension's** `package.json` color-contribution point, not the core `workbench.desktop.main.js` color registry, so a literal-string search of this one bundle file cannot find them (confirmed: zero occurrences of the substring `gitDecoration.` anywhere in the file). Fully real, fully documented, just sourced from a different file than the one we grepped.
- **7** `gauge.*` — zero occurrences of even the bare substring `gauge.` anywhere in `workbench.desktop.main.js`; likely registered in a different chunk/contribution not loaded into this particular bundle file, or a very lightly-used feature area. Treated as docs-only without further tracing (out of scope for this pass).
- **2** `aiCustomizationManagement.sashBorder` / `chatManagement.sashBorder` — the base identifiers (`aiCustomizationManagement`, etc.) *do* appear in the bundle (as context-key and command-id strings), but the literal `.sashBorder`-suffixed color id does not — strongly suggesting it's constructed at runtime via a template literal or shared helper (`` `${base}.sashBorder` ``) rather than a static string, which a regex-based static extractor cannot recover.

The 78 bundle-only (undocumented) keys are concentrated in features that are clearly newer than the current docs snapshot: a new **Agent Sessions** panel (31 keys: `agents*`, `activeSessionView.*`, `inactiveSessionView.*`), an in-progress **"modern" activity-bar/tab redesign** (25 keys: `modernActivityBar*`, `modernEditorTab*`, `modernTab*`), **Chat** voice/find-match additions (9 keys), plus a handful of `editor.*`, `testing.*`, `surface.*`, `quickInput*`, and two deprecation-warning `banner` colors. Full per-key breakdown, including each one's best-effort resolved `defaults` and an assigned `group`, is in `all-color-keys.json`.

---

## 6. Verified vs. Assumed

**Verified** (directly confirmed against a named, quoted source in this pass):
- The 910-key docs list and its 57-section grouping (parsed from the live fetched HTML of the reference page, footer-dated 9/9/2026).
- The bundle cross-check methodology and its 890/20/78 split (regex + balanced-bracket parser against `workbench.desktop.main.js`, described in `all-color-keys.json`'s `source`/`methodologyNotes` fields).
- All 16 `terminal.ansi*` default color values (extracted from the literal `{index, defaults}` map object in the bundle).
- The 7 dotless base colors' defaults (`contrastBorder`, `contrastActiveBorder`, `focusBorder`, `foreground`, `disabledForeground`, `errorForeground`, `descriptionForeground`).
- `--vscode-<id>` CSS variable naming and the `rgb()`/`rgba()` emission logic, including the alpha-rounding behavior (§2.1).
- The `getContext("2d", {alpha: …greyscale…})` canvas-alpha default (§2.2).
- `.monaco-workbench` has no static-CSS background rule, and its actual runtime-injected background is the hardcoded, non-themeable `CB(theme)` fallback (§2.4) — the single highest-value finding of this pass for VS Glass's transparency work.
- Electron `BrowserWindow` is created with `transparent:true` + `visualEffectState:"active"` unconditionally in 1.136.1, and the native `backgroundColor` seeding/persistence loop via `ThemeMainService`/`"themeBackground"` storage (§2.5).
- `window.systemColorTheme`'s existence, default value, and its effect on `nativeTheme.themeSource` (§2.6, mechanism only).
- The full `vscode://schemas/color-theme` JSON Schema shape, the `tokenColors` item/settings schema (including the deprecated `background` and the undocumented `fontFamily`/`fontSize`/`lineHeight`), and the 100-scope canonical enum (§1.1–1.3), all extracted verbatim from the bundle's own schema objects.
- The real top-level shape of 8 shipped built-in theme files, including `include` (§1.1).
- The 23 standard semantic token types, 10 modifiers, and the `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?` selector grammar (fetched from the official semantic-highlighting guide).
- The per-language scope tables in §1.4 (extracted directly from the installed `.tmLanguage.json` grammar files).
- The legacy `newOperator`/`stringLiteral`/etc. semantic-token-color keys observed in `dark_vs.json` (§1.5).

**Assumed** (standard/public knowledge, plausible and consistent with everything verified above, but not independently re-derived from source in this pass):
- Exact `window.titleBarStyle` enum values (`"native"` / `"custom"`) and their effect on whether `titleBar.*` colors apply — the *setting's existence* was confirmed (via a telemetry-switch reference in the bundle), but its schema/enum/description was not extracted.
- xterm.js terminal canvas/WebGL alpha-compositing behavior (§2.2) — the renderer/addon code isn't present in the one bundle file inspected.
- General TextMate theme cascade precedence rules (scope specificity beats declaration order; later rule wins among ties) — standard, well-documented TextMate behavior, consistent with but not re-derived from VS Code's own tokenizer source in this pass.
- That the 7 `gauge.*` and 2 dynamically-suffixed `*.sashBorder` docs-only keys are genuinely absent from *this* bundle file rather than present under some obfuscated pattern this pass's regex missed — a deeper trace (e.g. disassembling the minified call sites of the base `aiCustomizationManagement`/`chatManagement` identifiers, or checking other bundle chunks/extensions for `gauge.*`) was out of scope for this pass.

---

## 7. Citations

- https://code.visualstudio.com/api/references/theme-color — fetched via `curl` 2026-09-10 (177,432 bytes), parsed with Python `BeautifulSoup`/`lxml` for every `<h2 id="…">` section and its `<li><code>id</code>: description</li>` (or `<li><p><code>id</code>…</p></li>`) entries. 910 unique ids, 0 duplicates.
- https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide — fetched 2026-09-10 for §1.5.
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js` (VS Code 1.136.1, commit `a44adf7f53e00964ab890f9f8758a334f1fc15bc`) — static-analyzed with a hand-written Python parser (balanced-bracket call-argument splitter, not naive regex) to find `registerColor`-shaped call expressions; 945 valid matches after excluding non-color registries (design tokens, context keys, command ids, dom-builder helper calls) that coincidentally share the same 3-argument call shape. Also grepped directly for: `--vscode-${…}` / `CH(`/`Lt(` (CSS variable naming, §2.1), `getContext("2d"` (canvas alpha, §2.2), the `.monaco-workbench {` runtime background-injection rule and its `CB(theme)` fallback function (§2.4), the `vscode://schemas/color-theme` schema object and its nested `tokenColors`/`settings`/scope-enum definitions (§1.1–1.3), `"editor.tokenColorCustomizations"` / `"workbench.colorCustomizations"` registration (§4).
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css` — grepped for the exact selector `.monaco-workbench{` (6 matches, none set a background) and for `html{`/`body{`/`:root{` rules (§2.4).
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/main.js` (Electron main process) — grepped for `backgroundColor`/`getBackgroundColor`/`systemColorTheme`/`transparent`/`visualEffectState` (§2.5, §2.6).
- `/Applications/Visual Studio Code.app/Contents/Resources/app/out/nls.messages.json` — used as a lookup table to resolve `d(NUM,null)` description-index calls found in the bundle back into real English strings, including for the 78 bundle-only (undocumented) keys' descriptions.
- `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/theme-defaults/themes/*.json` and its `package.json` — real shipped theme files, used as ground truth in §1.1.
- `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/{typescript-basics,python,rust,go,json,yaml,markdown-basics,css,sql,shellscript}/syntaxes/*.tmLanguage.json` — real shipped grammars, used for §1.4.

All extraction scripts were written to `/private/tmp/claude-501/-Users-miloshampl-Repos-personal/119e209f-6d45-423a-83c1-93c013e429be/scratchpad/` (session-scoped scratch directory, not part of this repo) and are not part of the deliverables; only their outputs (`all-color-keys.json` and this document) were written into `research/`.
