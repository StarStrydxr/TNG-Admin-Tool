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
