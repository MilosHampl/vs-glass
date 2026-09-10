import type { Palette } from './palette';

export interface TokenColor { name?: string; scope: string | string[]; settings: { foreground?: string; background?: string; fontStyle?: string } }

/** tokenColors — placeholder; filled in Phase 3a. */
export default function tokens(p: Palette): TokenColor[] {
  return [{ name: 'Default', scope: ['source', 'text'], settings: { foreground: p.syntax.variable } }];
}
