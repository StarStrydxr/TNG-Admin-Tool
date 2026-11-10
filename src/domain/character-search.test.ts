import { describe, expect, it } from 'vitest';

import { createCharacter, type Character } from './character';
import {
  EMPTY_VAULT_FILTER,
  distinctValues,
  filterCharacters,
  isVaultFilterActive,
  searchableCharacterText,
} from './character-search';

function make(over: Partial<Character> = {}): Character {
  return {
    ...createCharacter({
      id: over.id ?? 'c1',
      kind: 'pc',
      name: 'Walker Masami',
      grade: 'grade-1',
      now: '2026-11-09T00:00:00Z',
    }),
    ...over,
  };
}

const ROSTER: readonly Character[] = [
  make({ id: 'a', name: 'Walker Masami', clan: 'Masami', faction: 'Sorcerers' }),
  make({ id: 'b', name: 'Ito Renji', grade: 'grade-3', clan: 'Ito', faction: 'Curse Users' }),
  make({ id: 'c', name: 'The Quiet Man', grade: 'grade-3', faction: 'Sorcerers', portrait: 'p.png' }),
];

describe('searchableCharacterText', () => {
  it('includes the grade by label and by abbreviation', () => {
    const text = searchableCharacterText(make());
    expect(text).toContain('grade 1');
    expect(text).toContain('g1');
  });

  /** Walked from the record itself, so a field added to the OC template is searchable at once. */
  it('reaches fields nobody listed here, including nested ones', () => {
    const text = searchableCharacterText(
      make({
        hobbies: 'Cycling',
        traits: [{ id: 't1', name: 'Masami Bonus', effect: '+2 Speed', notes: '' }],
      }),
    );
    expect(text).toContain('cycling');
    expect(text).toContain('masami bonus');
  });
});

describe('filterCharacters', () => {
  it('returns everything when nothing is set', () => {
    expect(filterCharacters(ROSTER, EMPTY_VAULT_FILTER)).toHaveLength(3);
    expect(isVaultFilterActive(EMPTY_VAULT_FILTER)).toBe(false);
  });

  it('requires every term to match, not any of them', () => {
    const both = filterCharacters(ROSTER, { ...EMPTY_VAULT_FILTER, query: 'masami grade 1' });
    expect(both.map((c) => c.id)).toEqual(['a']);

    // "ito grade 1" matches nobody, where an any-term search would return two.
    expect(filterCharacters(ROSTER, { ...EMPTY_VAULT_FILTER, query: 'ito grade 1' })).toEqual([]);
  });

  it('filters by grade, faction and clan', () => {
    expect(
      filterCharacters(ROSTER, { ...EMPTY_VAULT_FILTER, grade: 'grade-3' }).map((c) => c.id),
    ).toEqual(['b', 'c']);
    expect(
      filterCharacters(ROSTER, { ...EMPTY_VAULT_FILTER, faction: 'Sorcerers' }).map((c) => c.id),
    ).toEqual(['a', 'c']);
    expect(
      filterCharacters(ROSTER, { ...EMPTY_VAULT_FILTER, clan: 'Ito' }).map((c) => c.id),
    ).toEqual(['b']);
  });

  it('filters by having a portrait', () => {
    expect(
      filterCharacters(ROSTER, { ...EMPTY_VAULT_FILTER, withPortrait: true }).map((c) => c.id),
    ).toEqual(['c']);
  });

  it('combines filters rather than widening', () => {
    expect(
      filterCharacters(ROSTER, {
        ...EMPTY_VAULT_FILTER,
        grade: 'grade-3',
        faction: 'Sorcerers',
      }).map((c) => c.id),
    ).toEqual(['c']);
  });
});

describe('distinctValues', () => {
  it('lists what is actually there, sorted and deduplicated', () => {
    expect(distinctValues(ROSTER, (c) => c.faction)).toEqual(['Curse Users', 'Sorcerers']);
  });

  it('leaves out blanks, so the dropdown has no empty row', () => {
    expect(distinctValues(ROSTER, (c) => c.clan)).toEqual(['Ito', 'Masami']);
  });
});
