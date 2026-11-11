/**
 * Black Flash — what a character's stats read as while one is landing.
 *
 * Dan's rule, 10 Nov 2026:
 *
 * - **+2 Grades to Strength** for the attack, dropping to **+1 Grade** once the character is
 *   Semi-Special Grade or above. Measured on the **character's own grade**, not on Strength's.
 * - **+1 Class to every stat** for five turns. CE Reserves is excluded, being a band rather
 *   than a `Grade[Class]` pair.
 * - Strength takes **both** — the grade jump and the class step.
 * - RCT fatigue resets. That is narrative and nothing here models it.
 *
 * ## ⚠️ This is not the thing CLAUDE.md §4 forbids
 *
 * §4 bans a **damage** calculator and a stat calculator that derives stored values from a trait
 * list. Nothing here produces a damage figure, reads a trait, or writes a stat. It restates
 * stats Dan typed by a rule Dan stated, as a second view shown beside the real ones — the same
 * arrangement as `effectiveReserves`, and confirmed the same way (10 Nov 2026). The record is
 * never touched.
 *
 * The arithmetic goes through `applyModifier`, which is the house rules' own carry rule: a
 * class is one tier, a grade is five, `G4[C1] +2 classes` is `G3[C4]`, and the top of the
 * ladder clamps at `AG[C1]`. Writing a second implementation here would be how the two drift.
 *
 * Pure (CLAUDE.md §3).
 */

import {
  applyModifier,
  gradeRank,
  type GradeId,
  type StatValue,
} from './grades';
import { GRADED_STAT_IDS, type GradedStatId, type StatBlock } from './stats';

/** At and above this grade the Strength bonus halves. */
export const BLACK_FLASH_THRESHOLD: GradeId = 'semi-special-grade';

/** Classes added to every graded stat. */
export const BLACK_FLASH_CLASSES = 1;

/** How long the all-stat buff lasts. Stated, not tracked — nothing here counts turns. */
export const BLACK_FLASH_TURNS = 5;

/**
 * Grades added to Strength: 2, or 1 from Semi-Special Grade up.
 *
 * ⚠️ Keyed on the **character's** grade. A Grade 2 character with freakish Semi-Special Grade
 * Strength still gets the full +2 — it is the sorcerer who is below the threshold, not the arm.
 */
export function strengthGradeBonus(characterGrade: GradeId): number {
  return gradeRank(characterGrade) >= gradeRank(BLACK_FLASH_THRESHOLD) ? 1 : 2;
}

export interface BlackFlashStat {
  readonly id: GradedStatId;
  /** What the sheet says. */
  readonly base: StatValue;
  /** What it reads as during the Black Flash. */
  readonly buffed: StatValue;
  /** False when the modifier could not move it — a Civilian stat, or the ceiling. */
  readonly moved: boolean;
}

export interface BlackFlashView {
  /** Grades added to Strength — 1 or 2. */
  readonly strengthGrades: number;
  /** True once the character is at or above the threshold and the bonus has halved. */
  readonly halved: boolean;
  readonly turns: number;
  readonly stats: readonly BlackFlashStat[];
}

/**
 * The buffed reading of a stat block. Derived for display; nothing is written back.
 *
 * A Civilian stat comes back unchanged, because `applyModifier` leaves it alone — the house
 * rules do not say how a positive modifier lifts a stat off the floor, and §12.1 is still open
 * on whether Civilian Grade even has classes. `moved` is false there so the UI can say so
 * rather than silently showing the same value twice.
 */
export function blackFlashView(grade: GradeId, stats: StatBlock): BlackFlashView {
  const strengthGrades = strengthGradeBonus(grade);

  return {
    strengthGrades,
    halved: strengthGrades === 1,
    turns: BLACK_FLASH_TURNS,
    stats: GRADED_STAT_IDS.map((id) => {
      const base = stats.graded[id];
      // Strength takes both the grade jump and the class step.
      const buffed = applyModifier(base, {
        classes: BLACK_FLASH_CLASSES,
        ...(id === 'strength' ? { grades: strengthGrades } : {}),
      });

      return {
        id,
        base,
        buffed,
        moved:
          base.kind !== buffed.kind ||
          (base.kind === 'graded' &&
            buffed.kind === 'graded' &&
            (base.grade !== buffed.grade || base.classRank !== buffed.classRank)),
      };
    }),
  };
}

/** One Black Flash, as it happened. */
export interface BlackFlashRecord {
  readonly id: string;
  /** Free text, like every other date in this project. */
  readonly date: string;
  /** What it landed on. */
  readonly against: string;
  readonly notes: string;
}

export function newBlackFlashRecord(id: string, date: string): BlackFlashRecord {
  return { id, date, against: '', notes: '' };
}

/** "12 Mar — against a Grade 2 curse — first one" */
export function blackFlashLogLine(entry: BlackFlashRecord): string {
  return [entry.date, entry.against && `against ${entry.against}`, entry.notes]
    .filter(Boolean)
    .join(' — ');
}
