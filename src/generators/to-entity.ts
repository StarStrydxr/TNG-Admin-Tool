/**
 * Draft → saved entity.
 *
 * One converter per generator. These are the files that must change when a spec gains or
 * renames a field — the price of typed storage over generic draft storage.
 *
 * Pure; the id and timestamp are injected.
 */

import {
  entityBase,
  type Curse,
  type CursedObject,
  type CursedTool,
  type EmbeddedShikigami,
  type EntityMeta,
  type GenerationOrigin,
  type Mission,
  type SavedEntity,
  type Shikigami,
  type ShikigamiCore,
  type Technique,
} from '../domain/entities';
import { draftValue, draftValues, type Draft } from './draft';

function originOf(draft: Draft): GenerationOrigin {
  return {
    seed: draft.seed,
    tableVersion: draft.tableVersion,
    expandedByClaude: false,
    variantId: draft.variant?.id ?? null,
  };
}

function shikigamiCore(draft: Draft): ShikigamiCore {
  return {
    grade: draft.grade,
    form: draftValue(draft, 'form'),
    role: draftValue(draft, 'role'),
    abilities: draftValues(draft, 'abilities'),
    summoning: draftValue(draft, 'summoning'),
    cost: draftValue(draft, 'cost'),
    temperament: draftValue(draft, 'temperament'),
    binding: draftValue(draft, 'binding'),
    weakness: draftValue(draft, 'weakness'),
  };
}

export function curseFromDraft(draft: Draft, meta: EntityMeta): Curse {
  const form = draftValue(draft, 'form');
  const fear = draftValue(draft, 'originFear');

  return {
    // Named after what it is and what made it — a curse has no name of its own.
    ...entityBase('curse', [form, fear].filter(Boolean).join(' — '), meta),
    kind: 'curse',
    generated: originOf(draft),
    grade: draft.grade,
    registration: draftValue(draft, 'registration'),
    originFear: fear,
    form,
    intelligence: draftValue(draft, 'intelligence'),
    habitat: draftValue(draft, 'habitat'),
    behaviour: draftValue(draft, 'behaviour'),
    abilities: draftValues(draft, 'abilities'),
    weakness: draftValue(draft, 'weakness'),
  };
}

/**
 * The parts of a posting that are not table rolls.
 *
 * Rewards come from a difficulty preset rather than a table (see `domain/difficulty.ts`), and
 * hosts and slots are things Dan fills in, so they arrive alongside the draft instead of in it.
 * All optional: a mission converted without them is the same mission it was before the format
 * rework, with blanks where the new fields go.
 */
export interface MissionExtras {
  readonly recommendedGrade?: string;
  readonly faction?: string;
  readonly hosts?: readonly string[];
  readonly rewards?: readonly string[];
  readonly objectiveRewards?: readonly string[];
  readonly mvpRewards?: readonly string[];
  readonly hostRewards?: readonly string[];
  readonly difficulty?: string;
  readonly slots?: string;
}

export function missionFromDraft(
  draft: Draft,
  meta: EntityMeta,
  extras: MissionExtras = {},
): Mission {
  const type = draftValue(draft, 'type');
  const location = draftValue(draft, 'location');
  return {
    ...entityBase('mission', [type, location].filter(Boolean).join(' — '), meta),
    kind: 'mission',
    generated: originOf(draft),
    grade: draft.grade,
    missionType: type,
    recommendedGrade: extras.recommendedGrade ?? '',
    faction: extras.faction ?? '',
    hosts: extras.hosts ?? [],
    location,
    client: draftValue(draft, 'client'),
    briefing: draftValue(draft, 'briefing'),
    trueSituation: draftValue(draft, 'trueSituation'),
    objectives: draftValues(draft, 'objectives'),
    complications: draftValues(draft, 'complications'),
    rewards: extras.rewards ?? [],
    objectiveRewards: extras.objectiveRewards ?? [],
    mvpRewards: extras.mvpRewards ?? [],
    hostRewards: extras.hostRewards ?? [],
    difficulty: extras.difficulty ?? '',
    slots: extras.slots ?? '',
    veil: draftValue(draft, 'veil'),
    support: draftValue(draft, 'support'),
    payout: draftValue(draft, 'payout'),
  };
}

export function cursedObjectFromDraft(draft: Draft, meta: EntityMeta): CursedObject {
  const appearance = draftValue(draft, 'appearance');
  return {
    ...entityBase('cursed-object', appearance, meta),
    kind: 'cursed-object',
    generated: originOf(draft),
    grade: draft.grade,
    state: draftValue(draft, 'state'),
    appearance,
    origin: draftValue(draft, 'origin'),
    seal: draftValue(draft, 'seal'),
    effect: draftValue(draft, 'effect'),
    containment: draftValue(draft, 'containment'),
    incident: draftValue(draft, 'incident'),
  };
}

export function cursedToolFromDraft(draft: Draft, meta: EntityMeta): CursedTool {
  return {
    ...entityBase('cursed-tool', draftValue(draft, 'name'), meta),
    kind: 'cursed-tool',
    generated: originOf(draft),
    grade: draft.grade,
    form: draftValue(draft, 'form'),
    appearance: draftValue(draft, 'appearance'),
    properties: draftValues(draft, 'properties'),
    drawback: draftValue(draft, 'drawback'),
    ceRequirement: draftValue(draft, 'ceRequirement'),
    provenance: draftValue(draft, 'provenance'),
  };
}

export function shikigamiFromDraft(draft: Draft, meta: EntityMeta): Shikigami {
  return {
    ...entityBase('shikigami', draftValue(draft, 'name'), meta),
    kind: 'shikigami',
    generated: originOf(draft),
    ...shikigamiCore(draft),
  };
}

export function embeddedShikigami(draft: Draft): EmbeddedShikigami {
  return { id: draft.seed, name: draftValue(draft, 'name'), ...shikigamiCore(draft) };
}

/** `household` is the shikigami rolled alongside a shikigami-type technique. */
export function techniqueFromDraft(
  draft: Draft,
  meta: EntityMeta,
  household: readonly Draft[] = [],
): Technique {
  return {
    ...entityBase('technique', draftValue(draft, 'name'), meta),
    kind: 'technique',
    generated: originOf(draft),
    grade: draft.grade,
    techniqueType: draft.variant?.id ?? '',
    techniqueTypeLabel: draft.variant?.label ?? '',
    principle: draftValue(draft, 'principle'),
    application: draftValue(draft, 'application'),
    extensions: draftValues(draft, 'extensions'),
    maximum: draftValue(draft, 'maximum'),
    domain: draftValue(draft, 'domain'),
    cost: draftValue(draft, 'cost'),
    limitation: draftValue(draft, 'limitation'),
    tell: draftValue(draft, 'tell'),
    shikigami: household.map(embeddedShikigami),
  };
}

/**
 * Convert whatever a generator produced. Sorcerers and curse users are characters, not
 * entities, and go through `to-character.ts` instead — hence the null.
 */
export function entityFromDraft(
  draft: Draft,
  meta: EntityMeta,
  household: readonly Draft[] = [],
  mission: MissionExtras = {},
): SavedEntity | null {
  switch (draft.kind) {
    case 'mission':
      return missionFromDraft(draft, meta, mission);
    case 'curse':
      return curseFromDraft(draft, meta);
    case 'cursed-object':
      return cursedObjectFromDraft(draft, meta);
    case 'cursed-tool':
      return cursedToolFromDraft(draft, meta);
    case 'technique':
      return techniqueFromDraft(draft, meta, household);
    case 'shikigami':
      return shikigamiFromDraft(draft, meta);
    default:
      return null;
  }
}
