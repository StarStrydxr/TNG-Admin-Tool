import { describe, expect, it } from 'vitest';

import { formatStatShort } from './grades';
import {
  CE_RESERVES_BANDS,
  DEFAULT_CE_RESERVES,
  GRADED_STAT_IDS,
  GRADED_STAT_LABELS,
  compareCeReserves,
  defaultStatBlock,
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
