import { describe, expect, it } from 'vitest';

import {
  bookletCover,
  buildSheet,
  characterSheet,
  entitySheet,
  isCharacter,
} from './sheet';
import { createCharacter } from './character';
import { parseEntity } from './entities-parse';
import type { Mission, SavedEntity } from './entities';
import type { Sheet } from './sheet';

function mission(overrides: Partial<Mission> = {}): Mission {
  const base = parseEntity(
    {
      kind: 'mission',
      id: 'm1',
      name: 'Exorcism at the mall',
      grade: 'grade-2',
      missionType: 'Exorcism',
      location: 'A shopping centre, half demolished',
      client: 'The Association',
      briefing: 'One curse, grade three at worst.',
      trueSituation: 'Two curses, and one of them is thinking.',
      complications: ['A hard deadline', 'Standing water'],
      payout: 'Standard rate',
      folder: 'Arc 2/Shibuya',
      minRole: 'admin',
      notes: 'Ran this on the 12th.',
    },
    'fallback',
  );
  if (!base || base.kind !== 'mission') throw new Error('fixture did not parse as a mission');
  return { ...base, ...overrides };
}

function labels(sheet: Sheet): readonly string[] {
  return sheet.sections.flatMap((section) => section.fields.map((field) => field.label));
}

function sectionTitled(sheet: Sheet, title: string) {
  const found = sheet.sections.find((section) => section.title === title);
  if (!found) throw new Error(`no section titled ${title}`);
  return found;
}

describe('entity sheets', () => {
  it('titles the sheet with the record name and its kind', () => {
    const sheet = entitySheet(mission());
    expect(sheet.id).toBe('m1');
    expect(sheet.title).toBe('Exorcism at the mall');
    expect(sheet.subtitle).toBe('Mission');
  });

  it('reads its fields from describeEntity rather than a second layout', () => {
    const sheet = entitySheet(mission());
    expect(labels(sheet)).toContain('Briefing says');
    expect(labels(sheet)).toContain('Actually');
  });

  it('keeps a multi-value field as a list', () => {
    const field = sectionTitled(entitySheet(mission()), 'Details').fields.find(
      (f) => f.label === 'Complications',
    );
    expect(field?.values).toEqual(['A hard deadline', 'Standing water']);
  });

  it('prints folder, visibility and seed in the footer', () => {
    const sheet = entitySheet(
      mission({
        generated: {
          seed: 'abc123',
          tableVersion: '1',
          variantId: '',
          expandedByClaude: false,
        },
      }),
    );
    expect(sheet.footer).toContain('Arc 2/Shibuya');
    expect(sheet.footer).toContain('Admin');
    expect(sheet.footer).toContain('abc123');
  });

  it('says so plainly when a record sits at the collection root', () => {
    expect(entitySheet(mission({ folder: '' })).footer).toContain('collection root');
  });

  it('drops the notes section when there are none', () => {
    const titles = entitySheet(mission({ notes: '   ' })).sections.map((s) => s.title);
    expect(titles).not.toContain('Notes');
  });

  it('keeps notes when there are some', () => {
    expect(sectionTitled(entitySheet(mission()), 'Notes').fields[0]?.values).toEqual([
      'Ran this on the 12th.',
    ]);
  });
});

describe('character sheets', () => {
  const blank = createCharacter({
    id: 'c1',
    kind: 'pc',
    name: 'Walker Masami',
    grade: 'grade-1',
    now: '2026-10-29T12:00:00.000Z',
  });

  it('heads the sheet with the kind and grade in long form', () => {
    const sheet = characterSheet(blank);
    expect(sheet.title).toBe('Walker Masami');
    expect(sheet.subtitle).toBe('Player character · Grade 1');
  });

  it('prints all eight stats, the ungraded one included', () => {
    const stats = sectionTitled(characterSheet(blank), 'Stats');
    expect(stats.fields).toHaveLength(8);
    expect(stats.fields.map((f) => f.label)).toContain('CE Reserves');
  });

  it('writes stats in long form, not the dense notation', () => {
    const output = sectionTitled(characterSheet(blank), 'Stats').fields[0]?.values[0];
    expect(output).toBe('Grade 1 [Class 3]');
  });

  it('leaves out sections with nothing in them', () => {
    const titles = characterSheet(blank).sections.map((s) => s.title);
    expect(titles).toContain('Stats');
    expect(titles).not.toContain('Traits and defects');
    expect(titles).not.toContain('Cursed technique');
  });

  it('pairs a trait with its effect on one line', () => {
    const sheet = characterSheet({
      ...blank,
      traits: [{ id: 't1', name: 'Masami Bonus', effect: '+2 Cl Speed, −2 Cl Strength', notes: '' }],
    });
    expect(sectionTitled(sheet, 'Traits and defects').fields[0]?.values).toEqual([
      'Masami Bonus — +2 Cl Speed, −2 Cl Strength',
    ]);
  });

  it('reports slot usage in the footer', () => {
    expect(characterSheet(blank).footer).toContain('0/3 traits');
  });

  it('prints Reverse Cursed Technique only when the character has it', () => {
    expect(labels(characterSheet(blank))).not.toContain('Reverse Cursed Technique');

    const healer = characterSheet({ ...blank, reverseCursedTechnique: 'others' });
    expect(
      sectionTitled(healer, 'Cursed technique').fields.find(
        (f) => f.label === 'Reverse Cursed Technique',
      )?.values,
    ).toEqual(['Self and others']);
  });

  it('shows Black Flash only once it has happened', () => {
    const none = characterSheet(blank);
    expect(labels(none)).not.toContain('Black Flash');

    const struck = characterSheet({
      ...blank,
      blackFlashCount: 2,
      innateTechnique: { ...blank.innateTechnique, name: 'Ten Shadows' },
    });
    const technique = sectionTitled(struck, 'Cursed technique');
    expect(technique.fields.find((f) => f.label === 'Black Flash')?.values).toEqual(['2']);
  });
});

describe('buildSheet dispatches on the record', () => {
  const character = createCharacter({
    id: 'c2',
    kind: 'npc',
    name: 'A recurring sorcerer',
    grade: 'grade-3',
    now: '2026-10-29T12:00:00.000Z',
  });

  it('recognises a character by its kind', () => {
    expect(isCharacter(character)).toBe(true);
    expect(isCharacter(mission() as SavedEntity)).toBe(false);
  });

  it('builds the matching sheet for either', () => {
    expect(buildSheet(character).subtitle).toContain('Grade 3');
    expect(buildSheet(mission()).subtitle).toBe('Mission');
  });

  it('never emits an empty section or an empty field', () => {
    for (const sheet of [buildSheet(character), buildSheet(mission())]) {
      for (const section of sheet.sections) {
        expect(section.fields.length).toBeGreaterThan(0);
        for (const field of section.fields) {
          expect(field.values.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('the booklet cover', () => {
  const m1 = mission({ id: 'a', name: 'First mission' });
  const m2 = mission({ id: 'b', name: 'Second mission' });
  const character = createCharacter({
    id: 'c9',
    kind: 'npc',
    name: 'A sorcerer',
    grade: 'grade-3',
    now: '2026-11-08T12:00:00.000Z',
  });

  it('is not made for a single record — that sheet is its own cover', () => {
    expect(bookletCover([m1], 'Arc 2', '8 November 2026')).toBeNull();
    expect(bookletCover([], 'Arc 2', '8 November 2026')).toBeNull();
  });

  it('titles itself with the folder, and says so when there is none', () => {
    expect(bookletCover([m1, m2], 'Arc 2/Shibuya', 'today')?.title).toBe('Arc 2/Shibuya');
    expect(bookletCover([m1, m2], '', 'today')?.title).toBe('The vault');
  });

  it('counts each kind, pluralised, with the date', () => {
    const cover = bookletCover([m1, m2, character], 'Arc 2', '8 November 2026');
    expect(cover?.subtitle).toContain('2 missions');
    expect(cover?.subtitle).toContain('1 NPC');
    expect(cover?.subtitle).toContain('printed 8 November 2026');
  });

  it('lists the records in printing order', () => {
    expect(bookletCover([m2, m1], 'Arc 2', 'today')?.contents).toEqual([
      'Second mission',
      'First mission',
    ]);
  });
});
