import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTER,
  applyFilter,
  gradesPresent,
  isFilterActive,
  matchesFilter,
  queryTerms,
  searchableText,
} from './entity-search';
import { parseEntity } from './entities-parse';
import type { SavedEntity } from './entities';

function entity(raw: Record<string, unknown>): SavedEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error('fixture did not parse');
  return parsed;
}

const mission = entity({
  kind: 'mission',
  id: 'm1',
  name: 'Exorcism at the depot',
  grade: 'grade-2',
  missionType: 'Exorcism',
  location: 'A parcel depot in Nakano',
  client: 'A shift supervisor',
  complications: ['Standing water', 'A hard deadline'],
  folder: 'Arc 2/Shibuya',
  minRole: 'admin',
  image: 'abc.png',
  notes: 'Kurosawa nearly lost an arm.',
});

const tool = entity({
  kind: 'cursed-tool',
  id: 'k1',
  name: 'Split-ash tanto',
  grade: 'grade-3',
  form: 'blade',
  properties: ['Cuts cursed energy cleanly'],
  minRole: 'player',
});

describe('searchable text', () => {
  it('covers a record’s own fields without being told which', () => {
    const text = searchableText(mission);
    expect(text).toContain('nakano');
    expect(text).toContain('shift supervisor');
    expect(text).toContain('standing water');
    expect(text).toContain('kurosawa');
    expect(text).toContain('arc 2/shibuya');
  });

  it('matches a grade by label and by abbreviation', () => {
    const text = searchableText(mission);
    expect(text).toContain('grade 2');
    expect(text).toContain('g2');
  });

  it('reaches into an embedded shikigami', () => {
    const technique = entity({
      kind: 'technique',
      id: 't1',
      name: 'Ten Shadows',
      grade: 'grade-1',
      shikigami: [{ id: 's1', grade: 'grade-3', name: 'Nue', form: 'A winged thing' }],
    });
    expect(searchableText(technique)).toContain('nue');
    expect(searchableText(technique)).toContain('winged thing');
  });

  it('separates fields so a term cannot match across a boundary', () => {
    // Without a separator, "…in Nakano" + "A shift supervisor" would read as "nakanoa shift".
    expect(searchableText(mission)).not.toContain('nakanoa');
    expect(matchesFilter(mission, { ...EMPTY_FILTER, query: 'nakanoa' })).toBe(false);
  });
});

describe('query terms', () => {
  it('splits on whitespace and lowercases', () => {
    expect(queryTerms('  Nakano   DEPOT ')).toEqual(['nakano', 'depot']);
  });

  it('is empty for an empty query', () => {
    expect(queryTerms('   ')).toEqual([]);
  });
});

describe('matching', () => {
  it('passes everything when nothing is set', () => {
    expect(matchesFilter(mission, EMPTY_FILTER)).toBe(true);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it('ANDs the terms', () => {
    expect(matchesFilter(mission, { ...EMPTY_FILTER, query: 'nakano depot' })).toBe(true);
    expect(matchesFilter(mission, { ...EMPTY_FILTER, query: 'nakano kyoto' })).toBe(false);
  });

  it('ignores case', () => {
    expect(matchesFilter(mission, { ...EMPTY_FILTER, query: 'NAKANO' })).toBe(true);
  });

  it('filters by grade exactly', () => {
    expect(matchesFilter(mission, { ...EMPTY_FILTER, grade: 'grade-2' })).toBe(true);
    expect(matchesFilter(mission, { ...EMPTY_FILTER, grade: 'grade-1' })).toBe(false);
  });

  it('filters by visibility exactly', () => {
    expect(matchesFilter(mission, { ...EMPTY_FILTER, minRole: 'admin' })).toBe(true);
    expect(matchesFilter(mission, { ...EMPTY_FILTER, minRole: 'player' })).toBe(false);
  });

  it('filters to records that have a picture', () => {
    expect(matchesFilter(mission, { ...EMPTY_FILTER, withImage: true })).toBe(true);
    expect(matchesFilter(tool, { ...EMPTY_FILTER, withImage: true })).toBe(false);
  });

  it('combines a query with a filter rather than choosing one', () => {
    expect(
      matchesFilter(mission, { ...EMPTY_FILTER, query: 'nakano', grade: 'grade-1' }),
    ).toBe(false);
  });
});

describe('applying to a list', () => {
  const all = [mission, tool];

  it('returns the same array when nothing is set, rather than a copy', () => {
    expect(applyFilter(all, EMPTY_FILTER)).toBe(all);
  });

  it('narrows to the matches', () => {
    expect(applyFilter(all, { ...EMPTY_FILTER, query: 'tanto' })).toEqual([tool]);
    expect(applyFilter(all, { ...EMPTY_FILTER, query: 'nothing here' })).toEqual([]);
  });

  it('lists only the grades actually present', () => {
    expect([...gradesPresent(all)].sort()).toEqual(['grade-2', 'grade-3']);
  });
});
