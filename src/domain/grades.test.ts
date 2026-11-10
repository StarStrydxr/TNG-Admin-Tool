import { describe, expect, it } from 'vitest';

import {
  CIVILIAN_STAT,
  CLASSES_PER_GRADE,
  GRADE_IDS,
  LISTED_GRADE_IDS,
  MAX_TIER,
  applyModifier,
  compareGrades,
  formatStatLong,
  formatStatShort,
  fromTier,
  gradeAbbrev,
  gradeAtRank,
  gradeRank,
  isListedGrade,
  powerRatio,
  statValue,
  toTier,
  type GradeId,
} from './grades';

describe('the ladder', () => {
  it('has fifteen positions — fourteen rungs plus the Civilian floor', () => {
    expect(GRADE_IDS).toHaveLength(14);
    expect(gradeRank('civilian-grade')).toBe(-1);
  });

  it('orders the rungs weakest to strongest', () => {
    const order: GradeId[] = [
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
    ];
    expect([...GRADE_IDS]).toEqual(order);
    order.forEach((id, index) => expect(gradeRank(id)).toBe(index));
  });

  it('puts the three-gap rungs in the order Demi then Semi', () => {
    expect(gradeRank('demi-apocalypse-grade')).toBeLessThan(gradeRank('semi-apocalypse-grade'));
    expect(gradeRank('semi-apocalypse-grade')).toBeLessThan(gradeRank('apocalypse-grade'));
  });

  it('places Semi-Special between Grade 1 and Special Grade', () => {
    expect(gradeRank('grade-1')).toBeLessThan(gradeRank('semi-special-grade'));
    expect(gradeRank('semi-special-grade')).toBeLessThan(gradeRank('special-grade'));
  });

  it('marks the implied rungs as unlisted', () => {
    expect(isListedGrade('semi-special-grade')).toBe(false);
    expect(isListedGrade('semi-calamity-grade')).toBe(false);
    expect(isListedGrade('demi-apocalypse-grade')).toBe(false);
    expect(isListedGrade('semi-apocalypse-grade')).toBe(false);
    expect(LISTED_GRADE_IDS).toHaveLength(10);
  });

  it('sorts Civilian Grade below everything', () => {
    expect(compareGrades('civilian-grade', 'grade-4')).toBeLessThan(0);
  });

  it('doubles power per rung', () => {
    expect(powerRatio('grade-3', 'grade-4')).toBe(2);
    expect(powerRatio('special-grade', 'grade-1')).toBe(4); // declared gap of 2
    expect(powerRatio('apocalypse-grade', 'grade-4')).toBe(8192); // 2 ** 13
  });

  it('returns undefined off the end of the ladder', () => {
    expect(gradeAtRank(14)).toBeUndefined();
    expect(gradeAtRank(-1)).toBeUndefined();
  });
});

describe('notation', () => {
  it('formats the short form', () => {
    expect(formatStatShort(statValue('grade-1', 3))).toBe('G1[C3]');
    expect(formatStatShort(statValue('semi-special-grade', 1))).toBe('S-SG[C1]');
    expect(formatStatShort(CIVILIAN_STAT)).toBe('CIV');
  });

  it('formats the long form', () => {
    expect(formatStatLong(statValue('grade-1', 3))).toBe('Grade 1 [Class 3]');
    expect(formatStatLong(CIVILIAN_STAT)).toBe('Civilian Grade');
  });

  it('uses the abbreviations the server confirmed', () => {
    expect(gradeAbbrev('grade-1')).toBe('G1');
    expect(gradeAbbrev('special-grade')).toBe('SG');
    expect(gradeAbbrev('semi-special-grade')).toBe('S-SG');
  });

  it('defaults to Class 3', () => {
    expect(formatStatShort(statValue('grade-2'))).toBe('G2[C3]');
  });
});

describe('tier arithmetic (reference only)', () => {
  it('round-trips every grade and class', () => {
    for (const grade of GRADE_IDS) {
      for (const classRank of [1, 2, 3, 4, 5] as const) {
        const value = statValue(grade, classRank);
        const tier = toTier(value);
        expect(tier).not.toBeNull();
        expect(fromTier(tier as number)).toEqual(value);
      }
    }
  });

  it('spans one rung every five classes', () => {
    const base = toTier(statValue('grade-4', 3)) as number;
    expect(fromTier(base + CLASSES_PER_GRADE)).toEqual(statValue('grade-3', 3));
  });

  it("carries across a grade boundary — Dan's worked example", () => {
    // G4[C1] +2 Classes => G3[C4]
    expect(applyModifier(statValue('grade-4', 1), { classes: 2 })).toEqual(
      statValue('grade-3', 4),
    );
  });

  it('drops to Civilian Grade below the floor', () => {
    // G4[C5] -2 Classes => Civilian
    expect(applyModifier(statValue('grade-4', 5), { classes: -2 })).toEqual(CIVILIAN_STAT);
  });

  it('leaves a Civilian stat alone, since the rules do not define lifting it', () => {
    expect(applyModifier(CIVILIAN_STAT, { grades: 2 })).toEqual(CIVILIAN_STAT);
    expect(toTier(CIVILIAN_STAT)).toBeNull();
  });

  it('clamps at the ceiling', () => {
    expect(fromTier(MAX_TIER + 50)).toEqual(statValue('apocalypse-grade', 1));
  });
});

describe("Walker Masami's sheet reproduces exactly", () => {
  // Grade 1 sorcerer, so every stat bases at G1[C3].
  const base = statValue('grade-1', 3);

  const cases: ReadonlyArray<[string, Parameters<typeof applyModifier>[1], string]> = [
    ['CE Output', {}, 'G1[C3]'],
    ['CE Control', { grades: 1, classes: 4 }, 'SG[C4]'],
    ['CE Efficiency', { grades: 2, classes: 2 }, 'SG[C1]'],
    ['Perception', { grades: 2 }, 'SG[C3]'],
    ['Strength', { classes: -2 }, 'G1[C5]'],
    ['Speed', { classes: 2 }, 'G1[C1]'],
    ['Fortitude', {}, 'G1[C3]'],
  ];

  it.each(cases)('%s', (_name, modifier, expected) => {
    expect(formatStatShort(applyModifier(base, modifier))).toBe(expected);
  });

  it('routes CE Control through the implied Semi-Special rung', () => {
    // The four class bonuses alone carry it off the top of Grade 1 onto Semi-Special;
    // only then does +1 Grade reach Special Grade. Without the implied rung it would
    // land one short, so this pins the rung's existence.
    const afterClasses = applyModifier(base, { classes: 4 });
    expect(formatStatShort(afterClasses)).toBe('S-SG[C4]');
    expect(formatStatShort(applyModifier(afterClasses, { grades: 1 }))).toBe('SG[C4]');
  });
});
