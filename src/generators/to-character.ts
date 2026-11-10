/**
 * Turn a rolled NPC into a vault record.
 *
 * Only the fields that map cleanly onto the character schema are promoted; everything else is
 * written into notes rather than being forced into a field it does not belong in. The draft's
 * seed is recorded in `origin`, so a saved NPC can always be traced back to the roll that made
 * it (CLAUDE.md §5).
 *
 * Pure — id and timestamp are injected.
 */

import { createCharacter, type Character } from '../domain/character';
import { draftValue, type Draft } from './draft';

/** Fields written into dedicated character fields rather than into notes. */
const PROMOTED = new Set(['familyName', 'givenName', 'affiliation', 'allegiance', 'technique']);

export interface ToCharacterInput {
  readonly id: string;
  readonly now: string;
  /** Stored image file name, attached at the moment of saving. */
  readonly portrait?: string;
}

export function draftToCharacter(draft: Draft, input: ToCharacterInput): Character {
  const base = createCharacter({
    id: input.id,
    now: input.now,
    kind: 'npc',
    grade: draft.grade,
  });

  const name = [draftValue(draft, 'familyName'), draftValue(draft, 'givenName')]
    .filter((part) => part.length > 0)
    .join(' ');

  const affiliation = draftValue(draft, 'affiliation') || draftValue(draft, 'allegiance');
  const technique = draftValue(draft, 'technique');

  const notes = draft.fields
    .filter((field) => !PROMOTED.has(field.key) && field.values.length > 0)
    .map((field) => `${field.label}: ${field.values.join('; ')}`)
    .join('\n');

  return {
    ...base,
    name,
    affiliation,
    portrait: input.portrait ?? '',
    notes,
    innateTechnique: { ...base.innateTechnique, name: technique },
    origin: {
      seed: draft.seed,
      tableVersion: draft.tableVersion,
      expandedByClaude: false,
    },
  };
}

/** A curse or an object is not a character; only these two produce vault records for now. */
export function canSaveToVault(draft: Draft): boolean {
  return draft.kind === 'sorcerer' || draft.kind === 'curse-user';
}
