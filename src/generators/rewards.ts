/**
 * Rolling a posting's rewards from a difficulty preset.
 *
 * Lives on the generator side because it rolls; the presets themselves are settings and live in
 * `domain/difficulty.ts`, which explains why rewards are bands rather than tables and why there
 * are three buckets.
 *
 * Pure and deterministic — same seed and preset ⇒ identical lines (CLAUDE.md §5).
 */

import {
  CHEST_LABELS,
  bandToCount,
  type Band,
  type DifficultyPreset,
  type HostRewards,
  type RewardBucket,
} from '../domain/difficulty';
import { gradeLabel } from '../domain/grades';
import { createRng, deriveSeed } from './rng';

function pickIn(band: Band, rng: ReturnType<typeof createRng>): number {
  const [low, high] = bandToCount(band);
  return low + rng.nextInt(high - low + 1);
}

/** Thousands separators, so 160000 reads as 160,000 on a sheet and in Discord. */
function grouped(value: number): string {
  return value.toLocaleString('en-GB');
}

/**
 * Money comes out round.
 *
 * A Yen band of 10,000–50,000 rolling 23,117 would look like a bug rather than a payout, so
 * anything in that range is rounded to the nearest thousand and clamped back inside the band.
 * Small bands are left exactly as rolled — rounding 1–100 to the nearest thousand gives zero.
 */
function roundMoney(value: number, band: Band): number {
  const [low, high] = bandToCount(band);
  if (high < 5_000) return value;
  return Math.min(high, Math.max(low, Math.round(value / 1_000) * 1_000));
}

interface BucketTotals {
  readonly cr: number;
  readonly traitPoints: number;
  readonly yen: number;
}

const NO_TOTALS: BucketTotals = { cr: 0, traitPoints: 0, yen: 0 };

function addTotals(a: BucketTotals, b: BucketTotals): BucketTotals {
  return {
    cr: a.cr + b.cr,
    traitPoints: a.traitPoints + b.traitPoints,
    yen: a.yen + b.yen,
  };
}

function rollBucket(
  bucket: RewardBucket,
  gradeUpMaxGrade: DifficultyPreset['gradeUpMaxGrade'],
  seed: string,
  key: string,
  nonce: number,
): { readonly lines: readonly string[]; readonly totals: BucketTotals } {
  const rng = createRng(deriveSeed(seed, `@rewards.${key}`, nonce));

  const cr = pickIn(bucket.cr, rng);
  const traitPoints = pickIn(bucket.traitPoints, rng);
  const yen = roundMoney(pickIn(bucket.yen, rng), bucket.yen);

  const lines: string[] = [];
  if (cr > 0) lines.push(`${grouped(cr)} CR`);
  if (traitPoints > 0) lines.push(`${grouped(traitPoints)} TP`);
  if (yen > 0) lines.push(`${grouped(yen)} Yen`);
  if (bucket.chest !== 'none') lines.push(`1 ${CHEST_LABELS[bucket.chest]}`);
  if (bucket.gradeUp) {
    lines.push(
      gradeUpMaxGrade
        ? `Grade Up — ${gradeLabel(gradeUpMaxGrade)} and below only`
        : 'Grade Up',
    );
  }

  return { lines, totals: { cr, traitPoints, yen } };
}

/**
 * What a host takes home.
 *
 * Chests and Grade Ups are deliberately absent: a multiplier on a chest tier is meaningless, and
 * Dan said plainly that chests do not count toward the 3× and 2×. The closing line says so in
 * the output too, so nobody reading a posting has to remember it.
 */
function hostLines(totals: BucketTotals, hosts: HostRewards): readonly string[] {
  const lines: string[] = [];

  for (const [label, factor] of [
    ['Primary host', hosts.primary],
    ['Secondary host', hosts.secondary],
  ] as const) {
    const parts: string[] = [];
    if (totals.cr > 0) parts.push(`${grouped(totals.cr * factor)} CR`);
    if (totals.traitPoints > 0) parts.push(`${grouped(totals.traitPoints * factor)} TP`);
    if (totals.yen > 0) parts.push(`${grouped(totals.yen * factor)} Yen`);
    if (parts.length > 0) lines.push(`${label} (×${factor}): ${parts.join(' · ')}`);
  }

  if (lines.length > 0) lines.push('Chests are not multiplied.');
  return lines;
}

export interface RolledRewards {
  readonly base: readonly string[];
  readonly objective: readonly string[];
  readonly mvp: readonly string[];
  readonly hosts: readonly string[];
}

export const NO_REWARDS: RolledRewards = { base: [], objective: [], mvp: [], hosts: [] };

/**
 * The reward lines for a posting, one list per bucket plus the host payout.
 *
 * Each bucket rolls against its own derived seed, so adding a reward to one does not shift the
 * numbers in another.
 */
export function rollRewards(
  preset: DifficultyPreset,
  hosts: HostRewards,
  seed: string,
  nonce = 0,
): RolledRewards {
  const base = rollBucket(preset.base, preset.gradeUpMaxGrade, seed, 'base', nonce);
  const objective = rollBucket(preset.objective, preset.gradeUpMaxGrade, seed, 'objective', nonce);
  const mvp = rollBucket(preset.mvp, preset.gradeUpMaxGrade, seed, 'mvp', nonce);

  const counted =
    hosts.basis === 'base-and-objective'
      ? addTotals(base.totals, objective.totals)
      : base.totals;

  return {
    base: base.lines,
    objective: objective.lines,
    mvp: mvp.lines,
    hosts: hostLines(counted ?? NO_TOTALS, hosts),
  };
}

/** `Special Grade and Below` — the recommendation line the posting carries. */
export function recommendedGradeLine(label: string): string {
  return `${label} and Below`;
}

/**
 * What a bucket would typically pay, as placeholder text.
 *
 * Shown greyed in an empty reward box so an admin writing a posting by hand can see the shape
 * the difficulty expects — a Hard objective bucket suggests "250 CR / 11 TP" rather than
 * leaving the box blank and the house rules in someone's memory. Midpoints, not a roll: a
 * placeholder that changed every render would read as a value rather than a hint.
 */
export function exampleRewardLines(
  bucket: RewardBucket,
  gradeUpMaxGrade: DifficultyPreset['gradeUpMaxGrade'],
): readonly string[] {
  const mid = (band: Band): number => {
    const [low, high] = bandToCount(band);
    return Math.round((low + high) / 2);
  };

  const lines: string[] = [];
  const cr = mid(bucket.cr);
  const traitPoints = mid(bucket.traitPoints);
  const yen = roundMoney(mid(bucket.yen), bucket.yen);

  if (cr > 0) lines.push(`${grouped(cr)} CR`);
  if (traitPoints > 0) lines.push(`${grouped(traitPoints)} TP`);
  if (yen > 0) lines.push(`${grouped(yen)} Yen`);
  if (bucket.chest !== 'none') lines.push(`1 ${CHEST_LABELS[bucket.chest]}`);
  if (bucket.gradeUp) {
    lines.push(
      gradeUpMaxGrade
        ? `Grade Up — ${gradeLabel(gradeUpMaxGrade)} and below only`
        : 'Grade Up',
    );
  }

  return lines;
}
