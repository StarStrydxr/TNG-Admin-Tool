import { describe, expect, it } from 'vitest';

import { CIVILIAN_STAT, formatStatShort, statValue, type GradeId } from './grades';
import {
  CE_RESERVES_BANDS,
  DEFAULT_CE_RESERVES,
  GRADED_STAT_IDS,
  GRADED_STAT_LABELS,
  compareCeReserves,
  defaultStatBlock,
  describeEffectiveReserves,
  effectiveReserves,
  type CeReservesBand,
  type StatBlock,
} from './stats';

describe('the stat block', () => {
  it('has seven graded stats', () => {
    expect(GRADED_STAT_IDS).toHaveLength(7);
  });

  it('labels every graded stat', () => {
    for (const id of GRADED_STAT_IDS) {
      expect(GRADED_STAT_LABELS[id]).toBeTruthy();
    }
  });

  it("starts every stat at Class 3 of the character's own grade", () => {
    const block = defaultStatBlock('grade-1');
    for (const id of GRADED_STAT_IDS) {
      expect(formatStatShort(block.graded[id])).toBe('G1[C3]');
    }
  });

  it('follows the character grade', () => {
    expect(formatStatShort(defaultStatBlock('special-grade').graded['speed'])).toBe('SG[C3]');
  });

  it('defaults CE Reserves to a band, not a grade', () => {
    expect(defaultStatBlock('grade-4').ceReserves).toBe(DEFAULT_CE_RESERVES);
    expect(CE_RESERVES_BANDS).toContain(DEFAULT_CE_RESERVES);
  });
});

describe('CE Reserves', () => {
  it('runs shallow to endless', () => {
    expect([...CE_RESERVES_BANDS]).toEqual([
      'shallow',
      'average',
      'deep',
      'bottomless',
      'abysmal',
      'endless',
    ]);
  });

  it('orders bands by depth', () => {
    expect(compareCeReserves('shallow', 'deep')).toBeLessThan(0);
    expect(compareCeReserves('endless', 'bottomless')).toBeGreaterThan(0);
    expect(compareCeReserves('deep', 'deep')).toBe(0);
  });
});

describe('effective reserves', () => {
  /** A block at `grade` throughout, with Efficiency and the reserves band overridden. */
  function block(
    grade: GradeId,
    efficiency: GradeId,
    ceReserves: CeReservesBand,
  ): StatBlock {
    const base = defaultStatBlock(grade);
    return {
      ...base,
      graded: { ...base.graded, 'ce-efficiency': statValue(efficiency) },
      ceReserves,
    };
  }

  it('leaves the band alone when Efficiency is level with Output', () => {
    const result = effectiveReserves(block('grade-1', 'grade-1', 'deep'));
    expect(result).toEqual({ base: 'deep', band: 'deep', steps: 0, capped: false });
  });

  // Dan's own example, 10 Nov 2026.
  it('raises Deep to Bottomless at one grade above', () => {
    const result = effectiveReserves(block('grade-1', 'semi-special-grade', 'deep'));
    expect(result.band).toBe('bottomless');
    expect(result.steps).toBe(1);
  });

  it('adds one stage per grade, so two grades reach Abysmal from Deep', () => {
    expect(effectiveReserves(block('grade-1', 'special-grade', 'deep')).band).toBe('abysmal');
  });

  // The ladder's implied rungs are real for gap counting (CLAUDE.md §4), so Semi-2 to 2 is one.
  it('counts an implied rung', () => {
    const result = effectiveReserves(block('grade-semi-2', 'grade-2', 'average'));
    expect(result.steps).toBe(1);
    expect(result.band).toBe('deep');
  });

  it('never lowers the band when Efficiency is below Output', () => {
    const result = effectiveReserves(block('grade-1', 'grade-4', 'deep'));
    expect(result).toEqual({ base: 'deep', band: 'deep', steps: 0, capped: false });
  });

  it('stops at Endless and says the scale ran out', () => {
    const result = effectiveReserves(block('grade-4', 'special-grade', 'bottomless'));
    expect(result.band).toBe('endless');
    expect(result.capped).toBe(true);
    expect(result.steps).toBe(7);
    expect(describeEffectiveReserves(block('grade-4', 'special-grade', 'bottomless'))).toContain(
      'past the top of the scale',
    );
  });

  it('yields no shift when either stat is Civilian', () => {
    const base = defaultStatBlock('grade-1');
    const civilianEfficiency: StatBlock = {
      ...base,
      graded: { ...base.graded, 'ce-efficiency': CIVILIAN_STAT },
      ceReserves: 'deep',
    };
    const civilianOutput: StatBlock = {
      ...base,
      graded: { ...base.graded, 'ce-output': CIVILIAN_STAT },
      ceReserves: 'deep',
    };

    expect(effectiveReserves(civilianEfficiency).steps).toBe(0);
    expect(effectiveReserves(civilianOutput).steps).toBe(0);
  });

  it('describes a level block as the plain band, with no explanation bolted on', () => {
    expect(describeEffectiveReserves(block('grade-1', 'grade-1', 'deep'))).toBe('Deep');
  });

  it('names the grade count in the singular and the plural', () => {
    expect(describeEffectiveReserves(block('grade-1', 'semi-special-grade', 'deep'))).toContain(
      '1 grade of CE Efficiency over Output',
    );
    expect(describeEffectiveReserves(block('grade-1', 'special-grade', 'deep'))).toContain(
      '2 grades of CE Efficiency over Output',
    );
  });

  // The whole point of deriving rather than storing (CLAUDE.md §4).
  it('does not touch the block it was given', () => {
    const original = block('grade-1', 'special-grade', 'deep');
    const copy = structuredClone(original);
    effectiveReserves(original);
    expect(original).toEqual(copy);
    expect(original.ceReserves).toBe('deep');
  });
});
