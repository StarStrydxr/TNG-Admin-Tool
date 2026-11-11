/**
 * Forgiving reader for saved entity JSON.
 *
 * Same contract as the character parser: these files are hand-editable, so a missing or wrong
 * field falls back rather than throwing. A record whose `kind` is unrecognisable returns null
 * and is reported as skipped — better than guessing at it.
 */

import { isGradeId, type GradeId } from './grades';
import { isLinkKind, type EntityLink } from './links';
import { DEFAULT_MIN_ROLE, isRole, type Role } from './roles';
import { parseStatBlock } from './character-parse';
import { modifier } from './clans';
import {
  ENTITY_SCHEMA_VERSION,
  SEAT_STATUSES,
  normaliseFolder,
  type Bounty,
  type Clan,
  type ClanAsset,
  type ClanFigure,
  type ClanModifier,
  type ClanSeat,
  type ClanTreasury,
  type Mutation,
  type SeatStatus,
  type CursedObject,
  type CursedTool,
  type EmbeddedShikigami,
  type EntityKind,
  type GenerationOrigin,
  type Curse,
  type Mission,
  type SavedEntity,
  type Lore,
  type Shikigami,
  type ShikigamiCore,
  type Technique,
} from './entities';

const FALLBACK_GRADE: GradeId = 'grade-4';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function strList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function grade(value: unknown): GradeId {
  const raw = str(value);
  return isGradeId(raw) ? raw : FALLBACK_GRADE;
}

function role(value: unknown): Role {
  const raw = str(value);
  return isRole(raw) ? raw : DEFAULT_MIN_ROLE;
}

/**
 * Links, forgivingly. A malformed entry is dropped rather than failing the whole record —
 * these files are hand-editable and one bad link should not cost a mission.
 */
function parseLinks(value: unknown): readonly EntityLink[] {
  if (!Array.isArray(value)) return [];

  const links: EntityLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;

    const id = str(raw['id']).trim();
    const kind = str(raw['kind']);
    if (!id || !isLinkKind(kind)) continue;
    if (links.some((existing) => existing.id === id)) continue;

    links.push({ id, kind, label: str(raw['label']), note: str(raw['note']) });
  }

  return links;
}

function parseGenerated(value: unknown): GenerationOrigin | null {
  const raw = asRecord(value);
  const seed = str(raw['seed']);
  if (!seed) return null;
  return {
    seed,
    tableVersion: str(raw['tableVersion']),
    expandedByClaude: raw['expandedByClaude'] === true,
    variantId: typeof raw['variantId'] === 'string' ? raw['variantId'] : null,
  };
}

function parseBase(raw: Record<string, unknown>, kind: EntityKind, fallbackId: string) {
  return {
    schemaVersion: ENTITY_SCHEMA_VERSION,
    id: str(raw['id']).trim() || fallbackId,
    kind,
    name: str(raw['name']),
    createdAt: str(raw['createdAt'], new Date(0).toISOString()),
    updatedAt: str(raw['updatedAt'], new Date(0).toISOString()),
    folder: normaliseFolder(str(raw['folder'])),
    minRole: role(raw['minRole']),
    generated: parseGenerated(raw['generated']),
    image: str(raw['image']),
    links: parseLinks(raw['links']),
    notes: str(raw['notes']),
  };
}

function parseShikigamiCore(raw: Record<string, unknown>): ShikigamiCore {
  const own = grade(raw['grade']);

  return {
    grade: own,
    form: str(raw['form']),
    role: str(raw['role']),
    abilities: strList(raw['abilities']),
    summoning: str(raw['summoning']),
    cost: str(raw['cost']),
    temperament: str(raw['temperament']),
    binding: str(raw['binding']),
    weakness: str(raw['weakness']),
    // Absent means nobody statted it, and that is kept as null rather than filled with Class
    // 3s — a default block would claim stats that were never written. Read through the
    // character's own parser, so a shikigami's stats are validated exactly like a sheet's.
    stats: raw['stats'] === undefined || raw['stats'] === null
      ? null
      : parseStatBlock(raw['stats'], own),
    addendum: str(raw['addendum']),
  };
}

function parseEmbedded(value: unknown, index: number): EmbeddedShikigami {
  const raw = asRecord(value);
  return {
    id: str(raw['id']).trim() || `shikigami-${index}`,
    name: str(raw['name']),
    ...parseShikigamiCore(raw),
  };
}

/**
 * A clan's modifiers, forgivingly.
 *
 * A bare string is accepted as well as an object, because a hand-written clan file is far more
 * likely to say `"bonuses": ["+2 Speed"]` than to spell out a direction nothing calculates
 * with. The direction is then read off the sign (`directionOf`), which is a display decision
 * and safe to guess.
 */
function parseModifiers(value: unknown): readonly ClanModifier[] {
  if (!Array.isArray(value)) return [];

  const out: ClanModifier[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      if (item.trim()) out.push(modifier(item));
      continue;
    }
    const raw = asRecord(item);
    const text = str(raw['text']);
    if (!text.trim()) continue;
    const direction = str(raw['direction']);
    out.push(
      direction === 'up' || direction === 'down' || direction === 'other'
        ? { text, direction }
        : modifier(text),
    );
  }
  return out;
}

function parseMutations(value: unknown): readonly Mutation[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const raw = asRecord(item);
    return {
      id: str(raw['id']).trim() || `mutation-${index}`,
      name: str(raw['name']),
      effects: parseModifiers(raw['effects']),
      tpCost: str(raw['tpCost']),
      usesTraitSlot: raw['usesTraitSlot'] === true,
      note: str(raw['note']),
    } satisfies Mutation;
  });
}

function seatStatus(value: unknown): SeatStatus {
  const raw = str(value);
  return (SEAT_STATUSES as readonly string[]).includes(raw) ? (raw as SeatStatus) : 'vacant';
}

function parseSeats(value: unknown): readonly ClanSeat[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const raw = asRecord(item);
    const holder = str(raw['holder']);
    return {
      id: str(raw['id']).trim() || `seat-${index}`,
      title: str(raw['title']),
      tier: typeof raw['tier'] === 'number' && Number.isFinite(raw['tier']) ? raw['tier'] : index,
      holder,
      holderId: str(raw['holderId']).trim(),
      // A seat with a name in it but no status written is held — that is what the name means.
      status: raw['status'] === undefined && holder.trim() ? 'held' : seatStatus(raw['status']),
      notes: str(raw['notes']),
    } satisfies ClanSeat;
  });
}

function parseFigures(value: unknown): readonly ClanFigure[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const raw = asRecord(item);
    return {
      id: str(raw['id']).trim() || `figure-${index}`,
      name: str(raw['name']),
      epithet: str(raw['epithet']),
      era: str(raw['era']),
      characterId: str(raw['characterId']).trim(),
      body: str(raw['body']),
    } satisfies ClanFigure;
  });
}

function parseTreasury(value: unknown): ClanTreasury {
  const raw = asRecord(value);
  const assets = Array.isArray(raw['assets']) ? raw['assets'] : [];

  return {
    yen: str(raw['yen']),
    notes: str(raw['notes']),
    assets: assets.map((item, index) => {
      const entry = asRecord(item);
      return {
        id: str(entry['id']).trim() || `asset-${index}`,
        name: str(entry['name']),
        assetType: str(entry['assetType']),
        recordId: str(entry['recordId']).trim(),
        heldBy: str(entry['heldBy']),
        notes: str(entry['notes']),
      } satisfies ClanAsset;
    }),
  };
}

/** Null when the record has no recognisable `kind`. */
export function parseEntity(value: unknown, fallbackId: string): SavedEntity | null {
  const raw = asRecord(value);
  const kind = str(raw['kind']);

  switch (kind) {
    case 'mission':
      return {
        ...parseBase(raw, 'mission', fallbackId),
        kind: 'mission',
        grade: grade(raw['grade']),
        missionType: str(raw['missionType']),
        recommendedGrade: str(raw['recommendedGrade']),
        faction: str(raw['faction']),
        hosts: strList(raw['hosts']),
        location: str(raw['location']),
        client: str(raw['client']),
        briefing: str(raw['briefing']),
        trueSituation: str(raw['trueSituation']),
        objectives: strList(raw['objectives']),
        complications: strList(raw['complications']),
        rewards: strList(raw['rewards']),
        objectiveRewards: strList(raw['objectiveRewards']),
        mvpRewards: strList(raw['mvpRewards']),
        hostRewards: strList(raw['hostRewards']),
        difficulty: str(raw['difficulty']),
        slots: str(raw['slots']),
        veil: str(raw['veil']),
        support: str(raw['support']),
        payout: str(raw['payout']),
      } satisfies Mission;

    case 'curse':
      return {
        ...parseBase(raw, 'curse', fallbackId),
        kind: 'curse',
        grade: grade(raw['grade']),
        registration: str(raw['registration']),
        originFear: str(raw['originFear']),
        form: str(raw['form']),
        intelligence: str(raw['intelligence']),
        habitat: str(raw['habitat']),
        behaviour: str(raw['behaviour']),
        abilities: strList(raw['abilities']),
        weakness: str(raw['weakness']),
      } satisfies Curse;

    case 'cursed-object':
      return {
        ...parseBase(raw, 'cursed-object', fallbackId),
        kind: 'cursed-object',
        grade: grade(raw['grade']),
        state: str(raw['state']),
        appearance: str(raw['appearance']),
        origin: str(raw['origin']),
        seal: str(raw['seal']),
        effect: str(raw['effect']),
        containment: str(raw['containment']),
        incident: str(raw['incident']),
      } satisfies CursedObject;

    case 'cursed-tool':
      return {
        ...parseBase(raw, 'cursed-tool', fallbackId),
        kind: 'cursed-tool',
        grade: grade(raw['grade']),
        form: str(raw['form']),
        appearance: str(raw['appearance']),
        properties: strList(raw['properties']),
        drawback: str(raw['drawback']),
        ceRequirement: str(raw['ceRequirement']),
        provenance: str(raw['provenance']),
      } satisfies CursedTool;

    case 'technique':
      return {
        ...parseBase(raw, 'technique', fallbackId),
        kind: 'technique',
        grade: grade(raw['grade']),
        techniqueType: str(raw['techniqueType']),
        techniqueTypeLabel: str(raw['techniqueTypeLabel']),
        principle: str(raw['principle']),
        application: str(raw['application']),
        extensions: strList(raw['extensions']),
        maximum: str(raw['maximum']),
        domain: str(raw['domain']),
        cost: str(raw['cost']),
        limitation: str(raw['limitation']),
        tell: str(raw['tell']),
        shikigami: (Array.isArray(raw['shikigami']) ? raw['shikigami'] : []).map(parseEmbedded),
      } satisfies Technique;

    case 'shikigami':
      return {
        ...parseBase(raw, 'shikigami', fallbackId),
        kind: 'shikigami',
        ...parseShikigamiCore(raw),
      } satisfies Shikigami;

    case 'lore':
      return {
        ...parseBase(raw, 'lore', fallbackId),
        kind: 'lore',
        loreType: str(raw['loreType']),
        summary: str(raw['summary']),
        body: str(raw['body']),
        era: str(raw['era']),
        status: str(raw['status']),
        location: str(raw['location']),
      } satisfies Lore;

    case 'bounty':
      return {
        ...parseBase(raw, 'bounty', fallbackId),
        kind: 'bounty',
        grade: grade(raw['grade']),
        // Defaults to the threat grade: a posting that names only one grade means both.
        targetGrade: raw['targetGrade'] === undefined
          ? grade(raw['grade'])
          : grade(raw['targetGrade']),
        target: str(raw['target']),
        conspicuousity: str(raw['conspicuousity']),
        state: str(raw['state']),
        pings: strList(raw['pings']),
        crime: str(raw['crime']),
        briefing: str(raw['briefing']),
        warning: str(raw['warning']),
        objectives: strList(raw['objectives']),
        rewards: strList(raw['rewards']),
        issuer: str(raw['issuer']),
      } satisfies Bounty;

    case 'clan':
      return {
        ...parseBase(raw, 'clan', fallbackId),
        kind: 'clan',
        motto: str(raw['motto']),
        innateTechnique: str(raw['innateTechnique']),
        seat: str(raw['seat']),
        era: str(raw['era']),
        status: str(raw['status']),
        summary: str(raw['summary']),
        overview: str(raw['overview']),
        bonuses: parseModifiers(raw['bonuses']),
        mutations: parseMutations(raw['mutations']),
        hierarchy: parseSeats(raw['hierarchy']),
        figures: parseFigures(raw['figures']),
        treasury: parseTreasury(raw['treasury']),
      } satisfies Clan;

    default:
      return null;
  }
}
