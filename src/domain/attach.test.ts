import { describe, expect, it } from 'vitest';

import { attachTechnique, hasInnateTechnique, techniqueToInnate } from './attach';
import { createCharacter } from './character';
import { parseEntity } from './entities-parse';
import type { Technique } from './entities';

function technique(overrides: Partial<Technique> = {}): Technique {
  const parsed = parseEntity(
    {
      kind: 'technique',
      id: 't1',
      name: 'Hollow Pace',
      grade: 'grade-1',
      principle: 'She borrows distance from a stride she has not taken yet.',
      application: 'She arrives before the step lands and pays the gap back in exhaustion.',
      extensions: ['Borrowed Step', 'Arrears'],
      maximum: 'Debt Called In',
      domain: 'The Long Hallway With No Doors',
      cost: 'Moderate per use',
      limitation: 'Cannot borrow from a stride she is unable to take',
      tell: 'Her trailing foot scuffs a beat late',
    },
    'fallback',
  );
  if (!parsed || parsed.kind !== 'technique') throw new Error('fixture did not parse');
  return { ...parsed, ...overrides };
}

const blank = createCharacter({
  id: 'c1',
  kind: 'pc',
  name: 'Walker Masami',
  grade: 'grade-1',
  now: '2026-10-29T12:00:00.000Z',
});

describe('mapping a technique onto a character', () => {
  it('carries the five fields that have a home', () => {
    const innate = techniqueToInnate(technique());
    expect(innate.name).toBe('Hollow Pace');
    expect(innate.extensions).toEqual(['Borrowed Step', 'Arrears']);
    expect(innate.maximum).toBe('Debt Called In');
    expect(innate.domainExpansion).toBe('The Long Hallway With No Doors');
  });

  it('builds the description from principle then application', () => {
    const { description } = techniqueToInnate(technique());
    expect(description.startsWith('She borrows distance')).toBe(true);
    expect(description).toContain('\n\nShe arrives before the step lands');
  });

  it('keeps the homeless fields as a labelled tail rather than dropping them', () => {
    const { description } = techniqueToInnate(technique());
    expect(description).toContain('Cost: Moderate per use');
    expect(description).toContain('Limitation: Cannot borrow');
    expect(description).toContain('Tell: Her trailing foot');
  });

  it('names the shikigami household when there is one', () => {
    const { description } = techniqueToInnate(
      technique({
        shikigami: [
          {
            id: 's1',
            grade: 'grade-3',
            name: 'Kettle',
            form: 'A hound',
            role: '',
            abilities: [],
            summoning: '',
            cost: '',
            temperament: '',
            binding: '',
            weakness: '',
            stats: null,
            addendum: '',
          },
        ],
      }),
    );
    expect(description).toContain('Shikigami: Kettle — A hound');
  });

  it('leaves no stray blank lines when a technique has no extras', () => {
    const { description } = techniqueToInnate(
      technique({ cost: '', limitation: '', tell: '', shikigami: [] }),
    );
    expect(description).not.toMatch(/\n\n\n/);
    expect(description.endsWith('exhaustion.')).toBe(true);
  });
});

describe('attaching', () => {
  it('replaces the technique and stamps the clock the caller passed', () => {
    const next = attachTechnique(blank, technique(), '2026-10-30T09:00:00.000Z');
    expect(next.innateTechnique.name).toBe('Hollow Pace');
    expect(next.updatedAt).toBe('2026-10-30T09:00:00.000Z');
  });

  it('does not touch the stat block, the grade or anything else', () => {
    const next = attachTechnique(blank, technique(), '2026-10-30T09:00:00.000Z');
    expect(next.stats).toEqual(blank.stats);
    expect(next.grade).toBe(blank.grade);
    expect(next.traits).toEqual(blank.traits);
    expect(next.id).toBe(blank.id);
  });

  it('spots a character who already has one, so the UI can warn before overwriting', () => {
    expect(hasInnateTechnique(blank)).toBe(false);
    expect(hasInnateTechnique(attachTechnique(blank, technique(), 'now'))).toBe(true);
    expect(
      hasInnateTechnique({
        ...blank,
        innateTechnique: { ...blank.innateTechnique, domainExpansion: 'Something' },
      }),
    ).toBe(true);
  });

  it('treats whitespace as empty rather than as a technique worth protecting', () => {
    expect(
      hasInnateTechnique({
        ...blank,
        innateTechnique: { ...blank.innateTechnique, name: '   ' },
      }),
    ).toBe(false);
  });
});
