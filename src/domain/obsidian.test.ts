import { entityGrade } from './entities';
import { describe, expect, it } from 'vitest';

import {
  VAULT_MARKER,
  noteIdentity,
  noteName,
  parseNote,
  sectionList,
  toNote,
  yamlScalar,
} from './obsidian';
import { mergeNote } from './obsidian-merge';
import { parseEntity } from './entities-parse';
import { createCharacter } from './character';
import { linkTo } from './links';
import { ENTITY_KINDS, type SavedEntity } from './entities';

function entity(raw: Record<string, unknown>): SavedEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error('fixture did not parse');
  return parsed;
}

const mission = entity({
  kind: 'mission',
  id: 'm1',
  name: 'Exorcism at the depot',
  grade: 'grade-2',
  missionType: 'Exorcism',
  location: 'A parcel depot in Nakano',
  client: 'A shift supervisor',
  briefing: 'One curse, grade three at worst.',
  trueSituation: 'There are two, and one is thinking.',
  complications: ['Standing water', 'A hard deadline'],
  folder: 'Arc 2/Shibuya',
  minRole: 'admin',
  notes: 'Ran this on the 12th.',
  generated: { seed: 'ash-gantry-nine', tableVersion: '1', variantId: null, expandedByClaude: false },
});

describe('yamlScalar', () => {
  it('leaves an ordinary value bare', () => {
    expect(yamlScalar('Exorcism')).toBe('Exorcism');
  });

  it('quotes what YAML would otherwise read as something else', () => {
    expect(yamlScalar('true')).toBe("'true'");
    expect(yamlScalar('12')).toBe("'12'");
    expect(yamlScalar('- leading dash')).toBe("'- leading dash'");
    expect(yamlScalar('key: value')).toBe("'key: value'");
    expect(yamlScalar('')).toBe("''");
  });

  it('leaves a mid-string apostrophe bare, which YAML allows', () => {
    expect(yamlScalar("someone's")).toBe("someone's");
  });

  it('doubles the apostrophe when the value has to be quoted anyway', () => {
    expect(yamlScalar("- someone's")).toBe("'- someone''s'");
  });

  it('folds a newline rather than emitting a broken scalar', () => {
    expect(yamlScalar('two\nlines')).toBe('two lines');
  });
});

describe('noteName', () => {
  it('uses the record’s display name', () => {
    expect(noteName(mission)).toBe('Exorcism at the depot');
  });

  it('strips what Windows and wikilinks cannot carry', () => {
    const awkward = entity({ kind: 'mission', id: 'x', name: 'A/B: [c] #d | e?' });
    expect(noteName(awkward)).not.toMatch(/[\\/:*?"<>|[\]#^]/);
  });

  it('never returns an empty name', () => {
    expect(noteName(entity({ kind: 'mission', id: 'x', name: '   ' }))).toBeTruthy();
  });
});

describe('writing a note', () => {
  const text = toNote(mission);

  it('opens with frontmatter carrying identity and filing', () => {
    expect(text.startsWith('---\n')).toBe(true);
    expect(text).toContain(`${VAULT_MARKER}: true`);
    expect(text).toContain('id: m1');
    expect(text).toContain('kind: mission');
    expect(text).toContain('folder: Arc 2/Shibuya');
    expect(text).toContain('visible_to: admin');
    expect(text).toContain('seed: ash-gantry-nine');
  });

  it('tags the note so the vault groups by kind', () => {
    expect(text).toContain('- jjk/mission');
  });

  it('writes one heading per field, with the display label', () => {
    expect(text).toContain('## Briefing says');
    expect(text).toContain('## Actually');
    expect(text).toContain('## Complications');
  });

  it('writes a multi-value field as a list and a single one as prose', () => {
    expect(text).toContain('- Standing water');
    expect(text).toContain('A parcel depot in Nakano');
    expect(text).not.toContain('- A parcel depot in Nakano');
  });

  it('writes links as wikilinks in frontmatter, using live names where known', () => {
    const tool = entity({ kind: 'cursed-tool', id: 'k1', name: 'Split-ash tanto' });
    const linked = { ...mission, links: [linkTo(tool)] };

    // Quoted on purpose: a bare [[...]] in YAML parses as a nested flow sequence, so the
    // quotes are what make this valid frontmatter. Obsidian reads the quoted form as a link.
    expect(toNote(linked)).toContain("- '[[Split-ash tanto]]'");
    expect(
      toNote(linked, { linkNames: new Map([['k1', 'Renamed since']]) }),
    ).toContain("- '[[Renamed since]]'");
  });

  it('does not repeat links in the body, which would make import ambiguous', () => {
    const tool = entity({ kind: 'cursed-tool', id: 'k1', name: 'Split-ash tanto' });
    expect(toNote({ ...mission, links: [linkTo(tool)] })).not.toContain('## Linked');
  });

  it('ends with exactly one newline and no triple blank lines', () => {
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text).not.toMatch(/\n{3}/);
  });

  it('writes a note for every entity kind without throwing', () => {
    for (const kind of ENTITY_KINDS) {
      const note = toNote(entity({ kind, id: `x-${kind}`, name: `A ${kind}` }));
      expect(note, kind).toContain(`kind: ${kind}`);
    }
  });

  it('writes a character too, with its own headings', () => {
    const character = createCharacter({
      id: 'c1',
      kind: 'pc',
      name: 'Walker Masami',
      grade: 'grade-1',
      now: '2026-11-09T00:00:00.000Z',
    });
    const note = toNote({ ...character, background: 'Registered late.' });

    expect(note).toContain('kind: pc');
    expect(note).toContain('## Background');
    // Characters have no folder or rank of their own.
    expect(note).not.toContain('visible_to:');
  });
});

describe('parsing a note', () => {
  it('reads frontmatter, the title and the sections back', () => {
    const parsed = parseNote(toNote(mission));

    expect(parsed.frontmatter['id']).toBe('m1');
    expect(parsed.title).toBe('Exorcism at the depot');
    expect(parsed.sections.get('Location')).toBe('A parcel depot in Nakano');
    expect(sectionList(parsed.sections.get('Complications'))).toEqual([
      'Standing water',
      'A hard deadline',
    ]);
  });

  it('reads a frontmatter list', () => {
    expect(parseNote(toNote(mission)).frontmatter['tags']).toEqual(['jjk/mission']);
  });

  it('survives a note with no frontmatter at all', () => {
    const parsed = parseNote('# Just a note\n\n## Thoughts\n\nSome text.\n');
    expect(parsed.title).toBe('Just a note');
    expect(parsed.sections.get('Thoughts')).toBe('Some text.');
    expect(noteIdentity(parsed)).toBeNull();
  });

  it('survives an unterminated frontmatter block', () => {
    expect(() => parseNote('---\nid: x\n\n# Title\n')).not.toThrow();
  });

  it('handles Windows line endings', () => {
    const parsed = parseNote('---\r\nid: m1\r\n---\r\n\r\n# T\r\n\r\n## A\r\n\r\nb\r\n');
    expect(parsed.frontmatter['id']).toBe('m1');
    expect(parsed.sections.get('A')).toBe('b');
  });

  it('identifies our own notes and ignores other people’s', () => {
    const ours = noteIdentity(parseNote(toNote(mission)));
    expect(ours?.id).toBe('m1');
    expect(ours?.folder).toBe('Arc 2/Shibuya');
    expect(ours?.minRole).toBe('admin');

    expect(noteIdentity(parseNote('# My own note\n\nNothing to do with the app.\n'))).toBeNull();
  });
});

describe('the round trip', () => {
  it('reports no change when nothing was edited', () => {
    const { changed } = mergeNote(mission, parseNote(toNote(mission)));
    expect(changed).toEqual([]);
  });

  it('brings an edited prose field back', () => {
    const edited = toNote(mission).replace(
      'There are two, and one is thinking.',
      'There are three, and all of them are hungry.',
    );
    const { entity: next, changed } = mergeNote(mission, parseNote(edited));

    expect(changed).toEqual(['trueSituation']);
    expect(next.kind === 'mission' && next.trueSituation).toBe(
      'There are three, and all of them are hungry.',
    );
  });

  it('brings an edited list back as a list', () => {
    const edited = toNote(mission).replace(
      '- Standing water\n- A hard deadline',
      '- Standing water\n- A hard deadline\n- A journalist outside',
    );
    const { entity: next } = mergeNote(mission, parseNote(edited));

    expect(next.kind === 'mission' && next.complications).toEqual([
      'Standing water',
      'A hard deadline',
      'A journalist outside',
    ]);
  });

  it('follows a note moved to another folder', () => {
    const edited = toNote(mission).replace('folder: Arc 2/Shibuya', 'folder: Arc 3');
    const { entity: next, changed } = mergeNote(mission, parseNote(edited));

    expect(changed).toContain('folder');
    expect(next.folder).toBe('Arc 3');
  });

  it('leaves a field alone when its heading was deleted', () => {
    const stripped = toNote(mission).replace(/## Location\n\n.*\n/, '');
    const { entity: next, changed } = mergeNote(mission, parseNote(stripped));

    expect(changed).not.toContain('location');
    expect(next.kind === 'mission' && next.location).toBe('A parcel depot in Nakano');
  });

  it('never changes the id, kind or grade from a note', () => {
    const tampered = toNote(mission)
      .replace('id: m1', 'id: something-else')
      .replace('grade: grade-2', 'grade: special-grade');
    const { entity: next } = mergeNote(mission, parseNote(tampered));

    expect(next.id).toBe('m1');
    expect(next.kind).toBe('mission');
    expect(entityGrade(next)).toBe('grade-2');
  });

  it('round-trips every entity kind with no spurious changes', () => {
    for (const kind of ENTITY_KINDS) {
      const record = entity({ kind, id: `r-${kind}`, name: `A ${kind}`, notes: 'Some notes.' });
      const { changed } = mergeNote(record, parseNote(toNote(record)));
      expect(changed, kind).toEqual([]);
    }
  });
});
