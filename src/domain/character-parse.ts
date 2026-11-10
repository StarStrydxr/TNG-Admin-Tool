/**
 * Forgiving reader for character JSON.
 *
 * Vault files are meant to be hand-editable (CLAUDE.md §1), so a file with a missing field, a
 * typo'd grade or a renamed key must still open with sensible defaults rather than crash the
 * app. Anything unrecognised falls back; nothing throws.
 *
 * Pure — no clock, no IDs generated here. The caller supplies both.
 */

import {
  CIVILIAN_STAT,
  DEFAULT_CLASS_RANK,
  isClassRank,
  isGradeId,
  statValue,
  type ClassRank,
  type GradeId,
  type StatValue,
} from './grades';
import {
  CE_RESERVES_BANDS,
  DEFAULT_CE_RESERVES,
  GRADED_STAT_IDS,
  type CeReservesBand,
  type GradedStatId,
  type StatBlock,
} from './stats';
import {
  CHARACTER_KINDS,
  MISSION_OUTCOMES,
  RCT_LEVELS,
  SCHEMA_VERSION,
  createCharacter,
  type Art,
  type Awakening,
  type BindingVow,
  type Character,
  type CharacterCursedTool,
  type CharacterKind,
  type GeneratedOrigin,
  type InnateTechnique,
  type MissionOutcome,
  type MissionRecord,
  type NewCharacterInput,
  type RctLevel,
  type Relationship,
  type Trait,
} from './character';

/* ---------------------------------------------------------------- */
/* Primitives                                                        */
/* ---------------------------------------------------------------- */

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asInt(value: unknown, fallback: number, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.trunc(value));
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringList(value: unknown): readonly string[] {
  return asArray(value).filter((item): item is string => typeof item === 'string');
}

function entryId(raw: Record<string, unknown>, prefix: string, index: number): string {
  const id = asString(raw['id']).trim();
  return id || `${prefix}-${index}`;
}

/* ---------------------------------------------------------------- */
/* Stats                                                             */
/* ---------------------------------------------------------------- */

export function parseStatValue(value: unknown, fallbackGrade: GradeId): StatValue {
  const raw = asRecord(value);

  if (raw['kind'] === 'civilian' || raw['grade'] === 'civilian-grade') return CIVILIAN_STAT;

  const grade = asString(raw['grade']);
  const resolvedGrade: GradeId = isGradeId(grade) ? grade : fallbackGrade;

  // Accept both `classRank` and a legacy/hand-written `class`.
  const rawClass = raw['classRank'] ?? raw['class'];
  const classRank: ClassRank =
    typeof rawClass === 'number' && isClassRank(rawClass) ? rawClass : DEFAULT_CLASS_RANK;

  return statValue(resolvedGrade, classRank);
}

function parseCeReserves(value: unknown): CeReservesBand {
  const band = asString(value).toLowerCase();
  return (CE_RESERVES_BANDS as readonly string[]).includes(band)
    ? (band as CeReservesBand)
    : DEFAULT_CE_RESERVES;
}

export function parseStatBlock(value: unknown, fallbackGrade: GradeId): StatBlock {
  const raw = asRecord(value);
  const gradedRaw = asRecord(raw['graded']);

  const graded = Object.fromEntries(
    GRADED_STAT_IDS.map((id) => [id, parseStatValue(gradedRaw[id], fallbackGrade)]),
  ) as Record<GradedStatId, StatValue>;

  return { graded, ceReserves: parseCeReserves(raw['ceReserves']) };
}

/* ---------------------------------------------------------------- */
/* Collections                                                       */
/* ---------------------------------------------------------------- */

/** Defects share the `Trait` shape, so they share the reader — only the id prefix differs. */
function parseTraits(value: unknown, prefix = 'trait'): readonly Trait[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    return {
      id: entryId(raw, prefix, index),
      name: asString(raw['name']),
      effect: asString(raw['effect']),
      notes: asString(raw['notes']),
    };
  });
}

function parseArts(value: unknown): readonly Art[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    return {
      id: entryId(raw, 'art', index),
      name: asString(raw['name']),
      description: asString(raw['description']),
    };
  });
}

function parseAwakenings(value: unknown): readonly Awakening[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    return {
      id: entryId(raw, 'awakening', index),
      name: asString(raw['name']),
      notes: asString(raw['notes']),
    };
  });
}

function parseCursedTools(value: unknown): readonly CharacterCursedTool[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    return {
      id: entryId(raw, 'tool', index),
      name: asString(raw['name']),
      grade: asString(raw['grade']),
      notes: asString(raw['notes']),
    };
  });
}

function parseRelationships(value: unknown): readonly Relationship[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    return {
      id: entryId(raw, 'rel', index),
      name: asString(raw['name']),
      relation: asString(raw['relation']),
      notes: asString(raw['notes']),
    };
  });
}

/**
 * Read an outcome, from the union or from the free text the field used to hold.
 *
 * Mission history predates the tag, so saved logs say things like "Cleared, one casualty".
 * Those are read by keyword and anything unrecognised becomes `unresolved` — but the words
 * themselves are not thrown away, see `parseMissionHistory`.
 */
function parseOutcome(value: unknown): MissionOutcome {
  const raw = asString(value).toLowerCase();
  if (raw.includes('succ') || raw.includes('clear') || raw.includes('complet')) return 'success';
  if (raw.includes('fail') || raw.includes('lost') || raw.includes('wipe')) return 'failure';
  return 'unresolved';
}

function parseMissionHistory(value: unknown): readonly MissionRecord[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    const written = asString(raw['outcome']);
    const outcome = parseOutcome(written);
    const notes = asString(raw['notes']);

    // An old free-text outcome that the keywords did not recognise is still something Dan
    // wrote, so it is kept in the notes rather than dropped on the way to a tag.
    const keepsText =
      written.length > 0 &&
      outcome === 'unresolved' &&
      !MISSION_OUTCOMES.includes(written as MissionOutcome) &&
      !notes.includes(written);

    return {
      id: entryId(raw, 'mission', index),
      title: asString(raw['title']),
      date: asString(raw['date']),
      outcome,
      mvp: raw['mvp'] === true,
      cr: asString(raw['cr']),
      notes: keepsText ? [written, notes].filter(Boolean).join(' — ') : notes,
    };
  });
}

function parseBindingVows(value: unknown): readonly BindingVow[] {
  return asArray(value).map((item, index) => {
    const raw = asRecord(item);
    return { id: entryId(raw, 'vow', index), summary: asString(raw['summary']) };
  });
}

function parseInnateTechnique(value: unknown): InnateTechnique {
  const raw = asRecord(value);
  return {
    name: asString(raw['name']),
    description: asString(raw['description']),
    extensions: asStringList(raw['extensions']),
    maximum: asString(raw['maximum']),
    domainExpansion: asString(raw['domainExpansion']),
  };
}

function parseOrigin(value: unknown): GeneratedOrigin | null {
  if (value === null || value === undefined) return null;
  const raw = asRecord(value);
  const seed = asString(raw['seed']);
  if (!seed) return null;
  return {
    seed,
    tableVersion: asString(raw['tableVersion']),
    expandedByClaude: asBool(raw['expandedByClaude'], false),
  };
}

/* ---------------------------------------------------------------- */
/* Character                                                         */
/* ---------------------------------------------------------------- */

function parseKind(value: unknown, fallback: CharacterKind): CharacterKind {
  const kind = asString(value);
  return (CHARACTER_KINDS as readonly string[]).includes(kind) ? (kind as CharacterKind) : fallback;
}

function parseRct(value: unknown): RctLevel {
  const level = asString(value);
  return (RCT_LEVELS as readonly string[]).includes(level) ? (level as RctLevel) : 'none';
}

/**
 * Read a character from arbitrary JSON. `fallback` supplies the id, timestamp, kind and grade
 * used wherever the data is missing or unusable.
 */
export function parseCharacter(value: unknown, fallback: NewCharacterInput): Character {
  const base = createCharacter(fallback);
  const raw = asRecord(value);

  const gradeRaw = asString(raw['grade']);
  const grade: GradeId = isGradeId(gradeRaw) ? gradeRaw : fallback.grade;

  return {
    schemaVersion: asInt(raw['schemaVersion'], SCHEMA_VERSION, 1),
    id: asString(raw['id']).trim() || base.id,
    kind: parseKind(raw['kind'], fallback.kind),
    createdAt: asString(raw['createdAt'], base.createdAt),
    updatedAt: asString(raw['updatedAt'], base.updatedAt),
    origin: parseOrigin(raw['origin']),

    name: asString(raw['name']),
    nicknames: asString(raw['nicknames']),
    gender: asString(raw['gender']),
    race: asString(raw['race']),
    subdivision: asString(raw['subdivision']),
    age: asString(raw['age']),
    dateOfBirth: asString(raw['dateOfBirth']),
    sexuality: asString(raw['sexuality']),

    nationality: asString(raw['nationality']),
    ethnicity: asString(raw['ethnicity']),
    hairColour: asString(raw['hairColour']),
    eyeColour: asString(raw['eyeColour']),
    height: asString(raw['height']),
    appearance: asString(raw['appearance']),

    affiliation: asString(raw['affiliation']),
    occupation: asString(raw['occupation']),
    hobbies: asString(raw['hobbies']),
    likes: asString(raw['likes']),
    dislikes: asString(raw['dislikes']),
    personality: asString(raw['personality']),
    background: asString(raw['background']),

    portrait: asString(raw['portrait']),

    grade,
    faction: asString(raw['faction']),
    clan: asString(raw['clan']),
    ceApplications: asString(raw['ceApplications']),
    arsenal: asString(raw['arsenal']),
    potential: asString(raw['potential']),
    feats: asStringList(raw['feats']),
    mastery: asString(raw['mastery']),
    clanBonus: raw['clanBonus'] === true,
    mutations: asStringList(raw['mutations']),
    cursedRating: asString(raw['cursedRating']),

    stats: parseStatBlock(raw['stats'], grade),

    traits: parseTraits(raw['traits']),
    defects: parseTraits(raw['defects'], 'defect'),
    arts: parseArts(raw['arts']),
    awakenings: parseAwakenings(raw['awakenings']),
    traitSlots: asInt(raw['traitSlots'], base.traitSlots),
    artSlots: asInt(raw['artSlots'], base.artSlots),

    innateTechnique: parseInnateTechnique(raw['innateTechnique']),
    reverseCursedTechnique: parseRct(raw['reverseCursedTechnique']),
    simpleDomain: asBool(raw['simpleDomain'], false),
    blackFlashCount: asInt(raw['blackFlashCount'], 0),
    heavenlyRestriction: asString(raw['heavenlyRestriction']),

    cursedTools: parseCursedTools(raw['cursedTools']),
    relationships: parseRelationships(raw['relationships']),
    missionHistory: parseMissionHistory(raw['missionHistory']),
    bindingVows: parseBindingVows(raw['bindingVows']),

    themeSong: asString(raw['themeSong']),
    faceClaim: asString(raw['faceClaim']),

    notes: asString(raw['notes']),
  };
}
