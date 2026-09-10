import type { Palette } from './palette';

export type SemanticRule = string | { foreground?: string; fontStyle?: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean };

/** semanticTokenColors — placeholder; filled in Phase 3a. */
export default function semantic(p: Palette): Record<string, SemanticRule> {
  void p;
  return {};
}
