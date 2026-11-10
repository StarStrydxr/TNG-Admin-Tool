import { describe, expect, it } from 'vitest';

import { parseCharacter, parseStatValue } from './character-parse';
import { createCharacter, type NewCharacterInput } from './character';
import { CIVILIAN_STAT, formatStatShort } from './grades';
import { GRADED_STAT_IDS } from './stats';

const FALLBACK: NewCharacterInput = {
  id: 'fallback-id',
  now: '2026-10-28T12:00:00.000Z',
  kind: 'pc',
  grade: 'grade-4',
};

describe('parseCharacter tolerates hand-edited files', () => {
  it('survives completely unusable input', () => {
    for (const input of [null, undefined, 42, 'nope', []]) {
      const character = parseCharacter(input, FALLBACK);
      expect(character.id).toBe('fallback-id');
      expect(character.grade).toBe('grade-4');
    }
  });

  it('fills missing fields from the fallback without dropping what is present', () => {
    const character = parseCharacter({ name: 'Walker Masami', grade: 'grade-1' }, FALLBACK);
    expect(character.name).toBe('Walker Masami');
    expect(character.grade).toBe('grade-1');
    expect(character.traits).toEqual([]);
    expect(character.reverseCursedTechnique).toBe('none');
  });

  it('falls back on an unknown grade rather than throwing', () => {
    expect(parseCharacter({ grade: 'grade-99' }, FALLBACK).grade).toBe('grade-4');
  });

  it('defaults stats to the resolved grade at Class 3', () => {
    const character = parseCharacter({ grade: 'special-grade' }, FALLBACK);
    for (const id of GRADED_STAT_IDS) {
      expect(formatStatShort(character.stats.graded[id])).toBe('SG[C3]');
    }
  });

  it('keeps stats that are present and repairs the ones that are not', () => {
    const character = parseCharacter(
      {
        grade: 'grade-1',
        stats: { graded: { speed: { grade: 'special-grade', classRank: 1 } }, ceReserves: 'deep' },
      },
      FALLBACK,
    );
    expect(formatStatShort(character.stats.graded['speed'])).toBe('SG[C1]');
    expect(formatStatShort(character.stats.graded['strength'])).toBe('G1[C3]');
    expect(character.stats.ceReserves).toBe('deep');
  });

  it('falls back on an unknown CE Reserves band', () => {
    const character = parseCharacter({ stats: { ceReserves: 'soggy' } }, FALLBACK);
    expect(character.stats.ceReserves).toBe('average');
  });

  it('gives list entries an id when the file omits one', () => {
    const character = parseCharacter({ traits: [{ name: 'Eccentric Genius' }] }, FALLBACK);
    expect(character.traits[0]?.id).toBe('trait-0');
    expect(character.traits[0]?.name).toBe('Eccentric Genius');
  });

  it('ignores a non-array where a list belongs', () => {
    expect(parseCharacter({ arts: 'three of them' }, FALLBACK).arts).toEqual([]);
  });

  it('treats a seedless origin as hand-made', () => {
    expect(parseCharacter({ origin: { tableVersion: '1' } }, FALLBACK).origin).toBeNull();
  });

  it('keeps a real generated origin', () => {
    const character = parseCharacter(
      { origin: { seed: 'abc', tableVersion: '2', expandedByClaude: true } },
      FALLBACK,
    );
    expect(character.origin).toEqual({ seed: 'abc', tableVersion: '2', expandedByClaude: true });
  });

  it('round-trips a character through JSON unchanged', () => {
    const original = createCharacter({ ...FALLBACK, name: 'Walker Masami', grade: 'grade-1' });
    const parsed = parseCharacter(JSON.parse(JSON.stringify(original)), FALLBACK);
    expect(parsed).toEqual(original);
  });
});

/**
 * The OC-template fields were added after characters had already been saved, so the claim that
 * no migration was needed rests on exactly this: a file written before them opens with blanks.
 */
describe('characters saved before the OC template existed', () => {
  const OLD_FILE = {
    schemaVersion: 1,
    id: 'c-old',
    kind: 'pc',
    name: 'Walker Masami',
    grade: 'grade-1',
    affiliation: 'Jujutsu High (Tokyo)',
    clan: 'Masami',
    age: '17',
    background: 'Found in a collapsed veil at nine.',
    traits: [{ id: 't1', name: 'Masami Bonus', effect: '+2 Classes Speed, −2 Classes Strength' }],
  };

  it('opens without losing anything it did hold', () => {
    const character = parseCharacter(OLD_FILE, FALLBACK);
    expect(character.name).toBe('Walker Masami');
    expect(character.affiliation).toBe('Jujutsu High (Tokyo)');
    expect(character.background).toBe('Found in a collapsed veil at nine.');
    expect(character.traits).toHaveLength(1);
  });

  it('gives every new field an empty value rather than undefined', () => {
    const character = parseCharacter(OLD_FILE, FALLBACK);

    for (const key of [
      'nicknames',
      'gender',
      'race',
      'subdivision',
      'dateOfBirth',
      'sexuality',
      'nationality',
      'ethnicity',
      'hairColour',
      'eyeColour',
      'height',
      'appearance',
      'occupation',
      'hobbies',
      'likes',
      'dislikes',
      'personality',
      'faction',
      'ceApplications',
      'arsenal',
      'potential',
      'mastery',
      'themeSong',
      'faceClaim',
    ] as const) {
      expect(character[key], key).toBe('');
    }

    expect(character.feats).toEqual([]);
    expect(character.defects).toEqual([]);
  });

  it('reads defects with ids of their own, so they cannot collide with traits', () => {
    const character = parseCharacter(
      { ...OLD_FILE, defects: [{ name: 'Glass Jaw', effect: '−2 Classes Fortitude' }] },
      FALLBACK,
    );
    expect(character.defects[0]?.id).toBe('defect-0');
    expect(character.traits[0]?.id).not.toBe(character.defects[0]?.id);
  });
});

describe('parseStatValue', () => {
  it('accepts the hand-written `class` key as well as `classRank`', () => {
    expect(formatStatShort(parseStatValue({ grade: 'grade-2', class: 1 }, 'grade-4'))).toBe(
      'G2[C1]',
    );
  });

  it('recognises the Civilian floor both ways', () => {
    expect(parseStatValue({ kind: 'civilian' }, 'grade-4')).toEqual(CIVILIAN_STAT);
    expect(parseStatValue({ grade: 'civilian-grade' }, 'grade-4')).toEqual(CIVILIAN_STAT);
  });

  it('rejects an out-of-range class', () => {
    expect(formatStatShort(parseStatValue({ grade: 'grade-1', classRank: 9 }, 'grade-4'))).toBe(
      'G1[C3]',
    );
  });
});
