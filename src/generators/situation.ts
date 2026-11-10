/**
 * A whole situation, rolled together.
 *
 * Three records that belong to each other: a mission, the curse actually in it, and the tool
 * recovered from the site. Rolling them separately gives you three unrelated things you then
 * have to reconcile by hand; rolling them from one seed gives you a scene.
 *
 * The grade relationship is the point. CLAUDE.md §4 says misgraded missions are the engine of
 * JJK plots, so the curse is drawn at or **above** the posting — `gradeDrift` below — which is
 * the mechanical form of "the briefing was wrong". The tool sits at or below it, because
 * something recoverable from a site is rarely the most dangerous thing there.
 *
 * This is a generator decision about which grade to roll at, not arithmetic on stats: the app
 * still never calculates a stat (§4). Every record keeps its own grade, editable afterwards.
 *
 * Pure, and deterministic from one seed (§5).
 */

import { GRADE_IDS, gradeAtRank, gradeRank, type GradeId } from '../domain/grades';
import type { TableSet } from '../domain/tables';
import { rollDraft, type Draft } from './draft';
import { createRng, deriveSeed, type Rng } from './rng';
import { CURSE_SPEC, CURSED_TOOL_SPEC, MISSION_SPEC } from './specs';

export interface Situation {
  readonly seed: string;
  readonly mission: Draft;
  readonly curse: Draft;
  readonly tool: Draft;
  /** How many rungs above the posting the curse actually is. 0 means the brief was right. */
  readonly drift: number;
}

export interface SituationConstraints {
  /** Pin the mission's grade; the curse and tool are derived from it. */
  readonly grade?: GradeId;
  /** Roll the mission honestly, with the curse at the posted grade. */
  readonly noDrift?: boolean;
}

/**
 * How badly the posting understates the curse.
 *
 * Weighted so that an accurate brief is the single most likely outcome and a three-rung
 * surprise is rare but possible — that last case is the one worth playing.
 */
function gradeDrift(rng: Rng): number {
  const roll = rng.nextInt(10);
  if (roll < 4) return 0;
  if (roll < 8) return 1;
  if (roll < 9) return 2;
  return 3;
}

/** Shift a grade by rungs, clamped to the ladder. */
export function shiftGrade(grade: GradeId, rungs: number): GradeId {
  const target = Math.max(0, Math.min(GRADE_IDS.length - 1, gradeRank(grade) + rungs));
  return gradeAtRank(target) ?? grade;
}

export function rollSituation(
  tables: TableSet,
  seed: string,
  constraints: SituationConstraints = {},
): Situation {
  // Sub-seeds, so one situation seed reproduces all three records and re-rolling one of them
  // later does not disturb the others.
  const mission = rollDraft(
    MISSION_SPEC,
    tables,
    deriveSeed(seed, '@mission', 0),
    constraints.grade !== undefined ? { grade: constraints.grade } : {},
  );

  const drift = constraints.noDrift
    ? 0
    : gradeDrift(createRng(deriveSeed(seed, '@drift', 0)));

  const curse = rollDraft(CURSE_SPEC, tables, deriveSeed(seed, '@curse', 0), {
    grade: shiftGrade(mission.grade, drift),
  });

  const tool = rollDraft(CURSED_TOOL_SPEC, tables, deriveSeed(seed, '@tool', 0), {
    grade: shiftGrade(mission.grade, -1),
  });

  return { seed, mission, curse, tool, drift };
}

/** Re-roll one part of a situation, leaving the other two exactly as they are. */
export function rerollPart(
  situation: Situation,
  tables: TableSet,
  part: 'mission' | 'curse' | 'tool',
  nonce: number,
): Situation {
  if (part === 'mission') {
    const mission = rollDraft(
      MISSION_SPEC,
      tables,
      deriveSeed(situation.seed, '@mission', nonce),
      { grade: situation.mission.grade },
    );
    return { ...situation, mission };
  }

  if (part === 'curse') {
    const curse = rollDraft(CURSE_SPEC, tables, deriveSeed(situation.seed, '@curse', nonce), {
      grade: situation.curse.grade,
    });
    return { ...situation, curse };
  }

  const tool = rollDraft(CURSED_TOOL_SPEC, tables, deriveSeed(situation.seed, '@tool', nonce), {
    grade: situation.tool.grade,
  });
  return { ...situation, tool };
}

/** One line describing how wrong the brief is, for the UI. */
export function driftSummary(situation: Situation): string {
  switch (situation.drift) {
    case 0:
      return 'The posting is accurate — for once.';
    case 1:
      return 'One rung under-graded. Survivable, and nobody will be pleased.';
    case 2:
      return 'Two rungs under-graded. Whoever surveyed this is in trouble.';
    default:
      return 'Three rungs under-graded. This is how teams are lost.';
  }
}
