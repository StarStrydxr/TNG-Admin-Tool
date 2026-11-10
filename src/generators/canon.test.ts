/**
 * Canon as it ships.
 *
 * The table files are data nothing typechecks, and a generator with a missing or sparse table
 * fails quietly — a blank field, or the same result twice in a row. This is the test that
 * notices. Run it after any `data:` change.
 */

import { describe, expect, it } from 'vitest';

import { buildTableSet } from '../domain/tables';
import { parseTableFile } from '../domain/tables-parse';
import { rollDraft, specTableIds } from './draft';
import { ALL_SPECS, TECHNIQUE_SPEC } from './specs';
import { missingTables, tableEntries } from '../domain/tables';
import { LISTED_GRADE_IDS } from '../domain/grades';

const MODULES = import.meta.glob('/data/canon/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

function canon() {
  const files = [];
  const issues = [];
  for (const path of Object.keys(MODULES).sort()) {
    const parsed = parseTableFile(MODULES[path], 'canon');
    files.push(parsed.file);
    issues.push(...parsed.issues);
  }
  return { set: buildTableSet(files), issues };
}

describe('canon as shipped', () => {
  const { set, issues } = canon();

  it('parses with no dropped entries', () => {
    expect(issues).toEqual([]);
  });

  it('fills every table each generator asks for', () => {
    for (const spec of ALL_SPECS) {
      expect(missingTables(set, specTableIds(spec)), spec.kind).toEqual([]);
    }
  });

  it('rolls every generator at every grade without a blank field', () => {
    for (const spec of ALL_SPECS) {
      for (const grade of LISTED_GRADE_IDS) {
        const draft = rollDraft(spec, set, `smoke-${spec.kind}-${grade}`, { grade });
        for (const field of draft.fields) {
          expect(field.values.every((v) => v.trim().length > 0), `${spec.kind}/${grade}/${field.key}`).toBe(true);
        }
      }
    }
  });

  it('gives every technique type its own tables rather than the shared fallback', () => {
    // The fallback exists so a new type still rolls (draft.ts), but a type that silently uses
    // it produces generic content under a specific label. That is the failure this catches.
    const types = tableEntries(set, 'technique.type').map((entry) => entry.id);
    expect(types.length).toBeGreaterThan(0);

    for (const type of types) {
      for (const field of ['name', 'principle', 'application', 'extension', 'maximum', 'domain']) {
        const id = `technique.${type}.${field}`;
        expect(tableEntries(set, id).length, id).toBeGreaterThan(0);
      }
    }
  });

  it('rolls a different technique for each type at the same seed', () => {
    const types = tableEntries(set, 'technique.type').map((entry) => entry.id);
    const principles = new Set(
      types.map((variantId) => {
        const draft = rollDraft(TECHNIQUE_SPEC, set, 'same-seed', {
          grade: 'grade-1',
          variantId,
        });
        return draft.fields.find((field) => field.key === 'principle')?.values[0];
      }),
    );

    // One shared pool would collapse these to a single value.
    expect(principles.size).toBe(types.length);
  });

  it('produces varied results across many seeds', () => {
    for (const spec of ALL_SPECS) {
      const names = new Set<string>();
      for (let i = 0; i < 60; i += 1) {
        const draft = rollDraft(spec, set, `variety-${i}`);
        names.add(draft.fields.map((f) => f.values.join('|')).join('//'));
      }
      expect(names.size, spec.kind).toBeGreaterThan(50);
    }
  });
});
