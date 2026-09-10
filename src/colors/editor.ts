import type { Palette } from '../palette';
import { alpha, alphaOf, composite, ensureContrast } from '../color';

/**
 * editor — the content plane: editor colors, diff editor, minimap, symbol icons,
 * snippets, markdown alerts, scrollbar control, and the newer inline-edit / comments-widget
 * surfaces. Everything here composites over (or sits inside) `p.content.bg`, which is opaque
 * in every variant — Layer 2 supplies translucency for the surrounding chrome, not for text.
 *
 * DELIBERATELY UNSET (upstream default is `null`; we intentionally do not override):
 *   - editor.selectionForeground        — forcing an opaque selected-text color would fight
 *                                          syntax highlighting through the translucent selection
 *                                          tint; leave text at its own token color.
 *   - editor.findMatchForeground        — let the matched token keep its own syntax color;
 *   - editor.findMatchHighlightForeground   only the background tint marks a match.
 *   - editorBracketMatch.foreground     — matching brackets keep their token color; only the
 *                                          background fill + border indicate the match.
 *
 * OUT OF SCOPE (present in the task's design-rule prose but NOT in research/keys-by-owner/editor.json —
 * verified against research/keys-by-owner/*.json): editorStickyScroll.*, editorStickyScrollGutter.*,
 * editorStickyScrollHover.background, editorGhostText.* all belong to controls.json (controls.ts owns
 * them). editorWatermark.foreground and markdown.extension.editor.codeSpan.background are not
 * registered in any keys-by-owner file at all (not shipped VS Code keys / third-party-extension key
 * not present in research/all-color-keys.json) — not set anywhere.
 */
export default function editor(p: Palette): Record<string, string> {
  const c = p.content;
  const a = p.accent;
  const t = p.accentText;
  const dx = p.diagnostics;
  const df = p.diff;

  // ---- bracket colour ladders (shared by highlight + both guide systems) -------------------
  // Level order matches Apple's system-color wheel; bracketPairGuide reuses the exact hue at
  // each level as editorBracketHighlight so a guide line always matches the bracket it belongs to.
  const bracketAccents = [a.blue, a.indigo, a.purple, a.pink, a.orange, a.yellow];
  const bracketAccentsText = [t.blue, t.indigo, t.purple, t.pink, t.orange, t.yellow];
  // Indent guides 2-6 skip blue (reserved for selection/focus elsewhere) — 5 remaining accents.
  const indentAccents = [a.indigo, a.purple, a.pink, a.orange, a.yellow];

  const bracketHighlight: Record<string, string> = { 'editorBracketHighlight.unexpectedBracket.foreground': t.red };
  const bracketPairGuide: Record<string, string> = {};
  bracketAccents.forEach((color, i) => {
    const n = i + 1;
    bracketHighlight[`editorBracketHighlight.foreground${n}`] = bracketAccentsText[i];
    bracketPairGuide[`editorBracketPairGuide.background${n}`] = alpha(color, 0.4);
    bracketPairGuide[`editorBracketPairGuide.activeBackground${n}`] = alpha(color, 0.8);
  });

  const indentGuide: Record<string, string> = {
    // Level 1 = neutral separator-derived guide (matches editorIndentGuide.background/.activeBackground).
    'editorIndentGuide.background': c.indentGuide,
    'editorIndentGuide.activeBackground': c.indentGuideActive,
    'editorIndentGuide.background1': c.indentGuide,
    'editorIndentGuide.activeBackground1': c.indentGuideActive,
  };
  indentAccents.forEach((color, i) => {
    const n = i + 2;
    indentGuide[`editorIndentGuide.background${n}`] = alpha(color, 0.35);
    indentGuide[`editorIndentGuide.activeBackground${n}`] = alpha(color, 0.8);
  });

  // ---- symbol icons: glyph colour by kind (uses p.accent — glyphs, not text) ----------------
  const symbolKind: Record<string, string> = {
    arrayForeground: p.label.secondary,
    booleanForeground: a.yellow,
    classForeground: a.indigo,
    colorForeground: p.label.secondary,
    constantForeground: a.yellow,
    constructorForeground: a.mint,
    enumeratorForeground: a.purple,
    enumeratorMemberForeground: a.yellow,
    eventForeground: a.purple,
    fieldForeground: a.cyan,
    fileForeground: p.label.secondary,
    folderForeground: p.label.secondary,
    functionForeground: a.mint,
    interfaceForeground: a.indigo,
    keyForeground: p.label.secondary,
    keywordForeground: a.pink,
    methodForeground: a.mint,
    moduleForeground: a.blue,
    namespaceForeground: a.blue,
    nullForeground: p.label.secondary,
    numberForeground: a.yellow,
    objectForeground: p.label.secondary,
    operatorForeground: a.pink,
    packageForeground: a.blue,
    propertyForeground: a.cyan,
    referenceForeground: p.label.secondary,
    snippetForeground: p.label.secondary,
    stringForeground: a.orange,
    structForeground: a.indigo,
    textForeground: a.orange,
    typeParameterForeground: a.indigo,
    unitForeground: p.label.secondary,
    variableForeground: a.cyan,
  };
  const symbolIcon: Record<string, string> = Object.fromEntries(Object.entries(symbolKind).map(([k, v]) => [`symbolIcon.${k}`, v]));

  // ---- inline hints: shared pill background, per-role opaque foreground --------------------
  const inlayForeground = composite(p.label.secondary, c.bg); // opaque so it never double-composites onto itself
  const inlayBackground = alpha(p.glass.raised.solid, 0.6); // solid, not the translucent .bg — this is a small pill floating over text, not a chrome pane

  return {
    // ============================================================================
    // Content plane
    // ============================================================================
    'editor.background': c.bgTheme, // translucent in the see-through variants (webviews paint this themselves); contrast is audited on the composited value
    'editor.foreground': p.syntax.variable,
    'editor.border': p.separator.hairline, // "modern layout" editor-surface edge
    'editor.compositionBorder': p.ui.focus, // IME composition underline
    'editorGutter.background': '#00000000', // inherit editor.background
    'editorLineNumber.foreground': c.lineNumber,
    'editorLineNumber.activeForeground': c.lineNumberActive,
    'editorLineNumber.dimmedForeground': composite(p.label.quaternary, c.bg),
    'editorCursor.foreground': c.cursor,
    'editorCursor.background': c.bg,
    'editorMultiCursor.primary.foreground': c.cursor,
    'editorMultiCursor.primary.background': c.bg,
    'editorMultiCursor.secondary.foreground': a.indigo,
    'editorMultiCursor.secondary.background': c.bg,
    'editor.placeholder.foreground': ensureContrast(composite(p.label.tertiary, c.bg), c.bg, 3),

    // ============================================================================
    // Highlights (all translucent so the underlying token colour keeps showing)
    // ============================================================================
    'editor.lineHighlightBackground': c.lineHighlight,
    'editor.lineHighlightBorder': '#00000000',
    'editor.inactiveLineHighlightBackground': alpha(c.lineHighlight, alphaOf(c.lineHighlight) * 0.6),
    'editor.selectionBackground': c.selection,
    'editor.inactiveSelectionBackground': c.selectionInactive,
    'editor.selectionHighlightBackground': c.wordHighlight,
    'editor.selectionHighlightBorder': '#00000000',
    'editor.wordHighlightBackground': c.wordHighlight,
    'editor.wordHighlightBorder': '#00000000',
    'editor.wordHighlightStrongBackground': c.wordHighlightStrong,
    'editor.wordHighlightStrongBorder': '#00000000',
    'editor.wordHighlightTextBackground': c.wordHighlight,
    'editor.wordHighlightTextBorder': '#00000000',
    'editor.findMatchBackground': c.findMatch,
    'editor.findMatchBorder': alpha(a.orange, 0.8),
    'editor.findMatchHighlightBackground': c.findMatchHighlight,
    'editor.findMatchHighlightBorder': '#00000000',
    'editor.findRangeHighlightBackground': c.rangeHighlight,
    'editor.findRangeHighlightBorder': '#00000000',
    'editor.hoverHighlightBackground': c.wordHighlight,
    'editor.rangeHighlightBackground': c.rangeHighlight,
    'editor.rangeHighlightBorder': '#00000000',
    'editor.symbolHighlightBackground': c.wordHighlightStrong,
    'editor.symbolHighlightBorder': '#00000000',
    'editor.foldBackground': c.foldBg,
    'editor.foldPlaceholderForeground': p.label.tertiary,
    'editor.linkedEditingBackground': alpha(a.indigo, 0.2),
    // Snippets: active tabstop is the more prominent mint fill/border; the *final* tabstop
    // (nothing left to fill in) is deliberately quieter — a dim background, brighter border.
    'editor.snippetTabstopHighlightBackground': alpha(a.mint, 0.18),
    'editor.snippetTabstopHighlightBorder': alpha(a.mint, 0.35),
    'editor.snippetFinalTabstopHighlightBackground': alpha(a.mint, 0.1),
    'editor.snippetFinalTabstopHighlightBorder': alpha(a.mint, 0.6),

    // ============================================================================
    // Guides / whitespace / rulers
    // ============================================================================
    ...indentGuide,
    'editorWhitespace.foreground': c.whitespace,
    'editorRuler.foreground': c.ruler,

    // ============================================================================
    // Bracket pair colorization
    // ============================================================================
    ...bracketHighlight,
    ...bracketPairGuide,
    'editorBracketMatch.background': c.bracketMatch,
    'editorBracketMatch.border': c.bracketMatchBorder,

    // ============================================================================
    // Diagnostics (squiggles only — background/border stay transparent)
    // ============================================================================
    'editorError.foreground': dx.error,
    'editorError.background': '#00000000',
    'editorError.border': '#00000000',
    'editorWarning.foreground': dx.warning,
    'editorWarning.background': '#00000000',
    'editorWarning.border': '#00000000',
    'editorInfo.foreground': dx.info,
    'editorInfo.background': '#00000000',
    'editorInfo.border': '#00000000',
    'editorHint.foreground': dx.hint,
    'editorHint.border': '#00000000',
    'editorUnnecessaryCode.opacity': '#000000aa', // alpha-only key — only the alpha channel is read
    'editorUnnecessaryCode.border': '#00000000',
    'editorUnicodeHighlight.border': alpha(a.yellow, 0.8),
    'editorUnicodeHighlight.background': alpha(a.yellow, 0.12),
    'problemsErrorIcon.foreground': dx.error,
    'problemsWarningIcon.foreground': dx.warning,
    'problemsInfoIcon.foreground': dx.info,

    // ============================================================================
    // Gutter
    // ============================================================================
    'editorGutter.modifiedBackground': df.modifiedGutter,
    'editorGutter.modifiedSecondaryBackground': alpha(a.orange, 0.35),
    'editorGutter.addedBackground': df.insertedGutter,
    'editorGutter.addedSecondaryBackground': alpha(a.green, 0.35),
    'editorGutter.deletedBackground': df.removedGutter,
    'editorGutter.deletedSecondaryBackground': alpha(a.red, 0.35),
    'editorGutter.commentRangeForeground': p.label.quaternary,
    'editorGutter.commentGlyphForeground': p.label.secondary,
    'editorGutter.commentDraftGlyphForeground': a.yellow,
    'editorGutter.commentUnresolvedGlyphForeground': a.blue,
    'editorGutter.foldingControlForeground': p.label.secondary,
    'editorGutter.itemGlyphForeground': p.label.secondary,
    'editorGutter.itemBackground': composite(p.ui.hover, c.bg), // "should be opaque" per upstream description

    // ============================================================================
    // Overview ruler
    // ============================================================================
    'editorOverviewRuler.border': '#00000000',
    'editorOverviewRuler.background': '#00000000',
    'editorOverviewRuler.findMatchForeground': alpha(a.orange, 0.7),
    'editorOverviewRuler.rangeHighlightForeground': p.ui.scrollbarHover,
    'editorOverviewRuler.selectionHighlightForeground': alpha(a.blue, 0.5),
    'editorOverviewRuler.wordHighlightForeground': alpha(a.blue, 0.5),
    'editorOverviewRuler.wordHighlightStrongForeground': alpha(a.blue, 0.7),
    'editorOverviewRuler.wordHighlightTextForeground': alpha(a.blue, 0.5),
    'editorOverviewRuler.bracketMatchForeground': alpha(a.blue, 0.5),
    'editorOverviewRuler.modifiedForeground': alpha(a.orange, 0.6),
    'editorOverviewRuler.addedForeground': alpha(a.green, 0.6),
    'editorOverviewRuler.deletedForeground': alpha(a.red, 0.6),
    'editorOverviewRuler.inlineChatInserted': alpha(a.green, 0.6),
    'editorOverviewRuler.inlineChatRemoved': alpha(a.red, 0.6),
    'editorOverviewRuler.errorForeground': alpha(dx.error, 0.8),
    'editorOverviewRuler.warningForeground': alpha(dx.warning, 0.8),
    'editorOverviewRuler.infoForeground': alpha(dx.info, 0.8),
    'editorOverviewRuler.commentDraftForeground': composite(a.yellow, c.bg), // "should be opaque" per upstream description

    // ============================================================================
    // Minimap
    // ============================================================================
    'minimap.background': '#00000000', // transparent — editor.background shows through
    'minimap.foregroundOpacity': '#000000b3', // alpha-only key
    'minimap.selectionHighlight': c.selection,
    'minimap.selectionOccurrenceHighlight': c.wordHighlightStrong,
    'minimap.findMatchHighlight': c.findMatch,
    'minimap.errorHighlight': alpha(dx.error, 0.7),
    'minimap.warningHighlight': alpha(dx.warning, 0.7),
    'minimap.infoHighlight': alpha(dx.info, 0.7),
    'minimap.chatEditHighlight': alpha(a.indigo, 0.5),
    'editorMinimap.inlineChatInserted': df.insertedGutter,
    'minimapGutter.addedBackground': df.insertedGutter,
    'minimapGutter.deletedBackground': df.removedGutter,
    'minimapGutter.modifiedBackground': df.modifiedGutter,
    'minimapSlider.background': p.ui.scrollbar,
    'minimapSlider.hoverBackground': p.ui.scrollbarHover,
    'minimapSlider.activeBackground': p.ui.scrollbarActive,

    // ============================================================================
    // Scrollbar control
    // ============================================================================
    'scrollbar.background': '#00000000', // track stays transparent — glass shows through
    'scrollbar.shadow': p.ui.shadow,
    'scrollbarSlider.background': p.ui.scrollbar,
    'scrollbarSlider.hoverBackground': p.ui.scrollbarHover,
    'scrollbarSlider.activeBackground': p.ui.scrollbarActive,

    // ============================================================================
    // Inline hints / code lens / links / lightbulb
    // ============================================================================
    'editorInlayHint.background': inlayBackground,
    'editorInlayHint.foreground': inlayForeground,
    'editorInlayHint.typeBackground': inlayBackground,
    'editorInlayHint.typeForeground': inlayForeground,
    'editorInlayHint.parameterBackground': inlayBackground,
    'editorInlayHint.parameterForeground': inlayForeground,
    'editorCodeLens.foreground': ensureContrast(composite(p.label.tertiary, c.bg), c.bg, 3),
    'editorLink.activeForeground': p.ui.link,
    'editorLightBulb.foreground': a.yellow,
    'editorLightBulbAutoFix.foreground': a.blue,
    'editorLightBulbAi.foreground': a.indigo,

    // ============================================================================
    // Comments widget (in-editor comment threads)
    // ============================================================================
    'editorCommentsWidget.rangeBackground': alpha(a.blue, 0.08),
    'editorCommentsWidget.rangeActiveBackground': alpha(a.blue, 0.16),
    'editorCommentsWidget.replyInputBackground': p.ui.inputBg,
    'editorCommentsWidget.resolvedBorder': a.green,
    'editorCommentsWidget.unresolvedBorder': a.yellow,

    // ============================================================================
    // Inline Edit (next-edit-suggestion widget) — modelled as a mini diff: the
    // "modified" (incoming) side reads as an insert, the "original" side as a delete;
    // gutter indicator kinds mirror success/primary/secondary emphasis levels.
    // ============================================================================
    'inlineEdit.gutterIndicator.background': alpha(p.glass.raised.solid, 0.5),
    'inlineEdit.gutterIndicator.primaryBackground': alpha(a.indigo, 0.22),
    'inlineEdit.gutterIndicator.primaryBorder': alpha(a.indigo, 0.6),
    'inlineEdit.gutterIndicator.primaryForeground': p.accentText.indigo,
    'inlineEdit.gutterIndicator.secondaryBackground': p.label.quaternary,
    'inlineEdit.gutterIndicator.secondaryBorder': p.separator.strong,
    'inlineEdit.gutterIndicator.secondaryForeground': p.labelSolid.primary,
    'inlineEdit.gutterIndicator.successfulBackground': alpha(a.green, 0.22),
    'inlineEdit.gutterIndicator.successfulBorder': alpha(a.green, 0.6),
    'inlineEdit.gutterIndicator.successfulForeground': p.accentText.green,
    'inlineEdit.modifiedBackground': df.insertedLine,
    'inlineEdit.modifiedBorder': alpha(a.green, 0.5),
    'inlineEdit.modifiedChangedLineBackground': df.insertedText,
    'inlineEdit.modifiedChangedTextBackground': alpha(a.green, 0.35),
    'inlineEdit.originalBackground': df.removedLine,
    'inlineEdit.originalBorder': alpha(a.red, 0.5),
    'inlineEdit.originalChangedLineBackground': df.removedText,
    'inlineEdit.originalChangedTextBackground': alpha(a.red, 0.35),
    'inlineEdit.tabWillAcceptModifiedBorder': a.mint,
    'inlineEdit.tabWillAcceptOriginalBorder': alpha(a.mint, 0.5),

    // ============================================================================
    // Diff editor
    // ============================================================================
    'diffEditor.border': p.separator.hairline,
    'diffEditor.diagonalFill': df.diagonalFill,
    'diffEditor.insertedLineBackground': df.insertedLine,
    'diffEditor.insertedTextBackground': df.insertedText,
    'diffEditor.insertedTextBorder': '#00000000',
    'diffEditor.removedLineBackground': df.removedLine,
    'diffEditor.removedTextBackground': df.removedText,
    'diffEditor.removedTextBorder': '#00000000',
    'diffEditor.move.border': df.move,
    'diffEditor.moveActive.border': a.indigo,
    'diffEditor.unchangedCodeBackground': df.unchangedRegion,
    'diffEditor.unchangedRegionBackground': p.glass.raised.bg,
    'diffEditor.unchangedRegionForeground': p.label.secondary,
    'diffEditor.unchangedRegionShadow': p.ui.shadow,
    'diffEditorGutter.insertedLineBackground': df.inserted,
    'diffEditorGutter.removedLineBackground': df.removed,
    'diffEditorOverview.insertedForeground': alpha(a.green, 0.6),
    'diffEditorOverview.removedForeground': alpha(a.red, 0.6),
    'multiDiffEditor.headerBackground': p.glass.raised.bg,
    'multiDiffEditor.background': c.bg,
    'multiDiffEditor.border': p.separator.hairline,

    // ============================================================================
    // Symbol icons
    // ============================================================================
    ...symbolIcon,

    // ============================================================================
    // Markdown alerts (GitHub-style callouts: note/tip/important/warning/caution)
    // ============================================================================
    'markdownAlert.note.foreground': t.blue,
    'markdownAlert.tip.foreground': t.green,
    'markdownAlert.important.foreground': t.purple,
    'markdownAlert.warning.foreground': t.yellow,
    'markdownAlert.caution.foreground': t.red,

    // ============================================================================
    // Search / search editor
    // ============================================================================
    'search.resultsInfoForeground': p.label.secondary,
    'searchEditor.findMatchBackground': c.findMatch,
    'searchEditor.findMatchBorder': alpha(a.orange, 0.8),
    'searchEditor.textInputBorder': p.ui.inputBorder,
  };
}
