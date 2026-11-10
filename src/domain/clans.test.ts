import { describe, expect, it } from 'vitest';

import {
  clanNames,
  createClan,
  describeClanBonus,
  describeMutations,
  directionOf,
  hierarchySummary,
  hierarchyTiers,
  isBlankClan,
  masamiSeed,
  modifier,
  mutationsFor,
  findClan,
  vacantSeats,
} from './clans';
import { entityGrade } from './entities';
import { parseEntity } from './entities-parse';
import { describeEntity } from './entities-display';
import type { Clan } from './entities';

const NOW = '2026-11-09T12:00:00.000Z';

function blank(): Clan {
  return createClan({ id: 'c1', now: NOW });
}

/** Through the real reader, so a test never asserts on a shape the vault could not produce. */
function reread(clan: Clan): Clan {
  const parsed = parseEntity(JSON.parse(JSON.stringify(clan)), 'fallback');
  if (!parsed || parsed.kind !== 'clan') throw new Error('did not parse as a clan');
  return parsed;
}

describe('a new clan', () => {
  it('starts blank, and says so', () => {
    expect(isBlankClan(blank())).toBe(true);
    expect(isBlankClan({ ...blank(), name: 'Zenin' })).toBe(false);
  });

  it('is ungraded, like lore', () => {
    expect(entityGrade(blank())).toBeNull();
  });

  it('has no grade line in its reading view', () => {
    const fields = describeEntity({ ...blank(), name: 'Zenin', motto: 'Strength' });
    expect(fields.map((field) => field.key)).not.toContain('grade');
  });
});

describe('the Masami seed', () => {
  const masami = masamiSeed('seed-id', NOW);

  it('carries the clan document’s bonuses', () => {
    expect(masami.bonuses.map((b) => b.text)).toEqual([
      '+2 Classes Speed',
      '+2 Classes CE Efficiency',
      '−2 Classes Strength',
    ]);
  });

  it('offers God’s Chosen at the document’s cost', () => {
    const mutation = masami.mutations.find((m) => m.id === 'gods-chosen');
    expect(mutation?.tpCost).toBe('8 TP');
  });

  it('leaves the Clan Head and all five Archangel seats vacant', () => {
    expect(vacantSeats(masami)).toHaveLength(6);
    expect(masami.hierarchy.filter((s) => s.title === 'Archangel')).toHaveLength(5);
    expect(hierarchySummary(masami)).toBe('0 of 6 seats held');
  });

  it('records the four figures from the document', () => {
    expect(masami.figures.map((f) => f.name)).toEqual([
      'Akira Masami',
      'Noriaka Masami',
      'Jinn Masami',
      'Walker Masami',
    ]);
  });

  it('starts with an empty vault — the money is Dan’s to write', () => {
    expect(masami.treasury).toEqual({ yen: '', notes: '', assets: [] });
  });

  it('survives a round trip through the vault reader unchanged', () => {
    expect(reread(masami)).toEqual(masami);
  });
});

describe('finding a clan', () => {
  const clans = [masamiSeed('m', NOW), { ...blank(), id: 'z', name: 'Zenin' }];

  it('matches by name, ignoring case and padding', () => {
    expect(findClan(clans, '  masami ')?.name).toBe('Masami');
  });

  it('matches by id', () => {
    expect(findClan(clans, 'z')?.name).toBe('Zenin');
  });

  it('finds nothing for a hand-typed clan, which is allowed', () => {
    expect(findClan(clans, 'Kamo')).toBeNull();
    expect(mutationsFor(clans, 'Kamo')).toEqual([]);
    expect(describeClanBonus(clans, 'Kamo')).toEqual([]);
  });

  it('finds nothing for an empty clan field rather than the first clan', () => {
    expect(findClan(clans, '')).toBeNull();
    expect(findClan(clans, '   ')).toBeNull();
  });

  it('lists names alphabetically, skipping unnamed records', () => {
    expect(clanNames([...clans, blank()])).toEqual(['Masami', 'Zenin']);
  });
});

describe('describing a character’s clan', () => {
  const clans = [masamiSeed('m', NOW)];

  it('reads the bonus out as lines', () => {
    expect(describeClanBonus(clans, 'Masami')).toContain('+2 Classes Speed');
  });

  it('writes a mutation as name, effects and cost', () => {
    const [line] = describeMutations(clans, 'Masami', ['gods-chosen']);
    expect(line).toContain('God’s Chosen');
    expect(line).toContain('+1 Grade CE Efficiency');
    expect(line).toContain('8 TP');
  });

  // A clan deleted or renamed must not quietly empty somebody's sheet.
  it('keeps an unknown id visible as itself', () => {
    expect(describeMutations(clans, 'Masami', ['long-gone'])).toEqual(['long-gone']);
    expect(describeMutations([], 'Masami', ['gods-chosen'])).toEqual(['gods-chosen']);
  });
});

describe('modifier direction', () => {
  it('reads an ASCII plus and minus', () => {
    expect(directionOf('+2 Speed')).toBe('up');
    expect(directionOf('-2 Strength')).toBe('down');
  });

  // The clan document is typed with a real minus sign, not a hyphen.
  it('reads a Unicode minus and an en dash', () => {
    expect(directionOf('−2 Strength')).toBe('down');
    expect(directionOf('–2 Strength')).toBe('down');
  });

  it('calls anything without a sign "other"', () => {
    expect(directionOf('A direct connection to God')).toBe('other');
    expect(modifier('').direction).toBe('other');
  });
});

describe('the hierarchy', () => {
  const clan: Clan = {
    ...blank(),
    name: 'Zenin',
    hierarchy: [
      { id: 'b', title: 'General', tier: 1, holder: '', holderId: '', status: 'vacant', notes: '' },
      { id: 'a', title: 'Head', tier: 0, holder: 'Naobito', holderId: '', status: 'held', notes: '' },
      { id: 'c', title: 'General', tier: 1, holder: 'Maki', holderId: '', status: 'contested', notes: '' },
    ],
  };

  it('groups seats by tier, top first', () => {
    expect(hierarchyTiers(clan).map((tier) => tier.map((s) => s.id))).toEqual([['a'], ['b', 'c']]);
  });

  it('counts only genuinely empty seats as vacant', () => {
    expect(vacantSeats(clan).map((s) => s.id)).toEqual(['b']);
  });

  it('mentions a contested seat in the summary', () => {
    expect(hierarchySummary(clan)).toBe('1 of 3 seats held · 1 contested');
  });

  it('says so when there is no hierarchy at all', () => {
    expect(hierarchySummary(blank())).toBe('No hierarchy recorded');
  });
});

describe('reading a hand-written clan file', () => {
  it('accepts bare strings for bonuses and reads their sign', () => {
    const parsed = reread({
      ...blank(),
      name: 'Kamo',
      bonuses: ['+1 Grade CE Output', '−2 Classes Speed'] as never,
    });

    expect(parsed.bonuses).toEqual([
      { text: '+1 Grade CE Output', direction: 'up' },
      { text: '−2 Classes Speed', direction: 'down' },
    ]);
  });

  it('treats a seat with a name and no status as held', () => {
    const parsed = parseEntity(
      {
        kind: 'clan',
        id: 'k',
        name: 'Kamo',
        hierarchy: [{ title: 'Clan Head', holder: 'Noritoshi' }],
      },
      'fallback',
    );

    expect(parsed?.kind).toBe('clan');
    if (parsed?.kind !== 'clan') return;
    expect(parsed.hierarchy[0]?.status).toBe('held');
    // No id written by hand, so one is derived rather than the row being dropped.
    expect(parsed.hierarchy[0]?.id).toBeTruthy();
  });

  it('falls back to an empty vault rather than failing on a missing treasury', () => {
    const parsed = parseEntity({ kind: 'clan', id: 'k', name: 'Kamo' }, 'fallback');
    if (parsed?.kind !== 'clan') throw new Error('did not parse');
    expect(parsed.treasury).toEqual({ yen: '', notes: '', assets: [] });
  });

  it('drops a blank bonus line rather than storing an empty modifier', () => {
    const parsed = reread({ ...blank(), bonuses: ['', '  '] as never });
    expect(parsed.bonuses).toEqual([]);
  });
});
