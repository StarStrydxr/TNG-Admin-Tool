/**
 * The stat block.
 *
 * Authoritative source: docs/house-rules/stats-grades-classes.md §5.
 *
 * Seven stats are graded (`Grade[Class]`). CE Reserves is NOT — it is a descriptive band,
 * so it is typed separately rather than being forced into the same shape.
 */

import {
  DEFAULT_CLASS_RANK,
  gradeRank,
  statValue,
  type GradeId,
  type StatValue,
} from './grades';

export const GRADED_STAT_IDS = [
  'ce-output',
  'ce-control',
  'ce-efficiency',
  'perception',
  'strength',
  'speed',
  'fortitude',
] as const;

export type GradedStatId = (typeof GRADED_STAT_IDS)[number];

export const GRADED_STAT_LABELS: Record<GradedStatId, string> = {
  'ce-output': 'CE Output',
  'ce-control': 'CE Control',
  'ce-efficiency': 'CE Efficiency',
  perception: 'Perception',
  strength: 'Strength',
  speed: 'Speed',
  fortitude: 'Fortitude',
};

/** Weakest first. CE Reserves is a band, not a grade — it has no Class. */
export const CE_RESERVES_BANDS = [
  'shallow',
  'average',
  'deep',
  'bottomless',
  'abysmal',
  'endless',
] as const;

export type CeReservesBand = (typeof CE_RESERVES_BANDS)[number];

export const CE_RESERVES_LABELS: Record<CeReservesBand, string> = {
  shallow: 'Shallow',
  average: 'Average',
  deep: 'Deep',
  bottomless: 'Bottomless',
  abysmal: 'Abysmal',
  endless: 'Endless',
};

export const DEFAULT_CE_RESERVES: CeReservesBand = 'average';

export function ceReservesRank(band: CeReservesBand): number {
  return CE_RESERVES_BANDS.indexOf(band);
}

/** Negative when `a` is shallower than `b`. Suitable for Array.prototype.sort. */
export function compareCeReserves(a: CeReservesBand, b: CeReservesBand): number {
  return ceReservesRank(a) - ceReservesRank(b);
}

export interface StatBlock {
  readonly graded: Readonly<Record<GradedStatId, StatValue>>;
  readonly ceReserves: CeReservesBand;
}

/**
 * A fresh stat block for a character of the given grade.
 *
 * Every stat starts at Class 3 of the character's own grade, because Class 3 is average.
 * Traits and defects move individual classes from there, and those are entered by hand —
 * the app does not compute them. See CLAUDE.md §4.
 */
export function defaultStatBlock(grade: GradeId): StatBlock {
  const graded = Object.fromEntries(
    GRADED_STAT_IDS.map((id) => [id, statValue(grade, DEFAULT_CLASS_RANK)]),
  ) as Record<GradedStatId, StatValue>;

  return { graded, ceReserves: DEFAULT_CE_RESERVES };
}

/* ------------------------------------------------------------------ */
/* Effective reserves — DERIVED, never stored                          */
/* ------------------------------------------------------------------ */

export interface EffectiveReserves {
  /** The band actually written on the sheet. */
  readonly base: CeReservesBand;
  /** What it comes to in play. Equal to `base` when Efficiency does not outrank Output. */
  readonly band: CeReservesBand;
  /** Grades CE Efficiency sits above CE Output. Never negative. */
  readonly steps: number;
  /** True when the shift ran out of scale — the steps are real, Endless is the ceiling. */
  readonly capped: boolean;
}

/**
 * What a character's reserves come to once CE Efficiency is taken into account.
 *
 * Dan's rule, 10 Nov 2026: **every grade CE Efficiency sits above CE Output is one more stage
 * of reserves** — Deep becomes Bottomless at one grade up, Abysmal at two. Efficiency at or
 * below Output changes nothing; the rule only ever adds.
 *
 * ⚠️ **This is derived for display and is never written back.** `stats.ceReserves` stays
 * exactly the band Dan typed, and this returns a second value to show beside it. That is the
 * line between this and the stat calculator CLAUDE.md §4 forbids: nothing here reads a trait,
 * sums a modifier, or changes a stored stat. It restates two stats he entered by a rule he
 * stated, and a reader can check it at a glance.
 *
 * Rungs are counted on the full ladder, implied ones included, because §4 says gap counting
 * depends on them — so Grade Semi-2 to Grade 2 is one grade, not nothing.
 *
 * A Civilian stat has no rung. Civilian Efficiency can never outrank anything, so it yields no
 * shift; Civilian Output would make every grade above it a step, which is more likely a
 * half-filled sheet than a real reading, so that case also yields none.
 */
export function effectiveReserves(stats: StatBlock): EffectiveReserves {
  const base = stats.ceReserves;
  const efficiency = stats.graded['ce-efficiency'];
  const output = stats.graded['ce-output'];

  if (efficiency.kind !== 'graded' || output.kind !== 'graded') {
    return { base, band: base, steps: 0, capped: false };
  }

  const steps = Math.max(0, gradeRank(efficiency.grade) - gradeRank(output.grade));
  if (steps === 0) return { base, band: base, steps: 0, capped: false };

  const top = CE_RESERVES_BANDS.length - 1;
  const raised = ceReservesRank(base) + steps;
  const band = CE_RESERVES_BANDS[Math.min(raised, top)] ?? base;

  return { base, band, steps, capped: raised > top };
}

/** "Bottomless — one grade of CE Efficiency over Output", or the plain band when level. */
export function describeEffectiveReserves(stats: StatBlock): string {
  const { band, steps, capped } = effectiveReserves(stats);
  if (steps === 0) return CE_RESERVES_LABELS[band];

  const grades = `${steps} grade${steps === 1 ? '' : 's'} of CE Efficiency over Output`;
  return capped
    ? `${CE_RESERVES_LABELS[band]} — ${grades}, past the top of the scale`
    : `${CE_RESERVES_LABELS[band]} — ${grades}`;
}
