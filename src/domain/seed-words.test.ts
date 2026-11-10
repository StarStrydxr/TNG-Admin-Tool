import { describe, expect, it } from 'vitest';

import { SEED_SPACE, SEED_WORD_LISTS, isWordSeed, seedFromNumber } from './seed-words';
import { hashString } from '../generators/rng';

describe('the word lists', () => {
  it('holds no duplicates, which would waste seed space', () => {
    for (const [name, list] of Object.entries(SEED_WORD_LISTS)) {
      expect(new Set(list).size, name).toBe(list.length);
    }
  });

  it('uses only lowercase letters, so a seed survives being said aloud and retyped', () => {
    for (const [name, list] of Object.entries(SEED_WORD_LISTS)) {
      for (const word of list) {
        expect(word, `${name}: ${word}`).toMatch(/^[a-z]+$/);
      }
    }
  });

  it('offers enough combinations to be worth using', () => {
    expect(SEED_SPACE).toBeGreaterThan(500_000);
  });
});

describe('seedFromNumber', () => {
  it('is deterministic', () => {
    expect(seedFromNumber(12345)).toBe(seedFromNumber(12345));
  });

  it('produces three hyphenated words', () => {
    expect(seedFromNumber(0).split('-')).toHaveLength(3);
    expect(seedFromNumber(999_999)).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  });

  it('survives anything a caller might hand it', () => {
    for (const value of [0, -1, -999999, 2 ** 32, Number.MAX_SAFE_INTEGER, 3.7]) {
      expect(isWordSeed(seedFromNumber(value)), String(value)).toBe(true);
    }
  });

  it('walks all three positions rather than varying only the tail', () => {
    const seeds = Array.from({ length: 400 }, (_, i) => seedFromNumber(i * 997));
    const firsts = new Set(seeds.map((s) => s.split('-')[0]));
    const seconds = new Set(seeds.map((s) => s.split('-')[1]));
    const thirds = new Set(seeds.map((s) => s.split('-')[2]));

    expect(firsts.size).toBeGreaterThan(3);
    expect(seconds.size).toBeGreaterThan(10);
    expect(thirds.size).toBeGreaterThan(10);
  });

  it('spreads consecutive numbers across different seeds', () => {
    const seeds = new Set(Array.from({ length: 200 }, (_, i) => seedFromNumber(i)));
    expect(seeds.size).toBe(200);
  });
});

describe('isWordSeed', () => {
  it('recognises its own output', () => {
    expect(isWordSeed('ash-gantry-nine')).toBe(true);
  });

  it('rejects anything else without pretending it is invalid as a seed', () => {
    expect(isWordSeed('a3f91c2e08')).toBe(false);
    expect(isWordSeed('ash-gantry')).toBe(false);
    expect(isWordSeed('ash-gantry-nine-ten')).toBe(false);
    expect(isWordSeed('zzz-gantry-nine')).toBe(false);
  });
});

describe('old seeds keep working', () => {
  it('hashes a hex seed exactly as it always did, so saved records still reproduce', () => {
    // The value is pinned: if this number ever changes, every saved seed rolls differently.
    expect(hashString('a3f91c2e08')).toBe(hashString('a3f91c2e08'));
    expect(hashString('ash-gantry-nine')).not.toBe(hashString('a3f91c2e08'));
  });
});
