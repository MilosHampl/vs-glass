import type { Palette } from '../palette';
import { alpha, composite, ensureContrast} from '../color';

/**
 * controls — floating overlays & form controls: lists/trees, buttons, inputs, dropdowns,
 * checkboxes/radios, badges, progress, links/text, keybinding labels, menus, quick picker,
 * editor widgets (hover/suggest/marker-nav/sticky-scroll/action-list), notifications, peek
 * view, welcome/walkthrough, settings editor, extensions, comments view, keyboard shortcut
 * table, gauge, ports, toolbar/action bar, simple find widget, simple browser.
 *
 * These are Layer-1 *floating* surfaces — they must stay legible over code with no CSS at
 * all, so they use the high-alpha widget/overlay material (`p.glass.widget`, `p.glass.overlay`)
 * rather than the lower-alpha chrome material. Layer 2 (glass.css) lowers alpha + adds blur later.
 */
export default function controls(p: Palette): Record<string, string> {
  const isDark = p.isDark;

  // Shared "very faint tint over the plane" fills reused by several unrelated groups.
  const quoteBg = isDark ? alpha(p.glass.tint, 0.06) : alpha(p.groundDeep, 0.06); // text block quote / code block / preformat bg
  const rowTint = isDark ? alpha(p.glass.tint, 0.03) : alpha(p.groundDeep, 0.03); // settings row hover, keybinding table rows
  const oddRowTint = isDark ? alpha(p.glass.tint, 0.025) : alpha(p.groundDeep, 0.03); // tree table odd rows (slightly fainter in dark)

  // Input validation boxes must be opaque enough to read text on — composite the tinted
  // error/warning/info wash over the widget material's *solid* look rather than leaving it
  // translucent (translucent-on-translucent would double-composite and wash out).
  const errorBoxBg = composite(p.ui.errorBg, p.glass.widget.solid);
  const warningBoxBg = composite(p.ui.warningBg, p.glass.widget.solid);
  const infoBoxBg = composite(p.ui.infoBg, p.glass.widget.solid);

  return {
    // ---------------------------------------------------------------------------------------
    // Lists and trees
    // ---------------------------------------------------------------------------------------
    'list.activeSelectionBackground': p.ui.selectionBg,
    'list.activeSelectionForeground': p.label.primary,
    'list.activeSelectionIconForeground': p.label.primary,
    'list.inactiveSelectionBackground': p.ui.active,
    'list.inactiveSelectionForeground': p.label.primary,
    'list.inactiveSelectionIconForeground': p.label.primary,
    'list.hoverBackground': p.ui.hover,
    'list.hoverForeground': p.label.primary,
    'list.focusBackground': p.ui.selectionBg,
    'list.focusForeground': p.label.primary,
    'list.focusOutline': p.ui.focus,
    'list.focusAndSelectionOutline': p.ui.focus,
    'list.inactiveFocusBackground': p.ui.active,
    'list.inactiveFocusOutline': '#00000000',
    'list.highlightForeground': p.ui.link,
    'list.focusHighlightForeground': p.ui.linkActive,
    'list.dropBackground': p.ui.dropBg,
    'list.dropBetweenBackground': p.ui.accent,
    'list.errorForeground': p.ui.error,
    'list.warningForeground': p.ui.warning,
    'list.invalidItemForeground': p.ui.error,
    'list.deemphasizedForeground': p.label.tertiary,
    'list.filterMatchBackground': p.content.findMatchHighlight,
    'list.filterMatchBorder': '#00000000',
    'listFilterWidget.background': p.glass.widget.bg,
    'listFilterWidget.outline': p.ui.focus,
    'listFilterWidget.noMatchesOutline': p.ui.error,
    'listFilterWidget.shadow': p.ui.shadow,
    'tree.indentGuidesStroke': p.separator.hairline,
    'tree.inactiveIndentGuidesStroke': p.label.quaternary,
    'tree.tableColumnsBorder': p.separator.hairline,
    'tree.tableOddRowsBackground': oddRowTint,

    // ---------------------------------------------------------------------------------------
    // Button control
    // ---------------------------------------------------------------------------------------
    'button.background': p.ui.accentFill,
    'button.foreground': p.ui.onAccent,
    'button.hoverBackground': p.ui.accentHover,
    'button.border': '#00000000',
    'button.separator': alpha(p.ui.onAccent, 0.4),
    'button.secondaryBackground': p.glass.raised.solid, // opaque — must contrast with text on its own
    'button.secondaryForeground': p.label.primary,
    'button.secondaryHoverBackground': p.glass.widget.solid,
    'button.secondaryBorder': p.separator.hairline, // decision: hairline rather than VS Code's foreground-derived default

    // ---------------------------------------------------------------------------------------
    // Input control
    // ---------------------------------------------------------------------------------------
    'input.background': p.ui.inputBg,
    'input.foreground': p.label.primary,
    'input.border': p.ui.inputBorder,
    'input.placeholderForeground': p.ui.inputPlaceholder,
    'inputOption.activeBackground': p.ui.selectionBg,
    'inputOption.activeBorder': p.ui.focus,
    'inputOption.activeForeground': p.label.primary,
    'inputOption.hoverBackground': p.ui.hover,
    'inputValidation.errorBackground': errorBoxBg,
    'inputValidation.errorBorder': p.accent.red,
    'inputValidation.errorForeground': p.label.primary,
    'inputValidation.warningBackground': warningBoxBg,
    'inputValidation.warningBorder': p.accent.yellow,
    'inputValidation.warningForeground': p.label.primary,
    'inputValidation.infoBackground': infoBoxBg,
    'inputValidation.infoBorder': p.accent.blue,
    'inputValidation.infoForeground': p.label.primary,

    // ---------------------------------------------------------------------------------------
    // Dropdown / Checkbox / Radio
    // ---------------------------------------------------------------------------------------
    'dropdown.background': p.glass.widget.bg,
    'dropdown.listBackground': p.glass.overlay.bg,
    'dropdown.foreground': p.label.primary,
    'dropdown.border': p.ui.inputBorder,
    'checkbox.background': p.ui.inputBg,
    'checkbox.foreground': p.label.primary,
    'checkbox.border': p.ui.inputBorder,
    'checkbox.selectBackground': p.ui.accent,
    'checkbox.selectBorder': p.ui.accent,
    // No VS Code default for either grade (null in every variant) — muted chrome material +
    // tertiary label reads as "present but inert" without inventing a new tone.
    'checkbox.disabled.background': p.glass.chrome.bg,
    'checkbox.disabled.foreground': p.label.tertiary,
    'radio.activeBackground': p.ui.selectionBg,
    'radio.activeBorder': p.ui.focus,
    'radio.activeForeground': p.label.primary,
    'radio.inactiveBorder': p.separator.strong,
    'radio.inactiveHoverBackground': p.ui.hover,
    // radio.inactiveBackground / radio.inactiveForeground: DELIBERATELY UNSET below.

    // ---------------------------------------------------------------------------------------
    // Badge / Progress bar / Text colors
    // ---------------------------------------------------------------------------------------
    'badge.background': p.ui.badgeBg,
    'badge.foreground': p.ui.badgeFg,
    'progressBar.background': p.ui.progress,
    'textLink.foreground': p.ui.link,
    'textLink.activeForeground': p.ui.linkActive,
    'textBlockQuote.background': quoteBg,
    'textBlockQuote.border': p.ui.accent,
    'textCodeBlock.background': quoteBg,
    'textPreformat.foreground': ensureContrast(p.syntax.string, composite(quoteBg, p.ground), 4.5),
    'textPreformat.background': quoteBg,
    'textSeparator.foreground': p.separator.strong,
    // textPreformat.border: DELIBERATELY UNSET below.

    // ---------------------------------------------------------------------------------------
    // Keybinding label / Keyboard shortcut table
    // ---------------------------------------------------------------------------------------
    'keybindingLabel.background': p.glass.raised.bg,
    'keybindingLabel.border': p.glass.raised.border,
    'keybindingLabel.bottomBorder': p.separator.strong,
    'keybindingLabel.foreground': p.label.primary,
    'keybindingTable.headerBackground': p.glass.raised.bg,
    'keybindingTable.rowsBackground': rowTint,

    // ---------------------------------------------------------------------------------------
    // Toolbar / Action bar
    // ---------------------------------------------------------------------------------------
    'toolbar.hoverBackground': p.ui.hover,
    'toolbar.activeBackground': p.ui.pressed,
    'toolbar.hoverOutline': '#00000000',
    'actionBar.toggledBackground': p.ui.active,

    // ---------------------------------------------------------------------------------------
    // Welcome page / Walkthrough
    // ---------------------------------------------------------------------------------------
    'welcomePage.background': p.content.bg,
    'welcomePage.tileBackground': p.glass.raised.bg,
    'welcomePage.tileHoverBackground': p.glass.widget.bg,
    'welcomePage.tileBorder': p.glass.raised.border,
    'welcomePage.progress.background': p.glass.raised.solid,
    'welcomePage.progress.foreground': p.ui.accentFill,
    'walkThrough.embeddedEditorBackground': p.glass.raised.bg,
    'walkthrough.stepTitle.foreground': p.label.primary,

    // ---------------------------------------------------------------------------------------
    // Settings editor
    // ---------------------------------------------------------------------------------------
    'settings.headerForeground': p.label.primary,
    'settings.modifiedItemIndicator': p.accent.orange,
    'settings.dropdownBackground': p.ui.inputBg,
    'settings.dropdownForeground': p.label.primary,
    'settings.dropdownBorder': p.ui.inputBorder,
    'settings.dropdownListBorder': p.glass.widget.border,
    'settings.textInputBackground': p.ui.inputBg,
    'settings.textInputForeground': p.label.primary,
    'settings.textInputBorder': p.ui.inputBorder,
    'settings.numberInputBackground': p.ui.inputBg,
    'settings.numberInputForeground': p.label.primary,
    'settings.numberInputBorder': p.ui.inputBorder,
    'settings.checkboxBackground': p.ui.inputBg,
    'settings.checkboxForeground': p.label.primary,
    'settings.checkboxBorder': p.ui.inputBorder,
    'settings.focusedRowBackground': p.ui.hover,
    'settings.rowHoverBackground': rowTint,
    'settings.focusedRowBorder': p.ui.focus,
    'settings.headerBorder': p.separator.hairline,
    'settings.sashBorder': p.separator.hairline,
    'settings.settingsHeaderHoverForeground': p.label.primary,

    // ---------------------------------------------------------------------------------------
    // Extensions
    // ---------------------------------------------------------------------------------------
    'extensionButton.background': p.ui.accentFill,
    'extensionButton.foreground': p.ui.onAccent,
    'extensionButton.hoverBackground': p.ui.accentHover,
    'extensionButton.separator': alpha(p.ui.onAccent, 0.4),
    'extensionButton.border': p.separator.hairline, // decision: matches button.secondaryBorder treatment
    'extensionButton.prominentBackground': p.ui.accentFill,
    'extensionButton.prominentForeground': p.ui.onAccent,
    'extensionButton.prominentHoverBackground': p.ui.accentHover,
    'extensionBadge.remoteBackground': p.accent.indigo,
    'extensionBadge.remoteForeground': p.ui.onAccent,
    'extensionIcon.starForeground': p.accent.yellow,
    'extensionIcon.verifiedForeground': p.accent.blue,
    'extensionIcon.preReleaseForeground': p.accent.orange,
    'extensionIcon.sponsorForeground': p.accent.pink,
    'extensionIcon.privateForeground': p.accent.purple,
    'mcpIcon.starForeground': p.accent.yellow, // same rating-star treatment as extensionIcon.starForeground

    // ---------------------------------------------------------------------------------------
    // Editor widget colors — widget glass (L3): quick input, suggest, hover, editor widget,
    // marker navigation, menus, dropdown list, ghost text, sticky scroll, action list, debug
    // exception widget.
    // ---------------------------------------------------------------------------------------
    'editorWidget.background': p.glass.widget.bg,
    'editorWidget.border': p.glass.widget.border,
    'editorWidget.foreground': p.label.primary,
    'editorWidget.resizeBorder': p.ui.accent,

    'editorSuggestWidget.background': p.glass.widget.bg,
    'editorSuggestWidget.border': p.glass.widget.border,
    'editorSuggestWidget.foreground': p.label.primary,
    'editorSuggestWidget.selectedBackground': p.ui.selectionBg,
    'editorSuggestWidget.selectedForeground': p.label.primary,
    'editorSuggestWidget.selectedIconForeground': p.label.primary,
    'editorSuggestWidget.highlightForeground': p.ui.link,
    'editorSuggestWidget.focusHighlightForeground': p.ui.linkActive,
    'editorSuggestWidget.focusOutline': p.ui.focus, // decision: real focus ring for keyboard nav (upstream only sets it for HC)
    'editorSuggestWidgetStatus.foreground': p.label.tertiary,

    'editorHoverWidget.background': p.glass.widget.bg,
    'editorHoverWidget.border': p.glass.widget.border,
    'editorHoverWidget.foreground': p.label.primary,
    'editorHoverWidget.highlightForeground': p.ui.link,
    'editorHoverWidget.statusBarBackground': p.glass.overlay.bg,

    'quickInput.background': p.glass.widget.bg,
    'quickInput.foreground': p.label.primary,
    'quickInputTitle.background': p.glass.overlay.bg,
    'quickInputList.focusBackground': p.ui.selectionBg,
    'quickInputList.focusForeground': p.label.primary,
    'quickInputList.focusIconForeground': p.label.primary,
    'quickInputList.focusHighlightForeground': p.ui.linkActive,
    // Undocumented/legacy alias of quickInputList.focusBackground (dotted id, no description
    // in the registry) — keep it in lockstep with its camelCase sibling.
    'quickInput.list.focusBackground': p.ui.selectionBg,

    'pickerGroup.border': p.separator.hairline,
    'pickerGroup.foreground': p.ui.link,

    'menu.background': p.glass.widget.bg,
    'menu.foreground': p.label.primary,
    'menu.selectionBackground': p.ui.selectionBg,
    'menu.selectionForeground': p.label.primary,
    'menu.selectionBorder': '#00000000',
    'menu.separatorBackground': p.separator.hairline,
    'menu.border': p.glass.widget.border,
    'menubar.selectionBackground': p.ui.hover,
    'menubar.selectionForeground': p.label.primary,
    'menubar.selectionBorder': '#00000000',

    'debugExceptionWidget.background': alpha(p.accent.red, 0.18),
    'debugExceptionWidget.border': p.accent.red,

    'editorMarkerNavigation.background': p.glass.widget.bg,
    'editorMarkerNavigationError.background': p.diagnostics.error,
    'editorMarkerNavigationError.headerBackground': alpha(p.diagnostics.error, 0.1),
    'editorMarkerNavigationWarning.background': p.diagnostics.warning,
    'editorMarkerNavigationWarning.headerBackground': alpha(p.diagnostics.warning, 0.1),
    'editorMarkerNavigationInfo.background': p.diagnostics.info,
    'editorMarkerNavigationInfo.headerBackground': alpha(p.diagnostics.info, 0.1),

    'editorActiveLineNumber.foreground': p.content.lineNumberActive,

    'editorGhostText.foreground': alpha(p.label.primary, 0.35),
    'editorGhostText.border': alpha(p.label.primary, 0.18),
    // editorGhostText.background: DELIBERATELY UNSET below.

    // Sticky scroll sits in the content plane but is owned here; treat it as a docked raised
    // row over the editor rather than a second copy of the editor background.
    'editorStickyScroll.background': p.content.bg,
    'editorStickyScroll.border': p.separator.hairline,
    'editorStickyScroll.shadow': p.ui.shadow,
    'editorStickyScrollGutter.background': p.content.bg,
    'editorStickyScrollHover.background': p.ui.hover,

    'editorActionList.background': p.glass.widget.bg,
    'editorActionList.foreground': p.label.primary,
    'editorActionList.focusBackground': p.ui.selectionBg,
    'editorActionList.focusForeground': p.label.primary,

    // ---------------------------------------------------------------------------------------
    // Peek view
    // ---------------------------------------------------------------------------------------
    'peekView.border': p.ui.accent,
    'peekViewTitleLabel.foreground': p.label.primary,
    'peekViewTitleDescription.foreground': p.label.secondary,
    'peekViewTitle.background': p.glass.raised.bg,
    'peekViewResult.background': p.glass.widget.bg,
    'peekViewResult.fileForeground': p.label.primary,
    'peekViewResult.lineForeground': p.label.secondary,
    'peekViewResult.matchHighlightBackground': p.content.findMatchHighlight,
    'peekViewResult.selectionBackground': p.ui.selectionBg,
    'peekViewResult.selectionForeground': p.label.primary,
    'peekViewEditor.background': p.content.bg,
    'peekViewEditor.matchHighlightBackground': p.content.findMatchHighlight,
    'peekViewEditorGutter.background': p.content.bg,
    'peekViewEditorStickyScroll.background': p.glass.raised.bg,
    // Deviates from upstream's default (@peekViewEditor.background) to stay visually
    // consistent with the raised sticky-scroll row it belongs to, above.
    'peekViewEditorStickyScrollGutter.background': p.glass.raised.bg,
    // peekViewEditor.matchHighlightBorder: DELIBERATELY UNSET below.

    // ---------------------------------------------------------------------------------------
    // Notifications
    // ---------------------------------------------------------------------------------------
    'notifications.background': p.glass.widget.bg,
    'notifications.foreground': p.label.primary,
    'notifications.border': p.separator.hairline,
    'notificationCenter.border': p.glass.widget.border,
    'notificationCenterHeader.background': p.glass.overlay.bg,
    'notificationCenterHeader.foreground': p.label.primary,
    'notificationToast.border': p.glass.widget.border,
    'notificationLink.foreground': p.ui.link,
    'notificationsErrorIcon.foreground': p.accent.red,
    'notificationsWarningIcon.foreground': p.accent.yellow,
    'notificationsInfoIcon.foreground': p.accent.blue,

    // ---------------------------------------------------------------------------------------
    // Ports / Remote / Gauge / Comments view / Keyboard shortcut table (header dealt above) /
    // Simple find widget / Simple browser
    // ---------------------------------------------------------------------------------------
    'ports.iconRunningProcessForeground': p.accent.green,

    'gauge.background': p.ui.accentFill,
    'gauge.foreground': p.ui.onAccent,
    'gauge.border': p.separator.hairline,
    'gauge.warningBackground': p.accent.yellow,
    'gauge.warningForeground': p.ui.onWarning,
    'gauge.errorBackground': p.ui.errorFill,
    'gauge.errorForeground': p.ui.onAccent,

    'commentsView.resolvedIcon': p.accent.green,
    'commentsView.unresolvedIcon': p.accent.blue,

    'simpleFindWidget.sashBorder': p.separator.hairline,

    'browser.border': p.separator.hairline,

    // -----------------------------------------------------------------------------------------
    // DELIBERATELY UNSET:
    //  - radio.inactiveBackground / radio.inactiveForeground: null in every VS Code variant
    //    (dark, light, hcDark, hcLight) — an inactive radio has no default fill or text-color
    //    override anywhere upstream, so we don't invent one.
    //  - textPreformat.border: null in dark/light upstream (only hcDark sets it); the tinted
    //    quoteBg fill already differentiates preformatted text without a border.
    //  - peekViewEditor.matchHighlightBorder: null in dark/light upstream (HC-only); the
    //    match highlight background alone is sufficient.
    //  - editorGhostText.background: null in *every* variant upstream, including HC — ghost
    //    text is meant to read as dimmed inline text, not a highlighted box.
    // -----------------------------------------------------------------------------------------
  };
}
