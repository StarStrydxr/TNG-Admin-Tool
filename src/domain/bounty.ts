/**
 * Bounties — the posting fields, and their own economy.
 *
 * ## ⚠️ Bounties do not use the mission economy
 *
 * `domain/difficulty.ts` caps mission money at 50,000 Yen on purpose: "we want the economy to
 * grow slowly." Dan's own bounty pays **¥1,000,000**, twenty times that cap, and that is not
 * an outlier to be sanded down — a bounty is a different kind of transaction, confirmed 10 Nov
 * 2026. So the bands live here, unconnected to the difficulty tiers, and nothing reads across.
 *
 * The amounts below are **proposed, not approved** (§10). They are scaled off the one real
 * example: a Disaster Grade threat paying ¥1,000,000. Read them and change what does not sound
 * like the server.
 *
 * ## The three posting fields are free text
 *
 * `conspicuousity`, `state` and `pings` have one known example each and no written list
 * anywhere. Free text with suggestions is the same bargain `clan` and `status` already make:
 * the field takes anything, the UI offers what has been seen, and a new role on the server
 * costs no code change. A hardcoded enum would quietly make my guesses load-bearing.
 *
 * Pure (CLAUDE.md §3).
 */

import { GRADE_IDS, gradeLabel, gradeRank, type GradeId } from './grades';

/** Suggestions, never an enum. */
export const CONSPICUOUSITIES: readonly string[] = [
  'Public',
  'Private',
  'Classified',
  'Staff only',
];

export const BOUNTY_STATES: readonly string[] = [
  'Dead',
  'Alive',
  'Dead or Alive',
  'Captured',
];

/** Written `@{ Curse User }` in the Discord posting. */
export const BOUNTY_PINGS: readonly string[] = [
  'Curse User',
  'Student',
  'Teacher',
  'Sorcerer',
  'Staff',
];

export interface YenBand {
  readonly min: number;
  readonly max: number;
}

/**
 * What a bounty pays, by the **threat grade** it is posted at — not the target's own ranking.
 *
 * ⚠️ Proposed. The only figure I have is ¥1,000,000 for a Disaster Grade threat; everything
 * else is scaled around it, roughly doubling a rung as the grade ladder itself does.
 */
export const BOUNTY_PURSE: Readonly<Record<string, YenBand>> = {
  'grade-4': { min: 20_000, max: 50_000 },
  'grade-3': { min: 40_000, max: 90_000 },
  'grade-semi-2': { min: 80_000, max: 150_000 },
  'grade-2': { min: 150_000, max: 250_000 },
  'grade-semi-1': { min: 250_000, max: 400_000 },
  'grade-1': { min: 400_000, max: 600_000 },
  'semi-special-grade': { min: 600_000, max: 800_000 },
  'special-grade': { min: 800_000, max: 1_000_000 },
  'disaster-grade': { min: 1_000_000, max: 1_500_000 },
  'semi-calamity-grade': { min: 1_500_000, max: 2_500_000 },
  'calamity-grade': { min: 2_500_000, max: 4_000_000 },
  'demi-apocalypse-grade': { min: 4_000_000, max: 6_000_000 },
  'semi-apocalypse-grade': { min: 6_000_000, max: 9_000_000 },
  'apocalypse-grade': { min: 9_000_000, max: 15_000_000 },
};

/** The band for a grade, falling back to the lowest rather than throwing. */
export function purseFor(grade: GradeId): YenBand {
  return BOUNTY_PURSE[grade] ?? { min: 20_000, max: 50_000 };
}

/**
 * ¥1,000,000 — rounded hard, because a bounty of ¥1,043,117 reads as a bug.
 *
 * Rounded to the nearest 50,000 above half a million and the nearest 10,000 below it, so a
 * small purse keeps some texture and a large one stays a round number people can say aloud.
 */
export function formatYen(amount: number): string {
  const step = amount >= 500_000 ? 50_000 : 10_000;
  const rounded = Math.max(step, Math.round(amount / step) * step);
  return `¥${rounded.toLocaleString('en-US')}`;
}

/**
 * The midpoint of a grade's purse, as placeholder text.
 *
 * A midpoint rather than a roll, for the same reason the mission tiers show one: a placeholder
 * that changed on every render would read as a value somebody had chosen.
 */
export function examplePurse(grade: GradeId): string {
  const band = purseFor(grade);
  return formatYen((band.min + band.max) / 2);
}

/**
 * A line about the gap between what the target is and what the bounty is posted at.
 *
 * Dan's own example carries exactly this: a Special Grade sorcerer posted as a Disaster Grade
 * threat, with the posting spelling out why. Returns empty when the two agree, so an ordinary
 * bounty says nothing extra.
 */
export function threatNote(grade: GradeId, targetGrade: GradeId): string {
  const gap = gradeRank(grade) - gradeRank(targetGrade);
  if (gap === 0) return '';

  return gap > 0
    ? `Despite the target's ranking as ${gradeLabel(targetGrade)}, this is posted as a ` +
        `${gradeLabel(grade)} threat.`
    : `The target is ranked ${gradeLabel(targetGrade)}, above the ${gradeLabel(grade)} this is ` +
        'posted at.';
}

/** Every grade has a purse. A missing one is a table gap, not a runtime fallback. */
export function missingPurses(): readonly GradeId[] {
  return GRADE_IDS.filter((id) => !BOUNTY_PURSE[id]);
}
