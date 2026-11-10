import { describe, expect, it } from 'vitest';

import { buildTableSet, type TableSet } from '../domain/tables';
import { parseTableFile } from '../domain/tables-parse';
import { GRADE_IDS, gradeRank } from '../domain/grades';
import { driftSummary, rerollPart, rollSituation, shiftGrade } from './situation';

const MODULES = import.meta.glob('/data/canon/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

function canon(): TableSet {
  const files = Object.keys(MODULES)
    .sort()
    .map((path) => parseTableFile(MODULES[path], 'canon').file);
  return buildTableSet(files);
}

const set = canon();

describe('shiftGrade', () => {
  it('moves up and down the ladder', () => {
    expect(shiftGrade('grade-3', 1)).toBe(GRADE_IDS[gradeRank('grade-3') + 1]);
    expect(shiftGrade('grade-3', -1)).toBe(GRADE_IDS[gradeRank('grade-3') - 1]);
  });

  it('clamps at both ends rather than falling off', () => {
    expect(shiftGrade(GRADE_IDS[0] as 'grade-4', -3)).toBe(GRADE_IDS[0]);
    const top = GRADE_IDS[GRADE_IDS.length - 1] as 'apocalypse-grade';
    expect(shiftGrade(top, 5)).toBe(top);
  });

  it('returns the same grade for no shift', () => {
    expect(shiftGrade('grade-1', 0)).toBe('grade-1');
  });
});

describe('rolling a situation', () => {
  it('is deterministic from one seed', () => {
    expect(rollSituation(set, 'ash-gantry-nine')).toEqual(rollSituation(set, 'ash-gantry-nine'));
  });

  it('gives three different seeds, so the parts do not mirror each other', () => {
    const s = rollSituation(set, 'seed');
    expect(new Set([s.mission.seed, s.curse.seed, s.tool.seed]).size).toBe(3);
  });

  it('rolls the right kind for each part', () => {
    const s = rollSituation(set, 'seed');
    expect(s.mission.kind).toBe('mission');
    expect(s.curse.kind).toBe('curse');
    expect(s.tool.kind).toBe('cursed-tool');
  });

  it('never puts the curse below the posting', () => {
    for (let i = 0; i < 60; i += 1) {
      const s = rollSituation(set, `drift-${i}`);
      expect(gradeRank(s.curse.grade)).toBeGreaterThanOrEqual(gradeRank(s.mission.grade));
    }
  });

  it('keeps the tool at or below the posting', () => {
    for (let i = 0; i < 60; i += 1) {
      const s = rollSituation(set, `tool-${i}`);
      expect(gradeRank(s.tool.grade)).toBeLessThanOrEqual(gradeRank(s.mission.grade));
    }
  });

  it('produces accurate postings and badly wrong ones both', () => {
    const drifts = new Set(
      Array.from({ length: 120 }, (_, i) => rollSituation(set, `spread-${i}`).drift),
    );
    expect(drifts.has(0)).toBe(true);
    expect(drifts.size).toBeGreaterThan(2);
  });

  it('honours a pinned grade on the mission', () => {
    const s = rollSituation(set, 'pinned', { grade: 'grade-2' });
    expect(s.mission.grade).toBe('grade-2');
  });

  it('can be told to roll honestly', () => {
    for (let i = 0; i < 20; i += 1) {
      const s = rollSituation(set, `honest-${i}`, { noDrift: true });
      expect(s.drift).toBe(0);
      expect(s.curse.grade).toBe(s.mission.grade);
    }
  });

  it('fills every field of all three parts', () => {
    for (let i = 0; i < 30; i += 1) {
      const s = rollSituation(set, `full-${i}`);
      for (const draft of [s.mission, s.curse, s.tool]) {
        for (const field of draft.fields) {
          expect(field.values.every((v) => v.trim().length > 0), `${draft.kind}/${field.key}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('describes the drift in words for every value it can produce', () => {
    for (const drift of [0, 1, 2, 3]) {
      const summary = driftSummary({ ...rollSituation(set, 'words'), drift });
      expect(summary.length).toBeGreaterThan(10);
    }
  });
});

describe('re-rolling one part', () => {
  const original = rollSituation(set, 'reroll');

  it('changes only that part', () => {
    const next = rerollPart(original, set, 'curse', 1);
    expect(next.mission).toEqual(original.mission);
    expect(next.tool).toEqual(original.tool);
    expect(next.curse).not.toEqual(original.curse);
  });

  it('keeps that part’s grade, so the drift still means something', () => {
    for (const part of ['mission', 'curse', 'tool'] as const) {
      const next = rerollPart(original, set, part, 3);
      expect(next[part].grade).toBe(original[part].grade);
    }
  });

  it('is deterministic per nonce', () => {
    expect(rerollPart(original, set, 'tool', 2)).toEqual(rerollPart(original, set, 'tool', 2));
    expect(rerollPart(original, set, 'tool', 2)).not.toEqual(
      rerollPart(original, set, 'tool', 3),
    );
  });
});
