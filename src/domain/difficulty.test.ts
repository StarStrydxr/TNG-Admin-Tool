import { describe, expect, it } from 'vitest';

import {
  CUSTOM_DIFFICULTY_ID,
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_DIFFICULTY_PRESETS,
  DEFAULT_HOST_REWARDS,
  bandToCount,
  findPreset,
  type DifficultyPreset,
  type HostRewards,
} from './difficulty';
import { parseSettings } from './settings-parse';
import { exampleRewardLines, rollRewards } from '../generators/rewards';

const EASY = findPreset(DEFAULT_DIFFICULTY_PRESETS, 'easy');
const MEDIUM = findPreset(DEFAULT_DIFFICULTY_PRESETS, 'medium');
const HARD = findPreset(DEFAULT_DIFFICULTY_PRESETS, 'hard');
const CUSTOM = findPreset(DEFAULT_DIFFICULTY_PRESETS, CUSTOM_DIFFICULTY_ID);

const HOSTS = DEFAULT_HOST_REWARDS;

/** Every line any bucket produced, for assertions that do not care which bucket. */
function allLines(rolled: ReturnType<typeof rollRewards>): readonly string[] {
  return [...rolled.base, ...rolled.objective, ...rolled.mvp];
}

/** The figure a bucket's `12,000 Yen` line carries, or 0 when the bucket has no such line. */
function amount(lines: readonly string[], unit: string): number {
  const line = lines.find((candidate) => candidate.endsWith(unit));
  return line ? Number(line.replace(/[^0-9]/g, '')) : 0;
}

/**
 * The figure inside a host line, which packs several units onto one line —
 * `Primary host (×3): 1,038 CR · 36 TP`.
 */
function hostAmount(lines: readonly string[], unit: string): number {
  for (const line of lines) {
    const found = new RegExp(`([\\d,]+) ${unit}\\b`).exec(line);
    if (found) return Number((found[1] as string).replace(/,/g, ''));
  }
  return 0;
}

describe('the shipped presets', () => {
  it('is the server’s three tiers, plus a custom one', () => {
    expect(DEFAULT_DIFFICULTY_PRESETS.map((preset) => preset.label)).toEqual([
      'Easy',
      'Medium',
      'Hard',
      'Custom',
    ]);
  });

  it('starts new missions on Easy', () => {
    expect(DEFAULT_DIFFICULTY_ID).toBe('easy');
  });

  /* The caps below are Dan's own, quoted from the summaries he supplied. */

  it('keeps Easy under 50 CR and 3 TP, and offers a Grade Up to Grade 2 and below', () => {
    expect(EASY.base.cr.max).toBeLessThanOrEqual(50);
    expect(EASY.base.traitPoints.max).toBeLessThanOrEqual(3);
    expect(EASY.base.gradeUp).toBe(true);
    expect(EASY.gradeUpMaxGrade).toBe('grade-2');
    // "Usually higher slots to allow more in."
    expect(EASY.slots).toBeGreaterThan(MEDIUM.slots);
  });

  it('keeps Medium under 200 CR, 8 TP and 50,000 Yen, with a Gold chest for the MVP', () => {
    expect(MEDIUM.base.cr.max).toBeLessThanOrEqual(200);
    expect(MEDIUM.base.traitPoints.max).toBeLessThanOrEqual(8);
    expect(MEDIUM.base.yen.max).toBeLessThanOrEqual(50_000);
    expect(MEDIUM.mvp.chest).toBe('gold');
  });

  it('puts most of Hard behind the objectives, and a Diamond chest behind the MVP', () => {
    expect(HARD.objective.cr.min).toBeGreaterThan(HARD.base.cr.max);
    expect(HARD.objective.traitPoints.min).toBeGreaterThan(0);
    expect(HARD.mvp.chest).toBe('diamond');
    expect(HARD.mvp.traitPoints.max).toBeGreaterThan(0);
  });

  it('offers a Grade Up on Easy and nowhere else', () => {
    for (const preset of [MEDIUM, HARD, CUSTOM]) {
      expect(preset.gradeUpMaxGrade, preset.label).toBeNull();
      for (const bucket of [preset.base, preset.objective, preset.mvp]) {
        expect(bucket.gradeUp, preset.label).toBe(false);
      }
    }
  });

  it('gets harder in one direction only', () => {
    for (const [easier, harder] of [
      [EASY, MEDIUM],
      [MEDIUM, HARD],
      [HARD, CUSTOM],
    ] as const) {
      expect(harder.complications.max).toBeGreaterThanOrEqual(easier.complications.max);
      expect(harder.gradeDrift).toBeGreaterThanOrEqual(easier.gradeDrift);
    }
  });
});

describe('findPreset', () => {
  it('falls back to the default preset rather than failing', () => {
    expect(findPreset(DEFAULT_DIFFICULTY_PRESETS, 'nonsense').id).toBe(DEFAULT_DIFFICULTY_ID);
    expect(findPreset([], 'nonsense').id).toBe(DEFAULT_DIFFICULTY_ID);
  });
});

describe('bandToCount', () => {
  it('tolerates a band typed backwards or below zero', () => {
    expect(bandToCount({ min: 3, max: 1 })).toEqual([1, 3]);
    expect(bandToCount({ min: -4, max: 2 })).toEqual([0, 2]);
    expect(bandToCount({ min: 2.7, max: 2.2 })).toEqual([2, 2]);
  });
});

describe('rolling rewards', () => {
  it('is deterministic — same seed and preset means the same lines', () => {
    expect(rollRewards(MEDIUM, HOSTS, 'ash-gantry-nine')).toEqual(
      rollRewards(MEDIUM, HOSTS, 'ash-gantry-nine'),
    );
  });

  it('changes with the nonce, so re-rolling rewards actually re-rolls them', () => {
    expect(rollRewards(HARD, HOSTS, 'ash-gantry-nine', 0)).not.toEqual(
      rollRewards(HARD, HOSTS, 'ash-gantry-nine', 1),
    );
  });

  it('leaves a bucket empty when its bands grant nothing', () => {
    const rolled = rollRewards(EASY, HOSTS, 'seed');
    expect(rolled.base.length).toBeGreaterThan(0);
    expect(rolled.objective).toEqual([]);
    expect(rolled.mvp).toEqual([]);
  });

  it('writes Easy as low CR, maybe some TP, and the capped Grade Up', () => {
    const rolled = rollRewards(EASY, HOSTS, 'seed');
    expect(amount(rolled.base, 'CR')).toBeLessThanOrEqual(50);
    expect(rolled.base).toContain('Grade Up — Grade 2 and below only');
    expect(rolled.base.some((line) => line.endsWith('Yen'))).toBe(false);
  });

  it('splits Hard across the three buckets the way the server writes it', () => {
    const rolled = rollRewards(HARD, HOSTS, 'seed');
    expect(amount(rolled.base, 'CR')).toBeGreaterThan(0);
    expect(amount(rolled.objective, 'CR')).toBeGreaterThan(amount(rolled.base, 'CR'));
    expect(amount(rolled.objective, 'TP')).toBeGreaterThan(0);
    expect(rolled.mvp).toContain('1 Diamond chest');
  });

  it('names a chest as a tier, never a count', () => {
    expect(rollRewards(MEDIUM, HOSTS, 'seed').mvp).toEqual(['1 Gold chest']);
  });

  it('rounds money so a payout does not read like a bug', () => {
    for (let i = 0; i < 25; i += 1) {
      const yen = amount(rollRewards(MEDIUM, HOSTS, `money-${i}`).base, 'Yen');
      expect(yen % 1_000).toBe(0);
      expect(yen).toBeLessThanOrEqual(50_000);
    }
  });

  it('leaves out a reward the bands set to nothing rather than printing a zero', () => {
    const noYen: DifficultyPreset = {
      ...MEDIUM,
      base: { ...MEDIUM.base, yen: { min: 0, max: 0 } },
    };
    const lines = allLines(rollRewards(noYen, HOSTS, 'seed'));
    expect(lines.some((line) => line.endsWith('Yen'))).toBe(false);
    expect(lines.some((line) => line.endsWith('CR'))).toBe(true);
  });
});

/**
 * The greyed example in an empty reward box. It has to describe the preset it belongs to, or it
 * is worse than no placeholder: an admin writing a Hard posting by hand would be shown Easy's
 * numbers and have no reason to doubt them.
 */
describe('the example rewards shown as placeholder text', () => {
  it('lands inside the bands it describes', () => {
    for (const preset of DEFAULT_DIFFICULTY_PRESETS) {
      const example = exampleRewardLines(preset.base, preset.gradeUpMaxGrade);
      const cr = amount(example, 'CR');
      if (cr > 0) {
        expect(cr, preset.label).toBeGreaterThanOrEqual(preset.base.cr.min);
        expect(cr, preset.label).toBeLessThanOrEqual(preset.base.cr.max);
      }
    }
  });

  it('does not move between renders — a hint is not a roll', () => {
    expect(exampleRewardLines(HARD.objective, null)).toEqual(
      exampleRewardLines(HARD.objective, null),
    );
  });

  it('is empty for a bucket that grants nothing, so no placeholder is shown', () => {
    expect(exampleRewardLines(EASY.objective, EASY.gradeUpMaxGrade)).toEqual([]);
    expect(exampleRewardLines(EASY.mvp, EASY.gradeUpMaxGrade)).toEqual([]);
  });

  it('shows Hard’s objective bucket as the bulk of the reward', () => {
    const example = exampleRewardLines(HARD.objective, HARD.gradeUpMaxGrade);
    expect(amount(example, 'CR')).toBeGreaterThan(
      amount(exampleRewardLines(HARD.base, HARD.gradeUpMaxGrade), 'CR'),
    );
    expect(example.some((line) => line.endsWith('TP'))).toBe(true);
  });

  it('names the chest and the Grade Up cap, as the real lines do', () => {
    expect(exampleRewardLines(MEDIUM.mvp, MEDIUM.gradeUpMaxGrade)).toContain('1 Gold chest');
    expect(exampleRewardLines(EASY.base, EASY.gradeUpMaxGrade)).toContain(
      'Grade Up — Grade 2 and below only',
    );
  });
});

describe('the host payout', () => {
  it('multiplies the base rewards by three and by two', () => {
    const rolled = rollRewards(MEDIUM, HOSTS, 'seed');
    const baseCr = amount(rolled.base, 'CR');

    expect(rolled.hosts[0]).toContain('Primary host (×3)');
    expect(rolled.hosts[1]).toContain('Secondary host (×2)');
    expect(rolled.hosts[0]).toContain(`${(baseCr * 3).toLocaleString('en-GB')} CR`);
    expect(rolled.hosts[1]).toContain(`${(baseCr * 2).toLocaleString('en-GB')} CR`);
  });

  it('never multiplies a chest, and says so', () => {
    const rolled = rollRewards(MEDIUM, HOSTS, 'seed');
    expect(rolled.hosts.some((line) => line.toLowerCase().includes('chest'))).toBe(true);
    expect(rolled.hosts.at(-1)).toBe('Chests are not multiplied.');
    // The MVP's Gold chest is not smuggled into a host line as "3 Gold chests".
    expect(rolled.hosts.some((line) => /\d+ Gold chest/.test(line))).toBe(false);
  });

  it('counts the objective-exclusive rewards too when set to', () => {
    const wider: HostRewards = { ...HOSTS, basis: 'base-and-objective' };
    const narrow = rollRewards(HARD, HOSTS, 'seed');
    const broad = rollRewards(HARD, wider, 'seed');

    expect(hostAmount(broad.hosts, 'CR')).toBeGreaterThan(hostAmount(narrow.hosts, 'CR'));
    expect(hostAmount(broad.hosts, 'TP')).toBeGreaterThan(0);
    // The buckets themselves are untouched by the basis — only the host lines move.
    expect(broad.base).toEqual(narrow.base);
    expect(broad.objective).toEqual(narrow.objective);
  });

  it('says nothing at all when there is nothing to multiply', () => {
    const nothing: DifficultyPreset = {
      ...EASY,
      base: { ...EASY.base, cr: { min: 0, max: 0 }, traitPoints: { min: 0, max: 0 } },
    };
    expect(rollRewards(nothing, HOSTS, 'seed').hosts).toEqual([]);
  });
});

describe('reading presets back out of config.json', () => {
  it('keeps all four when the file has never heard of them', () => {
    expect(parseSettings({}).difficulties).toEqual(DEFAULT_DIFFICULTY_PRESETS);
    expect(parseSettings({}).hostRewards).toEqual(DEFAULT_HOST_REWARDS);
  });

  it('merges a partial edit onto the shipped preset instead of losing the rest', () => {
    const parsed = parseSettings({
      difficulties: [{ id: 'medium', base: { cr: { min: 90, max: 90 } } }],
    });
    const medium = findPreset(parsed.difficulties, 'medium');

    expect(medium.base.cr).toEqual({ min: 90, max: 90 });
    // Everything the edit did not mention survives.
    expect(medium.base.traitPoints).toEqual(MEDIUM.base.traitPoints);
    expect(medium.base.yen).toEqual(MEDIUM.base.yen);
    expect(medium.mvp.chest).toBe('gold');
    expect(medium.label).toBe('Medium');
    expect(parsed.difficulties).toHaveLength(4);
  });

  it('keeps a fifth preset someone added by hand', () => {
    const parsed = parseSettings({
      difficulties: [{ id: 'nightmare', label: 'Nightmare' }],
    });
    expect(parsed.difficulties).toHaveLength(5);
    expect(parsed.difficulties.at(-1)?.label).toBe('Nightmare');
  });

  it('ignores nonsense in a band or a chest tier rather than producing NaN', () => {
    const parsed = parseSettings({
      difficulties: [
        { id: 'medium', base: { yen: { min: 'lots', max: null } }, mvp: { chest: 'platinum' } },
      ],
    });
    const medium = findPreset(parsed.difficulties, 'medium');
    expect(medium.base.yen).toEqual(MEDIUM.base.yen);
    expect(medium.mvp.chest).toBe('gold');
  });

  it('lets a preset turn its Grade Up off with an explicit null', () => {
    const parsed = parseSettings({
      difficulties: [{ id: 'easy', gradeUpMaxGrade: null }],
    });
    expect(findPreset(parsed.difficulties, 'easy').gradeUpMaxGrade).toBeNull();
  });

  it('clamps a hand-edited host multiplier instead of trusting it', () => {
    const parsed = parseSettings({ hostRewards: { primary: 9_000, secondary: -4 } });
    expect(parsed.hostRewards.primary).toBeLessThanOrEqual(100);
    expect(parsed.hostRewards.secondary).toBe(0);
    expect(parsed.hostRewards.basis).toBe('base');
  });
});
