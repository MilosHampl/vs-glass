import type { Palette } from './palette';

export type SemanticRule = string | { foreground?: string; fontStyle?: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean };

/**
 * semanticTokenColors — LSP semantic token type/modifier → colour mapping.
 *
 * Selector syntax: `(*|tokenType)(.tokenModifier)*(:tokenLanguage)?`. VS Code picks, for each
 * token, the rule whose modifier set is the largest subset of the token's actual modifiers
 * (i.e. more specific wins) — so e.g. a rule for `variable.readonly` is used for a token that
 * is `variable.readonly.declaration` unless a more specific `variable.readonly.declaration`
 * rule also exists. That means an intentionally *omitted* selector below isn't a gap — it's a
 * decision that the modifier shouldn't change anything, and the next-most-specific rule (often
 * just the bare type) applies untouched.
 *
 * The 23 standard token types get a base colour first (same hue mapping as tokens.ts / the
 * `syntax` philosophy in palette.ts). Everything after is a modifier or a non-standard type a
 * language service registers on top of the standard legend (rust-analyzer, Pylance, the
 * TypeScript server, etc.).
 *
 * Deliberate decisions (asked for explicitly, recorded here instead of scattered as comments):
 *  - `*.declaration` / `*.definition`: NOT styled. Declarations aren't emphasised — the palette
 *    philosophy keeps identifiers calm so accent colours (keyword/type/string) carry the
 *    meaning; a declaration is still identifiable from context (a keyword and a type usually
 *    sit right next to it).
 *  - `variable.readonly` = constant colour (yellow) — a readonly binding behaves like a
 *    constant, so it's coloured like one.
 *  - `property.readonly` is intentionally NOT overridden — stays plain property cyan. Readonly
 *    class fields are extremely common (every TS `readonly` field, every Rust struct field is
 *    implicitly one via ownership) and recolouring all of them would wash out the "property"
 *    signal; only the rarer readonly *variable* gets the constant treatment.
 *  - `*.static`: NOT styled (no italic, no colour change) — a static member's meaning already
 *    comes from its type/keyword context, and the CONTRACT says the "no italic" default holds
 *    unless spec-mandated.
 *  - `*.deprecated`: `strikethrough` only, colour untouched, so the token keeps reading as
 *    whatever it is (function, variable, …) while visibly marked as deprecated.
 *  - `*.defaultLibrary` (`class.defaultLibrary`, `function.defaultLibrary`,
 *    `variable.defaultLibrary`, …): NOT special-cased — a built-in `Array` or `console` reads
 *    exactly like a user-defined one of the same kind. Keeps the palette calm and avoids a
 *    second "is this mine or the platform's" signal competing with the type/keyword signal.
 *  - `*.async`, `*.abstract`, `*.modification`: NOT styled — same "don't multiply signals"
 *    reasoning as `static`.
 *  - `*.documentation` = docComment colour, so a docstring token inside e.g. `variable.
 *    documentation` reads like the rest of the doc block rather than like code.
 *  - Python `selfParameter` / `clsParameter` and the generic `selfKeyword` all get the same
 *    italic pink treatment as `variable.language` in tokens.ts (this/self/super) — kept in
 *    sync deliberately so the TextMate and semantic layers never disagree on how "self" looks,
 *    regardless of which one a given file ends up tokenized by.
 *  - `magicFunction` (Python dunders as a semantic type, not just `support.variable.magic`
 *    scope) reuses the macro purple, same reasoning as tokens.ts: a dunder method is a kind of
 *    incantation, closer kin to a macro than to an ordinary method.
 *  - Rust `lifetime` reuses `s.string` (orange) for the same reason as the TextMate rule in
 *    tokens.ts: `p.syntax` has no independent "orange" slot outside `string`/`attributeValue`.
 */
export default function semantic(p: Palette): Record<string, SemanticRule> {
  const s = p.syntax;
  const italicPink = { foreground: s.keyword, fontStyle: 'italic' };

  return {
    // -----------------------------------------------------------------------------------------
    // Standard token types (23) — base colours
    // -----------------------------------------------------------------------------------------
    namespace: s.namespace,
    class: s.class,
    enum: s.class,
    interface: s.interface,
    struct: s.class,
    typeParameter: s.typeParameter,
    type: s.type,
    parameter: s.parameter,
    variable: s.variable,
    property: s.property,
    enumMember: s.enumMember,
    decorator: s.decorator,
    event: s.method, // treated like a method you subscribe to, not a plain property
    function: s.function,
    method: s.method,
    macro: s.macro,
    label: s.label,
    comment: s.comment,
    string: s.string,
    keyword: s.keyword,
    number: s.number,
    regexp: s.regex,
    operator: s.operator,

    // -----------------------------------------------------------------------------------------
    // Standard modifiers
    // -----------------------------------------------------------------------------------------
    // `*.declaration`, `*.definition`, `*.static`, `*.async`, `*.abstract`, `*.modification`,
    // and `*.defaultLibrary` are intentionally omitted — see file header.
    'variable.readonly': s.constant,
    // `property.readonly` intentionally omitted — see file header.
    '*.deprecated': { strikethrough: true },
    '*.documentation': s.docComment,

    // -----------------------------------------------------------------------------------------
    // Non-standard types/modifiers registered by common language services
    // (rust-analyzer, Pylance/TypeScript server, etc.)
    // -----------------------------------------------------------------------------------------
    selfParameter: italicPink,
    clsParameter: italicPink,
    selfKeyword: italicPink,
    builtinConstant: s.constant,
    magicFunction: s.macro,
    lifetime: s.string,
    formatSpecifier: s.stringEscape,
    derive: s.decorator,
    attribute: s.decorator,
    attributeBracket: s.decorator,
    generic: s.typeParameter,
    typeAlias: s.type,
    boolean: s.constant,
    punctuation: s.punctuation,
    'keyword.controlFlow': s.control,
    builtinType: s.type,
    unresolvedReference: s.invalid,
    escapeSequence: s.stringEscape,
    bracket: s.punctuation,
    angle: s.punctuation,
    brace: s.punctuation,
    parenthesis: s.punctuation,

    // TSX: distinct from the generic `type` — a component reads like a type, a plain
    // `<div>`/`<span>` tag reads like markup.
    tag: s.tag,
    component: s.type,
  };
}
