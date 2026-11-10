/**
 * Searching and filtering the vault.
 *
 * The Library has had this since the first quality-of-life pass; the character list never did,
 * which is the difference between a roster and a folder you scroll. Same shape as
 * `entity-search.ts` on purpose — one idiom, learned once.
 *
 * Pure (CLAUDE.md §3).
 */

import { gradeAbbrev, gradeLabel, type GradeId } from './grades';
import { characterDisplayName, type Character } from './character';

export interface VaultFilter {
  /** Free text. Every term must match somewhere in the record. */
  readonly query: string;
  /** Exactly this grade, or `''` for any. */
  readonly grade: GradeId | '';
  /** Exactly this faction — Sorcerers, Curse Users, Curses — or `''` for any. */
  readonly faction: string;
  /** Exactly this clan, or `''` for any. */
  readonly clan: string;
  /** Only characters with a portrait. */
  readonly withPortrait: boolean;
}

export const EMPTY_VAULT_FILTER: VaultFilter = {
  query: '',
  grade: '',
  faction: '',
  clan: '',
  withPortrait: false,
};

export function isVaultFilterActive(filter: VaultFilter): boolean {
  return (
    filter.query.trim().length > 0 ||
    filter.grade !== '' ||
    filter.faction !== '' ||
    filter.clan !== '' ||
    filter.withPortrait
  );
}

/**
 * Bookkeeping that is never what anyone is looking for.
 *
 * Left in, a search for "1" matched every record through a uuid or an ISO timestamp, which
 * quietly broke the all-terms rule: "ito grade 1" found the Grade 3 Ito because the "1" landed
 * in a date. A file name is the same — nobody searches for `p-4f2a.png`.
 */
const NOT_SEARCHABLE: ReadonlySet<string> = new Set([
  'id',
  'schemaVersion',
  'createdAt',
  'updatedAt',
  'portrait',
  'origin',
]);

/**
 * Everything about a character worth matching against, lowercased.
 *
 * Walked from the record's own fields rather than a hand-kept list, so a field added to the OC
 * template is searchable the moment it exists. Nested objects — traits, arts, the technique,
 * the mission log — contribute their strings too, which is what makes "Masami Bonus" or the
 * name of a mission find the people it belongs to.
 */
export function searchableCharacterText(character: Character): string {
  const parts: string[] = [
    gradeLabel(character.grade),
    gradeAbbrev(character.grade),
    characterDisplayName(character),
  ];

  const walk = (value: unknown, depth: number): void => {
    if (typeof value === 'string') {
      parts.push(value);
      return;
    }
    if (depth > 2 || !value || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (depth === 0 && NOT_SEARCHABLE.has(key)) continue;
      walk(nested, depth + 1);
    }
  };

  walk(character, 0);
  return parts.join(' \u0000 ').toLowerCase();
}

/** The distinct values of a field across the roster, for the filter dropdowns. */
export function distinctValues(
  characters: readonly Character[],
  pick: (character: Character) => string,
): readonly string[] {
  const seen = new Set<string>();
  for (const character of characters) {
    const value = pick(character).trim();
    if (value) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * Narrow a roster.
 *
 * Every whitespace-separated term must match somewhere, so "masami grade 1" finds the Masami
 * who is Grade 1 rather than everyone who is either.
 */
export function filterCharacters(
  characters: readonly Character[],
  filter: VaultFilter,
): readonly Character[] {
  const terms = filter.query.toLowerCase().split(/\s+/).filter(Boolean);

  return characters.filter((character) => {
    if (filter.grade && character.grade !== filter.grade) return false;
    if (filter.faction && character.faction !== filter.faction) return false;
    if (filter.clan && character.clan !== filter.clan) return false;
    if (filter.withPortrait && !character.portrait) return false;
    if (terms.length === 0) return true;

    const haystack = searchableCharacterText(character);
    return terms.every((term) => haystack.includes(term));
  });
}
