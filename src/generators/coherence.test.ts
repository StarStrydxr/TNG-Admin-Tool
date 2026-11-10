/**
 * Tag coherence.
 *
 * The behaviour this guards is "tags exclude, never require" — easy to get subtly wrong in a
 * way that quietly narrows every roll to the handful of entries somebody tagged.
 */

import { describe, expect, it } from 'vitest';

import { buildTableSet } from '../domain/tables';
import { parseTableFile } from '../domain/tables-parse';
import {
  coherentPool,
  contextTags,
  rerollField,
  rerollUnlocked,
  rollDraft,
  setFieldLocked,
  setFieldValues,
  type GeneratorSpec,
} from './draft';

describe('coherentPool', () => {
  const pool = [
    { id: 'urban', tags: ['urban'] },
    { id: 'arctic', tags: ['arctic'] },
    { id: 'plain' },
    { id: 'both', tags: ['urban', 'arctic'] },
  ];

  it('returns the whole pool when nothing has been drawn yet', () => {
    expect(coherentPool(pool, new Set())).toBe(pool);
  });

  it('keeps untagged entries always — tags exclude, they do not require', () => {
    const kept = coherentPool(pool, new Set(['urban'])).map((e) => e.id);
    expect(kept).toContain('plain');
  });

  it('drops a tagged entry that shares nothing with the context', () => {
    const kept = coherentPool(pool, new Set(['urban'])).map((e) => e.id);
    expect(kept).not.toContain('arctic');
    expect(kept).toEqual(['urban', 'plain', 'both']);
  });

  it('keeps an entry that matches any one of several context tags', () => {
    const kept = coherentPool(pool, new Set(['arctic', 'something-else'])).map((e) => e.id);
    expect(kept).toEqual(['arctic', 'plain', 'both']);
  });

  it('falls back to the whole pool rather than leaving a field blank', () => {
    const onlyTagged = [{ id: 'a', tags: ['x'] }, { id: 'b', tags: ['y'] }];
    expect(coherentPool(onlyTagged, new Set(['z']))).toBe(onlyTagged);
  });

  it('is unaffected by a pool with no tags in it at all', () => {
    const untagged: readonly { readonly id: string; readonly tags?: readonly string[] }[] = [
      { id: 'a' },
      { id: 'b' },
    ];
    expect(coherentPool(untagged, new Set(['anything']))).toEqual(untagged);
  });
});

describe('contextTags', () => {
  const fields = [
    { key: 'a', label: '', tableId: 't', values: [], locked: false, nonce: 0, tags: ['x', 'y'] },
    { key: 'b', label: '', tableId: 't', values: [], locked: false, nonce: 0, tags: ['y', 'z'] },
  ];

  it('unions every field’s tags', () => {
    expect([...contextTags(fields)].sort()).toEqual(['x', 'y', 'z']);
  });

  it('leaves out the field being re-rolled', () => {
    expect([...contextTags(fields, 'a')].sort()).toEqual(['y', 'z']);
  });
});

describe('coherence through a real roll', () => {
  const TABLES = {
    'test.grade': [{ id: 'g', value: 'grade-2' }],
    'test.place': [
      { id: 'subway', value: 'A Tokyo subway', tags: ['urban'] },
      { id: 'tundra', value: 'Open tundra', tags: ['arctic'] },
    ],
    'test.weather': [
      { id: 'smog', value: 'Smog', tags: ['urban'] },
      { id: 'blizzard', value: 'A blizzard', tags: ['arctic'] },
      { id: 'drizzle', value: 'Drizzle' },
    ],
    'test.name': [
      { id: 'one', value: 'Alpha', tags: ['arctic'] },
      { id: 'two', value: 'Beta', tags: ['urban'] },
    ],
  };

  const spec: GeneratorSpec = {
    kind: 'mission',
    label: 'Test',
    blurb: '',
    gradeTable: 'test.grade',
    fields: [
      { key: 'place', label: 'Place', tableId: 'test.place' },
      { key: 'weather', label: 'Weather', tableId: 'test.weather' },
      { key: 'name', label: 'Name', tableId: 'test.name', coherent: false },
    ],
  };

  function tables() {
    const parsed = parseTableFile(TABLES, 'canon');
    return buildTableSet([parsed.file]);
  }

  const set = tables();

  function rollMany(count: number) {
    return Array.from({ length: count }, (_, i) => rollDraft(spec, set, `seed-${i}`));
  }

  it('never pairs an arctic entry with an urban one', () => {
    for (const draft of rollMany(40)) {
      const place = draft.fields.find((f) => f.key === 'place')?.values[0];
      const weather = draft.fields.find((f) => f.key === 'weather')?.values[0];

      if (place === 'A Tokyo subway') expect(weather).not.toBe('A blizzard');
      if (place === 'Open tundra') expect(weather).not.toBe('Smog');
    }
  });

  it('still reaches both sides of the untagged middle', () => {
    const weathers = new Set(
      rollMany(40).map((d) => d.fields.find((f) => f.key === 'weather')?.values[0]),
    );
    expect(weathers.has('Drizzle')).toBe(true);
    expect(weathers.size).toBeGreaterThan(1);
  });

  it('ignores coherence for a field that opted out', () => {
    // `name` is coherent: false, so both values appear regardless of the place drawn.
    const names = new Set(
      rollMany(40).map((d) => d.fields.find((f) => f.key === 'name')?.values[0]),
    );
    expect(names).toEqual(new Set(['Alpha', 'Beta']));
  });

  it('keeps a field that opted out from steering the others', () => {
    for (const draft of rollMany(20)) {
      expect(draft.fields.find((f) => f.key === 'name')?.tags).toEqual([]);
    }
  });

  it('stays deterministic — same seed, same draft', () => {
    expect(rollDraft(spec, set, 'fixed')).toEqual(rollDraft(spec, set, 'fixed'));
  });

  it('agrees with a full re-roll when nothing is locked', () => {
    const first = rollDraft(spec, set, 'fixed');
    const second = rollDraft(spec, set, 'fixed');
    // Field values must match; only the nonces differ after a re-roll, so compare values.
    expect(second.fields.map((f) => f.values)).toEqual(first.fields.map((f) => f.values));
  });

  it('re-rolls one field to fit what the rest of the draft already says', () => {
    for (let i = 0; i < 20; i += 1) {
      let draft = rollDraft(spec, set, `reroll-${i}`);
      draft = setFieldLocked(draft, 'place', true);
      draft = rerollField(draft, spec, set, 'weather');

      const place = draft.fields.find((f) => f.key === 'place')?.values[0];
      const weather = draft.fields.find((f) => f.key === 'weather')?.values[0];

      if (place === 'A Tokyo subway') expect(weather).not.toBe('A blizzard');
      if (place === 'Open tundra') expect(weather).not.toBe('Smog');
    }
  });

  it('respects a locked field when re-rolling everything else', () => {
    for (let i = 0; i < 20; i += 1) {
      let draft = rollDraft(spec, set, `locked-${i}`);
      draft = setFieldLocked(draft, 'place', true);
      const place = draft.fields.find((f) => f.key === 'place')?.values[0];

      draft = rerollUnlocked(draft, spec, set);

      expect(draft.fields.find((f) => f.key === 'place')?.values[0]).toBe(place);
      const weather = draft.fields.find((f) => f.key === 'weather')?.values[0];
      if (place === 'A Tokyo subway') expect(weather).not.toBe('A blizzard');
    }
  });

  it('drops a hand-edited field’s tags, so a replaced value stops steering the roll', () => {
    const rolled = rollDraft(spec, set, 'edited');
    const placeTags = rolled.fields.find((f) => f.key === 'place')?.tags ?? [];
    expect(placeTags.length).toBeGreaterThan(0);

    const edited = setFieldValues(rolled, 'place', ['Somewhere else']);
    expect(edited.fields.find((f) => f.key === 'place')?.tags).toEqual([]);

    // Measured with the other tagged field excluded, so this is about `place` and not `weather`.
    expect([...contextTags(edited.fields, 'weather')]).toEqual([]);
  });
});
