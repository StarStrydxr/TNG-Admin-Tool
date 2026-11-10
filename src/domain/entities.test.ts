import { entityGrade } from './entities';
import { describe, expect, it } from 'vitest';

import {
  ROLES,
  assignableRoles,
  canSee,
  capabilitiesFor,
  compareRoles,
  isRole,
  roleRank,
  visibleTo,
  type Role,
} from './roles';
import { ENTITY_COLLECTIONS, ENTITY_KINDS, foldersIn, normaliseFolder } from './entities';
import { parseEntity } from './entities-parse';
import { buildTableSet, type TableEntry } from './tables';
import { rollDraft } from '../generators/draft';
import { entityFromDraft } from '../generators/to-entity';
import { MISSION_SPEC, SHIKIGAMI_SPEC } from '../generators/specs';

const META = { id: 'e1', now: '2026-10-29T12:00:00.000Z' };

describe('the role ladder', () => {
  it('runs player to owner', () => {
    expect([...ROLES]).toEqual(['player', 'mod', 'admin', 'senior-admin', 'owner']);
    expect(roleRank('player')).toBeLessThan(roleRank('owner'));
  });

  it('lets a viewer see their own tier and below, never above', () => {
    expect(canSee('admin', 'mod')).toBe(true);
    expect(canSee('admin', 'admin')).toBe(true);
    expect(canSee('admin', 'senior-admin')).toBe(false);
    expect(canSee('owner', 'owner')).toBe(true);
    expect(canSee('player', 'mod')).toBe(false);
  });

  it('sorts by rank', () => {
    expect(compareRoles('mod', 'owner')).toBeLessThan(0);
    expect(compareRoles('owner', 'mod')).toBeGreaterThan(0);
  });

  it('validates role strings', () => {
    expect(isRole('owner')).toBe(true);
    expect(isRole('superuser')).toBe(false);
  });

  it('gates capabilities by rank', () => {
    expect(capabilitiesFor('player').canCreate).toBe(false);
    expect(capabilitiesFor('mod').canCreate).toBe(true);
    expect(capabilitiesFor('mod').canDelete).toBe(false);
    expect(capabilitiesFor('admin').canDelete).toBe(true);
    expect(capabilitiesFor('senior-admin').canManageRoles).toBe(false);
    expect(capabilitiesFor('owner').canManageRoles).toBe(true);
  });

  it('stops anyone but the owner hiding a record from themselves', () => {
    expect(assignableRoles('admin')).toEqual(['player', 'mod', 'admin']);
    expect(assignableRoles('owner')).toEqual([...ROLES]);
  });

  it('filters a list to what a viewer may see', () => {
    const items = ROLES.map((minRole: Role) => ({ minRole }));
    expect(visibleTo(items, 'admin')).toHaveLength(3);
    expect(visibleTo(items, 'owner')).toHaveLength(5);
    expect(visibleTo(items, 'player')).toHaveLength(1);
  });
});

describe('folders', () => {
  it('normalises separators and strips empties', () => {
    expect(normaliseFolder('Arc 2\\Shibuya')).toBe('Arc 2/Shibuya');
    expect(normaliseFolder('/a//b/')).toBe('a/b');
    expect(normaliseFolder('   ')).toBe('');
  });

  it('removes traversal and drive segments', () => {
    expect(normaliseFolder('../../etc')).toBe('etc');
    expect(normaliseFolder('./a/./b')).toBe('a/b');
    expect(normaliseFolder('C:/Windows')).toBe('Windows');
  });

  it('lists every ancestor folder in a set', () => {
    const entities = [{ folder: 'Arc 2/Shibuya' }, { folder: 'Arc 2' }, { folder: '' }];
    expect(foldersIn(entities)).toEqual(['Arc 2', 'Arc 2/Shibuya']);
  });
});

describe('collections', () => {
  it('names a directory for every kind', () => {
    for (const kind of ENTITY_KINDS) {
      expect(ENTITY_COLLECTIONS[kind]).toBeTruthy();
    }
  });
});

describe('draft to entity and back', () => {
  function entry(id: string, value: string): TableEntry {
    return { id, value, source: 'canon' };
  }

  const tables = buildTableSet([
    {
      'shared.grade.mission': [entry('g2', 'grade-2')],
      'mission.type': [entry('exorcism', 'Exorcism')],
      'mission.location': [entry('mall', 'A shopping centre')],
      'mission.client': [entry('assoc', 'The Association')],
      'mission.briefing': [entry('single', 'One curse')],
      'mission.true-situation': [entry('two', 'There are two')],
      'mission.complication': [entry('clock', 'A hard deadline'), entry('water', 'Flooded')],
      'mission.veil': [entry('standard', 'Standard veil')],
      'mission.support': [entry('none', 'None')],
      'mission.payout': [entry('standard', 'Standard rate')],
      'shared.grade.shikigami': [entry('g3', 'grade-3')],
      'shikigami.name': [entry('kettle', 'Kettle')],
      'shikigami.form': [entry('hound', 'A hound')],
      'shikigami.role': [entry('scout', 'Scout')],
      'shikigami.ability': [entry('burrow', 'Burrows')],
      'shikigami.summoning': [entry('sign', 'A hand sign')],
      'shikigami.cost': [entry('free', 'Free')],
      'shikigami.temperament': [entry('sullen', 'Sullen')],
      'shikigami.binding': [entry('gone', 'Gone permanently')],
      'shikigami.weakness': [entry('range', 'Range limited')],
    },
  ]);

  it('maps a mission draft onto the typed record', () => {
    const draft = rollDraft(MISSION_SPEC, tables, 'seed');
    const entity = entityFromDraft(draft, META);
    expect(entity?.kind).toBe('mission');
    expect(entity).toMatchObject({
      grade: 'grade-2',
      missionType: 'Exorcism',
      location: 'A shopping centre',
      trueSituation: 'There are two',
    });
  });

  it('records the seed so a saved record traces back to its roll', () => {
    const draft = rollDraft(MISSION_SPEC, tables, 'traceable');
    const entity = entityFromDraft(draft, META);
    expect(entity?.generated).toMatchObject({ seed: 'traceable', expandedByClaude: false });
  });

  it('defaults to the lowest visibility and the root folder', () => {
    const entity = entityFromDraft(rollDraft(MISSION_SPEC, tables, 's'), META);
    expect(entity?.minRole).toBe('player');
    expect(entity?.folder).toBe('');
  });

  it('carries folder and visibility through when given', () => {
    const entity = entityFromDraft(rollDraft(MISSION_SPEC, tables, 's'), {
      ...META,
      folder: '/Arc 2//Shibuya/',
      minRole: 'senior-admin',
    });
    expect(entity?.folder).toBe('Arc 2/Shibuya');
    expect(entity?.minRole).toBe('senior-admin');
  });

  it('survives a round trip through JSON', () => {
    const entity = entityFromDraft(rollDraft(MISSION_SPEC, tables, 'rt'), META);
    const reparsed = parseEntity(JSON.parse(JSON.stringify(entity)), 'fallback');
    expect(reparsed).toEqual(entity);
  });

  it('embeds a household in a technique rather than cross-referencing it', () => {
    const shikigami = rollDraft(SHIKIGAMI_SPEC, tables, 'child');
    const technique = entityFromDraft(
      { ...rollDraft(MISSION_SPEC, tables, 'parent'), kind: 'technique' },
      META,
      [shikigami],
    );
    expect(technique?.kind).toBe('technique');
    if (technique?.kind === 'technique') {
      expect(technique.shikigami).toHaveLength(1);
      expect(technique.shikigami[0]?.name).toBe('Kettle');
    }
  });

  it('returns null for a draft kind that is a character, not an entity', () => {
    const draft = { ...rollDraft(MISSION_SPEC, tables, 's'), kind: 'sorcerer' as const };
    expect(entityFromDraft(draft, META)).toBeNull();
  });
});

describe('parseEntity tolerates hand-edited files', () => {
  it('rejects an unrecognisable kind rather than guessing', () => {
    expect(parseEntity({ kind: 'spaceship' }, 'f')).toBeNull();
    expect(parseEntity(null, 'f')).toBeNull();
  });

  it('fills missing fields and keeps what is there', () => {
    const parsed = parseEntity({ kind: 'mission', location: 'A rooftop' }, 'fallback-id');
    expect(parsed?.id).toBe('fallback-id');
    expect(parsed?.minRole).toBe('player');
    expect(parsed).toMatchObject({ location: 'A rooftop', grade: 'grade-4' });
  });

  /** The posting fields arrived after missions were already on disk; nothing was migrated. */
  it('opens a mission saved before the posting fields existed', () => {
    const parsed = parseEntity(
      { kind: 'mission', id: 'm-old', name: 'Old posting', grade: 'grade-2', location: 'A rooftop' },
      'f',
    );

    expect(parsed).toMatchObject({
      name: 'Old posting',
      location: 'A rooftop',
      recommendedGrade: '',
      difficulty: '',
      slots: '',
      hosts: [],
      objectives: [],
      rewards: [],
    });
  });

  it('falls back on an unknown role or grade', () => {
    const parsed = parseEntity(
      { kind: 'cursed-tool', minRole: 'god-emperor', grade: 'grade-99' },
      'f',
    );
    expect(parsed?.minRole).toBe('player');
    expect(parsed && entityGrade(parsed)).toBe('grade-4');
  });
});
