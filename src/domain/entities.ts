/**
 * Saved generator output — missions, cursed objects, cursed tools, techniques and shikigami.
 *
 * Typed per entity rather than stored as raw draft fields, so each one can be queried and
 * displayed properly. The cost is a converter per generator (`entities-convert.ts`) that must
 * be updated whenever a spec changes.
 *
 * Two naming notes:
 *
 *   - The generation-provenance field here is `generated`, not `origin` as on `Character`.
 *     Cursed objects have their own `origin` (where the thing came from) and the clash would
 *     have been worse than the inconsistency. Unify at the next migration, not before — that
 *     would rewrite saved character files.
 *   - `folder` is a path relative to the collection directory, forward-slashed, `''` for root.
 *     It maps to real subdirectories on disk.
 *
 * Pure.
 */

import type { GradeId } from './grades';
import type { EntityLink } from './links';
import { DEFAULT_MIN_ROLE, type Role } from './roles';

export const ENTITY_SCHEMA_VERSION = 1;

export type EntityKind =
  | 'mission'
  | 'curse'
  | 'cursed-object'
  | 'cursed-tool'
  | 'technique'
  | 'shikigami'
  | 'lore'
  | 'clan';

export const ENTITY_KINDS: readonly EntityKind[] = [
  'mission',
  'curse',
  'cursed-object',
  'cursed-tool',
  'technique',
  'shikigami',
  'lore',
  'clan',
];

/** Directory under `vault/` for each kind. Mirrored by the Rust whitelist. */
export const ENTITY_COLLECTIONS: Record<EntityKind, string> = {
  mission: 'missions',
  curse: 'curses',
  'cursed-object': 'cursed-objects',
  'cursed-tool': 'cursed-tools',
  technique: 'techniques',
  shikigami: 'shikigami',
  lore: 'lore',
  clan: 'clans',
};

export const ENTITY_LABELS: Record<EntityKind, string> = {
  mission: 'Mission',
  curse: 'Curse',
  'cursed-object': 'Cursed object',
  'cursed-tool': 'Cursed tool',
  technique: 'Technique',
  shikigami: 'Shikigami',
  lore: 'Lore',
  clan: 'Clan',
};

/** Present only on records a generator produced. */
export interface GenerationOrigin {
  readonly seed: string;
  readonly tableVersion: string;
  readonly expandedByClaude: boolean;
  /** The variant rolled, where the generator has them. */
  readonly variantId: string | null;
}

export interface EntityBase {
  readonly schemaVersion: number;
  readonly id: string;
  readonly kind: EntityKind;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Relative to the collection directory. `''` is the collection root. */
  readonly folder: string;
  /** Minimum rank that may see this record. Enforced at the publish boundary. */
  readonly minRole: Role;
  readonly generated: GenerationOrigin | null;
  /**
   * File name of a picture in `%APPDATA%\jjk-rp-vault\images\`, or `''` for none. Only the name
   * is stored — the bytes live beside the vault, so a record stays small and readable, and the
   * same picture can be shared by several records. Additive: records saved before this existed
   * parse with `''`.
   */
  readonly image: string;
  /**
   * Other records this one points at — the curse in the briefing, the character who owns the
   * tool. One-directional and unenforced; see `domain/links.ts`. Additive, like `image`.
   */
  readonly links: readonly EntityLink[];
  readonly notes: string;
}

/**
 * A posting.
 *
 * Fields follow §4 plus the server's own mission format: a type, a recommended grade, hosts,
 * objectives, rewards and a slot count. All of those are additive, so missions saved before the
 * format rework parse with `''` or `[]`.
 *
 * `payout` and `rewards` are deliberately both here and are not the same thing. `payout` is the
 * in-fiction fee — what the client is paying, which belongs in the briefing. `rewards` is the
 * server economy: Cursed Rating, Trait Points, Yen, chests. A mission can reasonably have one
 * and not the other.
 */
export interface Mission extends EntityBase {
  readonly kind: 'mission';
  readonly grade: GradeId;
  readonly missionType: string;
  /** The posting's recommendation line — "Special Grade and Below". */
  readonly recommendedGrade: string;
  /** Who the posting is for: Sorcerers, Curse Users or Curses. Empty means anyone. */
  readonly faction: string;
  /** Discord handles of whoever is running it. */
  readonly hosts: readonly string[];
  readonly location: string;
  readonly client: string;
  readonly briefing: string;
  readonly trueSituation: string;
  readonly objectives: readonly string[];
  readonly complications: readonly string[];
  /**
   * The server pays in three buckets, so they are three fields.
   *
   * `rewards` is granted for taking part; `objectiveRewards` only if **every** objective is
   * completed; `mvpRewards` is the referee's award at the end, and is not given at all if the
   * event concludes early. Separate fields rather than one list because the host multipliers do
   * arithmetic on them, and because a GM edits one without disturbing the others. All three are
   * plain string lists, so they export, print and round-trip through Obsidian unchanged.
   */
  readonly rewards: readonly string[];
  readonly objectiveRewards: readonly string[];
  readonly mvpRewards: readonly string[];
  /** What a primary and a secondary host take home. Chests are never multiplied. */
  readonly hostRewards: readonly string[];
  /** Which difficulty preset produced the objectives and rewards. */
  readonly difficulty: string;
  /** Player slots, as written on the posting — "0/4". */
  readonly slots: string;
  readonly veil: string;
  readonly support: string;
  readonly payout: string;
}

/**
 * A cursed spirit.
 *
 * Fields follow the Curse shape already specified in CLAUDE.md §4. Added as a sixth entity kind
 * because a rolled curse previously had nowhere to go: `canSaveToVault` covers only sorcerers
 * and curse users, so "Save" on a curse draft failed outright. Additive — a new collection and
 * a new kind, with nothing already on disk needing to change.
 */
export interface Curse extends EntityBase {
  readonly kind: 'curse';
  readonly grade: GradeId;
  /** Free text, not a boolean: "registered", "misfiled", "presumed exorcised". */
  readonly registration: string;
  readonly originFear: string;
  readonly form: string;
  readonly intelligence: string;
  readonly habitat: string;
  readonly behaviour: string;
  readonly abilities: readonly string[];
  readonly weakness: string;
}

export interface CursedObject extends EntityBase {
  readonly kind: 'cursed-object';
  readonly grade: GradeId;
  readonly state: string;
  readonly appearance: string;
  readonly origin: string;
  readonly seal: string;
  readonly effect: string;
  readonly containment: string;
  readonly incident: string;
}

export interface CursedTool extends EntityBase {
  readonly kind: 'cursed-tool';
  readonly grade: GradeId;
  readonly form: string;
  readonly appearance: string;
  readonly properties: readonly string[];
  readonly drawback: string;
  readonly ceRequirement: string;
  readonly provenance: string;
}

/**
 * The shikigami fields on their own, so a technique can embed a household without each member
 * carrying an id, folder and visibility of its own.
 */
export interface ShikigamiCore {
  readonly grade: GradeId;
  readonly form: string;
  readonly role: string;
  readonly abilities: readonly string[];
  readonly summoning: string;
  readonly cost: string;
  readonly temperament: string;
  readonly binding: string;
  readonly weakness: string;
}

export interface Shikigami extends EntityBase, ShikigamiCore {
  readonly kind: 'shikigami';
}

/** A named shikigami embedded in a technique. */
export interface EmbeddedShikigami extends ShikigamiCore {
  readonly id: string;
  readonly name: string;
}

export interface Technique extends EntityBase {
  readonly kind: 'technique';
  readonly grade: GradeId;
  /** The variant id — `shikigami`, `elemental`, and so on. */
  readonly techniqueType: string;
  readonly techniqueTypeLabel: string;
  readonly principle: string;
  readonly application: string;
  readonly extensions: readonly string[];
  /** Empty below Grade 1 — the generator omits the field entirely there. */
  readonly maximum: string;
  readonly domain: string;
  readonly cost: string;
  readonly limitation: string;
  readonly tell: string;
  readonly shikigami: readonly EmbeddedShikigami[];
}

/**
 * A piece of the world that is not a thing you roll.
 *
 * A place, a clan, an organisation, an incident, a house rule. Lore had a folder wired up in
 * `vault.rs` from the start and nothing behind it, which made it dead weight; it is an entity
 * now so it inherits folders, links, search, visibility, print and export without a line of
 * special-casing.
 *
 * ⚠️ **Lore has no `grade`** — alone among the entities. A clan is not Grade 2, and giving it a
 * grade so the type lines up would put a wrong abbreviation on every card. Use `entityGrade()`
 * wherever code reaches for a grade without knowing the kind.
 */
export interface Lore extends EntityBase {
  readonly kind: 'lore';
  /** place / organisation / clan / event / rule / person / other. Free text, suggestions in UI. */
  readonly loreType: string;
  /** One line, shown on the card. The body is the rest. */
  readonly summary: string;
  readonly body: string;
  /** When it happened or applies — "Heian era", "since 2016", "ongoing". */
  readonly era: string;
  /** current / historical / rumoured / contested. */
  readonly status: string;
  /** Where it is, for a place or an organisation. */
  readonly location: string;
}

/**
 * A modifier as a clan document writes it. Text, deliberately — nothing parses these.
 *
 * ⚠️ The direction is for colour and ordering only. It is **never** read as arithmetic: §4 is
 * unconditional that the app does not calculate stats, so a `+2 Classes Speed` here is a note
 * about why a stat is what it is, not an instruction to change one.
 */
export interface ClanModifier {
  readonly text: string;
  readonly direction: 'up' | 'down' | 'other';
}

export interface Mutation {
  readonly id: string;
  readonly name: string;
  readonly effects: readonly ClanModifier[];
  /** Trait Point cost, as the clan document states it. Free text; nothing sums it. */
  readonly tpCost: string;
  readonly note: string;
}

/** Where a seat sits, and whether anybody is in it. */
export type SeatStatus = 'held' | 'vacant' | 'contested' | 'deceased';

export const SEAT_STATUSES: readonly SeatStatus[] = ['held', 'vacant', 'contested', 'deceased'];

export const SEAT_STATUS_LABELS: Record<SeatStatus, string> = {
  held: 'Held',
  vacant: 'Vacant',
  contested: 'Contested',
  deceased: 'Deceased',
};

/**
 * One position in a clan's hierarchy.
 *
 * `tier` is the rung, 0 at the top, and several seats may share one — the Masami have five
 * Archangels beneath one Clan Head. `holder` is a name even when `holderId` is empty, because a
 * clan's records name people the vault has never had a sheet for; `holderId` is the link when
 * it does, and the same dangling-link rule applies (the stored name is what shows).
 */
export interface ClanSeat {
  readonly id: string;
  readonly title: string;
  readonly tier: number;
  readonly holder: string;
  /** Id of the character record in the seat, or `''`. */
  readonly holderId: string;
  readonly status: SeatStatus;
  readonly notes: string;
}

/** Something the clan owns. A tool, a property, a sealed object, an obligation. */
export interface ClanAsset {
  readonly id: string;
  readonly name: string;
  /** Cursed tool / Cursed object / Property / Other. Free text, suggestions in the UI. */
  readonly assetType: string;
  /** Id of the vault record for this thing, or `''` for something with no record. */
  readonly recordId: string;
  /** Who is carrying it right now. Free text — it may well be nobody in the vault. */
  readonly heldBy: string;
  readonly notes: string;
}

/**
 * The clan vault: money and things.
 *
 * ⚠️ **`yen` is free text and nothing totals it.** Same reasoning as Cursed Rating (§4): a
 * second number here that disagreed with the one the clan actually has would be worse than no
 * number at all. Write "¥4,200,000 — after the Kyoto repairs" if that is the truth of it.
 */
export interface ClanTreasury {
  readonly yen: string;
  readonly notes: string;
  readonly assets: readonly ClanAsset[];
}

/**
 * A named figure in the clan's history.
 *
 * Not a hierarchy seat: Akira Masami held one a thousand years ago and the seat outlived her,
 * so a seat and the people who have sat in it are different things. Not necessarily a vault
 * character either — most of a clan's history has no sheet — but `characterId` links the ones
 * that do. This exists because Dan's own clan document has a "Prevalent Members" section of
 * biographies, and a clan record that dropped them would lose most of the writing.
 */
export interface ClanFigure {
  readonly id: string;
  readonly name: string;
  /** "Goddess of the Masami", "The Smiling Traitor". */
  readonly epithet: string;
  /** When they mattered — "Heian era", "current". */
  readonly era: string;
  /** Id of the character record, or `''`. */
  readonly characterId: string;
  readonly body: string;
}

/**
 * A clan, as an editable record.
 *
 * Was a hardcoded registry in `domain/clans.ts` until Dan asked for an editor. Making it an
 * entity rather than a settings blob means it inherits folders, cross-links, search,
 * visibility, print and both export formats with no special-casing — the same bargain `Lore`
 * made — and lets a seat link to the character sitting in it through `EntityLink`.
 *
 * ⚠️ **Like `Lore`, a clan has no `grade`.** Go through `entityGrade()`.
 *
 * ⚠️ **It records bonuses. It does not apply them.** Ticking "clan bonus" on a character puts
 * these lines on the sheet beside the stat block and touches no Class. That is what stops a
 * bonus already entered by hand from being counted twice.
 */
export interface Clan extends EntityBase {
  readonly kind: 'clan';
  readonly motto: string;
  readonly innateTechnique: string;
  /** Where the clan is based — "Kyoto", "a compound outside Sendai". */
  readonly seat: string;
  /** When it was founded, or the era it belongs to. */
  readonly era: string;
  /** Ascendant / Diminished / Extinct / Exiled. Free text, suggestions in the UI. */
  readonly status: string;
  /** One line, shown on the card. */
  readonly summary: string;
  /** The clan's history, at whatever length it deserves. */
  readonly overview: string;
  readonly bonuses: readonly ClanModifier[];
  readonly mutations: readonly Mutation[];
  readonly hierarchy: readonly ClanSeat[];
  readonly figures: readonly ClanFigure[];
  readonly treasury: ClanTreasury;
}

export type SavedEntity =
  | Mission
  | Curse
  | CursedObject
  | CursedTool
  | Technique
  | Shikigami
  | Lore
  | Clan;

/**
 * The grade a record carries, or null for one that has none.
 *
 * `Lore` and `Clan` are the two ungraded kinds. Reaching for `entity.grade` without checking is
 * how a lore card ends up labelled `G4`, so generic code — search, the library header, display
 * — goes through here.
 */
export function entityGrade(entity: SavedEntity): GradeId | null {
  return entity.kind === 'lore' || entity.kind === 'clan' ? null : entity.grade;
}

export interface EntityMeta {
  readonly id: string;
  readonly now: string;
  readonly folder?: string;
  readonly minRole?: Role;
  /** Stored image file name, attached at the moment of saving. */
  readonly image?: string;
}

export function entityBase(kind: EntityKind, name: string, meta: EntityMeta): EntityBase {
  return {
    schemaVersion: ENTITY_SCHEMA_VERSION,
    id: meta.id,
    kind,
    name,
    createdAt: meta.now,
    updatedAt: meta.now,
    folder: normaliseFolder(meta.folder ?? ''),
    minRole: meta.minRole ?? DEFAULT_MIN_ROLE,
    generated: null,
    image: meta.image ?? '',
    links: [],
    notes: '',
  };
}

/**
 * Collapse a user-typed folder into a safe relative path: forward slashes, no leading or
 * trailing separator, no `.` or `..` segments, no drive letters. The Rust side rejects
 * anything that slips through, but failing here gives a better message.
 */
export function normaliseFolder(input: string): string {
  return input
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .filter((segment) => !/^[a-zA-Z]:$/.test(segment))
    .join('/');
}

export function entityDisplayName(entity: SavedEntity): string {
  return entity.name.trim() || `Unnamed ${ENTITY_LABELS[entity.kind].toLowerCase()}`;
}

/**
 * Every distinct folder in a set of records, including ancestors, sorted — for a folder tree
 * or a picker. Takes anything with a `folder`, since that is all it reads.
 */
export function foldersIn(entities: readonly { readonly folder: string }[]): readonly string[] {
  const folders = new Set<string>();
  for (const entity of entities) {
    const parts = entity.folder.split('/').filter(Boolean);
    for (let i = 1; i <= parts.length; i += 1) folders.add(parts.slice(0, i).join('/'));
  }
  return [...folders].sort();
}
