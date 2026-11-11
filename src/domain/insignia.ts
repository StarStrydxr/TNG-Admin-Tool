/**
 * What each kind of record looks like at a glance.
 *
 * **Shape, not colour.** Eight fixed accent colours would mean eight hardcoded hex values, and
 * every one of them would survive a theme change and look wrong (CLAUDE.md §9) — the rule
 * exists precisely so the whole interface repaints from Settings. Deriving eight hues from the
 * theme seed instead would risk a tint that fails contrast on Paper or Noir.
 *
 * So the glyph is the identity. It also happens to be the accessible choice: a shape works for
 * a colour-blind reader and in a monochrome print, where a colour code does not. Everything
 * here inherits `currentColor`.
 *
 * Pure (CLAUDE.md §3).
 */

import type { CharacterKind } from './character';
import type { EntityKind } from './entities';
import type { DraftKind } from '../generators/draft';

/** Every kind that can wear an insignia: saved records, characters, and generator drafts. */
export type InsigniaKind = EntityKind | CharacterKind | DraftKind;

export interface Insignia {
  /** Which glyph to draw. Several kinds may share one. */
  readonly glyph: GlyphId;
  /** Read out to a screen reader in place of the picture. */
  readonly label: string;
}

export type GlyphId =
  | 'sorcerer'
  | 'curse-user'
  | 'curse'
  | 'mission'
  | 'object'
  | 'tool'
  | 'technique'
  | 'shikigami'
  | 'lore'
  | 'clan'
  | 'bounty';

const INSIGNIA: Record<InsigniaKind, Insignia> = {
  // Characters and the drafts that become them share their glyphs: a saved sorcerer and a
  // rolled one are the same thing at different stages.
  pc: { glyph: 'sorcerer', label: 'Player character' },
  npc: { glyph: 'sorcerer', label: 'Recurring NPC' },
  sorcerer: { glyph: 'sorcerer', label: 'Sorcerer' },
  'curse-user': { glyph: 'curse-user', label: 'Curse user' },

  curse: { glyph: 'curse', label: 'Curse' },
  mission: { glyph: 'mission', label: 'Mission' },
  'cursed-object': { glyph: 'object', label: 'Cursed object' },
  'cursed-tool': { glyph: 'tool', label: 'Cursed tool' },
  technique: { glyph: 'technique', label: 'Technique' },
  shikigami: { glyph: 'shikigami', label: 'Shikigami' },
  lore: { glyph: 'lore', label: 'Lore' },
  clan: { glyph: 'clan', label: 'Clan' },
  bounty: { glyph: 'bounty', label: 'Bounty' },
};

export function insigniaFor(kind: InsigniaKind): Insignia {
  return INSIGNIA[kind];
}

/**
 * The three faction themes, by the kind they suit.
 *
 * Only a suggestion for the UI to offer — the user picks their theme in Settings and it stays
 * picked. Nothing here changes the theme on its own (that was the explicit choice: a palette
 * shifting under you while you work is disorienting).
 */
export const FACTION_THEME_FOR: Partial<Record<InsigniaKind, string>> = {
  pc: 'sorcerer',
  npc: 'sorcerer',
  sorcerer: 'sorcerer',
  'curse-user': 'curse-user',
  curse: 'curse',
};
