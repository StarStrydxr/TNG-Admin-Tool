import { describe, expect, it } from 'vitest';

import { buildTableSet, entriesForGrade, mergeTableFiles } from '../domain/tables';
import { parseTableFile } from '../domain/tables-parse';
import type { TableEntry } from '../domain/tables';
import { createRng, deriveSeed, weightedPick, weightedPickMany } from './rng';
import {
  fieldApplies,
  rerollField,
  rerollUnlocked,
  resolveTableId,
  rollDraft,
  setFieldLocked,
  setVariantLocked,
  specTableIds,
  type GeneratorSpec,
} from './draft';

function entry(id: string, value: string, extra: Partial<TableEntry> = {}): TableEntry {
  return { id, value, source: 'canon', ...extra };
}

const TABLES = buildTableSet([
  {
    'test.grade': [
      entry('g4', 'grade-4', { weight: 3 }),
      entry('g1', 'grade-1', { weight: 1 }),
    ],
    'test.colour': [
      entry('red', 'red'),
      entry('blue', 'blue'),
      entry('green', 'green'),
      entry('black', 'black'),
    ],
    'test.many': [
      entry('a', 'a'),
      entry('b', 'b'),
      entry('c', 'c'),
      entry('d', 'd'),
      entry('e', 'e'),
    ],
    'test.graded': [
      entry('low', 'low only', { grades: ['grade-4'] }),
      entry('high', 'high only', { grades: ['grade-1'] }),
    ],
  },
]);

const SPEC: GeneratorSpec = {
  kind: 'curse',
  label: 'Test',
  blurb: '',
  gradeTable: 'test.grade',
  fields: [
    { key: 'colour', label: 'Colour', tableId: 'test.colour' },
    { key: 'many', label: 'Many', tableId: 'test.many', count: [2, 3] },
    { key: 'graded', label: 'Graded', tableId: 'test.graded' },
  ],
};

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng('seed');
    const b = createRng('seed');
    const left = [a.next(), a.next(), a.next()];
    const right = [b.next(), b.next(), b.next()];
    expect(left).toEqual(right);
  });

  it('produces different streams for different seeds', () => {
    expect(createRng('one').next()).not.toBe(createRng('two').next());
  });

  it('stays inside bounds', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 200; i += 1) {
      const value = rng.nextInt(5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
    }
  });

  it('respects weights', () => {
    const items = [
      { id: 'heavy', weight: 99 },
      { id: 'light', weight: 1 },
    ];
    let heavy = 0;
    for (let i = 0; i < 500; i += 1) {
      const rng = createRng(`w${i}`);
      if (weightedPick(rng, items)?.id === 'heavy') heavy += 1;
    }
    expect(heavy).toBeGreaterThan(450);
  });

  it('never draws a zero-weight entry', () => {
    const items: { id: string; weight?: number }[] = [
      { id: 'never', weight: 0 },
      { id: 'always' },
    ];
    for (let i = 0; i < 100; i += 1) {
      expect(weightedPick(createRng(`z${i}`), items)?.id).toBe('always');
    }
  });

  it('draws distinct entries and caps at the pool size', () => {
    const items: { id: string; weight?: number }[] = [{ id: 'a' }, { id: 'b' }];
    const drawn = weightedPickMany(createRng('many'), items, 5);
    expect(drawn).toHaveLength(2);
    expect(new Set(drawn.map((item) => item.id)).size).toBe(2);
  });

  it('derives distinct child seeds', () => {
    expect(deriveSeed('root', 'a', 1)).not.toBe(deriveSeed('root', 'a', 2));
    expect(deriveSeed('root', 'a', 1)).toBe(deriveSeed('root', 'a', 1));
  });
});

describe('table merging', () => {
  const canon = parseTableFile(
    { 't': [{ id: 'keep', value: 'canon keep' }, { id: 'override', value: 'canon version' }] },
    'canon',
  ).file;
  const user = parseTableFile(
    { 't': [{ id: 'override', value: 'user version' }, { id: 'added', value: 'user added' }] },
    'user',
  ).file;

  it('overrides a canon entry with the same id and appends new ones', () => {
    const merged = mergeTableFiles([canon, user]);
    const values = merged['t']?.map((e) => e.value);
    expect(values).toEqual(['canon keep', 'user version', 'user added']);
  });

  it('tags entries with their source', () => {
    const merged = mergeTableFiles([canon, user]);
    const overridden = merged['t']?.find((e) => e.id === 'override');
    expect(overridden?.source).toBe('user');
  });

  it('drops entries missing an id or value, and says why', () => {
    const parsed = parseTableFile({ 't': [{ value: 'no id' }, { id: 'no-value' }] }, 'canon');
    expect(parsed.file['t']).toBeUndefined();
    expect(parsed.issues.map((i) => i.reason)).toEqual(['Missing id', 'Missing value']);
  });
});

describe('grade filtering', () => {
  const entries = [entry('any', 'any'), entry('low', 'low', { grades: ['grade-4'] })];

  it('keeps ungraded entries for every grade', () => {
    expect(entriesForGrade(entries, 'grade-1').map((e) => e.id)).toEqual(['any']);
    expect(entriesForGrade(entries, 'grade-4').map((e) => e.id)).toEqual(['any', 'low']);
  });

  it('falls back to the whole pool rather than leaving a field blank', () => {
    const onlyLow = [entry('low', 'low', { grades: ['grade-4'] })];
    expect(entriesForGrade(onlyLow, 'special-grade')).toHaveLength(1);
  });
});

describe('rollDraft', () => {
  it('is reproducible from the seed', () => {
    const a = rollDraft(SPEC, TABLES, 'seed-1');
    const b = rollDraft(SPEC, TABLES, 'seed-1');
    expect(a).toEqual(b);
  });

  it('differs between seeds', () => {
    const a = rollDraft(SPEC, TABLES, 'seed-1');
    const b = rollDraft(SPEC, TABLES, 'seed-2');
    expect([a.grade, ...a.fields.map((f) => f.values.join())]).not.toEqual([
      b.grade,
      ...b.fields.map((f) => f.values.join()),
    ]);
  });

  it('honours a pinned grade and marks it locked', () => {
    const draft = rollDraft(SPEC, TABLES, 'seed-1', { grade: 'special-grade' });
    expect(draft.grade).toBe('special-grade');
    expect(draft.gradeLocked).toBe(true);
  });

  it('rolls a count inside the declared range', () => {
    for (let i = 0; i < 40; i += 1) {
      const draft = rollDraft(SPEC, TABLES, `count-${i}`);
      const many = draft.fields.find((f) => f.key === 'many');
      expect(many?.values.length).toBeGreaterThanOrEqual(2);
      expect(many?.values.length).toBeLessThanOrEqual(3);
    }
  });

  it('records the table version it rolled against', () => {
    expect(rollDraft(SPEC, TABLES, 's').tableVersion).toBe(TABLES.version);
  });
});

/**
 * Count overrides exist so something outside the spec — mission difficulty — can decide how
 * much a draft rolls. The spec's own count has to stay the default, or every other generator
 * would change behaviour for a feature only one of them uses.
 */
describe('count overrides', () => {
  it('rolls the count it is given instead of the spec’s', () => {
    for (let i = 0; i < 20; i += 1) {
      const draft = rollDraft(SPEC, TABLES, `fixed-${i}`, { counts: { many: 4 } });
      expect(draft.fields.find((f) => f.key === 'many')?.values).toHaveLength(4);
    }
  });

  it('accepts a range, and stays inside it', () => {
    for (let i = 0; i < 40; i += 1) {
      const draft = rollDraft(SPEC, TABLES, `range-${i}`, { counts: { many: [1, 2] } });
      const count = draft.fields.find((f) => f.key === 'many')?.values.length ?? 0;
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('leaves fields it does not name alone', () => {
    const draft = rollDraft(SPEC, TABLES, 'seed-1', { counts: { many: 4 } });
    const plain = rollDraft(SPEC, TABLES, 'seed-1');
    expect(draft.fields.find((f) => f.key === 'colour')).toEqual(
      plain.fields.find((f) => f.key === 'colour'),
    );
  });

  it('survives a re-roll of everything', () => {
    const draft = rollDraft(SPEC, TABLES, 'seed-1', { counts: { many: 4 } });
    expect(rerollUnlocked(draft, SPEC, TABLES).fields.find((f) => f.key === 'many')?.values).toHaveLength(4);
  });

  it('survives a re-roll of the one field', () => {
    const draft = rollDraft(SPEC, TABLES, 'seed-1', { counts: { many: 4 } });
    expect(rerollField(draft, SPEC, TABLES, 'many').fields.find((f) => f.key === 'many')?.values).toHaveLength(4);
  });

  it('is still reproducible from the seed', () => {
    const constraints = { counts: { many: [1, 3] as const } };
    expect(rollDraft(SPEC, TABLES, 'seed-9', constraints)).toEqual(
      rollDraft(SPEC, TABLES, 'seed-9', constraints),
    );
  });
});

describe('re-rolling', () => {
  const draft = rollDraft(SPEC, TABLES, 'seed-1', { grade: 'grade-4' });

  it('changes only the named field', () => {
    const next = rerollField(draft, SPEC, TABLES, 'colour');
    expect(next.fields.find((f) => f.key === 'many')).toEqual(
      draft.fields.find((f) => f.key === 'many'),
    );
    expect(next.fields.find((f) => f.key === 'colour')?.nonce).toBe(1);
  });

  it('refuses to re-roll a locked field', () => {
    const locked = setFieldLocked(draft, 'colour', true);
    expect(rerollField(locked, SPEC, TABLES, 'colour')).toEqual(locked);
  });

  it('leaves locked fields alone when re-rolling everything', () => {
    const locked = setFieldLocked(draft, 'colour', true);
    const next = rerollUnlocked(locked, SPEC, TABLES);
    expect(next.fields.find((f) => f.key === 'colour')?.values).toEqual(
      locked.fields.find((f) => f.key === 'colour')?.values,
    );
    expect(next.fields.find((f) => f.key === 'many')?.nonce).toBe(1);
  });

  it('keeps a pinned grade across a full re-roll', () => {
    expect(rerollUnlocked(draft, SPEC, TABLES).grade).toBe('grade-4');
  });

  it('stays reproducible after re-rolling', () => {
    const once = rerollField(draft, SPEC, TABLES, 'colour');
    const twice = rerollField(
      rollDraft(SPEC, TABLES, 'seed-1', { grade: 'grade-4' }),
      SPEC,
      TABLES,
      'colour',
    );
    expect(once).toEqual(twice);
  });
});

/* ------------------------------------------------------------------ */
/* Grade gating and variants                                           */
/* ------------------------------------------------------------------ */

const VARIANT_TABLES = buildTableSet([
  {
    'v.grade': [entry('g4', 'grade-4'), entry('g1', 'grade-1')],
    'v.type': [entry('alpha', 'Alpha type'), entry('beta', 'Beta type')],
    'v.alpha.trait': [entry('a1', 'alpha trait')],
    'v.common.trait': [entry('c1', 'common trait')],
    'v.max': [entry('m1', 'a maximum')],
  },
]);

const VARIANT_SPEC: GeneratorSpec = {
  kind: 'technique',
  label: 'Variant test',
  blurb: '',
  gradeTable: 'v.grade',
  variantTable: 'v.type',
  variantLabel: 'Type',
  fields: [
    { key: 'trait', label: 'Trait', tableId: 'v.{variant}.trait' },
    { key: 'maximum', label: 'Maximum', tableId: 'v.max', minGrade: 'grade-1' },
  ],
};

describe('grade gating', () => {
  it('decides field presence from the grade ladder, not string equality', () => {
    const field = { key: 'm', label: 'M', tableId: 't', minGrade: 'grade-1' } as const;
    expect(fieldApplies(field, 'grade-4')).toBe(false);
    expect(fieldApplies(field, 'grade-semi-1')).toBe(false);
    expect(fieldApplies(field, 'grade-1')).toBe(true);
    expect(fieldApplies(field, 'special-grade')).toBe(true);
  });

  it('omits a gated field below its grade and includes it above', () => {
    const low = rollDraft(VARIANT_SPEC, VARIANT_TABLES, 's', { grade: 'grade-4' });
    const high = rollDraft(VARIANT_SPEC, VARIANT_TABLES, 's', { grade: 'special-grade' });
    expect(low.fields.map((f) => f.key)).toEqual(['trait']);
    expect(high.fields.map((f) => f.key)).toEqual(['trait', 'maximum']);
  });

  it('adds the gated field when a re-roll raises the grade past the gate', () => {
    // Seeds are searched rather than assumed, so this does not depend on RNG internals.
    let crossed = false;
    for (let i = 0; i < 60 && !crossed; i += 1) {
      const low = rollDraft(VARIANT_SPEC, VARIANT_TABLES, `cross-${i}`, { grade: 'grade-4' });
      const unpinned = { ...low, gradeLocked: false };
      const next = rerollUnlocked(unpinned, VARIANT_SPEC, VARIANT_TABLES);
      if (next.grade === 'grade-1') {
        expect(next.fields.map((f) => f.key)).toEqual(['trait', 'maximum']);
        crossed = true;
      }
    }
    expect(crossed).toBe(true);
  });
});

describe('variants', () => {
  it('substitutes the variant into a table id', () => {
    expect(resolveTableId('v.{variant}.trait', 'alpha')).toBe('v.alpha.trait');
    expect(resolveTableId('v.{variant}.trait', null)).toBe('v.common.trait');
    expect(resolveTableId('v.flat', 'alpha')).toBe('v.flat');
  });

  it('leaves templated ids out of the always-required list', () => {
    expect(specTableIds(VARIANT_SPEC)).toEqual(['v.type', 'v.grade', 'v.max']);
  });

  it('draws from the variant-specific table when one exists', () => {
    const draft = rollDraft(VARIANT_SPEC, VARIANT_TABLES, 's', { variantId: 'alpha' });
    expect(draft.variant).toEqual({ id: 'alpha', label: 'Alpha type' });
    expect(draft.fields.find((f) => f.key === 'trait')?.values).toEqual(['alpha trait']);
  });

  it('falls back to the common table for a variant with no tables of its own', () => {
    const draft = rollDraft(VARIANT_SPEC, VARIANT_TABLES, 's', { variantId: 'beta' });
    expect(draft.fields.find((f) => f.key === 'trait')?.values).toEqual(['common trait']);
  });

  it('pins a chosen variant and marks it locked', () => {
    const draft = rollDraft(VARIANT_SPEC, VARIANT_TABLES, 's', { variantId: 'beta' });
    expect(draft.variantLocked).toBe(true);
    expect(rerollUnlocked(draft, VARIANT_SPEC, VARIANT_TABLES).variant?.id).toBe('beta');
  });

  it('keeps a locked variant across a full re-roll', () => {
    const draft = setVariantLocked(rollDraft(VARIANT_SPEC, VARIANT_TABLES, 'x'), true);
    const before = draft.variant?.id;
    for (let i = 0; i < 10; i += 1) {
      expect(rerollUnlocked(draft, VARIANT_SPEC, VARIANT_TABLES).variant?.id).toBe(before);
    }
  });

  it('stays reproducible with variants in play', () => {
    expect(rollDraft(VARIANT_SPEC, VARIANT_TABLES, 'repeat')).toEqual(
      rollDraft(VARIANT_SPEC, VARIANT_TABLES, 'repeat'),
    );
  });
});
