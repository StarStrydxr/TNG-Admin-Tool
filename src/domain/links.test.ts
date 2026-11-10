import { describe, expect, it } from 'vitest';

import {
  LINK_KINDS,
  LINK_KIND_LABELS,
  addLink,
  backlinksTo,
  buildLinkIndex,
  isLinkKind,
  linkTo,
  removeLink,
  resolveLink,
  resolveLinks,
  targetOf,
  updateLinkNote,
} from './links';
import { createCharacter } from './character';
import { parseEntity } from './entities-parse';
import type { SavedEntity } from './entities';

function entity(raw: Record<string, unknown>): SavedEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error('fixture did not parse');
  return parsed;
}

const mission = entity({ kind: 'mission', id: 'm1', name: 'Exorcism at the depot' });
const tool = entity({ kind: 'cursed-tool', id: 'k1', name: 'Split-ash tanto' });
const masami = createCharacter({
  id: 'c1',
  kind: 'pc',
  name: 'Walker Masami',
  grade: 'grade-1',
  now: '2026-10-29T12:00:00.000Z',
});

describe('link kinds', () => {
  it('covers every collection, entities and characters alike', () => {
    expect(LINK_KINDS).toContain('mission');
    expect(LINK_KINDS).toContain('pc');
    expect(LINK_KINDS).toContain('npc');
    for (const kind of LINK_KINDS) expect(LINK_KIND_LABELS[kind]).toBeTruthy();
  });

  it('validates a kind read off disk', () => {
    expect(isLinkKind('mission')).toBe(true);
    expect(isLinkKind('spaceship')).toBe(false);
  });
});

describe('making a link', () => {
  it('names an entity by its display name', () => {
    expect(targetOf(mission)).toEqual({
      id: 'm1',
      kind: 'mission',
      name: 'Exorcism at the depot',
    });
  });

  it('names a character by theirs', () => {
    expect(targetOf(masami).name).toBe('Walker Masami');
  });

  it('carries a note and a snapshot of the name', () => {
    const link = linkTo(tool, 'she took this on the job');
    expect(link).toEqual({
      id: 'k1',
      kind: 'cursed-tool',
      label: 'Split-ash tanto',
      note: 'she took this on the job',
    });
  });
});

describe('resolving', () => {
  const index = buildLinkIndex([mission, tool, masami]);

  it('prefers the live name, so renaming a record updates its links', () => {
    const stale = { ...linkTo(tool), label: 'Old name' };
    const resolved = resolveLink(stale, index);
    expect(resolved.name).toBe('Split-ash tanto');
    expect(resolved.found).toBe(true);
  });

  it('falls back to the stored name when the target is gone', () => {
    const resolved = resolveLink(linkTo(tool), buildLinkIndex([mission]));
    expect(resolved.found).toBe(false);
    expect(resolved.name).toBe('Split-ash tanto');
  });

  it('still says something when the target is gone and had no name', () => {
    const resolved = resolveLink(
      { id: 'gone', kind: 'mission', label: '', note: '' },
      buildLinkIndex([]),
    );
    expect(resolved.name).toBe('Unnamed record');
  });

  it('resolves a whole list in order', () => {
    const resolved = resolveLinks([linkTo(tool), linkTo(masami)], index);
    expect(resolved.map((r) => r.name)).toEqual(['Split-ash tanto', 'Walker Masami']);
  });
});

describe('editing a list of links', () => {
  it('adds one', () => {
    expect(addLink([], linkTo(tool), 'm1')).toHaveLength(1);
  });

  it('refuses to link a record to itself', () => {
    const links = addLink([], linkTo(mission), 'm1');
    expect(links).toEqual([]);
  });

  it('refuses a duplicate rather than listing the same target twice', () => {
    const once = addLink([], linkTo(tool), 'm1');
    expect(addLink(once, linkTo(tool, 'different note'), 'm1')).toBe(once);
  });

  it('removes by id', () => {
    const links = addLink([], linkTo(tool), 'm1');
    expect(removeLink(links, 'k1')).toEqual([]);
    expect(removeLink(links, 'nope')).toEqual(links);
  });

  it('edits a note without touching the others', () => {
    const links = addLink(addLink([], linkTo(tool), 'm1'), linkTo(masami), 'm1');
    const updated = updateLinkNote(links, 'k1', 'recovered afterwards');

    expect(updated[0]?.note).toBe('recovered afterwards');
    expect(updated[1]?.note).toBe('');
  });
});

describe('backlinks', () => {
  it('finds what points at a record, without that being stored anywhere', () => {
    const linked = { ...mission, links: [linkTo(tool)] };
    expect(backlinksTo('k1', [linked, tool]).map((e) => e.id)).toEqual(['m1']);
    expect(backlinksTo('m1', [linked, tool])).toEqual([]);
  });
});

describe('links on disk', () => {
  it('round-trips through the parser', () => {
    const saved = { ...mission, links: [linkTo(tool, 'the weapon used')] };
    const reparsed = parseEntity(JSON.parse(JSON.stringify(saved)), 'f');
    expect(reparsed?.links).toEqual(saved.links);
  });

  it('drops a malformed link rather than losing the record', () => {
    const parsed = parseEntity(
      {
        kind: 'mission',
        id: 'm2',
        name: 'Still fine',
        links: [
          { id: 'ok', kind: 'cursed-tool', label: 'A tool', note: '' },
          { id: '', kind: 'cursed-tool' },
          { id: 'bad-kind', kind: 'spaceship' },
          'not an object',
          { id: 'ok', kind: 'mission', label: 'duplicate id' },
        ],
      },
      'f',
    );

    expect(parsed?.name).toBe('Still fine');
    expect(parsed?.links.map((l) => l.id)).toEqual(['ok']);
  });

  it('defaults to none for a record written before links existed', () => {
    expect(parseEntity({ kind: 'mission', id: 'm3' }, 'f')?.links).toEqual([]);
  });
});
