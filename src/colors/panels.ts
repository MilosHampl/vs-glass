import { alpha, composite } from '../color';
import type { Palette } from '../palette';

/**
 * panels — Integrated Terminal, Debug, Testing, Merge conflicts, Source Control Graph, Git
 * decorations, Notebook, Chart, Chat / Inline Chat / Panel Chat, and Agent Session colours.
 *
 * 289 keys owned here (research/keys-by-owner/panels.json). Every id is set below or listed
 * in the `DELIBERATELY UNSET` comment block at the bottom with a reason.
 */
export default function panels(p: Palette): Record<string, string> {
  const a = p.accent;
  const t = p.accentText;

  // ----------------------------------------------------------------------------------------------
  // Integrated Terminal (61) — background is transparent so the panel glass shows through.
  // ----------------------------------------------------------------------------------------------
  const [ansiBlack, ansiRed, ansiGreen, ansiYellow, ansiBlue, ansiMagenta, ansiCyan, ansiWhite,
    ansiBrightBlack, ansiBrightRed, ansiBrightGreen, ansiBrightYellow, ansiBrightBlue, ansiBrightMagenta, ansiBrightCyan, ansiBrightWhite] = p.terminal.ansi;

  // terminalSymbolIcon.* — same kind→colour convention as outline/breadcrumb symbol icons:
  // pink for flags, mint for methods, cyan for arguments, orange for files, secondary label otherwise.
  const symbolSecondary = p.label.secondary;
  const terminal: Record<string, string> = {
    'terminal.background': p.terminal.background,
    'terminal.foreground': p.terminal.foreground,
    'terminal.ansiBlack': ansiBlack, 'terminal.ansiRed': ansiRed, 'terminal.ansiGreen': ansiGreen, 'terminal.ansiYellow': ansiYellow,
    'terminal.ansiBlue': ansiBlue, 'terminal.ansiMagenta': ansiMagenta, 'terminal.ansiCyan': ansiCyan, 'terminal.ansiWhite': ansiWhite,
    'terminal.ansiBrightBlack': ansiBrightBlack, 'terminal.ansiBrightRed': ansiBrightRed, 'terminal.ansiBrightGreen': ansiBrightGreen, 'terminal.ansiBrightYellow': ansiBrightYellow,
    'terminal.ansiBrightBlue': ansiBrightBlue, 'terminal.ansiBrightMagenta': ansiBrightMagenta, 'terminal.ansiBrightCyan': ansiBrightCyan, 'terminal.ansiBrightWhite': ansiBrightWhite,
    'terminalCursor.foreground': p.terminal.cursor,
    'terminalCursor.background': p.content.bg,
    'terminal.selectionBackground': p.terminal.selection,
    'terminal.inactiveSelectionBackground': p.terminal.selectionInactive,
    // terminal.selectionForeground: DELIBERATELY UNSET — see bottom of file.
    'terminal.border': p.separator.hairline,
    'terminal.tab.activeBorder': p.ui.accent,
    'terminal.dropBackground': p.ui.dropBg,
    'terminal.findMatchBackground': p.content.findMatch,
    'terminal.findMatchHighlightBackground': p.content.findMatchHighlight,
    'terminal.findMatchBorder': '#00000000',
    'terminal.findMatchHighlightBorder': '#00000000',
    'terminal.hoverHighlightBackground': p.content.wordHighlight,
    'terminal.initialHintForeground': p.label.tertiary,
    'terminalCommandDecoration.defaultBackground': p.label.tertiary,
    'terminalCommandDecoration.successBackground': a.green,
    'terminalCommandDecoration.errorBackground': a.red,
    'terminalCommandGuide.foreground': p.label.quaternary,
    // border has no "corresponding accent" — kept structural (hairline); cursor/findMatch get their accent at .7.
    'terminalOverviewRuler.border': p.separator.hairline,
    'terminalOverviewRuler.cursorForeground': alpha(a.blue, 0.7),
    'terminalOverviewRuler.findMatchForeground': alpha(a.orange, 0.7),
    'terminalStickyScroll.background': p.glass.raised.bg,
    'terminalStickyScroll.border': p.separator.hairline,
    'terminalStickyScrollHover.background': p.ui.hover,
    'terminalSymbolIcon.aliasForeground': symbolSecondary,
    'terminalSymbolIcon.argumentForeground': a.cyan,
    'terminalSymbolIcon.branchForeground': symbolSecondary,
    'terminalSymbolIcon.commitForeground': symbolSecondary,
    'terminalSymbolIcon.fileForeground': a.orange,
    'terminalSymbolIcon.flagForeground': a.pink,
    'terminalSymbolIcon.folderForeground': symbolSecondary,
    'terminalSymbolIcon.inlineSuggestionForeground': symbolSecondary,
    'terminalSymbolIcon.methodForeground': a.mint,
    'terminalSymbolIcon.optionForeground': symbolSecondary,
    'terminalSymbolIcon.optionValueForeground': symbolSecondary,
    'terminalSymbolIcon.pullRequestDoneForeground': symbolSecondary,
    'terminalSymbolIcon.pullRequestForeground': symbolSecondary,
    'terminalSymbolIcon.remoteForeground': symbolSecondary,
    'terminalSymbolIcon.stashForeground': symbolSecondary,
    'terminalSymbolIcon.symbolText': symbolSecondary,
    'terminalSymbolIcon.symbolicLinkFileForeground': symbolSecondary,
    'terminalSymbolIcon.symbolicLinkFolderForeground': symbolSecondary,
    'terminalSymbolIcon.tagForeground': symbolSecondary,
  };

  // ----------------------------------------------------------------------------------------------
  // Debug colors + Debug Icons colors (38)
  // ----------------------------------------------------------------------------------------------
  const debug: Record<string, string> = {
    'debugToolBar.background': p.glass.widget.bg,
    'debugToolBar.border': p.glass.widget.border,
    'debugIcon.breakpointForeground': a.red,
    'debugIcon.breakpointDisabledForeground': alpha(a.red, 0.5),
    'debugIcon.breakpointUnverifiedForeground': p.label.tertiary,
    'debugIcon.breakpointCurrentStackframeForeground': a.yellow,
    'debugIcon.breakpointStackframeForeground': a.green,
    'debugIcon.startForeground': a.green,
    'debugIcon.pauseForeground': a.blue,
    'debugIcon.stopForeground': a.red,
    'debugIcon.disconnectForeground': a.red,
    'debugIcon.restartForeground': a.green,
    'debugIcon.stepOverForeground': a.blue,
    'debugIcon.stepIntoForeground': a.blue,
    'debugIcon.stepOutForeground': a.blue,
    'debugIcon.continueForeground': a.blue,
    'debugIcon.stepBackForeground': a.blue,
    'debugConsole.infoForeground': t.blue,
    'debugConsole.warningForeground': t.yellow,
    // errorForeground/sourceForeground extend the info/warning pattern given for debugConsole.
    'debugConsole.errorForeground': t.red,
    'debugConsole.sourceForeground': p.label.primary,
    'debugConsoleInputIcon.foreground': a.indigo,
    'debugTokenExpression.name': p.syntax.property,
    'debugTokenExpression.value': p.syntax.variable,
    'debugTokenExpression.string': p.syntax.string,
    'debugTokenExpression.boolean': p.syntax.constant,
    'debugTokenExpression.number': p.syntax.number,
    'debugTokenExpression.error': p.syntax.invalid,
    'debugTokenExpression.type': p.syntax.type,
    'debugView.exceptionLabelBackground': alpha(a.red, 0.3),
    'debugView.exceptionLabelForeground': p.label.primary,
    'debugView.stateLabelBackground': p.glass.raised.bg,
    'debugView.stateLabelForeground': p.label.secondary,
    'debugView.valueChangedHighlight': a.blue,
    'editor.inlineValuesForeground': composite(p.label.secondary, p.content.bg),
    'editor.inlineValuesBackground': alpha(a.yellow, 0.12),
    // Not given verbatim by spec: extend the established convention (current stack frame = yellow,
    // other stack frames = green, matching debugIcon.breakpoint{Current}StackframeForeground above).
    'editor.stackFrameHighlightBackground': alpha(a.yellow, 0.18),
    'editor.focusedStackFrameHighlightBackground': alpha(a.green, 0.18),
  };

  // ----------------------------------------------------------------------------------------------
  // Testing (34)
  // ----------------------------------------------------------------------------------------------
  const testing: Record<string, string> = {
    'testing.iconFailed': a.red,
    'testing.iconErrored': a.orange,
    'testing.iconPassed': a.green,
    'testing.runAction': a.green,
    'testing.iconQueued': a.yellow,
    'testing.iconUnset': p.label.tertiary,
    'testing.iconSkipped': p.label.tertiary,
    // .retired variants: same icon colour at half strength.
    'testing.iconFailed.retired': alpha(a.red, 0.5),
    'testing.iconErrored.retired': alpha(a.orange, 0.5),
    'testing.iconPassed.retired': alpha(a.green, 0.5),
    'testing.iconQueued.retired': alpha(a.yellow, 0.5),
    'testing.iconUnset.retired': alpha(p.label.tertiary, 0.5),
    'testing.iconSkipped.retired': alpha(p.label.tertiary, 0.5),
    'testing.peekBorder': a.red,
    'testing.peekHeaderBackground': alpha(a.red, 0.15),
    'testing.messagePeekBorder': a.red,
    'testing.messagePeekHeaderBackground': alpha(a.red, 0.15),
    'testing.message.error.badgeForeground': t.red,
    // badgeBackground/Border aren't spelled out by name in the design rules; kept as a subtle red
    // pill consistent with the badgeForeground contrast target (composited against content.bg).
    'testing.message.error.badgeBackground': composite(alpha(a.red, 0.14), p.content.bg),
    'testing.message.error.badgeBorder': alpha(a.red, 0.4),
    'testing.message.error.lineBackground': alpha(a.red, 0.12),
    'testing.message.info.decorationForeground': t.blue,
    'testing.message.info.lineBackground': alpha(a.blue, 0.1),
    'testing.coveredBackground': alpha(a.green, 0.18),
    'testing.coveredBorder': alpha(a.green, 0.5),
    'testing.coveredGutterBackground': alpha(a.green, 0.6),
    // undocumented minimap markers: match the gutter marker strength.
    'testing.coveredMinimapBackground': alpha(a.green, 0.6),
    'testing.uncoveredBranchBackground': alpha(a.red, 0.3),
    'testing.uncoveredBackground': alpha(a.red, 0.14),
    'testing.uncoveredBorder': alpha(a.red, 0.5),
    'testing.uncoveredGutterBackground': alpha(a.red, 0.6),
    'testing.uncoveredMinimapBackground': alpha(a.red, 0.6),
    'testing.coverCountBadgeBackground': p.ui.badgeBg,
    'testing.coverCountBadgeForeground': p.ui.badgeFg,
  };

  // ----------------------------------------------------------------------------------------------
  // Merge conflicts (25)
  // ----------------------------------------------------------------------------------------------
  const merge: Record<string, string> = {
    'merge.currentHeaderBackground': p.merge.currentHeader,
    'merge.currentContentBackground': p.merge.current,
    'merge.incomingHeaderBackground': p.merge.incomingHeader,
    'merge.incomingContentBackground': p.merge.incoming,
    'merge.commonHeaderBackground': p.merge.commonHeader,
    'merge.commonContentBackground': p.merge.common,
    'merge.border': '#00000000',
    'editorOverviewRuler.currentContentForeground': alpha(a.mint, 0.7),
    'editorOverviewRuler.incomingContentForeground': alpha(a.blue, 0.7),
    'editorOverviewRuler.commonContentForeground': p.separator.strong,
    // Code-review comment markers — grouped here upstream even though unrelated to merge conflicts.
    'editorOverviewRuler.commentForeground': composite(p.label.tertiary, p.content.bg),
    'editorOverviewRuler.commentUnresolvedForeground': a.blue,
    'mergeEditor.change.background': alpha(a.orange, 0.14),
    'mergeEditor.change.word.background': alpha(a.orange, 0.3),
    'mergeEditor.changeBase.background': alpha(a.purple, 0.14),
    'mergeEditor.changeBase.word.background': alpha(a.purple, 0.3),
    'mergeEditor.conflict.unhandledUnfocused.border': alpha(a.orange, 0.5),
    'mergeEditor.conflict.unhandledFocused.border': a.orange,
    'mergeEditor.conflict.handledUnfocused.border': alpha(a.green, 0.4),
    'mergeEditor.conflict.handledFocused.border': a.green,
    'mergeEditor.conflict.handled.minimapOverViewRuler': a.green,
    'mergeEditor.conflict.unhandled.minimapOverViewRuler': a.orange,
    'mergeEditor.conflictingLines.background': alpha(a.orange, 0.12),
    'mergeEditor.conflict.input1.background': p.merge.current,
    'mergeEditor.conflict.input2.background': p.merge.incoming,
  };

  // ----------------------------------------------------------------------------------------------
  // Git colors (11)
  // ----------------------------------------------------------------------------------------------
  const git: Record<string, string> = {
    'gitDecoration.addedResourceForeground': p.git.added,
    'gitDecoration.modifiedResourceForeground': p.git.modified,
    'gitDecoration.deletedResourceForeground': p.git.deleted,
    'gitDecoration.renamedResourceForeground': p.git.renamed,
    'gitDecoration.stageModifiedResourceForeground': p.git.stageModified,
    'gitDecoration.stageDeletedResourceForeground': p.git.stageDeleted,
    'gitDecoration.untrackedResourceForeground': p.git.untracked,
    'gitDecoration.ignoredResourceForeground': p.git.ignored,
    'gitDecoration.conflictingResourceForeground': p.git.conflicting,
    'gitDecoration.submoduleResourceForeground': p.git.submodule,
    'git.blame.editorDecorationForeground': composite(p.label.tertiary, p.content.bg),
  };

  // ----------------------------------------------------------------------------------------------
  // Source Control Graph (13)
  // ----------------------------------------------------------------------------------------------
  const scmGraph: Record<string, string> = {
    'scmGraph.historyItemHoverLabelForeground': p.label.primary,
    'scmGraph.foreground1': a.blue,
    'scmGraph.foreground2': a.mint,
    'scmGraph.foreground3': a.purple,
    'scmGraph.foreground4': a.orange,
    'scmGraph.foreground5': a.pink,
    'scmGraph.historyItemHoverAdditionsForeground': t.green,
    'scmGraph.historyItemHoverDeletionsForeground': t.red,
    'scmGraph.historyItemRefColor': a.blue,
    'scmGraph.historyItemRemoteRefColor': a.purple,
    'scmGraph.historyItemBaseRefColor': a.mint,
    'scmGraph.historyItemHoverDefaultLabelForeground': p.label.primary,
    'scmGraph.historyItemHoverDefaultLabelBackground': p.glass.raised.solid,
  };

  // ----------------------------------------------------------------------------------------------
  // Notebook (24)
  // ----------------------------------------------------------------------------------------------
  const notebook: Record<string, string> = {
    'notebook.cellBorderColor': p.separator.hairline,
    // dark and light both read fine against raised glass; keeps notebook cells visually "elevated".
    'notebook.cellEditorBackground': p.glass.raised.bg,
    'notebook.editorBackground': p.content.bg,
    'notebook.focusedCellBorder': p.ui.accent,
    'notebook.focusedEditorBorder': p.ui.focus,
    'notebook.inactiveFocusedCellBorder': p.separator.strong,
    'notebook.selectedCellBackground': p.ui.active,
    'notebook.selectedCellBorder': p.separator.strong,
    'notebook.cellHoverBackground': p.ui.hover,
    'notebook.cellInsertionIndicator': p.ui.accent,
    'notebook.cellStatusBarItemHoverBackground': p.ui.hover,
    'notebook.cellToolbarSeparator': p.separator.hairline,
    'notebook.focusedCellBackground': p.ui.hover,
    'notebook.inactiveSelectedCellBorder': p.separator.strong,
    'notebook.outputContainerBackgroundColor': p.glass.raised.bg,
    'notebook.outputContainerBorderColor': p.separator.hairline,
    'notebook.symbolHighlightBackground': p.content.wordHighlightStrong,
    'notebookScrollbarSlider.background': p.ui.scrollbar,
    'notebookScrollbarSlider.hoverBackground': p.ui.scrollbarHover,
    'notebookScrollbarSlider.activeBackground': p.ui.scrollbarActive,
    'notebookStatusErrorIcon.foreground': a.red,
    'notebookStatusRunningIcon.foreground': a.blue,
    'notebookStatusSuccessIcon.foreground': a.green,
    'notebookEditorOverviewRuler.runningCellForeground': a.blue,
  };

  // ----------------------------------------------------------------------------------------------
  // Chart colors (11)
  // ----------------------------------------------------------------------------------------------
  const charts: Record<string, string> = {
    'charts.foreground': p.charts.foreground,
    'charts.lines': p.charts.lines,
    'charts.red': p.charts.red,
    'charts.blue': p.charts.blue,
    'charts.yellow': p.charts.yellow,
    'charts.orange': p.charts.orange,
    'charts.green': p.charts.green,
    'charts.purple': p.charts.purple,
    // chart.axis/guide/line aren't covered by the charts.* palette group — mapped to the nearest
    // structural/accent equivalents: axis = strong separator, guide = hairline, line = teal (closest
    // hue to upstream's fixed #236B8E, which is identical across every VS Code theme kind).
    'chart.axis': p.separator.strong,
    'chart.guide': p.separator.hairline,
    'chart.line': a.teal,
  };

  // ----------------------------------------------------------------------------------------------
  // Chat / Inline Chat / Panel Chat (15 + 9 + 10 + 2 = 36)
  // ----------------------------------------------------------------------------------------------
  const chat: Record<string, string> = {
    'chat.requestBorder': p.glass.raised.border,
    'chat.requestBackground': p.glass.raised.bg,
    'chat.slashCommandBackground': alpha(a.indigo, 0.18),
    'chat.slashCommandForeground': t.indigo,
    'chat.avatarBackground': p.glass.raised.solid,
    'chat.avatarForeground': p.label.primary,
    'chat.editedFileForeground': t.orange,
    'chat.linesAddedForeground': t.green,
    'chat.linesRemovedForeground': t.red,
    'chat.requestCodeBorder': p.separator.hairline,
    'chat.requestBubbleBackground': p.glass.raised.bg,
    'chat.requestBubbleHoverBackground': p.glass.widget.bg,
    'chat.checkpointSeparator': p.separator.strong,
    // Shimmer overlay for "thinking" labels: upstream is literally white-on-dark / black-on-light —
    // the solid form of our primary label matches that intent while staying theme-derived.
    'chat.thinkingShimmer': composite(p.label.primary, p.content.bg),
    // chatManagement.sashBorder: DELIBERATELY UNSET — see bottom of file.
    'chat.findMatchBackground': p.content.findMatch,
    'chat.findMatchHighlightBackground': p.content.findMatchHighlight,
    // Animated in-flight border: three accent stops for a blue → purple → pink rotating gradient.
    'chat.inputWorkingBorderColor1': p.ui.accent,
    'chat.inputWorkingBorderColor2': a.purple,
    'chat.inputWorkingBorderColor3': a.pink,
    'chat.voiceGlowBaseColor': p.ui.focus,
    'chat.dictationActiveMicGlow': p.ui.focus,
    // chat.voiceListeningGlow / chat.voiceSpeakingGlow: DELIBERATELY UNSET — see bottom of file.

    'inlineChat.background': p.glass.widget.bg,
    'inlineChat.border': p.glass.widget.border,
    'inlineChat.foreground': p.label.primary,
    'inlineChat.shadow': p.ui.shadow,
    'inlineChatInput.background': p.ui.inputBg,
    'inlineChatInput.border': p.ui.inputBorder,
    'inlineChatInput.focusBorder': p.ui.focus,
    'inlineChatInput.placeholderForeground': p.ui.inputPlaceholder,
    'inlineChatDiff.inserted': p.diff.insertedText,
    'inlineChatDiff.removed': p.diff.removedText,

    // Panel Chat — not covered verbatim by the design rules; focus = accent focus ring,
    // inactive = the same subdued border used for inactive notebook/cell borders.
    'interactive.activeCodeBorder': p.ui.focus,
    'interactive.inactiveCodeBorder': p.separator.strong,
  };

  // ----------------------------------------------------------------------------------------------
  // Agent Session colors (36) — descriptions used to place each on the raised/widget depth ladder.
  // ----------------------------------------------------------------------------------------------
  const agents: Record<string, string> = {
    // Window shell (outermost — chrome level) vs. card panels nested inside it (raised level).
    'agents.background': p.glass.chrome.bg,
    'inactiveSessionView.background': p.glass.chrome.bg,
    'inactiveSessionView.foreground': p.label.secondary,
    'activeSessionView.background': p.glass.raised.bg,
    'activeSessionView.foreground': p.label.primary,
    'agentsPanel.background': p.glass.raised.bg,
    'agentsPanel.border': p.separator.hairline,
    'agentsPanel.foreground': p.label.primary,
    'agentsBottomPanel.border': p.separator.hairline,
    'agentsCard.border': p.separator.hairline,
    // Chat input field.
    'agentsChatInput.background': p.ui.inputBg,
    'agentsChatInput.border': p.ui.inputBorder,
    'agentsChatInput.focusBorder': p.ui.focus,
    'agentsChatInput.foreground': p.label.primary,
    'agentsChatInput.placeholderForeground': p.ui.inputPlaceholder,
    // Badges.
    'agentsBadge.background': p.ui.badgeBg,
    'agentsBadge.foreground': p.ui.badgeFg,
    'agentsUnreadBadge.background': p.ui.badgeBg,
    'agentsUnreadBadge.foreground': p.ui.badgeFg,
    'agentSessionReadIndicator.foreground': p.label.tertiary,
    // alpha() replaces rather than multiplies existing alpha — gives a themed, low-opacity outline.
    'agentSessionSelectedBadge.border': alpha(p.ui.onAccent, 0.3),
    'agentSessionSelectedUnfocusedBadge.border': alpha(p.label.primary, 0.3),
    // New Session button — ghost/outline style (transparent fill, separator border).
    'agentsNewSessionButton.background': '#00000000',
    'agentsNewSessionButton.border': p.separator.strong,
    'agentsNewSessionButton.foreground': p.label.primary,
    'agentsNewSessionButton.hoverBackground': p.ui.hover,
    // Shell gradient + titlebar status indicator.
    'agentsGradient.tintColor': p.ui.accent,
    'agentStatusIndicator.background': p.glass.chrome.bg,
    // Update button — status colours: downloading = running (blue), downloaded = success (green).
    'agentsUpdateButton.downloadingBackground': alpha(a.blue, 0.4),
    'agentsUpdateButton.downloadedBackground': alpha(a.green, 0.7),
    // Voice Mode speaking-state row highlight.
    'agentsVoice.speakingBackground': alpha(a.purple, 0.08),
    'agentsVoice.speakingForeground': a.purple,
    // Editor-hosted feedback widget.
    'agentFeedbackEditorWidget.background': p.glass.widget.bg,
    'agentFeedbackEditorWidget.border': alpha(p.label.primary, 0.35),
    'agentFeedbackInputWidget.border': p.glass.widget.border,
    // aiCustomizationManagement.sashBorder: DELIBERATELY UNSET — see bottom of file.
  };

  return {
    ...terminal,
    ...debug,
    ...testing,
    ...merge,
    ...git,
    ...scmGraph,
    ...notebook,
    ...charts,
    ...chat,
    ...agents,
  };

  // ----------------------------------------------------------------------------------------------
  // DELIBERATELY UNSET:
  // - terminal.selectionForeground — background-only override ('#00000000') would break text
  //   colour; VS Code's documented behaviour is to retain the underlying foreground with a
  //   minimum-contrast pass when this key is unset, which is exactly what we want.
  // - chatManagement.sashBorder, aiCustomizationManagement.sashBorder — upstream defaults are
  //   null in every theme kind (dark/light/hcDark/hcLight); these editors fall back to the
  //   workbench's default sash colour and aren't part of the glass material system.
  // - chat.voiceListeningGlow, chat.voiceSpeakingGlow — upstream description says both are
  //   "derived from {0} [chat.voiceGlowBaseColor] when unset" (hue-shifted automatically by
  //   VS Code); we set chat.voiceGlowBaseColor and let the two glows auto-derive from it.
  // ----------------------------------------------------------------------------------------------
}
