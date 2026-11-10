/**
 * Making a piece of lore.
 *
 * Lore is the one record with no generator behind it — nobody wants a randomly rolled clan
 * history — so it needs a constructor of its own, the way a character does. Everything else
 * (folders, links, search, visibility, print, export) it inherits by being an entity.
 *
 * Pure (CLAUDE.md §3).
 */

import { ENTITY_SCHEMA_VERSION, type Lore } from './entities';
import { DEFAULT_MIN_ROLE } from './roles';

/** Suggestions, not an enum. The field takes any text — this is Dan's setting, not mine. */
export const LORE_TYPES: readonly string[] = [
  'Place',
  'Organisation',
  'Clan',
  'Event',
  'Rule',
  'Person',
  'Artefact',
  'Other',
];

export const LORE_STATUSES: readonly string[] = [
  'Current',
  'Historical',
  'Rumoured',
  'Contested',
  'Secret',
];

export interface NewLoreInput {
  readonly id: string;
  readonly now: string;
  readonly folder?: string;
  readonly loreType?: string;
}

export function createLore(input: NewLoreInput): Lore {
  return {
    schemaVersion: ENTITY_SCHEMA_VERSION,
    id: input.id,
    kind: 'lore',
    name: '',
    createdAt: input.now,
    updatedAt: input.now,
    folder: input.folder ?? '',
    minRole: DEFAULT_MIN_ROLE,
    // Nothing rolled it, and `generated` is what marks a record as a generator's output.
    generated: null,
    image: '',
    links: [],
    notes: '',

    loreType: input.loreType ?? '',
    summary: '',
    body: '',
    era: '',
    status: '',
    location: '',
  };
}

/** Lore with nothing in it but an id — not worth saving, and not worth warning about either. */
export function isBlankLore(lore: Lore): boolean {
  return (
    !lore.name.trim() &&
    !lore.summary.trim() &&
    !lore.body.trim() &&
    !lore.loreType.trim() &&
    !lore.location.trim()
  );
}
