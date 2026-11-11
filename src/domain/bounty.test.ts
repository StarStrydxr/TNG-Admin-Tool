import { describe, expect, it } from 'vitest';

import {
  BOUNTY_PURSE,
  examplePurse,
  formatYen,
  missingPurses,
  purseFor,
  threatNote,
} from './bounty';
import { DEFAULT_DIFFICULTY_PRESETS } from './difficulty';
import { rollBountyPurse } from '../generators/rewards';
import { parseEntity } from './entities-parse';
import { describeEntity } from './entities-display';

describe('the bounty purse', () => {
  it('has a band for every grade on the ladder', () => {
    expect(missingPurses()).toEqual([]);
  });

  it('rises with the grade, never falling back a rung', () => {
    const bands = Object.values(BOUNTY_PURSE);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]!.min).toBeGreaterThanOrEqual(bands[i - 1]!.min);
      expect(bands[i]!.max).toBeGreaterThan(bands[i - 1]!.max);
    }
  });

  it('every band is a real range', () => {
    for (const [grade, band] of Object.entries(BOUNTY_PURSE)) {
      expect(band.max, grade).toBeGreaterThan(band.min);
      expect(band.min, grade).toBeGreaterThan(0);
    }
  });

  // Dan's one real example: a Disaster Grade threat paying ¥1,000,000.
  it('prices a Disaster Grade threat around the example', () => {
    const band = purseFor('disaster-grade');
    expect(band.min).toBeLessThanOrEqual(1_000_000);
    expect(band.max).toBeGreaterThanOrEqual(1_000_000);
  });

  /**
   * ⚠️ The whole point of a separate economy. Missions cap money at 50,000 Yen on purpose;
   * a bounty starts near where that ends. If these two ever overlap at the top, somebody has
   * wired the bounty purse to the difficulty tiers and the economies have merged.
   */
  it('starts above the mission economy it is deliberately separate from', () => {
    const missionCeiling = Math.max(
      ...DEFAULT_DIFFICULTY_PRESETS.flatMap((preset) =>
        [preset.base, preset.objective, preset.mvp].map((bucket) => bucket.yen.max),
      ),
    );
    expect(missionCeiling).toBeLessThanOrEqual(purseFor('grade-4').max);
  });

  it('rounds hard, because ¥1,043,117 reads as a bug', () => {
    expect(formatYen(1_043_117)).toBe('¥1,050,000');
    expect(formatYen(23_117)).toBe('¥20,000');
    // Never rounds away to nothing.
    expect(formatYen(1)).toBe('¥10,000');
  });

  it('rolls the same purse from the same seed', () => {
    const a = rollBountyPurse('disaster-grade', 'ash-gantry-nine');
    const b = rollBountyPurse('disaster-grade', 'ash-gantry-nine');
    expect(a).toBe(b);
  });

  it('rolls inside the band', () => {
    const band = purseFor('grade-1');
    for (const seed of ['one', 'two', 'three', 'four', 'five']) {
      const value = Number(rollBountyPurse('grade-1', seed).replace(/[¥,]/g, ''));
      // Rounded outward by at most one step.
      expect(value).toBeGreaterThanOrEqual(band.min - 50_000);
      expect(value).toBeLessThanOrEqual(band.max + 50_000);
    }
  });

  it('offers a midpoint as placeholder text', () => {
    expect(examplePurse('disaster-grade')).toMatch(/^¥[\d,]+$/);
  });
});

describe('the gap between the two grades', () => {
  it('says nothing when they agree', () => {
    expect(threatNote('grade-1', 'grade-1')).toBe('');
  });

  // Dan's example: a Special Grade target posted as a Disaster Grade threat.
  it('calls out a threat posted above the target', () => {
    const note = threatNote('disaster-grade', 'special-grade');
    expect(note).toContain('Special Grade');
    expect(note).toContain('Disaster Grade');
    expect(note).toMatch(/despite/i);
  });

  it('calls out a target ranked above the posting', () => {
    const note = threatNote('grade-2', 'special-grade');
    expect(note).toContain('above');
  });
});

describe('the bounty record', () => {
  const raw = {
    kind: 'bounty',
    id: 'b1',
    name: 'Bounty: Walker Masami',
    grade: 'disaster-grade',
    targetGrade: 'special-grade',
    target: 'Walker Masami',
    conspicuousity: 'Public',
    state: 'Dead',
    pings: ['Curse User', 'Student', 'Teacher'],
    crime: 'conspiracy against Jujutsu Society',
    objectives: ['Kill him, no exceptions.'],
    rewards: ['¥1,000,000'],
  };

  it('keeps the two grades apart', () => {
    const parsed = parseEntity(raw, 'fallback');
    if (parsed?.kind !== 'bounty') throw new Error('did not parse as a bounty');
    expect(parsed.grade).toBe('disaster-grade');
    expect(parsed.targetGrade).toBe('special-grade');
  });

  // A posting that names one grade means both — not Grade 4 by accident.
  it('defaults the target grade to the threat grade', () => {
    const parsed = parseEntity({ ...raw, targetGrade: undefined }, 'fallback');
    if (parsed?.kind !== 'bounty') throw new Error('did not parse as a bounty');
    expect(parsed.targetGrade).toBe('disaster-grade');
  });

  it('shows both grades in the reading view', () => {
    const parsed = parseEntity(raw, 'fallback');
    if (parsed?.kind !== 'bounty') throw new Error('did not parse as a bounty');
    const fields = describeEntity(parsed);
    const labels = fields.map((f) => f.label);
    expect(labels).toContain('Threat grade');
    expect(labels).toContain('Target ranked');
  });
});
