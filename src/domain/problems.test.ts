import { describe, expect, it } from 'vitest';

import { createCharacter } from './character';
import { parseEntity } from './entities-parse';
import { findProblems, groupProblems, type Problem } from './problems';
import type { SavedEntity } from './entities';

function entity(raw: Record<string, unknown>): SavedEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error('fixture did not parse');
  return parsed;
}

function character(over: Partial<ReturnType<typeof createCharacter>> = {}) {
  return {
    ...createCharacter({
      id: 'c1',
      kind: 'pc' as const,
      name: 'Walker Masami',
      grade: 'grade-1' as const,
      now: '2026-11-09T00:00:00Z',
    }),
    ...over,
  };
}

function kinds(problems: readonly Problem[]): readonly string[] {
  return problems.map((problem) => problem.kind);
}

const NO_IMAGES: ReadonlySet<string> = new Set();

describe('dangling links', () => {
  it('reports a link whose target is gone, by the name the link remembers', () => {
    const mission = entity({
      kind: 'mission',
      id: 'm1',
      name: 'The depot',
      grade: 'grade-2',
      links: [{ id: 'gone', kind: 'curse', label: 'The thing in the water', note: '' }],
    });

    const [problem] = findProblems({ records: [mission], imageNames: NO_IMAGES });
    expect(problem?.kind).toBe('dangling-link');
    expect(problem?.detail).toContain('The thing in the water');
  });

  it('says nothing when the target is there', () => {
    const curse = entity({ kind: 'curse', id: 'x1', name: 'The thing', grade: 'grade-2' });
    const mission = entity({
      kind: 'mission',
      id: 'm1',
      name: 'The depot',
      grade: 'grade-2',
      links: [{ id: 'x1', kind: 'curse', label: 'The thing', note: '' }],
    });

    expect(findProblems({ records: [mission, curse], imageNames: NO_IMAGES })).toEqual([]);
  });
});

describe('missing pictures', () => {
  const withPicture = entity({
    kind: 'curse',
    id: 'x1',
    name: 'The thing',
    grade: 'grade-2',
    image: 'curse-1.png',
  });

  it('reports a record pointing at a file that is not there', () => {
    const found = findProblems({ records: [withPicture], imageNames: new Set(['other.png']) });
    expect(kinds(found)).toEqual(['missing-image']);
    expect(found[0]?.detail).toContain('curse-1.png');
  });

  it('says nothing when the file is there', () => {
    expect(
      findProblems({ records: [withPicture], imageNames: new Set(['curse-1.png']) }),
    ).toEqual([]);
  });

  /**
   * Without the shell there is no way to list the folder. Reporting every picture as missing
   * would be worse than useless, so the check is skipped and the panel says so.
   */
  it('skips the check entirely when the folder could not be read', () => {
    expect(findProblems({ records: [withPicture], imageNames: null })).toEqual([]);
  });

  it('is not a problem for a record with no picture at all', () => {
    const bare = entity({ kind: 'curse', id: 'x2', name: 'Another', grade: 'grade-2' });
    expect(findProblems({ records: [bare], imageNames: NO_IMAGES })).toEqual([]);
  });
});

describe('duplicate names', () => {
  it('flags both records when two of a kind share a name', () => {
    const found = findProblems({
      records: [
        entity({ kind: 'curse', id: 'a', name: 'The Thing', grade: 'grade-2' }),
        entity({ kind: 'curse', id: 'b', name: 'the thing', grade: 'grade-3' }),
      ],
      imageNames: NO_IMAGES,
    });
    expect(kinds(found)).toEqual(['duplicate-name', 'duplicate-name']);
  });

  it('leaves a curse and a mission with the same name alone', () => {
    const found = findProblems({
      records: [
        entity({ kind: 'curse', id: 'a', name: 'Shibuya', grade: 'grade-2' }),
        entity({ kind: 'lore', id: 'b', name: 'Shibuya' }),
      ],
      imageNames: NO_IMAGES,
    });
    expect(found).toEqual([]);
  });

  it('does not treat two unnamed records as duplicates of each other', () => {
    const found = findProblems({
      records: [
        entity({ kind: 'curse', id: 'a', name: '', grade: 'grade-2' }),
        entity({ kind: 'curse', id: 'b', name: '', grade: 'grade-2' }),
      ],
      imageNames: NO_IMAGES,
    });
    expect(kinds(found)).toEqual(['unnamed', 'unnamed']);
  });
});

describe('slot limits', () => {
  it('reports a character carrying more traits than they have slots for', () => {
    const found = findProblems({
      records: [
        character({
          traitSlots: 1,
          traits: [
            { id: 't1', name: 'One', effect: '', notes: '' },
            { id: 't2', name: 'Two', effect: '', notes: '' },
          ],
        }),
      ],
      imageNames: NO_IMAGES,
    });

    expect(kinds(found)).toEqual(['over-slots']);
    expect(found[0]?.detail).toBe('2 traits in 1 slots.');
  });

  it('says nothing at exactly the limit', () => {
    const found = findProblems({
      records: [
        character({ traitSlots: 1, traits: [{ id: 't1', name: 'One', effect: '', notes: '' }] }),
      ],
      imageNames: NO_IMAGES,
    });
    expect(found).toEqual([]);
  });
});

describe('grouping', () => {
  it('drops empty groups and keeps the declared order', () => {
    const found = findProblems({
      records: [
        entity({ kind: 'curse', id: 'a', name: '', grade: 'grade-2', image: 'gone.png' }),
      ],
      imageNames: NO_IMAGES,
    });

    expect(groupProblems(found).map(([kind]) => kind)).toEqual(['missing-image', 'unnamed']);
  });

  it('is empty for a clean vault', () => {
    expect(groupProblems([])).toEqual([]);
  });
});

describe('a clan seat whose holder was deleted', () => {
  // `holderId` is not an `EntityLink`, so the dangling-link check cannot see it.
  const clan = entity({
    kind: 'clan',
    id: 'cl1',
    name: 'Masami',
    hierarchy: [
      { id: 'head', title: 'Clan Head', tier: 0, holder: 'Jinn Masami', holderId: 'gone', status: 'held' },
      { id: 'a1', title: 'Archangel', tier: 1, status: 'vacant' },
    ],
  });

  it('reports the stale claim, naming the seat and the person', () => {
    const problems = findProblems({ records: [clan], imageNames: NO_IMAGES });
    const orphan = problems.find((problem) => problem.kind === 'orphan-seat');
    expect(orphan?.detail).toContain('Clan Head');
    expect(orphan?.detail).toContain('Jinn Masami');
  });

  it('says nothing once the character is back in the vault', () => {
    const records = [clan, character({ id: 'gone', name: 'Jinn Masami' })];
    expect(kinds(findProblems({ records, imageNames: NO_IMAGES }))).not.toContain('orphan-seat');
  });

  it('ignores a vacant seat and a holder typed by hand with no link', () => {
    const byHand = entity({
      kind: 'clan',
      id: 'cl2',
      name: 'Zenin',
      hierarchy: [{ id: 'head', title: 'Clan Head', holder: 'Naobito Zenin' }],
    });
    expect(kinds(findProblems({ records: [byHand], imageNames: NO_IMAGES }))).not.toContain(
      'orphan-seat',
    );
  });
});
