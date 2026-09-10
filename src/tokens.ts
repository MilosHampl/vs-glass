import type { Palette } from './palette';

export interface TokenColor { name?: string; scope: string | string[]; settings: { foreground?: string; background?: string; fontStyle?: string } }

/**
 * tokenColors — TextMate scope → colour mapping.
 *
 * Every colour below is a `p.syntax.*` reference (see src/palette.ts for the mapping
 * philosophy — keywords/storage/control pink, strings orange, escapes teal, regex green,
 * numbers/constants/enums yellow, functions/methods mint, types/classes indigo,
 * decorators/macros/labels purple, properties/attributes cyan, tags blue, variables/params/
 * namespaces near-neutral primary label, comments muted secondary, operators/punctuation
 * secondary gray). Rules go general → specific for human readability; VS Code's TextMate
 * matcher actually resolves ties by scope *specificity* (more dot-segments wins), not array
 * order, so a later general rule can never clobber an earlier specific one or vice versa.
 *
 * fontStyle decisions (deliberate — noted here, not scattered as inline comments):
 *  - Comments are upright, never italic. Xcode-like calm reading, not the classic
 *    italic-comment look — matches the "identifiers stay calm" philosophy in palette.ts.
 *  - `variable.language` (this/self/super) AND Python's self/cls (scoped under
 *    `variable.parameter.function.language` by MagicPython, not `variable.language`) are
 *    italic pink — the one place italics earns its keep, distinguishing an implicit/special
 *    binding from both ordinary keywords and ordinary variables at a glance.
 *  - markup.italic and markdown blockquotes are italic; markup.bold and markdown headings
 *    are bold (spec-mandated).
 *  - deprecated / invalid.deprecated get `strikethrough`.
 *  - Nothing else carries a fontStyle. No bold keywords, no italic types — colour carries
 *    the meaning; fontStyle is reserved for the handful of semantically-loaded cases above.
 *
 * Scope-coverage assumptions worth flagging:
 *  - Rust lifetimes want "orange" per spec, but `p.syntax` only exposes orange via `string`
 *    (and `attributeValue`, same hue). Reused `s.string` — a lifetime reads like a borrowed
 *    annotation, close enough kin to a literal to share its colour.
 *  - CSS vendor prefixes (`-webkit-…`) get no separate rule: the installed grammar assigns
 *    the same `support.type.property-name.css` scope regardless of prefix, so the generic
 *    CSS property rule already covers them.
 *  - `constant.other.database-name`/`table-name` (SQL) and a few Shell scopes are included
 *    per spec even though the installed `sql`/`shellscript` grammars weren't confirmed to
 *    emit every one — harmless no-ops if a given grammar doesn't produce that exact scope.
 */
export default function tokens(p: Palette): TokenColor[] {
  const s = p.syntax;
  return [
    // ---------------------------------------------------------------------------------------
    // Base
    // ---------------------------------------------------------------------------------------
    { name: 'Default text', scope: ['source', 'text'], settings: { foreground: s.variable } },

    // ---------------------------------------------------------------------------------------
    // Comments
    // ---------------------------------------------------------------------------------------
    { name: 'Comment', scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: s.comment, fontStyle: '' } },
    { name: 'Comment — doc block', scope: ['comment.block.documentation', 'comment.line.documentation'], settings: { foreground: s.docComment, fontStyle: '' } },
    { name: 'Comment — doc tag', scope: ['keyword.other.documentation', 'storage.type.class.jsdoc', 'punctuation.definition.block.tag.jsdoc'], settings: { foreground: s.docTag } },

    // ---------------------------------------------------------------------------------------
    // Punctuation & operators — general; specific keyword.operator.* subtypes below win on
    // specificity regardless of declaration order.
    // ---------------------------------------------------------------------------------------
    { name: 'Punctuation', scope: [
        'punctuation', 'punctuation.separator', 'punctuation.terminator', 'punctuation.accessor',
        'meta.brace', 'punctuation.definition.block', 'punctuation.definition.parameters',
        'punctuation.definition.array', 'punctuation.section.embedded', 'punctuation.definition.tag',
      ], settings: { foreground: s.punctuation } },
    { name: 'Operator', scope: ['keyword.operator'], settings: { foreground: s.operator } },

    // ---------------------------------------------------------------------------------------
    // Keywords, storage, control flow
    // ---------------------------------------------------------------------------------------
    { name: 'Keyword / storage / control', scope: [
        'keyword', 'keyword.control', 'keyword.other', 'keyword.control.flow',
        'storage', 'storage.type', 'storage.modifier',
        'keyword.operator.new', 'keyword.operator.expression',
        'keyword.operator.logical', 'keyword.operator.arithmetic', 'keyword.operator.comparison',
      ], settings: { foreground: s.keyword } },
    { name: 'Keyword — import / export / module', scope: [
        'keyword.control.import', 'keyword.control.export', 'keyword.control.from',
        'keyword.control.as', 'keyword.control.type', 'keyword.package', 'keyword.import', 'keyword.control.module',
      ], settings: { foreground: s.keyword } },
    { name: 'Storage — async / try-catch', scope: ['storage.modifier.async', 'storage.modifier.await', 'keyword.control.trycatch'], settings: { foreground: s.keyword } },

    // ---------------------------------------------------------------------------------------
    // Strings
    // ---------------------------------------------------------------------------------------
    { name: 'String', scope: ['string', 'string.quoted', 'string.template', 'string.interpolated', 'string.unquoted.heredoc', 'string.quoted.other.backtick.sql', 'storage.type.string.python'], settings: { foreground: s.string } },
    { name: 'String — quote & delimiter punctuation', scope: ['punctuation.definition.string', 'punctuation.support.type.property-name.begin', 'punctuation.support.type.property-name.end'], settings: { foreground: s.string } },
    { name: 'String — template-expression punctuation', scope: ['punctuation.definition.template-expression', 'punctuation.section.embedded.begin', 'punctuation.section.embedded.end'], settings: { foreground: s.keyword } },
    { name: 'String escape', scope: ['constant.character.escape', 'constant.character.format.placeholder'], settings: { foreground: s.stringEscape } },

    // ---------------------------------------------------------------------------------------
    // Regex
    // ---------------------------------------------------------------------------------------
    { name: 'Regex', scope: ['string.regexp', 'constant.regexp'], settings: { foreground: s.regex } },
    { name: 'Regex — groups & quantifiers', scope: [
        'punctuation.definition.group.regexp', 'punctuation.definition.group.assertion.regexp',
        'keyword.control.anchor.regexp', 'keyword.operator.quantifier.regexp', 'constant.other.character-class.regexp',
      ], settings: { foreground: s.regex } },

    // ---------------------------------------------------------------------------------------
    // Numbers, booleans, constants, enum members
    // ---------------------------------------------------------------------------------------
    { name: 'Number', scope: ['constant.numeric', 'storage.type.numeric.bigint', 'keyword.other.unit.imaginary.go'], settings: { foreground: s.number } },
    { name: 'Constant — language / boolean / other', scope: ['constant.language', 'constant.other', 'constant.language.boolean', 'variable.other.constant', 'support.constant'], settings: { foreground: s.constant } },
    { name: 'Enum member', scope: ['variable.other.enummember', 'constant.other.enum', 'constant.other.caps.rust'], settings: { foreground: s.enumMember } },

    // ---------------------------------------------------------------------------------------
    // Functions & methods
    // ---------------------------------------------------------------------------------------
    { name: 'Function', scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function', 'meta.function-call.generic'], settings: { foreground: s.function } },
    { name: 'Method', scope: ['entity.name.function.member', 'meta.method entity.name.function', 'support.function.method'], settings: { foreground: s.method } },
    { name: 'Function — builtin / aggregate / scalar', scope: ['support.function.builtin', 'support.function.aggregate', 'support.function.scalar', 'support.function.magic'], settings: { foreground: s.function } },

    // ---------------------------------------------------------------------------------------
    // Decorators, macros, attributes, labels
    // ---------------------------------------------------------------------------------------
    { name: 'Decorator', scope: ['meta.decorator', 'punctuation.decorator', 'entity.name.function.decorator', 'meta.decorator entity.name.function'], settings: { foreground: s.decorator } },
    { name: 'Macro', scope: ['entity.name.function.macro', 'support.function.macro', 'meta.macro', 'support.macro.rust'], settings: { foreground: s.macro } },
    { name: 'Attribute (Rust)', scope: ['meta.attribute.rust', 'meta.attribute', 'punctuation.definition.attribute.rust'], settings: { foreground: s.decorator } },
    { name: 'Label', scope: ['entity.name.label', 'punctuation.definition.label'], settings: { foreground: s.label } },

    // ---------------------------------------------------------------------------------------
    // Types, classes, interfaces, structs, enums, traits, namespaces
    // ---------------------------------------------------------------------------------------
    { name: 'Type', scope: ['entity.name.type', 'support.type', 'support.class', 'entity.other.inherited-class', 'entity.name.type.instance.jsdoc', 'support.type.python'], settings: { foreground: s.type } },
    { name: 'Type parameter / generic', scope: ['entity.name.type.parameter', 'entity.name.type.type-parameter', 'meta.type.parameters'], settings: { foreground: s.typeParameter } },
    { name: 'Class / struct / enum / trait', scope: [
        'entity.name.class', 'entity.name.type.class', 'entity.name.type.struct', 'entity.name.type.enum', 'entity.name.type.trait',
        'storage.type.class', 'storage.type.struct', 'storage.type.enum', 'storage.type.trait',
      ], settings: { foreground: s.class } },
    { name: 'Interface', scope: ['entity.name.type.interface', 'entity.other.inherited-class.interface'], settings: { foreground: s.interface } },
    { name: 'Exception type (Python)', scope: ['support.type.exception.python'], settings: { foreground: s.type } },
    { name: 'Namespace / module / package', scope: ['entity.name.namespace', 'entity.name.type.namespace', 'entity.name.type.module', 'entity.name.package', 'storage.modifier.namespace'], settings: { foreground: s.namespace } },

    // ---------------------------------------------------------------------------------------
    // Variables, parameters, properties
    // ---------------------------------------------------------------------------------------
    { name: 'Variable', scope: ['variable', 'variable.other', 'variable.other.readwrite', 'variable.name'], settings: { foreground: s.variable } },
    { name: 'Variable — language (this / self / super / cls)', scope: ['variable.language', 'variable.parameter.function.language'], settings: { foreground: s.keyword, fontStyle: 'italic' } },
    { name: 'Parameter', scope: ['variable.parameter'], settings: { foreground: s.parameter } },
    { name: 'Property', scope: ['variable.other.property', 'variable.other.object.property', 'support.variable.property', 'meta.object-literal.key'], settings: { foreground: s.property } },
    { name: 'Dunder / magic (Python)', scope: ['support.variable.magic.python'], settings: { foreground: s.label } },

    // ---------------------------------------------------------------------------------------
    // JSON
    // ---------------------------------------------------------------------------------------
    { name: 'JSON key — level 1', scope: ['support.type.property-name.json'], settings: { foreground: s.jsonKey } },
    { name: 'JSON key — nested (level 2+)', scope: ['meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json'], settings: { foreground: s.type } },
    { name: 'JSON constant', scope: ['constant.language.json'], settings: { foreground: s.constant } },

    // ---------------------------------------------------------------------------------------
    // YAML
    // ---------------------------------------------------------------------------------------
    { name: 'YAML key', scope: ['entity.name.tag.yaml'], settings: { foreground: s.yamlKey } },
    { name: 'YAML anchor / alias', scope: ['entity.name.type.anchor.yaml', 'variable.other.alias.yaml'], settings: { foreground: s.macro } },
    { name: 'YAML tag handle', scope: ['storage.type.tag-handle.yaml'], settings: { foreground: s.type } },
    { name: 'YAML constant', scope: ['constant.language.yaml'], settings: { foreground: s.constant } },
    { name: 'YAML block scalar', scope: ['string.unquoted.block.yaml'], settings: { foreground: s.string } },
    { name: 'YAML list punctuation', scope: ['punctuation.definition.block.sequence.item.yaml'], settings: { foreground: s.operator } },

    // ---------------------------------------------------------------------------------------
    // Tags, attributes, components (HTML / JSX / TSX)
    // ---------------------------------------------------------------------------------------
    { name: 'Tag', scope: ['entity.name.tag'], settings: { foreground: s.tag } },
    { name: 'Tag attribute', scope: ['entity.other.attribute-name'], settings: { foreground: s.attribute } },
    { name: 'Tag attribute value', scope: ['string.quoted.double.html', 'string.quoted.single.html', 'meta.tag.attributes string'], settings: { foreground: s.attributeValue } },
    { name: 'JSX / TSX component', scope: ['support.class.component'], settings: { foreground: s.type } },

    // ---------------------------------------------------------------------------------------
    // CSS
    // ---------------------------------------------------------------------------------------
    { name: 'CSS selector', scope: [
        'entity.name.tag.css', 'entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css', 'entity.other.attribute-name.attribute.css',
      ], settings: { foreground: s.cssSelector } },
    { name: 'CSS pseudo-class / pseudo-element', scope: ['entity.other.attribute-name.pseudo-class.css', 'entity.other.attribute-name.pseudo-element.css'], settings: { foreground: s.type } },
    { name: 'CSS property', scope: ['support.type.property-name.css', 'support.type.property-name.media.css'], settings: { foreground: s.cssProperty } },
    { name: 'CSS custom property', scope: ['variable.css', 'support.type.custom-property.css'], settings: { foreground: s.property } },
    { name: 'CSS value', scope: ['support.constant.property-value.css'], settings: { foreground: s.variable } },
    { name: 'CSS unit', scope: ['keyword.other.unit'], settings: { foreground: s.cssUnit } },
    { name: 'CSS colour literal', scope: ['constant.other.color'], settings: { foreground: s.number } },
    { name: 'CSS at-rule / !important', scope: ['keyword.control.at-rule', 'keyword.other.important', 'punctuation.definition.keyword.css'], settings: { foreground: s.keyword } },
    { name: 'CSS function parens', scope: ['punctuation.section.function.begin.bracket.round.css', 'punctuation.section.function.end.bracket.round.css'], settings: { foreground: s.punctuation } },

    // ---------------------------------------------------------------------------------------
    // SQL
    // ---------------------------------------------------------------------------------------
    { name: 'SQL keyword', scope: ['keyword.other.sql', 'keyword.other.DML.sql', 'keyword.other.DDL.sql', 'keyword.other.create.sql', 'keyword.other.cascade.sql'], settings: { foreground: s.sqlKeyword } },
    { name: 'SQL function', scope: ['support.function.aggregate.sql', 'support.function.scalar.sql', 'entity.name.function.sql'], settings: { foreground: s.function } },
    { name: 'SQL identifier', scope: ['constant.other.database-name.sql', 'constant.other.table-name.sql'], settings: { foreground: s.type } },

    // ---------------------------------------------------------------------------------------
    // Shell
    // ---------------------------------------------------------------------------------------
    { name: 'Shell builtin', scope: ['support.function.builtin.shell'], settings: { foreground: s.shellBuiltin } },
    { name: 'Shell variable', scope: ['variable.other.normal.shell', 'variable.parameter.positional.shell'], settings: { foreground: s.property } },
    { name: 'Shell pipe / redirect', scope: ['keyword.operator.pipe.shell', 'keyword.operator.redirect.shell'], settings: { foreground: s.operator } },
    { name: 'Shell heredoc', scope: ['punctuation.definition.string.heredoc.delimiter.shell', 'keyword.operator.heredoc.shell', 'keyword.operator.herestring.shell'], settings: { foreground: s.operator } },
    { name: 'Shell function', scope: ['meta.function.shell entity.name.function'], settings: { foreground: s.function } },
    { name: 'Shell option', scope: ['constant.other.option.shell'], settings: { foreground: s.comment } },
    { name: 'Shell logical-expression brackets', scope: ['punctuation.definition.logical-expression.shell'], settings: { foreground: s.punctuation } },

    // ---------------------------------------------------------------------------------------
    // Go
    // ---------------------------------------------------------------------------------------
    { name: 'Go type', scope: ['entity.name.type.go'], settings: { foreground: s.type } },
    { name: 'Go keyword', scope: ['keyword.package.go', 'keyword.import.go', 'keyword.channel.go', 'keyword.go', 'keyword.type.go', 'keyword.function.go', 'keyword.interface.go'], settings: { foreground: s.keyword } },

    // ---------------------------------------------------------------------------------------
    // Rust
    // ---------------------------------------------------------------------------------------
    { name: 'Rust lifetime', scope: ['storage.modifier.lifetime.rust', 'entity.name.lifetime.rust', 'punctuation.definition.lifetime.rust'], settings: { foreground: s.string } },
    { name: 'Rust operator / macro punctuation', scope: ['keyword.operator.misc.rust', 'keyword.operator.macro.dollar.rust'], settings: { foreground: s.operator } },

    // ---------------------------------------------------------------------------------------
    // Python
    // ---------------------------------------------------------------------------------------
    { name: 'Python f-string interpolation punctuation', scope: ['punctuation.definition.interpolation.python'], settings: { foreground: s.keyword } },
    { name: 'Python decorator', scope: ['meta.function.decorator.python', 'entity.name.function.decorator.python'], settings: { foreground: s.decorator } },

    // ---------------------------------------------------------------------------------------
    // Markdown
    // ---------------------------------------------------------------------------------------
    { name: 'Markdown heading', scope: ['markup.heading', 'entity.name.section.markdown', 'punctuation.definition.heading.markdown'], settings: { foreground: s.markupHeading, fontStyle: 'bold' } },
    { name: 'Markdown bold', scope: ['markup.bold'], settings: { foreground: s.markupBold, fontStyle: 'bold' } },
    { name: 'Markdown italic', scope: ['markup.italic'], settings: { foreground: s.markupItalic, fontStyle: 'italic' } },
    { name: 'Markdown strikethrough', scope: ['markup.strikethrough'], settings: { foreground: s.deprecated, fontStyle: 'strikethrough' } },
    { name: 'Markdown inline code', scope: ['markup.inline.raw'], settings: { foreground: s.markupCode } },
    // Fenced code fences/lang-tag only — leave `markup.fenced_code.block` itself uncoloured so
    // the embedded language grammar's own token colours show through inside the block.
    { name: 'Markdown fenced-code punctuation', scope: ['punctuation.definition.markdown', 'fenced_code.block.language.markdown'], settings: { foreground: s.markupCode } },
    { name: 'Markdown link', scope: ['markup.underline.link', 'string.other.link.title', 'string.other.link.description.title.markdown'], settings: { foreground: s.markupLink, fontStyle: 'underline' } },
    { name: 'Markdown quote', scope: ['markup.quote'], settings: { foreground: s.markupQuote, fontStyle: 'italic' } },
    { name: 'Markdown list bullet', scope: ['punctuation.definition.list.begin.markdown'], settings: { foreground: s.markupList } },
    { name: 'Markdown inserted', scope: ['markup.inserted'], settings: { foreground: s.markupInserted } },
    { name: 'Markdown deleted', scope: ['markup.deleted'], settings: { foreground: s.markupDeleted } },
    { name: 'Markdown changed', scope: ['markup.changed'], settings: { foreground: s.markupChanged } },
    { name: 'Markdown table / separator punctuation', scope: ['punctuation.definition.table.markdown', 'meta.separator.markdown'], settings: { foreground: s.punctuation } },

    // ---------------------------------------------------------------------------------------
    // Invalid / deprecated
    // ---------------------------------------------------------------------------------------
    { name: 'Invalid', scope: ['invalid', 'invalid.illegal'], settings: { foreground: s.invalid, background: s.invalidBg } },
    { name: 'Deprecated', scope: ['invalid.deprecated'], settings: { foreground: s.deprecated, fontStyle: 'strikethrough' } },

    // ---------------------------------------------------------------------------------------
    // Output / log tokens (Output panel, Debug Console, some formatter extensions)
    // ---------------------------------------------------------------------------------------
    { name: 'Token — info', scope: ['token.info-token'], settings: { foreground: s.tag } },
    { name: 'Token — warn', scope: ['token.warn-token'], settings: { foreground: s.number } },
    { name: 'Token — error', scope: ['token.error-token'], settings: { foreground: s.invalid } },
    { name: 'Token — debug', scope: ['token.debug-token'], settings: { foreground: s.macro } },

    // ---------------------------------------------------------------------------------------
    // Generic markup emphasis (non-markdown-specific scopes some grammars emit)
    // ---------------------------------------------------------------------------------------
    { name: 'Emphasis', scope: ['emphasis'], settings: { fontStyle: 'italic' } },
    { name: 'Strong', scope: ['strong'], settings: { fontStyle: 'bold' } },
  ];
}
