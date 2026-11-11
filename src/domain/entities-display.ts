/**
 * How each typed entity is laid out for reading.
 *
 * Kept here rather than in the detail component so the field order and labels are pure data —
 * testable, and changed in one place when a schema gains a field. The component stays dumb.
 */

import { formatStatLong, gradeLabel } from './grades';
import {
  ACQUISITION_LABELS,
  entryGroups,
  entryLine,
  rarityLabel,
  rarityPermissionNote,
  traitCost,
  type TraitEntity,
} from './traits';
import { SEAT_STATUS_LABELS } from './entities';
import {
  CE_RESERVES_LABELS,
  GRADED_STAT_IDS,
  GRADED_STAT_LABELS,
  describeEffectiveReserves,
  effectiveReserves,
  type StatBlock,
} from './stats';
import type {
  ClanAsset,
  ClanFigure,
  ClanSeat,
  EmbeddedShikigami,
  Mutation,
  SavedEntity,
  TraitEntry,
} from './entities';

export interface EntityField {
  /**
   * The entity property this came from.
   *
   * Carried so a round trip can find its way home: the Obsidian exporter writes a heading per
   * field and the importer has to know which property a heading belongs to. Display-only
   * consumers ignore it.
   */
  readonly key: string;
  readonly label: string;
  /** One entry per line in the UI. Empty arrays are dropped before display. */
  readonly values: readonly string[];
}

function one(key: string, label: string, value: string): EntityField {
  return { key, label, values: value.trim() ? [value] : [] };
}

function many(key: string, label: string, values: readonly string[]): EntityField {
  return { key, label, values: values.filter((value) => value.trim().length > 0) };
}

/** Labelled fields in reading order. Empty ones are already removed. */
export function describeEntity(entity: SavedEntity): readonly EntityField[] {
  return [...fieldsFor(entity), linksField(entity)].filter((field) => field.values.length > 0);
}

/**
 * Links as stored, not as resolved.
 *
 * Resolving a link needs every other collection loaded, and this function is pure and
 * synchronous — so a sheet prints the name the link was made with. That is also the right
 * answer for paper: a printout cannot follow a link anyway.
 */
function linksField(entity: SavedEntity): EntityField {
  return many(
    'links',
    'Linked',
    entity.links.map((link) =>
      [link.label || 'Unnamed record', link.note].filter(Boolean).join(' — '),
    ),
  );
}

function fieldsFor(entity: SavedEntity): readonly EntityField[] {
  switch (entity.kind) {
    case 'mission':
      return [
        one('grade', 'Grade', gradeLabel(entity.grade)),
        one('missionType', 'Mission type', entity.missionType),
        one('recommendedGrade', 'Recommended grade', entity.recommendedGrade),
        one('faction', 'For', entity.faction),
        many('hosts', 'Hosts', entity.hosts),
        one('location', 'Location', entity.location),
        one('client', 'Client', entity.client),
        one('briefing', 'Briefing says', entity.briefing),
        one('trueSituation', 'Actually', entity.trueSituation),
        many('objectives', 'Objectives', entity.objectives),
        many('complications', 'Complications', entity.complications),
        many('rewards', 'Rewards', entity.rewards),
        many('objectiveRewards', 'Objective exclusive', entity.objectiveRewards),
        many('mvpRewards', 'MVP exclusive', entity.mvpRewards),
        many('hostRewards', 'Host payout', entity.hostRewards),
        one('slots', 'Mission slots', entity.slots),
        one('difficulty', 'Difficulty', entity.difficulty),
        one('veil', 'Veil', entity.veil),
        one('support', 'Support', entity.support),
        one('payout', 'Payout', entity.payout),
      ];

    case 'curse':
      return [
        one('grade', 'Grade', gradeLabel(entity.grade)),
        one('registration', 'Registration', entity.registration),
        one('originFear', 'Born from', entity.originFear),
        one('form', 'Form', entity.form),
        one('intelligence', 'Intelligence', entity.intelligence),
        one('habitat', 'Habitat', entity.habitat),
        one('behaviour', 'Behaviour', entity.behaviour),
        many('abilities', 'Abilities', entity.abilities),
        one('weakness', 'Weakness', entity.weakness),
      ];

    case 'cursed-object':
      return [
        one('grade', 'Grade', gradeLabel(entity.grade)),
        one('state', 'State', entity.state),
        one('appearance', 'Appearance', entity.appearance),
        one('origin', 'Origin', entity.origin),
        one('seal', 'Seal', entity.seal),
        one('effect', 'If unsealed', entity.effect),
        one('containment', 'Containment', entity.containment),
        one('incident', 'Known incident', entity.incident),
      ];

    case 'cursed-tool':
      return [
        one('grade', 'Grade', gradeLabel(entity.grade)),
        one('form', 'Form', entity.form),
        one('appearance', 'Appearance', entity.appearance),
        many('properties', 'Properties', entity.properties),
        one('drawback', 'Drawback', entity.drawback),
        one('ceRequirement', 'Cursed energy needed', entity.ceRequirement),
        one('provenance', 'Provenance', entity.provenance),
      ];

    case 'technique':
      return [
        one('grade', 'Grade', gradeLabel(entity.grade)),
        one('techniqueTypeLabel', 'Type', entity.techniqueTypeLabel || entity.techniqueType),
        one('principle', 'Principle', entity.principle),
        one('application', 'In practice', entity.application),
        many('extensions', 'Extensions', entity.extensions),
        one('maximum', 'Maximum technique', entity.maximum),
        one('domain', 'Domain expansion', entity.domain),
        one('cost', 'Rough cost', entity.cost),
        one('limitation', 'Limitation', entity.limitation),
        one('tell', 'Tell', entity.tell),
        many('shikigami', 'Shikigami', entity.shikigami.map(shikigamiLine)),
      ];

    case 'shikigami':
      return [
        one('grade', 'Grade', gradeLabel(entity.grade)),
        one('form', 'Form', entity.form),
        one('role', 'Role', entity.role),
        many('abilities', 'Abilities', entity.abilities),
        one('summoning', 'Summoning', entity.summoning),
        one('cost', 'Upkeep', entity.cost),
        one('temperament', 'Temperament', entity.temperament),
        one('binding', 'If it is destroyed', entity.binding),
        one('weakness', 'Weakness', entity.weakness),
        many('stats', 'Stats', entity.stats ? statLines(entity.stats) : []),
        one('addendum', 'Addendum', entity.addendum),
      ];

    // No grade line: lore is one of the two records that have none (see `entityGrade`).
    case 'lore':
      return [
        one('loreType', 'Type', entity.loreType),
        one('status', 'Status', entity.status),
        one('era', 'When', entity.era),
        one('location', 'Where', entity.location),
        one('summary', 'In short', entity.summary),
        one('body', 'Detail', entity.body),
      ];

    // Ungraded, like lore and clans: a trait is not Grade 2.
    case 'trait':
      return [
        one('rarity', 'Rarity', rarityLabel(entity.rarity)),
        one('cost', 'Cost', traitCost(entity)),
        one('acquisition', 'How it is taken', ACQUISITION_LABELS[entity.acquisition]),
        one('permission', 'Permission', rarityPermissionNote(entity.rarity)),
        one('description', 'Description', entity.description),
        ...entryFields(entity.entries),
        one('slot', 'Slot', entity.usesTraitSlot ? 'Takes a trait slot' : ''),
        one('source', 'Source', entity.source),
        many('requirements', 'Requirements', entity.requirements),
      ];

    // No rarity: the defect rules have not been supplied, so the cost stays free text (§10).
    case 'defect':
      return [
        one('tpCost', 'Cost', entity.tpCost),
        one('description', 'Description', entity.description),
        ...entryFields(entity.entries),
        one('slot', 'Slot', entity.usesTraitSlot ? 'Takes a trait slot' : ''),
        one('source', 'Source', entity.source),
        many('requirements', 'Requirements', entity.requirements),
      ];

    case 'bounty':
      return [
        one('grade', 'Threat grade', gradeLabel(entity.grade)),
        one('target', 'Target', entity.target),
        one('targetGrade', 'Target ranked', gradeLabel(entity.targetGrade)),
        one('conspicuousity', 'Conspicuousity', entity.conspicuousity),
        one('state', 'State', entity.state),
        many('pings', 'Pings', entity.pings),
        one('crime', 'Wanted for', entity.crime),
        one('briefing', 'Posting', entity.briefing),
        one('warning', 'Warning', entity.warning),
        many('objectives', 'Objectives', entity.objectives),
        many('rewards', 'Rewards', entity.rewards),
        one('issuer', 'Issued by', entity.issuer),
      ];

    // Ungraded, like lore — a clan is not Grade 2. The structured parts (seats, mutations,
    // assets) flatten to lines here because this shape is what prints and what Obsidian
    // writes; the editor reads the record itself.
    case 'clan':
      return [
        one('motto', 'Motto', entity.motto),
        one('innateTechnique', 'Inherited technique', entity.innateTechnique),
        one('seat', 'Seat', entity.seat),
        one('era', 'Era', entity.era),
        one('status', 'Status', entity.status),
        one('summary', 'In short', entity.summary),
        one('overview', 'Overview', entity.overview),
        many('bonuses', 'Clan bonus', entity.bonuses.map((b) => b.text)),
        many('mutations', 'Mutations', entity.mutations.map(mutationLine)),
        many('hierarchy', 'Hierarchy', entity.hierarchy.map(seatLine)),
        many('figures', 'Prevalent members', entity.figures.map(figureLine)),
        one('treasuryYen', 'Clan funds', entity.treasury.yen),
        many('treasuryAssets', 'Holdings', entity.treasury.assets.map(assetLine)),
        one('treasuryNotes', 'Vault notes', entity.treasury.notes),
      ];
  }
}

/**
 * A stat block as readable lines.
 *
 * Effective reserves appears only when CE Efficiency actually outranks CE Output, so an
 * ordinary block reads exactly as it did. It sits **beside** the written band and never in
 * place of it — the stored value is what Dan typed (CLAUDE.md §4).
 */
export function statLines(stats: StatBlock): readonly string[] {
  const lines = GRADED_STAT_IDS.map(
    (id) => `${GRADED_STAT_LABELS[id]}: ${formatStatLong(stats.graded[id])}`,
  );

  lines.push(`CE Reserves: ${CE_RESERVES_LABELS[stats.ceReserves]}`);

  const effective = effectiveReserves(stats);
  if (effective.steps > 0) {
    lines.push(`Effective reserves: ${describeEffectiveReserves(stats)}`);
  }

  return lines;
}

/** "Nue — Grade 1 · a thunderbird", with its stat block folded in where it has one. */
export function shikigamiLine(s: EmbeddedShikigami): string {
  const head = [s.name || 'Unnamed', [gradeLabel(s.grade), s.form].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .join(' — ');

  const tail = [s.stats ? statLines(s.stats).join('; ') : '', s.addendum].filter(Boolean);
  return tail.length > 0 ? `${head} — ${tail.join(' — ')}` : head;
}

/**
 * A trait's bonuses and drawbacks as readable fields.
 *
 * Split into two lists rather than one, because the green/red distinction is the whole shape of
 * the server's own block and a merged list would lose it on paper and in Obsidian, where there
 * is no colour to carry it. A conditional group gets a field of its own, named after the
 * condition, so "Whenever Alone (Team of One)" reads as its own heading the way it does on
 * Discord.
 */
function entryFields(entries: readonly TraitEntry[]): readonly EntityField[] {
  const groups = entryGroups({ entries } as TraitEntity);

  return groups.flatMap(({ condition, entries: group }) => {
    const label = (what: string) => (condition ? `${condition} — ${what}` : what);
    const key = (what: string) => (condition ? `${what}:${condition}` : what);
    const lines = (kind: 'bonus' | 'drawback') =>
      group
        .filter((item) => item.kind === kind)
        .map((item) => [entryLine(item), item.note].filter(Boolean).join(' — '));

    return [
      many(key('bonuses'), label('Bonuses'), lines('bonus')),
      many(key('drawbacks'), label('Drawbacks'), lines('drawback')),
    ];
  });
}

export function mutationLine(mutation: Mutation): string {
  const effects = mutation.effects.map((effect) => effect.text).join(', ');
  return [mutation.name, effects, mutation.tpCost].filter(Boolean).join(' — ');
}

/** "Clan Head — Vacant" or "Archangel — Hana Masami". The status is only worth saying once. */
export function seatLine(seat: ClanSeat): string {
  const who = seat.holder.trim() || SEAT_STATUS_LABELS[seat.status];
  const suffix = seat.holder.trim() && seat.status !== 'held' ? ` (${SEAT_STATUS_LABELS[seat.status]})` : '';
  return `${seat.title || 'Untitled seat'} — ${who}${suffix}`;
}

export function figureLine(figure: ClanFigure): string {
  const title = [figure.name || 'Unnamed', figure.epithet && `“${figure.epithet}”`]
    .filter(Boolean)
    .join(', ');
  return [title, figure.era].filter(Boolean).join(' — ');
}

export function assetLine(asset: ClanAsset): string {
  return [asset.name || 'Unnamed', asset.assetType, asset.heldBy && `held by ${asset.heldBy}`]
    .filter(Boolean)
    .join(' — ');
}

/**
 * One-line summary for a list row.
 *
 * Deliberately avoids whatever the record's *name* is built from — a mission is named after its
 * type and location, so repeating those here would waste the line.
 */
export function entitySummary(entity: SavedEntity): string {
  switch (entity.kind) {
    case 'mission':
      return entity.client;
    case 'curse':
      return [entity.form, entity.habitat].filter(Boolean).join(' · ');
    case 'lore':
      return [entity.loreType, entity.summary].filter(Boolean).join(' · ');
    case 'cursed-object':
      return entity.state;
    case 'cursed-tool':
      return entity.form;
    case 'technique':
      return entity.techniqueTypeLabel || entity.techniqueType;
    case 'shikigami':
      return [entity.role, entity.form].filter(Boolean).join(' · ');
    case 'clan':
      return [entity.innateTechnique, entity.summary].filter(Boolean).join(' · ');
    case 'bounty':
      return [entity.target, entity.crime].filter(Boolean).join(' · ');
    case 'trait':
    case 'defect':
      return [entity.description, traitCost(entity)].filter(Boolean).join(' · ');
  }
}
