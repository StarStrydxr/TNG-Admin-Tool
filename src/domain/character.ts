/**
 * The character record — player characters and NPCs alike.
 *
 * Shape follows CLAUDE.md §4 and, since Nov 2026, **the server's own OC template**: the
 * `«𝐆𝐞𝐧𝐞𝐫𝐚𝐥» / «𝐀𝐩𝐩𝐞𝐚𝐫𝐚𝐧𝐜𝐞» / «𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥» / «𝐒𝐨𝐫𝐜𝐞𝐫𝐞𝐫 𝐏𝐫𝐨𝐟𝐢𝐥𝐞» / «𝐒𝐭𝐚𝐭𝐬» / «𝐁𝐨𝐧𝐮𝐬»` form
 * characters are actually submitted in. The groupings in this file follow those headings, so
 * the app and the Discord server agree about what a character is.
 *
 * Every field added for that template is **additive and free text**, so files written before it
 * existed parse with `''` or `[]` and no migration was needed.
 *
 * Judgment calls made here:
 *
 *  - `affiliation` and `clan` are free text, not enums. Factions are Dan's setting content, and
 *    hardcoding a list would quietly make my invented canon load-bearing. The UI offers
 *    suggestions; the field accepts anything.
 *  - The template says **Affiliation twice** — once under Personal (the school or organisation)
 *    and once under Sorcerer Profile ("Curses, Curse Users, Sorcerers or Neutral"). Those are
 *    two different questions, so they are two fields: `affiliation` and `faction`. The export
 *    templates write both back out under the heading the server expects, so the rename is
 *    invisible on the Discord side.
 *  - `defects` reuses `Trait`. A defect is a trait with the sign flipped, and the app does not
 *    compute either (§4), so a second near-identical type would buy nothing.
 *  - `kind` provisionally answers open question §12.6 (one schema with a flag, rather than two
 *    types), which also matches the `vault/characters` + `vault/npcs` split in §3. Cheap to undo.
 */

import type { GradeId } from './grades';
import { defaultStatBlock, type StatBlock } from './stats';

export const SCHEMA_VERSION = 1;

export type CharacterKind = 'pc' | 'npc';

export const CHARACTER_KINDS: readonly CharacterKind[] = ['pc', 'npc'];

export const CHARACTER_KIND_LABELS: Record<CharacterKind, string> = {
  pc: 'Player character',
  npc: 'NPC',
};

/** Reverse Cursed Technique proficiency. */
export type RctLevel = 'none' | 'self' | 'others';

export const RCT_LEVELS: readonly RctLevel[] = ['none', 'self', 'others'];

export const RCT_LABELS: Record<RctLevel, string> = {
  none: 'None',
  self: 'Self only',
  others: 'Self and others',
};

/**
 * A trait or defect. `effect` is free text ("+2 Classes Speed, −2 Classes Strength") because the
 * app does not compute stats — Dan reads the effect and sets the stat himself. See CLAUDE.md §4.
 */
export interface Trait {
  readonly id: string;
  readonly name: string;
  readonly effect: string;
  readonly notes: string;
}

export interface Art {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface Awakening {
  readonly id: string;
  readonly name: string;
  readonly notes: string;
}

export interface InnateTechnique {
  readonly name: string;
  readonly description: string;
  readonly extensions: readonly string[];
  readonly maximum: string;
  readonly domainExpansion: string;
}

/** Embedded for now. If tools become a shared registry (§12.7) this grows a `toolId`. */
export interface CharacterCursedTool {
  readonly id: string;
  readonly name: string;
  readonly grade: string;
  readonly notes: string;
}

export interface Relationship {
  readonly id: string;
  readonly name: string;
  readonly relation: string;
  readonly notes: string;
}

/**
 * How a posting went for this character.
 *
 * `unresolved` is the default and covers a mission still running, one that ended without a
 * clean verdict, and a line imported from the old free-text field that said something else.
 */
export type MissionOutcome = 'success' | 'failure' | 'unresolved';

export const MISSION_OUTCOMES: readonly MissionOutcome[] = ['success', 'failure', 'unresolved'];

export const MISSION_OUTCOME_LABELS: Record<MissionOutcome, string> = {
  success: 'Success',
  failure: 'Failure',
  unresolved: 'Unresolved',
};

/**
 * One log line as a single string — `The Nakano depot — 12 Nov — SUCCESS · MVP — 40 CR`.
 *
 * Shared by the printable sheet and both export formats, so a mission reads the same wherever
 * it lands. The tags are upper-cased because that is how the server writes them.
 */
export function missionLogLine(entry: MissionRecord): string {
  const tags = [MISSION_OUTCOME_LABELS[entry.outcome].toUpperCase()];
  if (entry.mvp) tags.push('MVP');

  return [
    entry.title || 'Untitled mission',
    entry.date,
    tags.join(' · '),
    entry.cr ? `${entry.cr} CR` : '',
  ]
    .filter(Boolean)
    .join(' — ');
}

/**
 * One line of a character's mission log.
 *
 * `cr` is free text and nothing adds it up. Cursed Rating is tracked on the Discord server, so
 * the app mirrors what Dan writes rather than keeping a second ledger — a total computed here
 * that disagreed with the one on Discord would be worse than no total at all.
 */
export interface MissionRecord {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly outcome: MissionOutcome;
  /** Named MVP by the referee at the end of the event. */
  readonly mvp: boolean;
  readonly cr: string;
  readonly notes: string;
}

/** Deferred (CLAUDE.md §4). The field exists; nothing is built on it. */
export interface BindingVow {
  readonly id: string;
  readonly summary: string;
}

/** Present only on records a generator produced. Null for anything made by hand. */
export interface GeneratedOrigin {
  readonly seed: string;
  readonly tableVersion: string;
  readonly expandedByClaude: boolean;
}

export interface Character {
  readonly schemaVersion: number;
  readonly id: string;
  readonly kind: CharacterKind;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly origin: GeneratedOrigin | null;

  /* «General» */
  readonly name: string;
  readonly nicknames: string;
  readonly gender: string;
  readonly race: string;
  readonly subdivision: string;
  readonly age: string;
  readonly dateOfBirth: string;
  readonly sexuality: string;

  /* «Appearance» */
  readonly nationality: string;
  readonly ethnicity: string;
  readonly hairColour: string;
  readonly eyeColour: string;
  readonly height: string;
  readonly appearance: string;

  /* «Personal» */
  readonly affiliation: string;
  readonly occupation: string;
  readonly hobbies: string;
  readonly likes: string;
  readonly dislikes: string;
  readonly personality: string;
  /** The template's Backstory. Kept as `background` because saved files already use it. */
  readonly background: string;

  readonly portrait: string;

  /* «Sorcerer Profile» */
  readonly grade: GradeId;
  /** The Sorcerer Profile "Affiliation": Curses, Curse Users, Sorcerers or Neutral. */
  readonly faction: string;
  readonly clan: string;
  /** "Reinforcement, RCT, etc" — broader than the typed `reverseCursedTechnique` below. */
  readonly ceApplications: string;
  /** Cursed objects carried. Tools have their own structured list. */
  readonly arsenal: string;
  readonly potential: string;
  readonly feats: readonly string[];
  readonly mastery: string;
  /**
   * The clan's bonus is in effect for this character.
   *
   * ⚠️ A record, not a calculation. Ticking it applies **nothing** to the stats — the app does
   * not calculate stats (§4) — it marks that the bonus is live and lets the sheet show what it
   * is. Stats entered by hand already include it; this does not add it a second time.
   */
  readonly clanBonus: boolean;
  /** Mutation ids from the character's clan. A character may carry several. */
  readonly mutations: readonly string[];
  /**
   * Cursed Rating as it stands.
   *
   * Free text and never computed. The real ledger is on the Discord server; this is a figure
   * Dan copies across so a sheet can be read without opening Discord beside it.
   */
  readonly cursedRating: string;

  readonly stats: StatBlock;

  readonly traits: readonly Trait[];
  readonly defects: readonly Trait[];
  readonly arts: readonly Art[];
  readonly awakenings: readonly Awakening[];
  readonly traitSlots: number;
  readonly artSlots: number;

  readonly innateTechnique: InnateTechnique;
  readonly reverseCursedTechnique: RctLevel;
  readonly simpleDomain: boolean;
  readonly blackFlashCount: number;
  readonly heavenlyRestriction: string;

  readonly cursedTools: readonly CharacterCursedTool[];
  readonly relationships: readonly Relationship[];
  readonly missionHistory: readonly MissionRecord[];
  readonly bindingVows: readonly BindingVow[];

  /* «Bonus» */
  readonly themeSong: string;
  readonly faceClaim: string;

  readonly notes: string;
}

/**
 * Grade One is the one slot count the server has given us (3 trait / 3 art). The formula across
 * grades and awakenings is still TBD, so slots are plain editable numbers seeded with that
 * anchor rather than derived. See CLAUDE.md §4.
 */
export const DEFAULT_TRAIT_SLOTS = 3;
export const DEFAULT_ART_SLOTS = 3;

export const EMPTY_INNATE_TECHNIQUE: InnateTechnique = {
  name: '',
  description: '',
  extensions: [],
  maximum: '',
  domainExpansion: '',
};

export interface NewCharacterInput {
  readonly id: string;
  /** ISO timestamp. Injected so this stays pure and testable. */
  readonly now: string;
  readonly kind: CharacterKind;
  readonly grade: GradeId;
  readonly name?: string;
}

export function createCharacter(input: NewCharacterInput): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: input.id,
    kind: input.kind,
    createdAt: input.now,
    updatedAt: input.now,
    origin: null,

    name: input.name ?? '',
    nicknames: '',
    gender: '',
    race: '',
    subdivision: '',
    age: '',
    dateOfBirth: '',
    sexuality: '',

    nationality: '',
    ethnicity: '',
    hairColour: '',
    eyeColour: '',
    height: '',
    appearance: '',

    affiliation: '',
    occupation: '',
    hobbies: '',
    likes: '',
    dislikes: '',
    personality: '',
    background: '',

    portrait: '',

    grade: input.grade,
    faction: '',
    clan: '',
    ceApplications: '',
    arsenal: '',
    potential: '',
    feats: [],
    mastery: '',
    clanBonus: false,
    mutations: [],
    cursedRating: '',

    stats: defaultStatBlock(input.grade),

    traits: [],
    defects: [],
    arts: [],
    awakenings: [],
    traitSlots: DEFAULT_TRAIT_SLOTS,
    artSlots: DEFAULT_ART_SLOTS,

    innateTechnique: EMPTY_INNATE_TECHNIQUE,
    reverseCursedTechnique: 'none',
    simpleDomain: false,
    blackFlashCount: 0,
    heavenlyRestriction: '',

    cursedTools: [],
    relationships: [],
    missionHistory: [],
    bindingVows: [],

    themeSong: '',
    faceClaim: '',

    notes: '',
  };
}

/** Over-filled slots are a warning, never a block — Dan may be mid-edit or house-ruling. */
export interface SlotUsage {
  readonly used: number;
  readonly total: number;
  readonly overBy: number;
}

export function traitSlotUsage(character: Character): SlotUsage {
  return slotUsage(character.traits.length, character.traitSlots);
}

export function artSlotUsage(character: Character): SlotUsage {
  return slotUsage(character.arts.length, character.artSlots);
}

function slotUsage(used: number, total: number): SlotUsage {
  return { used, total, overBy: Math.max(0, used - total) };
}

/** Display name for a character that has not been named yet. */
export function characterDisplayName(character: Character): string {
  return character.name.trim() || 'Unnamed character';
}
