import { describe, expect, it } from 'vitest';

import {
  SIMILARITY_THRESHOLD,
  findSimilar,
  formatSimilarity,
  significantWords,
  similarity,
} from './similarity';
import { parseEntity } from './entities-parse';
import type { SavedEntity } from './entities';

function entity(raw: Record<string, unknown>): SavedEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error('fixture did not parse');
  return parsed;
}

describe('significantWords', () => {
  it('drops stop words and very short words', () => {
    const words = significantWords('The curse is in the depot at Nakano');
    expect([...words].sort()).toEqual(['curse', 'depot', 'nakano']);
  });

  it('lowercases and splits on punctuation', () => {
    expect([...significantWords('Nakano, depot — NAKANO!')].sort()).toEqual(['depot', 'nakano']);
  });

  it('keeps the distinctive vocabulary that makes records tellable apart', () => {
    const words = significantWords('An amalgam of fused bodies, faces still moving');
    expect(words.has('amalgam')).toBe(true);
    expect(words.has('faces')).toBe(true);
  });
});

describe('similarity', () => {
  const abc = new Set(['a', 'b', 'c']);

  it('is 1 for identical sets', () => {
    expect(similarity(abc, new Set(['a', 'b', 'c']))).toBe(1);
  });

  it('is 0 for disjoint sets', () => {
    expect(similarity(abc, new Set(['x', 'y']))).toBe(0);
  });

  it('is the overlap over the union', () => {
    // shared 2, union 4
    expect(similarity(abc, new Set(['b', 'c', 'd']))).toBeCloseTo(0.5);
  });

  it('is symmetric', () => {
    const other = new Set(['b', 'c', 'd', 'e']);
    expect(similarity(abc, other)).toBe(similarity(other, abc));
  });

  it('treats two empty records as identical, and one empty as unrelated', () => {
    expect(similarity(new Set(), new Set())).toBe(1);
    expect(similarity(abc, new Set())).toBe(0);
  });
});

describe('findSimilar', () => {
  const original = entity({
    kind: 'mission',
    id: 'm1',
    name: 'Exorcism at the depot',
    grade: 'grade-2',
    missionType: 'Exorcism',
    location: 'A parcel depot in Nakano',
    client: 'A shift supervisor',
    briefing: 'One curse, grade three at worst',
    trueSituation: 'There are two, and one is thinking',
  });

  const nearDuplicate = entity({ ...JSON.parse(JSON.stringify(original)), id: 'm2' });

  const different = entity({
    kind: 'mission',
    id: 'm3',
    name: 'Retrieval from the shrine',
    grade: 'special-grade',
    missionType: 'Retrieval',
    location: 'A mountain shrine above the treeline',
    client: 'A clan retainer',
    briefing: 'Collect a sealed box and sign for it',
    trueSituation: 'The box has been empty for years',
  });

  const sameWordsOtherKind = entity({
    kind: 'cursed-tool',
    id: 'k1',
    name: 'Exorcism at the depot',
    grade: 'grade-2',
    appearance: 'A parcel depot in Nakano',
    provenance: 'A shift supervisor',
  });

  it('finds a near-duplicate', () => {
    const matches = findSimilar(original, [nearDuplicate, different]);
    expect(matches.map((m) => m.entity.id)).toEqual(['m2']);
    expect(matches[0]?.score).toBeGreaterThan(0.9);
  });

  it('leaves genuinely different records alone', () => {
    expect(findSimilar(original, [different])).toEqual([]);
  });

  it('never matches a record against itself', () => {
    expect(findSimilar(original, [original])).toEqual([]);
  });

  it('does not compare across kinds, where shared words mean nothing', () => {
    expect(findSimilar(original, [sameWordsOtherKind])).toEqual([]);
  });

  it('sorts the most alike first', () => {
    const middling = entity({
      ...JSON.parse(JSON.stringify(original)),
      id: 'm4',
      trueSituation: 'Something else entirely is happening here instead',
      briefing: 'A different brief altogether, mentioning nothing familiar',
    });

    const matches = findSimilar(original, [middling, nearDuplicate], 0.1);
    expect(matches.map((m) => m.entity.id)).toEqual(['m2', 'm4']);
  });

  it('honours a custom threshold', () => {
    expect(findSimilar(original, [different], 0)).toHaveLength(1);
    expect(findSimilar(original, [nearDuplicate], 1.1)).toHaveLength(0);
  });

  it('uses a threshold that does not fire on ordinary variety', () => {
    // Two unrelated missions from the same tables must not look like duplicates.
    expect(similarity(
      significantWords('A parcel depot in Nakano, exorcism, a shift supervisor'),
      significantWords('A mountain shrine above the treeline, retrieval, a clan retainer'),
    )).toBeLessThan(SIMILARITY_THRESHOLD);
  });
});

describe('formatSimilarity', () => {
  it('rounds to a readable percentage', () => {
    expect(formatSimilarity(0.843)).toBe('84%');
    expect(formatSimilarity(1)).toBe('100%');
  });
});
