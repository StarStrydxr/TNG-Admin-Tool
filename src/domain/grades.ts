/**
 * The Grade/Class system.
 *
 * Authoritative source: docs/house-rules/stats-grades-classes.md
 * Read it before changing anything here.
 *
 * Two things routinely trip people up:
 *   1. The Class scale is INVERTED. Class 1 is the strongest, Class 5 the weakest.
 *   2. Several rungs of the ladder are "implied" — the server never names them, but they
 *      occupy real positions and gap counting depends on them.
 */

/**
 * Every rung of the ladder, weakest first. The array index IS the grade's rank.
 * Each step is one grade gap, and one gap means twice as powerful.
 */
export const GRADE_IDS = [
  'grade-4',
  'grade-3',
  'grade-semi-2',
  'grade-2',
  'grade-semi-1',
  'grade-1',
  'semi-special-grade',
  'special-grade',
  'disaster-grade',
  'semi-calamity-grade',
  'calamity-grade',
  'demi-apocalypse-grade',
  'semi-apocalypse-grade',
  'apocalypse-grade',
] as const;

export type GradeId = (typeof GRADE_IDS)[number];

/**
 * The floor, below Grade 4. A stat driven below `G4[C5]` by a defect becomes Civilian
 * Grade. It is not a rung on the ladder and has no rank.
 */
export const CIVILIAN_GRADE = 'civilian-grade';
export type CivilianGrade = typeof CIVILIAN_GRADE;

/** Any grade a stat may hold, the Civilian floor included. */
export type StatGrade = GradeId | CivilianGrade;

export const MIN_GRADE_RANK = 0;
export const MAX_GRADE_RANK = GRADE_IDS.length - 1;

interface GradeMeta {
  readonly label: string;
  readonly abbrev: string;
  /** False for the implied Semi-/Demi- rungs the server does not list. */
  readonly listed: boolean;
}

/**
 * Abbreviations other than G1, SG and S-SG are proposed rather than taken from the
 * server — see §3 of the house-rules doc. Confirm before they become load-bearing.
 */
const GRADE_META: Record<GradeId, GradeMeta> = {
  'grade-4': { label: 'Grade 4', abbrev: 'G4', listed: true },
  'grade-3': { label: 'Grade 3', abbrev: 'G3', listed: true },
  'grade-semi-2': { label: 'Grade Semi-2', abbrev: 'S-G2', listed: true },
  'grade-2': { label: 'Grade 2', abbrev: 'G2', listed: true },
  'grade-semi-1': { label: 'Grade Semi-1', abbrev: 'S-G1', listed: true },
  'grade-1': { label: 'Grade 1', abbrev: 'G1', listed: true },
  'semi-special-grade': { label: 'Semi-Special Grade', abbrev: 'S-SG', listed: false },
  'special-grade': { label: 'Special Grade', abbrev: 'SG', listed: true },
  'disaster-grade': { label: 'Disaster Grade', abbrev: 'DG', listed: true },
  'semi-calamity-grade': { label: 'Semi-Calamity Grade', abbrev: 'S-CG', listed: false },
  'calamity-grade': { label: 'Calamity Grade', abbrev: 'CG', listed: true },
  'demi-apocalypse-grade': { label: 'Demi-Apocalypse Grade', abbrev: 'D-AG', listed: false },
  'semi-apocalypse-grade': { label: 'Semi-Apocalypse Grade', abbrev: 'S-AG', listed: false },
  'apocalypse-grade': { label: 'Apocalypse Grade', abbrev: 'AG', listed: true },
};

const CIVILIAN_META: GradeMeta = { label: 'Civilian Grade', abbrev: 'CIV', listed: true };

const RANK_BY_ID = Object.fromEntries(GRADE_IDS.map((id, index) => [id, index])) as Record<
  GradeId,
  number
>;

export function isGradeId(value: string): value is GradeId {
  return value in GRADE_META;
}

export function isCivilianGrade(value: StatGrade): value is CivilianGrade {
  return value === CIVILIAN_GRADE;
}

/** Position on the ladder. Civilian Grade sits below rank 0 and returns -1. */
export function gradeRank(grade: StatGrade): number {
  return isCivilianGrade(grade) ? -1 : RANK_BY_ID[grade];
}

export function gradeAtRank(rank: number): GradeId | undefined {
  return GRADE_IDS[rank];
}

export function gradeLabel(grade: StatGrade): string {
  return (isCivilianGrade(grade) ? CIVILIAN_META : GRADE_META[grade]).label;
}

export function gradeAbbrev(grade: StatGrade): string {
  return (isCivilianGrade(grade) ? CIVILIAN_META : GRADE_META[grade]).abbrev;
}

/** True for the grades the server actually names, false for implied Semi-/Demi- rungs. */
export function isListedGrade(grade: StatGrade): boolean {
  return (isCivilianGrade(grade) ? CIVILIAN_META : GRADE_META[grade]).listed;
}

/** The grades the server names — the sensible default for a grade picker. */
export const LISTED_GRADE_IDS: readonly GradeId[] = GRADE_IDS.filter((id) => GRADE_META[id].listed);

/** Negative when `a` is weaker than `b`. Suitable for Array.prototype.sort. */
export function compareGrades(a: StatGrade, b: StatGrade): number {
  return gradeRank(a) - gradeRank(b);
}

/**
 * How many times more powerful `a` is than `b`. One grade gap doubles, so this grows fast:
 * Apocalypse Grade is 2^13 times Grade 4.
 *
 * Reference and display only. Never resolve a conflict with this — see §1 of the
 * house-rules doc.
 */
export function powerRatio(a: GradeId, b: GradeId): number {
  return 2 ** (gradeRank(a) - gradeRank(b));
}

/* ------------------------------------------------------------------ */
/* Classes                                                             */
/* ------------------------------------------------------------------ */

/** 1 is the HIGHEST, 5 the LOWEST. Do not sort these ascending by accident. */
export type ClassRank = 1 | 2 | 3 | 4 | 5;

export const CLASS_RANKS: readonly ClassRank[] = [1, 2, 3, 4, 5];

/** Every stat starts here — Class 3 of the character's own grade. */
export const DEFAULT_CLASS_RANK: ClassRank = 3;

/** Five classes span one grade rung. */
export const CLASSES_PER_GRADE = 5;

export const CLASS_DESCRIPTIONS: Record<ClassRank, string> = {
  1: 'Exceptional, borderlining the next grade',
  2: 'Above average',
  3: 'Average',
  4: 'Still below average but much closer to it',
  5: 'Just barely clearing the hurdle to the given grade',
};

export function isClassRank(value: number): value is ClassRank {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/* ------------------------------------------------------------------ */
/* Stat values                                                         */
/* ------------------------------------------------------------------ */

export type StatValue =
  | { readonly kind: 'graded'; readonly grade: GradeId; readonly classRank: ClassRank }
  | { readonly kind: 'civilian' };

export const CIVILIAN_STAT: StatValue = { kind: 'civilian' };

export function statValue(grade: GradeId, classRank: ClassRank = DEFAULT_CLASS_RANK): StatValue {
  return { kind: 'graded', grade, classRank };
}

/** `G1[C3]`, or `CIV` at the floor. */
export function formatStatShort(value: StatValue): string {
  if (value.kind === 'civilian') return CIVILIAN_META.abbrev;
  return `${gradeAbbrev(value.grade)}[C${value.classRank}]`;
}

/** `Grade 1 [Class 3]`, or `Civilian Grade` at the floor. */
export function formatStatLong(value: StatValue): string {
  if (value.kind === 'civilian') return CIVILIAN_META.label;
  return `${gradeLabel(value.grade)} [Class ${value.classRank}]`;
}

/* ------------------------------------------------------------------ */
/* Tier arithmetic — REFERENCE ONLY                                    */
/* ------------------------------------------------------------------ */

/**
 * ⚠️ The application does NOT calculate stats. Generators roll a grade; every stat then
 * sits at Class 3 of it and Dan adjusts classes by hand. See CLAUDE.md §4.
 *
 * These helpers exist to validate a hand-entered value or explain one in a tooltip.
 * Do not wire them into a generator, and do not auto-recalculate a character from its
 * trait list.
 *
 * The model: collapse grade and class into one integer, so every modifier is addition.
 * One class is +1 tier, one grade is +5 tiers.
 */
export const MAX_TIER = MAX_GRADE_RANK * CLASSES_PER_GRADE + (CLASSES_PER_GRADE - 1);

/** Null for Civilian Grade, which sits off the bottom of the scale. */
export function toTier(value: StatValue): number | null {
  if (value.kind === 'civilian') return null;
  return gradeRank(value.grade) * CLASSES_PER_GRADE + (CLASSES_PER_GRADE - value.classRank);
}

/** Below zero becomes Civilian Grade; above the top clamps to `AG[C1]`. */
export function fromTier(tier: number): StatValue {
  if (tier < 0) return CIVILIAN_STAT;

  const clamped = Math.min(tier, MAX_TIER);
  const rank = Math.floor(clamped / CLASSES_PER_GRADE);
  const grade = gradeAtRank(rank);
  if (grade === undefined) return CIVILIAN_STAT;

  const classRank = (CLASSES_PER_GRADE - (clamped % CLASSES_PER_GRADE)) as ClassRank;
  return statValue(grade, classRank);
}

export interface StatModifier {
  /** Whole grade rungs, implied Semi-/Demi- rungs included. May be negative. */
  readonly grades?: number;
  /** Individual classes. May be negative. */
  readonly classes?: number;
}

/**
 * Apply a modifier, carrying across grade boundaries. `G4[C1] +2 classes` becomes `G3[C4]`.
 *
 * A stat already at Civilian Grade is returned unchanged: the house rules do not say how a
 * positive modifier lifts a stat back off the floor. Confirm before relying on it.
 */
export function applyModifier(value: StatValue, modifier: StatModifier): StatValue {
  const tier = toTier(value);
  if (tier === null) return value;

  const delta = (modifier.grades ?? 0) * CLASSES_PER_GRADE + (modifier.classes ?? 0);
  return fromTier(tier + delta);
}
