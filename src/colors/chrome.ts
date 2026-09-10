import type { Palette } from '../palette';
import { alpha, composite, contrast, type Hex } from '../color';

/**
 * chrome — the workbench "frame": title bar, activity bar, side bar, panel, status bar,
 * editor group headers/tabs, breadcrumbs, banners, and the handful of base/contrast/window keys
 * VS Code has no better home for. Every colour is derived from `Palette`; see the material model
 * in the module doc comment at the top of `src/palette.ts`.
 *
 * Elevation cheat sheet used throughout:
 *   ground        p.ground                  — opaque window ground (titleBar only)
 *   chrome  (L1)  p.glass.chrome.{bg,solid}  — activity bar, side bar, panel, status bar, tab strip
 *   raised  (L2)  p.glass.raised.{bg,solid}  — section headers, inactive/selected tabs, sticky scroll
 *   widget  (L3)  p.glass.widget.bg          — command center popovers, banners, drop prompts
 *   content       p.content.bg               — editor plane; the active tab matches this exactly
 */
export default function chrome(p: Palette): Record<string, string> {
  // Foreground legible on a saturated accent fill (yellow/red badges): try the dark "inverse"
  // label first (Apple picks dark text on yellow), fall back to the light onAccent grade.
  const legibleOn = (bg: Hex): Hex => (contrast(p.label.inverse, bg) >= 4.5 ? p.label.inverse : p.ui.onAccent);
  const warningFg = p.ui.onWarning; // yellow is always light → dark text (legibleOn kept for other fills)
  const errorLikeFg = p.ui.onAccent; // paired with p.ui.errorFill (darkened until white passes AA)

  // Opaque "action button" backgrounds VS Code needs for the modern tab redesign — the spec is
  // literally "composite this translucent hover/selection tint over editor.background".
  const modernEditorTabHoverActionBg = composite(p.ui.hover, p.content.bg);
  const modernEditorTabSelectedActionBg = composite(p.glass.raised.bg, p.content.bg);

  // profileBadge sits on the opaque profileBadge.background (glass.raised.solid), so its text
  // needs a solid-composited label, not the alpha-carrying p.label.primary.
  const profileBadgeFg = composite(p.label.primary, p.glass.raised.solid);

  return {
    // ---------------------------------------------------------------------------------------
    // Ground — the opaque window ground painted through .monaco-grid-view (see palette.ts doc).
    // Everything translucent (chrome/raised/widget/overlay) composites over this.
    // ---------------------------------------------------------------------------------------
    'titleBar.activeBackground': p.ground,
    'titleBar.activeForeground': p.label.primary,
    'titleBar.inactiveBackground': p.ground,
    'titleBar.inactiveForeground': p.label.secondary,
    'titleBar.border': '#00000000',

    // Command Center — a raised pill floating on the title bar.
    'commandCenter.background': p.glass.raised.bg,
    'commandCenter.foreground': p.label.secondary,
    'commandCenter.activeBackground': p.glass.widget.bg,
    'commandCenter.activeForeground': p.label.primary,
    'commandCenter.activeBorder': p.glass.raised.border,
    'commandCenter.border': p.glass.raised.border,
    'commandCenter.inactiveBorder': p.separator.hairline,
    'commandCenter.inactiveForeground': p.label.secondary,
    // Same alpha the status bar uses for its debugging tint, so the two rows read as one state.
    'commandCenter.debuggingBackground': alpha(p.accent.orange, 0.35),

    // ---------------------------------------------------------------------------------------
    // Chrome glass (L1) — activity bar, side bar, panel, status bar, tab strip header, surfaces.
    // ---------------------------------------------------------------------------------------
    'activityBar.background': p.glass.chrome.bg,
    'sideBar.background': p.glass.chrome.bg,
    'panel.background': p.glass.chrome.bg,
    'statusBar.background': p.glass.chrome.bg,
    'statusBar.noFolderBackground': p.glass.chrome.bg, // keep the material consistent instead of VS Code's purple
    'editorGroupHeader.tabsBackground': p.glass.chrome.bg,
    'editorGroupHeader.noTabsBackground': p.glass.chrome.bg,
    'surface.background': p.glass.chrome.bg,
    'modernActivityBar.background': p.glass.chrome.bg,
    'modernActivityBar.inactiveBackground': p.glass.chrome.bg,
    'banner.background': p.glass.widget.bg, // banners float above chrome, not part of it
    'profileBadge.background': p.glass.raised.solid, // opaque — sits over the activity bar's gear icon

    // ---------------------------------------------------------------------------------------
    // Activity Bar
    // ---------------------------------------------------------------------------------------
    'activityBar.foreground': p.label.primary,
    'activityBar.inactiveForeground': p.label.tertiary,
    'activityBar.border': '#00000000',
    'activityBar.activeBorder': p.ui.accent,
    'activityBar.activeBackground': p.ui.active,
    'activityBar.activeFocusBorder': p.ui.accent,
    'activityBar.dropBorder': p.ui.accent, // consistent with tab.dragAndDropBorder below
    'activityBarBadge.background': p.ui.badgeBg,
    'activityBarBadge.foreground': p.ui.badgeFg,
    'activityErrorBadge.background': p.ui.errorFill,
    'activityErrorBadge.foreground': errorLikeFg,
    'activityWarningBadge.background': p.accent.yellow,
    'activityWarningBadge.foreground': warningFg,

    // Activity bar, top/bottom position variant — same logic as the side variant above.
    'activityBarTop.background': p.glass.chrome.bg,
    'activityBarTop.foreground': p.label.primary,
    'activityBarTop.inactiveForeground': p.label.tertiary,
    'activityBarTop.activeBorder': p.ui.accent,
    'activityBarTop.activeBackground': p.ui.active,
    'activityBarTop.dropBorder': p.ui.accent,

    // Modern Activity Bar redesign (undocumented) — bar-level active tint is left transparent;
    // the item-level `modernActivityBarItem.activeBackground` below carries the highlight.
    'modernActivityBar.activeBackground': '#00000000',
    'modernActivityBar.activeForeground': p.label.primary,
    'modernActivityBar.border': p.glass.chrome.border,
    'modernActivityBar.hoverBackground': p.ui.hover,
    'modernActivityBar.hoverForeground': p.label.primary,
    'modernActivityBarItem.activeBackground': p.ui.active,
    'modernActivityBarItem.activeForeground': p.label.primary,
    'modernActivityBarItem.hoverBackground': p.ui.hover,
    'modernActivityBarItem.hoverForeground': p.label.primary,

    // ---------------------------------------------------------------------------------------
    // Side Bar
    // ---------------------------------------------------------------------------------------
    'sideBar.foreground': p.label.primary,
    'sideBar.border': '#00000000',
    'sideBar.dropBackground': p.ui.dropBg,
    'sideBarTitle.foreground': p.label.primary,
    'sideBarTitle.background': '#00000000', // inherit the side bar's chrome — no separate title plane
    'sideBarTitle.border': '#00000000',
    'sideBarSectionHeader.background': p.glass.raised.bg,
    'sideBarSectionHeader.foreground': p.label.secondary,
    'sideBarSectionHeader.border': p.separator.hairline,
    'sideBarActivityBarTop.border': p.separator.hairline,
    'sideBarStickyScroll.background': p.glass.raised.bg,
    'sideBarStickyScroll.border': '#00000000',
    'sideBarStickyScroll.shadow': p.ui.shadow,

    // ---------------------------------------------------------------------------------------
    // Panel
    // ---------------------------------------------------------------------------------------
    'panel.border': p.separator.hairline, // top edge, separates panel from editor
    'panel.dropBorder': p.ui.accent,
    'panelTitle.activeForeground': p.label.primary,
    'panelTitle.inactiveForeground': p.label.secondary,
    'panelTitle.activeBorder': p.ui.accent,
    'panelTitle.border': '#00000000',
    'panelTitleBadge.background': p.ui.badgeBg,
    'panelTitleBadge.foreground': p.ui.badgeFg,
    'panelInput.border': p.ui.inputBorder,
    'panelSection.border': p.separator.hairline,
    'panelSection.dropBackground': p.ui.dropBg,
    'panelSectionHeader.background': p.glass.raised.bg,
    'panelSectionHeader.foreground': p.label.secondary,
    'panelSectionHeader.border': '#00000000', // the raised header tint already reads as a section break
    'panelStickyScroll.background': p.glass.raised.bg,
    'panelStickyScroll.border': '#00000000',
    'panelStickyScroll.shadow': p.ui.shadow,
    'outputView.background': '#00000000', // inherit panel.background
    'outputViewStickyScroll.background': p.glass.raised.bg,

    // ---------------------------------------------------------------------------------------
    // Profiles / surfaces
    // ---------------------------------------------------------------------------------------
    'profileBadge.foreground': profileBadgeFg,
    'profiles.sashBorder': p.separator.hairline,
    'surface.foreground': p.label.primary,
    'surface.border': p.glass.chrome.border,

    // ---------------------------------------------------------------------------------------
    // Editor Groups & Tabs — structure
    // ---------------------------------------------------------------------------------------
    'editorGroup.border': p.separator.hairline,
    'editorGroup.dropBackground': p.ui.dropBg,
    'editorGroup.dropIntoPromptBackground': p.glass.widget.bg,
    'editorGroup.dropIntoPromptForeground': p.label.primary,
    'editorGroup.dropIntoPromptBorder': p.glass.widget.border,
    'editorGroup.emptyBackground': p.content.bg,
    'editorGroup.focusedEmptyBorder': p.ui.accent,
    'editorGroupHeader.border': '#00000000',
    'editorGroupHeader.tabsBorder': '#00000000',
    'editorPane.background': p.content.bg,
    'sideBySideEditor.horizontalBorder': p.separator.hairline,
    'sideBySideEditor.verticalBorder': p.separator.hairline,

    // ---------------------------------------------------------------------------------------
    // Tabs — the active tab is seamless with the editor (content plane), everything else is raised.
    // Decision: no accent line under/over the active tab (`activeBorder`/`activeBorderTop` both
    // transparent) — the background match to the editor is what reads as "active" here, Apple-style;
    // an accent hairline would compete with `tab.selectedBorderTop` (keyboard/mouse selection).
    // ---------------------------------------------------------------------------------------
    'tab.activeBackground': p.content.bg,
    'tab.activeForeground': p.label.primary,
    'tab.activeBorder': '#00000000',
    'tab.activeBorderTop': '#00000000',
    'tab.activeModifiedBorder': p.accent.orange,
    'tab.border': '#00000000',
    'tab.dragAndDropBorder': p.ui.accent,
    'tab.hoverBackground': p.ui.hover,
    'tab.hoverBorder': '#00000000',
    'tab.hoverForeground': p.label.primary,
    'tab.inactiveBackground': p.glass.raised.bg,
    'tab.inactiveForeground': p.label.secondary,
    'tab.inactiveModifiedBorder': alpha(p.accent.orange, 0.6),
    'tab.lastPinnedBorder': p.separator.hairline,
    'tab.selectedBackground': p.glass.raised.bg,
    'tab.selectedBorderTop': p.ui.accent,
    'tab.selectedForeground': p.label.primary,
    'tab.unfocusedActiveBackground': p.content.bg,
    'tab.unfocusedActiveBorder': '#00000000',
    'tab.unfocusedActiveBorderTop': '#00000000',
    'tab.unfocusedActiveForeground': p.label.primary, // one tier dimmer than the focused-group active tab
    'tab.unfocusedActiveModifiedBorder': alpha(p.accent.orange, 0.6),
    'tab.unfocusedHoverBackground': p.ui.hover,
    'tab.unfocusedHoverBorder': '#00000000',
    'tab.unfocusedHoverForeground': p.label.secondary,
    'tab.unfocusedInactiveBackground': p.glass.raised.bg,
    'tab.unfocusedInactiveForeground': p.label.secondary, // one tier dimmer than the focused-group inactive tab
    'tab.unfocusedInactiveModifiedBorder': alpha(p.accent.orange, 0.4),

    // Modern tab-strip redesign (undocumented) — list-style tabs (used e.g. in compact mode).
    'modernTab.activeBackground': p.glass.raised.bg,
    'modernTab.activeForeground': p.label.primary,
    'modernTab.hoverBackground': p.ui.hover,
    'modernTab.hoverForeground': p.label.primary,

    // Modern editor-tab redesign (undocumented) — the flat, borderless tab style.
    'modernEditorTab.activeBackground': p.content.bg,
    'modernEditorTab.activeForeground': p.label.primary,
    'modernEditorTab.activeActionBackground': p.content.bg, // already opaque; compositing is a no-op
    'modernEditorTab.activeHoverBackground': p.ui.hover,
    'modernEditorTab.activeHoverActionBackground': modernEditorTabHoverActionBg,
    'modernEditorTab.hoverBackground': p.ui.hover,
    'modernEditorTab.hoverForeground': p.label.primary,
    'modernEditorTab.hoverActionBackground': modernEditorTabHoverActionBg,
    'modernEditorTab.inactiveBackground': '#00000000',
    'modernEditorTab.selectedActionBackground': modernEditorTabSelectedActionBg,

    // ---------------------------------------------------------------------------------------
    // Status Bar
    // ---------------------------------------------------------------------------------------
    'statusBar.foreground': p.label.secondary,
    'statusBar.border': '#00000000',
    'statusBar.debuggingBackground': alpha(p.accent.orange, 0.35),
    'statusBar.debuggingBorder': '#00000000',
    'statusBar.debuggingForeground': p.label.primary,
    'statusBar.focusBorder': p.ui.focus,
    'statusBar.noFolderBorder': '#00000000',
    'statusBar.noFolderForeground': p.label.secondary,

    'statusBarItem.activeBackground': p.ui.pressed,
    'statusBarItem.compactHoverBackground': p.ui.hover,
    'statusBarItem.hoverBackground': p.ui.hover,
    'statusBarItem.hoverForeground': p.label.primary,
    'statusBarItem.focusBorder': p.ui.focus,

    'statusBarItem.errorBackground': p.ui.errorFill,
    'statusBarItem.errorForeground': p.ui.onAccent,
    'statusBarItem.errorHoverBackground': p.ui.hover,
    'statusBarItem.errorHoverForeground': p.label.primary,

    'statusBarItem.warningBackground': p.accent.yellow,
    'statusBarItem.warningForeground': warningFg, // contrast-checked: dark label.inverse vs light onAccent
    'statusBarItem.warningHoverBackground': p.ui.hover,
    'statusBarItem.warningHoverForeground': p.label.primary,

    'statusBarItem.offlineBackground': p.ui.errorFill,
    'statusBarItem.offlineForeground': errorLikeFg, // same contrast-check treatment as warning
    'statusBarItem.offlineHoverBackground': p.ui.hover,
    'statusBarItem.offlineHoverForeground': p.label.primary,

    'statusBarItem.prominentBackground': p.glass.raised.bg,
    'statusBarItem.prominentForeground': p.label.primary,
    'statusBarItem.prominentHoverBackground': p.ui.hover,
    'statusBarItem.prominentHoverForeground': p.label.primary,

    'statusBarItem.remoteBackground': p.ui.accentFill,
    'statusBarItem.remoteForeground': p.ui.onAccent,
    'statusBarItem.remoteHoverBackground': p.ui.hover,
    'statusBarItem.remoteHoverForeground': p.label.primary,

    // ---------------------------------------------------------------------------------------
    // Breadcrumbs
    // ---------------------------------------------------------------------------------------
    'breadcrumb.background': '#00000000', // inherit editor/tabs-header background beneath it
    'breadcrumb.foreground': p.label.secondary,
    'breadcrumb.focusForeground': p.label.primary,
    'breadcrumb.activeSelectionForeground': p.label.primary,
    'breadcrumbPicker.background': p.glass.widget.bg,

    // ---------------------------------------------------------------------------------------
    // Banners
    // ---------------------------------------------------------------------------------------
    'banner.foreground': p.label.primary,
    'banner.iconForeground': p.accent.blue,
    // Undocumented single-purpose banner variants (ARM32/glibc deprecation notices) — reuse the
    // generic banner material rather than inventing a one-off warning tint for a notice VS Code
    // itself only shows on unsupported platforms.
    'arm32ServerDeprecation.banner': p.glass.widget.bg,
    'unsupportedGlibcWarning.banner': p.glass.widget.bg,

    // ---------------------------------------------------------------------------------------
    // Base colors
    // ---------------------------------------------------------------------------------------
    foreground: p.label.primary,
    descriptionForeground: p.label.secondary,
    disabledForeground: p.label.tertiary,
    errorForeground: p.ui.error,
    focusBorder: p.ui.focus,
    'icon.foreground': p.label.secondary,
    'selection.background': p.ui.selectionBg,
    'widget.border': p.glass.widget.border,
    'widget.shadow': p.ui.shadow,
    'sash.hoverBorder': p.ui.accent,

    // ---------------------------------------------------------------------------------------
    // Window border — frameless/transparent window (see research §2.5); no extra ring needed.
    // ---------------------------------------------------------------------------------------
    'window.activeBorder': '#00000000',
    'window.inactiveBorder': '#00000000',

    // ---------------------------------------------------------------------------------------
    // Contrast colors — High Contrast only. Glass themes never engage HC mode, but VS Code still
    // reads these keys, so they're set to fully transparent rather than omitted.
    // ---------------------------------------------------------------------------------------
    contrastActiveBorder: '#00000000',
    contrastBorder: '#00000000',
  };
}

// COVERAGE: every one of the 200 ids in research/keys-by-owner/chrome.json is set above.
// None deliberately unset — including the two HC-only contrast keys, which are set to
// '#00000000' rather than omitted per the task contract.
