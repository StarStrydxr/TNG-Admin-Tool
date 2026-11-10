/**
 * Mission difficulty — how much a posting asks, and what it pays.
 *
 * ## The numbers here are Dan's, not invented
 *
 * Easy, Medium and Hard are the server's own three tiers, with the amounts and the summaries he
 * supplied on 9 Nov 2026. Where something was not supplied it is marked in the comments below
 * rather than quietly filled in.
 *
 * ## Why rewards are bands and not tables
 *
 * Everywhere else the generators roll flavour from tables, because flavour wants depth and depth
 * wants a file you can hand-edit (CLAUDE.md §5). Rewards are not flavour — they are the server's
 * economy, and what a posting pays is a *range*, not a list of evocative fragments. So a preset
 * holds plain bands and a roll picks inside them: four numbers per reward, visible and editable
 * in Settings, with no hidden formula between what Dan types and what comes out.
 *
 * ## Three buckets, because the server pays in three ways
 *
 * `base` is granted for taking part. `objective` is granted only if **every** objective is
 * completed. `mvp` is the referee's award at the end of the event, and is not given at all if
 * the event concludes early. Hard leans almost entirely on the last two; Easy uses only the
 * first. They are separate fields rather than one list because the host multipliers have to do
 * arithmetic on them, and because a GM needs to edit one without disturbing the others.
 *
 * ## This is not the stat calculator
 *
 * CLAUDE.md §4 forbids deriving stats, and that rule is untouched. Nothing here reads or writes
 * a stat; `gradeDrift` chooses *which grade to roll at*, exactly as `generators/situation.ts`
 * already does, and the rest is currency.
 *
 * Pure (CLAUDE.md §3).
 */

import type { GradeId } from './grades';

/** An inclusive integer range. Used for counts and for reward amounts alike. */
export interface Band {
  readonly min: number;
  readonly max: number;
}

/**
 * The server's chest ladder, cheapest first.
 *
 * A chest is a *tier*, not a quantity — "a Gold chest", never "three chests". Gold is normally
 * the highest handed out; Diamond is reserved for Hard.
 */
export type ChestTier = 'none' | 'wooden' | 'iron' | 'gold' | 'diamond';

export const CHEST_TIERS: readonly ChestTier[] = ['none', 'wooden', 'iron', 'gold', 'diamond'];

export const CHEST_LABELS: Record<ChestTier, string> = {
  none: 'No chest',
  wooden: 'Wooden chest',
  iron: 'Iron chest',
  gold: 'Gold chest',
  diamond: 'Diamond chest',
};

/** One of the three ways a posting pays. A band of zero simply does not appear in the output. */
export interface RewardBucket {
  readonly cr: Band;
  readonly traitPoints: Band;
  readonly yen: Band;
  readonly chest: ChestTier;
  /** Offer a Grade Up. Capped by the preset's `gradeUpMaxGrade`. */
  readonly gradeUp: boolean;
}

export type RewardBucketId = 'base' | 'objective' | 'mvp';

export const REWARD_BUCKET_IDS: readonly RewardBucketId[] = ['base', 'objective', 'mvp'];

export const REWARD_BUCKET_LABELS: Record<RewardBucketId, string> = {
  base: 'Rewards',
  objective: 'Objective exclusive',
  mvp: 'MVP exclusive',
};

export const REWARD_BUCKET_NOTES: Record<RewardBucketId, string> = {
  base: 'Granted for taking part.',
  objective: 'Only granted if every objective is completed.',
  mvp: 'Decided by the referee at the end. None at all if the event concludes early.',
};

export interface DifficultyPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** How many objectives to roll. The template says typically 1–3. */
  readonly objectives: Band;
  readonly complications: Band;
  /** Default player slots on the posting. */
  readonly slots: number;
  /**
   * How many rungs above the posting the real threat may sit. Misgraded missions are the engine
   * of these plots (CLAUDE.md §4), and a harder night is one where the briefing is more wrong.
   */
  readonly gradeDrift: number;
  readonly base: RewardBucket;
  readonly objective: RewardBucket;
  readonly mvp: RewardBucket;
  /**
   * The highest grade a Grade Up reward applies to, or null where the preset offers none. Easy
   * is the only tier that does: "Grade Up is only for those who are Grade 2 and below."
   */
  readonly gradeUpMaxGrade: GradeId | null;
}

/**
 * What a host takes home.
 *
 * Primary hosts — whoever made and ran the event — get 3×; secondary hosts, usually other staff
 * helping run it, get 2×. **Chests are never multiplied**, and neither is a Grade Up.
 *
 * `basis` is the one thing that was genuinely ambiguous: "3x rewards" could mean three times the
 * base package, or three times everything a player clearing the mission would see. It defaults
 * to the base package — the conservative reading, since objective-exclusive rewards are earned
 * by the players who cleared the objectives — and is a setting so the other reading is one
 * click away.
 */
export interface HostRewards {
  readonly primary: number;
  readonly secondary: number;
  readonly basis: 'base' | 'base-and-objective';
}

export const DEFAULT_HOST_REWARDS: HostRewards = {
  primary: 3,
  secondary: 2,
  basis: 'base',
};

export const HOST_BASIS_LABELS: Record<HostRewards['basis'], string> = {
  base: 'The base rewards only',
  'base-and-objective': 'Base plus objective-exclusive rewards',
};

const NOTHING: RewardBucket = {
  cr: { min: 0, max: 0 },
  traitPoints: { min: 0, max: 0 },
  yen: { min: 0, max: 0 },
  chest: 'none',
  gradeUp: false,
};

/** The id reserved for the one preset an admin is expected to rewrite. */
export const CUSTOM_DIFFICULTY_ID = 'custom';

export const DEFAULT_DIFFICULTY_ID = 'easy';

export const DEFAULT_DIFFICULTY_PRESETS: readonly DifficultyPreset[] = [
  {
    id: 'easy',
    label: 'Easy',
    description:
      'Hosted to progress lower-grade characters. Low CR (max 50), very little TP if any ' +
      '(max 3), and a Grade Up for Grade 2 and below. More slots, to let more people in.',
    objectives: { min: 1, max: 2 },
    complications: { min: 1, max: 2 },
    slots: 6,
    gradeDrift: 1,
    base: {
      cr: { min: 30, max: 50 },
      traitPoints: { min: 0, max: 3 },
      yen: { min: 0, max: 0 },
      chest: 'none',
      gradeUp: true,
    },
    objective: NOTHING,
    mvp: NOTHING,
    gradeUpMaxGrade: 'grade-2',
  },
  {
    id: 'medium',
    label: 'Medium',
    description:
      'High CR (usually 150–200). Medium-high TP (max 6–8) — the rare resource, and what really ' +
      'sets the difficulty. Money kept to a maximum of 50,000 Yen so the economy grows slowly. ' +
      'One chest, usually Gold, to the MVP.',
    objectives: { min: 2, max: 3 },
    complications: { min: 2, max: 3 },
    slots: 4,
    gradeDrift: 2,
    base: {
      cr: { min: 100, max: 200 },
      traitPoints: { min: 4, max: 8 },
      yen: { min: 10_000, max: 50_000 },
      chest: 'none',
      gradeUp: false,
    },
    objective: NOTHING,
    mvp: { ...NOTHING, chest: 'gold' },
    gradeUpMaxGrade: null,
  },
  {
    id: 'hard',
    label: 'Hard',
    description:
      'A posting players should weigh before signing up for. Low base, with most of the reward ' +
      'behind completing every objective and the rest in the referee’s MVP award — so the ' +
      'question is whether it is worth it. Should almost guarantee at least one character death.',
    objectives: { min: 3, max: 3 },
    complications: { min: 3, max: 4 },
    // Not supplied — Easy is 6 and Medium is 4, so Hard starts at 4. Change it if that is wrong.
    slots: 4,
    gradeDrift: 3,
    base: {
      cr: { min: 20, max: 40 },
      traitPoints: { min: 0, max: 0 },
      yen: { min: 0, max: 0 },
      chest: 'none',
      gradeUp: false,
    },
    objective: {
      cr: { min: 200, max: 300 },
      traitPoints: { min: 10, max: 12 },
      yen: { min: 0, max: 0 },
      chest: 'none',
      gradeUp: false,
    },
    mvp: {
      cr: { min: 0, max: 0 },
      traitPoints: { min: 4, max: 6 },
      yen: { min: 0, max: 0 },
      chest: 'diamond',
      gradeUp: false,
    },
    gradeUpMaxGrade: null,
  },
  {
    id: CUSTOM_DIFFICULTY_ID,
    label: 'Custom',
    description:
      'Yours to set. Shipped a step past Hard so it is useful before you edit it.',
    objectives: { min: 3, max: 4 },
    complications: { min: 4, max: 5 },
    slots: 4,
    gradeDrift: 4,
    base: {
      cr: { min: 20, max: 40 },
      traitPoints: { min: 0, max: 0 },
      yen: { min: 0, max: 0 },
      chest: 'none',
      gradeUp: false,
    },
    objective: {
      cr: { min: 300, max: 400 },
      traitPoints: { min: 14, max: 18 },
      yen: { min: 0, max: 0 },
      chest: 'none',
      gradeUp: false,
    },
    mvp: {
      cr: { min: 0, max: 0 },
      traitPoints: { min: 6, max: 8 },
      yen: { min: 0, max: 0 },
      chest: 'diamond',
      gradeUp: false,
    },
    gradeUpMaxGrade: null,
  },
];

export function findPreset(
  presets: readonly DifficultyPreset[],
  id: string,
): DifficultyPreset {
  return (
    presets.find((preset) => preset.id === id) ??
    presets.find((preset) => preset.id === DEFAULT_DIFFICULTY_ID) ??
    (DEFAULT_DIFFICULTY_PRESETS[0] as DifficultyPreset)
  );
}

export function bucketOf(preset: DifficultyPreset, id: RewardBucketId): RewardBucket {
  return preset[id];
}

/** A band as an inclusive `[min, max]` count, clamped at zero and tolerant of a reversed pair. */
export function bandToCount(band: Band): readonly [number, number] {
  const a = Math.trunc(band.min);
  const b = Math.trunc(band.max);
  const low = Math.max(0, Math.min(a, b));
  return [low, Math.max(low, Math.max(a, b))];
}
