import { describe, expect, it } from 'vitest';

import {
  BLACK_FLASH_TURNS,
  blackFlashLogLine,
  blackFlashView,
  strengthGradeBonus,
} from './black-flash';
import { blackFlashTotal, createCharacter } from './character';
import { parseCharacter } from './character-parse';
import { CIVILIAN_STAT, formatStatShort, statValue, type GradeId } from './grades';
import { defaultStatBlock, type StatBlock } from './stats';

const NOW = '2026-11-10T00:00:00.000Z';

function character(grade: GradeId, stats?: StatBlock) {
  const base = createCharacter({ id: 'c1', kind: 'pc', name: 'Test', grade, now: NOW });
  return stats ? { ...base, stats } : base;
}

/** The buffed reading of one stat, short form. */
function buffed(grade: GradeId, stats: StatBlock, id: string): string {
  const view = blackFlashView(grade, stats);
  const found = view.stats.find((s) => s.id === id);
  if (!found) throw new Error(`no stat ${id}`);
  return formatStatShort(found.buffed);
}

describe('the Strength bonus', () => {
  it('is +2 Grades below the threshold', () => {
    expect(strengthGradeBonus('grade-4')).toBe(2);
    expect(strengthGradeBonus('grade-1')).toBe(2);
  });

  // ⚠️ Keyed on the character's grade, not on Strength's own (Dan, 10 Nov 2026).
  it('halves to +1 Grade at Semi-Special Grade and above', () => {
    expect(strengthGradeBonus('semi-special-grade')).toBe(1);
    expect(strengthGradeBonus('special-grade')).toBe(1);
    expect(strengthGradeBonus('apocalypse-grade')).toBe(1);
  });

  it('reads the character grade even when Strength is far above it', () => {
    const stats = defaultStatBlock('grade-2');
    const freakish: StatBlock = {
      ...stats,
      graded: { ...stats.graded, strength: statValue('special-grade', 3) },
    };
    // Grade 2 character, so the full +2 — the sorcerer is below the threshold, not the arm.
    expect(blackFlashView('grade-2', freakish).strengthGrades).toBe(2);
  });
});

describe('the buffed reading', () => {
  const stats = defaultStatBlock('grade-1');

  it('adds one class to every stat', () => {
    // Class 1 is the strongest, so +1 Class is C3 -> C2.
    expect(buffed('grade-1', stats, 'perception')).toBe('G1[C2]');
    expect(buffed('grade-1', stats, 'speed')).toBe('G1[C2]');
  });

  it('gives Strength both the grades and the class', () => {
    // Grade 1 is rank 5, so +2 rungs clears the implied Semi-Special and lands on Special
    // Grade — rank 7 — and the class step then takes it to C2.
    expect(buffed('grade-1', stats, 'strength')).toBe('SG[C2]');
  });

  it('gives Strength only one grade above the threshold', () => {
    const sg = defaultStatBlock('special-grade');
    expect(buffed('special-grade', sg, 'strength')).toBe('DG[C2]');
  });

  // CLAUDE.md §4: five classes span a rung, so a class added at C1 carries up.
  it('carries a Class 1 stat up a grade', () => {
    const at1: StatBlock = {
      ...stats,
      graded: { ...stats.graded, speed: statValue('grade-1', 1) },
    };
    expect(buffed('grade-1', at1, 'speed')).toBe('S-SG[C5]');
  });

  it('clamps at the top of the ladder rather than running off it', () => {
    const top = defaultStatBlock('apocalypse-grade');
    const maxed: StatBlock = {
      ...top,
      graded: { ...top.graded, strength: statValue('apocalypse-grade', 1) },
    };
    expect(buffed('apocalypse-grade', maxed, 'strength')).toBe('AG[C1]');
    const view = blackFlashView('apocalypse-grade', maxed);
    expect(view.stats.find((s) => s.id === 'strength')?.moved).toBe(false);
  });

  // §12.1 is open on whether Civilian Grade has classes, so nothing is invented.
  it('leaves a Civilian stat alone and says it did not move', () => {
    const civilian: StatBlock = {
      ...stats,
      graded: { ...stats.graded, strength: CIVILIAN_STAT },
    };
    const found = blackFlashView('grade-1', civilian).stats.find((s) => s.id === 'strength');
    expect(found?.buffed).toEqual(CIVILIAN_STAT);
    expect(found?.moved).toBe(false);
  });

  it('reports the five turns without tracking them', () => {
    expect(blackFlashView('grade-1', stats).turns).toBe(BLACK_FLASH_TURNS);
    expect(BLACK_FLASH_TURNS).toBe(5);
  });

  // The whole point of deriving rather than storing (CLAUDE.md §4).
  it('does not touch the stat block it was given', () => {
    const original = defaultStatBlock('grade-1');
    const copy = structuredClone(original);
    blackFlashView('grade-1', original);
    expect(original).toEqual(copy);
  });

  it('leaves CE Reserves out of it entirely', () => {
    const view = blackFlashView('grade-1', stats);
    expect(view.stats.map((s) => s.id)).not.toContain('ceReserves');
    expect(view.stats).toHaveLength(7);
  });
});

describe('the log', () => {
  it('starts empty on a new character and totals zero', () => {
    const made = character('grade-1');
    expect(made.blackFlashes).toEqual([]);
    expect(blackFlashTotal(made)).toBe(0);
  });

  // An old sheet keeps the number it already had, and logged ones add to it.
  it('adds the unlogged count and the written-up entries', () => {
    const made = {
      ...character('grade-1'),
      blackFlashCount: 3,
      blackFlashes: [
        { id: 'a', date: '2026-03-12', against: 'a Grade 2 curse', notes: '' },
        { id: 'b', date: '2026-04-02', against: '', notes: 'in the rain' },
      ],
    };
    expect(blackFlashTotal(made)).toBe(5);
  });

  it('writes a line from whichever parts were filled in', () => {
    expect(blackFlashLogLine({ id: 'a', date: '12 Mar', against: 'a curse', notes: 'first' })).toBe(
      '12 Mar — against a curse — first',
    );
    expect(blackFlashLogLine({ id: 'b', date: '', against: '', notes: 'no details' })).toBe(
      'no details',
    );
  });

  it('parses a sheet written before the log existed', () => {
    const old = parseCharacter(
      { schemaVersion: 1, id: 'c1', kind: 'pc', name: 'Ito', grade: 'grade-3', blackFlashCount: 2 },
      { id: 'c1', kind: 'pc', name: 'fallback', grade: 'grade-4', now: NOW },
    );
    expect(old.blackFlashes).toEqual([]);
    expect(old.blackFlashCount).toBe(2);
    expect(blackFlashTotal(old)).toBe(2);
  });

  it('derives an id for an entry written by hand without one', () => {
    const read = parseCharacter(
      {
        schemaVersion: 1,
        id: 'c1',
        kind: 'pc',
        name: 'Ito',
        grade: 'grade-3',
        blackFlashes: [{ date: '12 Mar', against: 'a curse' }],
      },
      { id: 'c1', kind: 'pc', name: 'fallback', grade: 'grade-4', now: NOW },
    );
    expect(read.blackFlashes[0]?.id).toBeTruthy();
    expect(read.blackFlashes[0]?.against).toBe('a curse');
  });
});
