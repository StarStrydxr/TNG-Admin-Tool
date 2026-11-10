import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ART_SLOTS,
  DEFAULT_TRAIT_SLOTS,
  artSlotUsage,
  characterDisplayName,
  createCharacter,
  traitSlotUsage,
  type Character,
  type Trait,
} from './character';
import { formatStatShort } from './grades';
import { GRADED_STAT_IDS } from './stats';

const INPUT = { id: 'c1', now: '2026-10-28T12:00:00.000Z', kind: 'pc', grade: 'grade-1' } as const;

function trait(id: string): Trait {
  return { id, name: id, effect: '', notes: '' };
}

describe('createCharacter', () => {
  it('starts every graded stat at Class 3 of the character grade', () => {
    const character = createCharacter(INPUT);
    for (const id of GRADED_STAT_IDS) {
      expect(formatStatShort(character.stats.graded[id])).toBe('G1[C3]');
    }
  });

  it('seeds slots from the Grade One anchor', () => {
    const character = createCharacter(INPUT);
    expect(character.traitSlots).toBe(DEFAULT_TRAIT_SLOTS);
    expect(character.artSlots).toBe(DEFAULT_ART_SLOTS);
  });

  it('is not marked as generated', () => {
    expect(createCharacter(INPUT).origin).toBeNull();
  });

  it('uses the injected timestamp for both stamps', () => {
    const character = createCharacter(INPUT);
    expect(character.createdAt).toBe(INPUT.now);
    expect(character.updatedAt).toBe(INPUT.now);
  });

  it('leaves binding vows empty — the field exists but nothing is built on it', () => {
    expect(createCharacter(INPUT).bindingVows).toEqual([]);
  });
});

describe('slot usage', () => {
  const base = createCharacter(INPUT);

  it('reports headroom', () => {
    const character: Character = { ...base, traits: [trait('a')] };
    expect(traitSlotUsage(character)).toEqual({ used: 1, total: 3, overBy: 0 });
  });

  it('reports an overfill rather than clamping', () => {
    const character: Character = {
      ...base,
      traits: [trait('a'), trait('b'), trait('c'), trait('d')],
    };
    expect(traitSlotUsage(character)).toEqual({ used: 4, total: 3, overBy: 1 });
  });

  it('tracks arts separately', () => {
    const character: Character = { ...base, artSlots: 1 };
    expect(artSlotUsage(character)).toEqual({ used: 0, total: 1, overBy: 0 });
  });
});

describe('characterDisplayName', () => {
  it('falls back for a blank name', () => {
    expect(characterDisplayName(createCharacter(INPUT))).toBe('Unnamed character');
    expect(characterDisplayName({ ...createCharacter(INPUT), name: '   ' })).toBe(
      'Unnamed character',
    );
  });

  it('uses the name when there is one', () => {
    expect(characterDisplayName({ ...createCharacter(INPUT), name: 'Walker Masami' })).toBe(
      'Walker Masami',
    );
  });
});
