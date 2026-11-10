/**
 * The shipped templates, rendered against real records.
 *
 * This is the test that catches a template typo, because a template is a file nothing else
 * typechecks. It renders each bundled default and asserts the obvious failure modes: a tag
 * left in the output, a heading for a section with nothing under it, a missing title.
 */

import { describe, expect, it } from 'vitest';

import { loadTemplates, renderRecord, templateFor, templateNameFor } from './exports';
import { createCharacter } from '../domain/character';
import { parseEntity } from '../domain/entities-parse';
import type { SavedEntity } from '../domain/entities';

function entity(raw: Record<string, unknown>): SavedEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error(`fixture did not parse: ${String(raw['kind'])}`);
  return parsed;
}

const RECORDS: readonly (SavedEntity | ReturnType<typeof createCharacter>)[] = [
  entity({
    kind: 'mission',
    id: 'm1',
    name: 'Exorcism at the depot',
    grade: 'grade-2',
    missionType: 'Extermination',
    recommendedGrade: 'Grade 2 and Below',
    faction: 'Sorcerers',
    hosts: ['@starstrydxr', '@izumidagoat'],
    location: 'A parcel depot in Nakano',
    client: 'A shift supervisor',
    briefing: 'One curse, grade three at worst.',
    trueSituation: 'There are two, and one is thinking.',
    objectives: ['Exorcise every cursed spirit on site', 'Get the civilians out first'],
    complications: ['A hard deadline', 'Standing water'],
    rewards: ['30 CR'],
    objectiveRewards: ['270 CR', '12 TP'],
    mvpRewards: ['1 Diamond chest', '6 TP'],
    hostRewards: ['Primary host (×3): 90 CR', 'Secondary host (×2): 60 CR', 'Chests are not multiplied.'],
    difficulty: 'Hard',
    slots: '0/4',
    veil: 'Standard',
    support: 'One first-year',
    payout: 'Standard rate',
    folder: 'Arc 2',
    minRole: 'admin',
    notes: 'Ran this on the 12th.',
    generated: { seed: 'abc', tableVersion: '1', variantId: null, expandedByClaude: false },
  }),
  entity({
    kind: 'technique',
    id: 't1',
    name: 'Hollow Pace',
    grade: 'grade-1',
    techniqueTypeLabel: 'Spatial',
    principle: 'She borrows distance from a stride not yet taken.',
    application: 'She arrives before the step lands.',
    extensions: ['Borrowed Step', 'Arrears'],
    maximum: 'Debt Called In',
    domain: 'The Long Hallway With No Doors',
    cost: 'Moderate',
    limitation: 'Cannot borrow a stride she could not take',
    tell: 'A scuffed trailing foot',
  }),
  entity({
    kind: 'shikigami',
    id: 's1',
    name: 'Kettle',
    grade: 'grade-3',
    form: 'A hound of boiled copper',
    role: 'Scout',
    abilities: ['Burrows', 'Tracks by heat'],
    summoning: 'A single hand sign',
    cost: 'Low upkeep',
    temperament: 'Sullen',
    binding: 'Gone permanently',
    weakness: 'Limited range',
  }),
  entity({
    kind: 'curse',
    id: 'cu1',
    name: 'An amalgam — being watched',
    grade: 'grade-2',
    registration: 'unregistered',
    originFear: 'Being watched through a window you cannot see into',
    form: 'An amalgam of fused bodies',
    intelligence: 'semi-sentient',
    habitat: 'Stairwells, and only between floors',
    behaviour: 'Territorial',
    abilities: ['Removes sound within its reach', 'Opens what is locked'],
    weakness: 'Cannot leave one room, and knows it',
  }),
  entity({
    kind: 'cursed-object',
    id: 'o1',
    name: 'The sealed finger',
    grade: 'special-grade',
    state: 'sealed',
    appearance: 'A blackened finger wrapped in sutra paper',
    origin: 'Left behind by something that is not finished',
    seal: 'Paper and salt',
    effect: 'It looks for a mouth',
    containment: 'A warded box, never alone',
    incident: 'A courier opened the box in 1998',
  }),
  entity({
    kind: 'cursed-tool',
    id: 'k1',
    name: 'Split-ash tanto',
    grade: 'grade-3',
    form: 'blade',
    appearance: 'A short blade with a grey, fibrous grain',
    properties: ['Cuts cursed energy cleanly', 'Will not hold an edge against bone'],
    drawback: 'It drinks from whoever draws it',
    ceRequirement: 'Any sorcerer can wield it',
    provenance: 'Taken from a Kyoto storehouse',
  }),
  // Lore is the one kind with no grade, so it also pins that a template renders without one.
  entity({
    kind: 'lore',
    id: 'l1',
    name: 'The Shibuya veil',
    loreType: 'Event',
    status: 'Contested',
    era: 'October 2018',
    location: 'Shibuya, Tokyo',
    summary: 'The night the veil came down over the station and did not come back up cleanly.',
    body: 'Accounts disagree about who raised it. The Association has never published one.',
  }),
  // A clan is the other ungraded kind, and the only one whose fields are objects rather than
  // strings — so this also pins that the flattened lines reach the template at all.
  entity({
    kind: 'clan',
    id: 'cl1',
    name: 'Masami',
    motto: 'Honour, Faith, Endurance.',
    innateTechnique: 'Through Faith’s Command',
    seat: 'Osaka, Japan',
    era: 'Founded pre-Heian',
    status: 'Unrecognised',
    summary: 'A clan of faith, clawing its way back to official status.',
    overview: 'Founded in Osaka after several families came together to practice their faith.',
    bonuses: ['+2 Classes Speed', '−2 Classes Strength'],
    mutations: [
      { id: 'gods-chosen', name: 'God’s Chosen', effects: ['+1 Grade CE Efficiency'], tpCost: '8 TP' },
    ],
    hierarchy: [
      { id: 'head', title: 'Clan Head', tier: 0, status: 'vacant' },
      { id: 'a1', title: 'Archangel', tier: 1, holder: 'Hana Masami', status: 'held' },
    ],
    figures: [{ id: 'akira', name: 'Akira Masami', epithet: 'Goddess of the Masami', era: 'Heian era' }],
    treasury: {
      yen: '¥4,200,000',
      notes: 'Held in the Osaka compound.',
      assets: [{ id: 'blade', name: 'Holy Sinner’s Blade', assetType: 'Cursed tool', heldBy: 'Walker Masami' }],
    },
  }),
  createCharacter({
    id: 'c1',
    kind: 'pc',
    name: 'Walker Masami',
    grade: 'grade-1',
    now: '2026-10-29T12:00:00.000Z',
  }),
];

describe('the shipped templates', () => {
  it('ships one for every record kind that can be exported', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      expect(templates[templateNameFor(record)], templateNameFor(record)).toBeTruthy();
    }
  });

  it('renders every one with no tag left behind', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      const name = templateNameFor(record);
      const out = renderRecord(record, templates[name] as string);
      expect(out, name).not.toContain('{{');
      expect(out, name).not.toContain('}}');
    }
  });

  it('starts each document with the record title', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      const out = renderRecord(record, templates[templateNameFor(record)] as string);
      expect(out.startsWith('# ')).toBe(true);
      expect(out.split('\n')[0]?.length).toBeGreaterThan(2);
    }
  });

  it('leaves no heading with nothing under it', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      const name = templateNameFor(record);
      const lines = renderRecord(record, templates[name] as string).split('\n');

      lines.forEach((line, index) => {
        if (!line.startsWith('## ')) return;
        const after = lines.slice(index + 1).find((candidate) => candidate.trim().length > 0);
        expect(after, `${name}: "${line}" has nothing under it`).toBeTruthy();
        expect(after?.startsWith('#'), `${name}: "${line}" is followed by another heading`).toBe(
          false,
        );
      });
    }
  });

  it('ends with exactly one trailing newline', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      const out = renderRecord(record, templates[templateNameFor(record)] as string);
      expect(out.endsWith('\n')).toBe(true);
      expect(out.endsWith('\n\n')).toBe(false);
    }
  });

  it('omits a section the record has nothing for', async () => {
    const { templates } = await loadTemplates();
    const bare = entity({ kind: 'cursed-tool', id: 'k2', name: 'A plain knife', grade: 'grade-4' });
    const out = renderRecord(bare, templates['cursed-tool'] as string);

    expect(out).toContain('# A plain knife');
    expect(out).not.toContain('## Properties');
    expect(out).not.toContain('Drawback');
  });

  it('writes a blank character sheet without pretending it is full', async () => {
    const { templates } = await loadTemplates();
    const blank = createCharacter({
      id: 'c2',
      kind: 'npc',
      name: 'Unnamed',
      grade: 'grade-4',
      now: '2026-10-29T12:00:00.000Z',
    });
    const out = renderRecord(blank, templates['character'] as string);

    expect(out).toContain('G4[C3]');
    expect(out).toContain('None recorded');
    expect(out).not.toContain('Maximum:');
  });
});

/**
 * The Discord posting templates.
 *
 * Only mission, technique and character have one, because those are the three formats the
 * server actually uses. Everything else is expected to fall back to the readable template
 * rather than write an empty file — that fallback is the behaviour being pinned here.
 */
describe('the Discord templates', () => {
  const DISCORD_KINDS = new Set(['mission', 'technique', 'character']);

  it('ships one for each format the server has', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      const base = templateNameFor(record);
      const name = templateNameFor(record, 'discord');
      if (DISCORD_KINDS.has(base)) expect(templates[name], name).toBeTruthy();
      else expect(templates[name], `${name} should not exist`).toBeUndefined();
    }
  });

  it('falls back to the readable template for a kind with no server format', async () => {
    const { templates } = await loadTemplates();
    const tool = RECORDS.find((record) => record.kind === 'cursed-tool');
    expect(templateFor(tool!, templates, 'discord')).toBe(templates['cursed-tool']);
  });

  it('renders with no tag left behind, and no trailing blank', async () => {
    const { templates } = await loadTemplates();
    for (const record of RECORDS) {
      const name = templateNameFor(record, 'discord');
      const out = renderRecord(record, templateFor(record, templates, 'discord'));
      expect(out, name).not.toContain('{{');
      expect(out, name).not.toContain('}}');
      expect(out.endsWith('\n'), name).toBe(true);
      expect(out.endsWith('\n\n'), name).toBe(false);
    }
  });

  it('writes the posting in the server’s own shape', async () => {
    const { templates } = await loadTemplates();
    const mission = RECORDS.find((record) => record.kind === 'mission');
    const out = renderRecord(mission!, templateFor(mission!, templates, 'discord'));

    expect(out).toContain('Hosts : @starstrydxr | @izumidagoat');
    expect(out).toContain('Mission Type: Extermination');
    expect(out).toContain('Recommended Grade: Grade 2 and Below');
    expect(out).toContain('Open To: Sorcerers');
    expect(out).toContain('𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲');
    expect(out).toContain('[ 𝖱𝖤𝖶𝖠𝖱𝖣𝖲 ]');
    expect(out).toContain('[ 𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤 𝖤𝖷𝖢𝖫𝖴𝖲𝖨𝖵𝖤 ]');
    expect(out).toContain('These rewards are only granted if all objectives are completed.');
    expect(out).toContain('[ 𝖬𝖵𝖯 𝖤𝖷𝖢𝖫𝖴𝖲𝖨𝖵𝖤 ]');
    expect(out).toContain('1 Diamond chest');
    expect(out).toContain('Mission Slots: [0/4]');
    // The host payout is staff-facing, so it travels spoilered like the other GM lines.
    expect(out).toContain('||Primary host (×3): 90 CR||');
    // The fenced briefing survives, and the GM-only lines are spoilered rather than plain.
    expect(out).toContain('```');
    expect(out).toContain('||**Actually:** There are two, and one is thinking.||');
  });

  it('falls back to the grade when a posting has no recommendation line', async () => {
    const { templates } = await loadTemplates();
    const bare = entity({ kind: 'mission', id: 'm2', name: 'Untitled', grade: 'special-grade' });
    const out = renderRecord(bare, templateFor(bare, templates, 'discord'));
    expect(out).toContain('Recommended Grade: Special Grade and Below');
  });

  it('writes a character under the server’s section headings', async () => {
    const { templates } = await loadTemplates();
    const character = RECORDS.find((record) => record.kind === 'pc');
    const out = renderRecord(character!, templateFor(character!, templates, 'discord'));

    for (const heading of ['«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»', '«𝐀𝐩𝐩𝐞𝐚𝐫𝐚𝐧𝐜𝐞»', '«𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥»', '«𝐒𝐭𝐚𝐭𝐬»']) {
      expect(out, heading).toContain(heading);
    }
    expect(out).toContain('CE Efficiency: G1[C3]');
    // "If not present, put N/A" — the template says so rather than leaving a blank line.
    expect(out).toContain('Potential: N/A');
  });
});
