/**
 * What each generator rolls, and from which table.
 *
 * These are declarations only — the engine in `draft.ts` does the work. Adding a field to a
 * generator means adding a line here and a table in `data/canon/`.
 */

import type { GeneratorSpec } from './draft';

export const SORCERER_SPEC: GeneratorSpec = {
  kind: 'sorcerer',
  label: 'Sorcerer',
  blurb: 'A jujutsu sorcerer — student, assistant manager, clan scion or veteran.',
  gradeTable: 'shared.grade.sorcerer',
  fields: [
    { key: 'familyName', label: 'Family name', tableId: 'npc.name.family', gradeScaled: false },
    { key: 'givenName', label: 'Given name', tableId: 'npc.name.given', gradeScaled: false },
    { key: 'affiliation', label: 'Affiliation', tableId: 'npc.sorcerer.affiliation' },
    { key: 'role', label: 'Role', tableId: 'npc.sorcerer.role' },
    { key: 'technique', label: 'Cursed technique', tableId: 'npc.technique' },
    { key: 'reputation', label: 'Reputation', tableId: 'npc.sorcerer.reputation' },
    { key: 'motivation', label: 'Motivation', tableId: 'npc.motivation' },
    { key: 'mannerism', label: 'Mannerism', tableId: 'npc.mannerism', gradeScaled: false },
    { key: 'flaw', label: 'Flaw', tableId: 'npc.flaw', gradeScaled: false },
    { key: 'gear', label: 'Carries', tableId: 'npc.sorcerer.gear' },
  ],
};

export const CURSE_USER_SPEC: GeneratorSpec = {
  kind: 'curse-user',
  label: 'Curse user',
  blurb: 'A sorcerer who works against jujutsu society, or outside it.',
  gradeTable: 'shared.grade.sorcerer',
  fields: [
    { key: 'familyName', label: 'Family name', tableId: 'npc.name.family', gradeScaled: false },
    { key: 'givenName', label: 'Given name', tableId: 'npc.name.given', gradeScaled: false },
    { key: 'allegiance', label: 'Allegiance', tableId: 'npc.curse-user.allegiance' },
    { key: 'motive', label: 'Motive', tableId: 'npc.curse-user.motive' },
    { key: 'technique', label: 'Cursed technique', tableId: 'npc.technique' },
    { key: 'method', label: 'Method', tableId: 'npc.curse-user.method' },
    { key: 'cover', label: 'Cover identity', tableId: 'npc.curse-user.cover', gradeScaled: false },
    { key: 'mannerism', label: 'Mannerism', tableId: 'npc.mannerism', gradeScaled: false },
    { key: 'flaw', label: 'Flaw', tableId: 'npc.flaw', gradeScaled: false },
  ],
};

export const CURSE_SPEC: GeneratorSpec = {
  kind: 'curse',
  label: 'Curse',
  blurb: 'A cursed spirit, born from fear left to ferment.',
  gradeTable: 'shared.grade.curse',
  fields: [
    { key: 'registration', label: 'Registration', tableId: 'curse.registration' },
    { key: 'originFear', label: 'Origin fear', tableId: 'curse.origin-fear' },
    { key: 'form', label: 'Form', tableId: 'curse.form' },
    { key: 'intelligence', label: 'Intelligence', tableId: 'curse.intelligence' },
    { key: 'habitat', label: 'Habitat', tableId: 'curse.habitat' },
    { key: 'behaviour', label: 'Behaviour', tableId: 'curse.behaviour' },
    { key: 'abilities', label: 'Abilities', tableId: 'curse.ability', count: [1, 2] },
    { key: 'weakness', label: 'Weakness', tableId: 'curse.weakness' },
  ],
};

export const MISSION_SPEC: GeneratorSpec = {
  kind: 'mission',
  label: 'Mission',
  blurb: 'A posting, its briefing, and what the briefing gets wrong.',
  gradeTable: 'shared.grade.mission',
  fields: [
    // Labelled as the server labels it, so a pasted posting's `Mission Type:` line finds this
    // field in the harvester. The key stays `type`, so nothing downstream moves.
    { key: 'type', label: 'Mission type', tableId: 'mission.type' },
    { key: 'location', label: 'Location', tableId: 'mission.location' },
    { key: 'client', label: 'Client', tableId: 'mission.client', gradeScaled: false },
    { key: 'briefing', label: 'Briefing says', tableId: 'mission.briefing' },
    { key: 'trueSituation', label: 'Actually', tableId: 'mission.true-situation' },
    {
      key: 'objectives',
      label: 'Objectives',
      tableId: 'mission.objective',
      count: [1, 2],
      hint: 'How many are rolled is set by the difficulty.',
    },
    { key: 'complications', label: 'Complications', tableId: 'mission.complication', count: [1, 2] },
    { key: 'veil', label: 'Veil', tableId: 'mission.veil' },
    { key: 'support', label: 'Support', tableId: 'mission.support' },
    { key: 'payout', label: 'Payout', tableId: 'mission.payout' },
  ],
};

/**
 * A bounty posting.
 *
 * The **target name is rolled like any other field**, which means it locks like any other
 * field: roll the whole board when you need a stranger to hunt, or lock the target and re-roll
 * the posting around somebody real. That was the ask — both, as a toggle — and the existing
 * lock mechanism already is the toggle, so nothing new was needed to get it.
 *
 * The grade this rolls is the **threat grade** the bounty is posted at. The target's own
 * ranking is a separate field the panel sets, because the gap between the two is the point.
 */
export const BOUNTY_SPEC: GeneratorSpec = {
  kind: 'bounty',
  label: 'Bounty',
  blurb: 'A posting on somebody the Academy wants dealt with.',
  gradeTable: 'shared.grade.sorcerer',
  fields: [
    { key: 'familyName', label: 'Family name', tableId: 'npc.name.family', gradeScaled: false },
    { key: 'givenName', label: 'Given name', tableId: 'npc.name.given', gradeScaled: false },
    { key: 'crime', label: 'Wanted for', tableId: 'bounty.crime' },
    { key: 'briefing', label: 'Posting', tableId: 'bounty.briefing' },
    {
      key: 'warning',
      label: 'Warning',
      tableId: 'bounty.warning',
      hint: 'What makes them dangerous to whoever takes this.',
    },
    { key: 'objectives', label: 'Objectives', tableId: 'bounty.objective', count: [1, 2] },
    { key: 'issuer', label: 'Issued by', tableId: 'bounty.issuer', gradeScaled: false },
  ],
};

export const CURSED_OBJECT_SPEC: GeneratorSpec = {
  kind: 'cursed-object',
  label: 'Cursed object',
  blurb: 'Something that should stay sealed.',
  gradeTable: 'shared.grade.object',
  fields: [
    { key: 'state', label: 'State', tableId: 'cursed-object.state' },
    { key: 'appearance', label: 'Appearance', tableId: 'cursed-object.appearance' },
    { key: 'origin', label: 'Origin', tableId: 'cursed-object.origin' },
    { key: 'seal', label: 'Seal', tableId: 'cursed-object.seal' },
    { key: 'effect', label: 'If unsealed', tableId: 'cursed-object.effect' },
    { key: 'containment', label: 'Containment', tableId: 'cursed-object.containment' },
    { key: 'incident', label: 'Known incident', tableId: 'cursed-object.incident' },
  ],
};

export const CURSED_TOOL_SPEC: GeneratorSpec = {
  kind: 'cursed-tool',
  label: 'Cursed tool',
  blurb: 'A graded tool, what it does, and what it costs to carry.',
  gradeTable: 'shared.grade.object',
  fields: [
    {
      key: 'name',
      label: 'Name',
      tableId: 'cursed-tool.name',
      gradeScaled: false,
      // Named tools from the setting can be picked instead of rolled, the same way the 41
      // canonical techniques are. A pick survives a re-roll (CLAUDE.md §5).
      pickTableId: 'cursed-tool.canonical',
    },
    { key: 'form', label: 'Form', tableId: 'cursed-tool.form' },
    { key: 'appearance', label: 'Appearance', tableId: 'cursed-tool.appearance' },
    { key: 'properties', label: 'Properties', tableId: 'cursed-tool.property', count: [1, 2] },
    { key: 'drawback', label: 'Drawback', tableId: 'cursed-tool.drawback' },
    { key: 'ceRequirement', label: 'Cursed energy needed', tableId: 'cursed-tool.ce-requirement' },
    { key: 'provenance', label: 'Provenance', tableId: 'cursed-tool.provenance' },
  ],
};

/**
 * Techniques route most of their fields through `{variant}`, so each technique type can have
 * its own tables. Anything a type has not been written for falls back to
 * `technique.common.*` — adding a type costs one entry in `technique.type`, and deepening it
 * is optional and incremental.
 */
export const TECHNIQUE_SPEC: GeneratorSpec = {
  kind: 'technique',
  label: 'Technique',
  blurb: 'An innate cursed technique: how it works, what it grows into, and what it costs.',
  gradeTable: 'shared.grade.sorcerer',
  variantTable: 'technique.type',
  variantLabel: 'Technique type',
  fields: [
    {
      key: 'name',
      label: 'Name',
      tableId: 'technique.{variant}.name',
      gradeScaled: false,
      pickTableId: 'technique.canonical',
      pickLabel: 'Canonical technique',
    },
    {
      key: 'principle',
      label: 'Principle',
      tableId: 'technique.{variant}.principle',
      hint: 'The rule the technique actually operates on.',
    },
    {
      key: 'application',
      label: 'In practice',
      tableId: 'technique.{variant}.application',
      hint: 'How it looks and behaves when used.',
    },
    {
      key: 'extensions',
      label: 'Extensions',
      tableId: 'technique.{variant}.extension',
      count: [3, 5],
      hint: 'Named applications the user has worked out. Re-roll for more.',
    },
    {
      key: 'maximum',
      label: 'Maximum technique',
      tableId: 'technique.{variant}.maximum',
      minGrade: 'grade-1',
      hint: 'Grade 1 and above only.',
    },
    { key: 'domain', label: 'Domain expansion', tableId: 'technique.{variant}.domain' },
    {
      key: 'cost',
      label: 'Rough cost',
      tableId: 'technique.cost',
      hint: 'Approximate drain per use — a reference point, not a budget.',
    },
    { key: 'limitation', label: 'Limitation', tableId: 'technique.limitation' },
    {
      key: 'tell',
      label: 'Tell',
      tableId: 'technique.tell',
      gradeScaled: false,
      hint: 'What gives it away a moment before it lands.',
    },
  ],
};

export const SHIKIGAMI_SPEC: GeneratorSpec = {
  kind: 'shikigami',
  label: 'Shikigami',
  blurb: 'A bound servant. Rolls on its own, or alongside a shikigami technique.',
  gradeTable: 'shared.grade.shikigami',
  fields: [
    { key: 'name', label: 'Name', tableId: 'shikigami.name', gradeScaled: false },
    { key: 'form', label: 'Form', tableId: 'shikigami.form' },
    { key: 'role', label: 'Role', tableId: 'shikigami.role' },
    { key: 'abilities', label: 'Abilities', tableId: 'shikigami.ability', count: [1, 2] },
    { key: 'summoning', label: 'Summoning', tableId: 'shikigami.summoning', gradeScaled: false },
    { key: 'cost', label: 'Upkeep', tableId: 'shikigami.cost' },
    {
      key: 'temperament',
      label: 'Temperament',
      tableId: 'shikigami.temperament',
      gradeScaled: false,
    },
    {
      key: 'binding',
      label: 'If it is destroyed',
      tableId: 'shikigami.binding',
      hint: 'Whether it comes back, and on what terms.',
    },
    { key: 'weakness', label: 'Weakness', tableId: 'shikigami.weakness' },
  ],
};

/** The variant id that makes a technique summon shikigami. */
export const SHIKIGAMI_VARIANT_ID = 'shikigami';

export const NPC_SPECS: readonly GeneratorSpec[] = [SORCERER_SPEC, CURSE_USER_SPEC, CURSE_SPEC];

export const TECHNIQUE_SPECS: readonly GeneratorSpec[] = [TECHNIQUE_SPEC, SHIKIGAMI_SPEC];

export const ALL_SPECS: readonly GeneratorSpec[] = [
  ...NPC_SPECS,
  ...TECHNIQUE_SPECS,
  MISSION_SPEC,
  BOUNTY_SPEC,
  CURSED_OBJECT_SPEC,
  CURSED_TOOL_SPEC,
];
