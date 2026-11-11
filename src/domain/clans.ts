/**
 * Making and reading clans.
 *
 * ## ⚠️ This records a bonus. It does not apply one.
 *
 * CLAUDE.md §4 is unconditional: the app does not calculate stats. Ticking "clan bonus" marks
 * that the bonus is in effect and puts the numbers on screen beside the stat block; it does
 * **not** touch a single Class. Dan applies those by hand, as he always has.
 *
 * That is also the direct answer to the double-counting worry. Walker's `+2 Speed / −2
 * Strength` are already in his stats because they were entered there. Ticking the box adds
 * nothing to them — it only stops the sheet being silent about *why* they are what they are.
 *
 * ## Clans are records now, not a constant
 *
 * They were a hardcoded registry here until Dan asked for an editor. A clan is a `Clan` entity
 * in `vault/clans/`, so it inherits folders, cross-links, search, visibility, print and both
 * export formats with no special-casing — the same bargain `Lore` made. The shapes themselves
 * live in `entities.ts` (and are re-exported below), because `Clan extends EntityBase` and
 * declaring it here would make the import circular.
 *
 * The practical consequence for callers: the helpers in this file take the clan **list**. A
 * pure module cannot read the vault, so whoever has the clans loaded passes them in; given
 * none, a character's clan bonus simply does not render, exactly as a hand-typed clan's never
 * did.
 *
 * ## Mutations are a list, not a choice
 *
 * A character may carry several, so `Character.mutations` holds ids. An id that no longer
 * matches a clan still renders — see `describeMutations` — because deleting a clan must not
 * silently empty a saved sheet.
 *
 * Content is Dan's (the Masami Clan document, 9 Nov 2026). Pure (CLAUDE.md §3).
 */

import {
  ENTITY_SCHEMA_VERSION,
  type Clan,
  type ClanAsset,
  type ClanFigure,
  type ClanModifier,
  type ClanSeat,
  type Mutation,
  type SeatStatus,
} from './entities';
import { DEFAULT_MIN_ROLE } from './roles';

export type { Clan, ClanAsset, ClanFigure, ClanModifier, ClanSeat, Mutation, SeatStatus };
export { SEAT_STATUSES, SEAT_STATUS_LABELS } from './entities';

/** Suggestions, not an enum — the fields take any text. */
export const CLAN_STATUSES: readonly string[] = [
  'Ascendant',
  'Established',
  'Diminished',
  'Unrecognised',
  'Exiled',
  'Extinct',
];

export const ASSET_TYPES: readonly string[] = [
  'Cursed tool',
  'Cursed object',
  'Property',
  'Relic',
  'Obligation',
  'Other',
];

export interface NewClanInput {
  readonly id: string;
  readonly now: string;
  readonly folder?: string;
  readonly name?: string;
}

export function createClan(input: NewClanInput): Clan {
  return {
    schemaVersion: ENTITY_SCHEMA_VERSION,
    id: input.id,
    kind: 'clan',
    name: input.name ?? '',
    createdAt: input.now,
    updatedAt: input.now,
    folder: input.folder ?? '',
    minRole: DEFAULT_MIN_ROLE,
    // Nothing rolled it, and `generated` is what marks a record as a generator's output.
    generated: null,
    image: '',
    links: [],
    notes: '',

    motto: '',
    innateTechnique: '',
    seat: '',
    era: '',
    status: '',
    summary: '',
    overview: '',
    bonuses: [],
    mutations: [],
    hierarchy: [],
    figures: [],
    treasury: { yen: '', notes: '', assets: [] },
  };
}

/** A clan with nothing in it but an id — not worth saving, nor worth warning about. */
export function isBlankClan(clan: Clan): boolean {
  return (
    !clan.name.trim() &&
    !clan.motto.trim() &&
    !clan.summary.trim() &&
    !clan.overview.trim() &&
    !clan.innateTechnique.trim() &&
    clan.bonuses.length === 0 &&
    clan.mutations.length === 0 &&
    clan.hierarchy.length === 0 &&
    clan.figures.length === 0 &&
    clan.treasury.assets.length === 0
  );
}

export const up = (text: string): ClanModifier => ({ text, direction: 'up' });
export const down = (text: string): ClanModifier => ({ text, direction: 'down' });
export const other = (text: string): ClanModifier => ({ text, direction: 'other' });

/**
 * The direction a hand-typed modifier is pointing.
 *
 * Reads the sign the way the clan document writes it, so the editor can colour a line the
 * moment it is typed rather than making Dan pick from a dropdown. Guessing wrong costs a tint,
 * which is why this is allowed to guess at all — nothing downstream does arithmetic on it.
 */
export function directionOf(text: string): ClanModifier['direction'] {
  const trimmed = text.trim();
  if (/^[+＋]|^\bplus\b|\bgain/i.test(trimmed)) return 'up';
  if (/^[-−–—]|^\bminus\b|\blos(e|s)/i.test(trimmed)) return 'down';
  return 'other';
}

export function modifier(text: string): ClanModifier {
  return { text, direction: directionOf(text) };
}

function seat(
  id: string,
  title: string,
  tier: number,
  status: SeatStatus,
  holder = '',
  notes = '',
): ClanSeat {
  return { id, title, tier, holder, holderId: '', status, notes };
}

/**
 * The Masami, from Dan's own clan document.
 *
 * Seeded into the vault on first visit so the editor opens on something real rather than an
 * empty board, and so the clan Walker's sheet already names resolves. Once it is saved it is
 * an ordinary record: edited, renamed or deleted like any other, and never written over by
 * this constant again.
 *
 * The five Archangel seats and the vacant Clan Head are the document's own; so are the four
 * biographies, trimmed to their opening characterisation rather than reproduced whole — the
 * full text is Dan's to paste in, and the record has a field waiting for it.
 */
export function masamiSeed(id: string, now: string): Clan {
  return {
    ...createClan({ id, now, name: 'Masami' }),
    motto: 'Honour, Faith, Endurance. They will guide us to eternal salvation.',
    innateTechnique: 'Through Faith’s Command',
    seat: 'Osaka, Japan',
    era: 'Founded pre-Heian; prime in the Heian era',
    status: 'Unrecognised',
    summary: 'A clan of faith, lost to official status and clawing its way back.',
    overview:
      'The Masami Clan were first founded in Osaka, Japan, after several families came ' +
      'together to practice their faith in an organised manner. With Shintoism being majorly ' +
      'popular in Japan at the time, their practices and rituals have unfortunately been lost ' +
      'to the fading memory of history.\n\n' +
      'The modern segment of the Masami traces back to the Heian era, in which they were in ' +
      'their prime under Akira Masami — widely regarded as the strongest Through Faith’s ' +
      'Command user of all time — taking on other major clans for money, fame, or recognition ' +
      'from their lord and saviour.\n\n' +
      'The rise of feudalism in the Kamakura period caught them in traditionalism, and by the ' +
      'Edo period the Masami had been lost to time: no longer recognised as an official clan, ' +
      'associates of the Tokugawa Shogunate but never valued enough to be anything official.',
    bonuses: [up('+2 Classes Speed'), up('+2 Classes CE Efficiency'), down('−2 Classes Strength')],
    mutations: [
      {
        id: 'gods-chosen',
        name: 'God’s Chosen',
        // Unticked: the seed carries only what the clan document says, and it does not say this.
        usesTraitSlot: false,
        effects: [
          up('+1 Grade CE Efficiency'),
          other('Schizophrenia — a direct connection to God, played as hallucination'),
        ],
        tpCost: '8 TP',
        note:
          'Only available to those born with Through Faith’s Command; one recorded use in ' +
          'history. The hallucinations are mostly directed by the player. A GM may propose ' +
          '"playing God" where it stays appropriate and does not assassinate the character’s ' +
          'own motivations.',
      },
    ],
    hierarchy: [
      seat('head', 'Clan Head', 0, 'vacant', '', 'Vacant since the death of Jinn Masami.'),
      // The note sits on the first of the five rather than on all of them: five identical
      // lines read as a rendering bug, and the reason is the same reason for every seat.
      ...[1, 2, 3, 4, 5].map((n) =>
        seat(
          `archangel-${n}`,
          'Archangel',
          1,
          'vacant',
          '',
          n === 1
            ? 'All five Archangel positions are open after their deaths against Walker Masami.'
            : '',
        ),
      ),
      // The document's "Members" heading is a heading, not a seat — it had nobody under it.
      // The roster of characters whose clan is this one covers that, and is computed.
    ],
    figures: [
      {
        id: 'akira',
        name: 'Akira Masami',
        epithet: 'Goddess of the Masami',
        era: 'Heian era',
        characterId: '',
        body:
          'Often regarded as quite the enigmatic woman, and the one who would change the idea ' +
          'of defensive sorcery forever. Born with a mutation of Through Faith’s Command that ' +
          'could neither buff nor debuff — a heretic to old doctrine — but gifted an offensive ' +
          'variant that applied damage through conditional vows, a fight with rulesets upon ' +
          'rulesets. She slaughtered the previous clan head to cleanse corruption and took the ' +
          'position herself, and was the first Masami to grasp Domain Expansion: “Eden’s Chosen ' +
          'Fruit”, a non-lethal domain in which both parties must forsake combat and follow the ' +
          'teachings given them, or be condemned. The strongest Masami to ever live.',
      },
      {
        id: 'noriaka',
        name: 'Noriaka Masami',
        epithet: 'The Smiling Traitor',
        era: 'Edo period',
        characterId: '',
        body:
          'Clan Head during the Edo period, and the only pre-modern head without Through ' +
          'Faith’s Command — his father put him on the throne by killing the TFC heir in a ' +
          '"freak accident". Reached a mere Grade Semi-2 in modern rankings, with no divine ' +
          'connection and no impressive showings at all. Besides the fact he was a coward, and ' +
          'a fool, not much can be noted about Noriaka Masami.',
      },
      {
        id: 'jinn',
        name: 'Jinn Masami',
        epithet: 'A translucent ray of sunshine',
        era: 'Recent',
        characterId: '',
        body:
          'The most recent Clan Head, succeeding a TFC user by quiet takeover. A charming ' +
          'young man who kept a smile and the status quo, stabilised tensions among the ' +
          'generals and built a cult loyalty to his name. The second non-TFC head, originally ' +
          'labelled a heretic and considered for an execution order, which he escaped through ' +
          'clever diplomacy and "espionage". Wielded Magnetism with his trusted shikigami, and ' +
          'loses his temper the moment the facade fails.',
      },
      {
        id: 'walker',
        name: 'Walker Masami',
        epithet: 'The Child touched by God',
        era: 'Current',
        characterId: '',
        body:
          'The latest wielder of Through Faith’s Command, raised in Europe by a mother who ' +
          'fought tooth and nail for him to have a normal life. His technique manifested late, ' +
          'raising questions as to its legitimacy, and his grandparents had him sent back to ' +
          'Japan for training. His shikigami champion, Basil Masami, manifested on his twelfth ' +
          'birthday and has kept a watchful eye on even Walker’s closest allies ever since. A ' +
          'direct lineage connection to Akira, and currently the second strongest Masami to ' +
          'have existed.',
      },
    ],
    treasury: { yen: '', notes: '', assets: [] },
  };
}

/**
 * The clan a character names, matched by id or name.
 *
 * ⚠️ Matched by **name**, because `Character.clan` is free text and stays that way (§9) — the
 * registry supplies suggestions, and a hand-typed clan is perfectly valid and simply has no
 * record yet. The consequence worth knowing: renaming a clan record does not retarget the
 * characters pointing at its old name.
 */
export function findClan(clans: readonly Clan[], nameOrId: string): Clan | null {
  const wanted = nameOrId.trim().toLowerCase();
  if (!wanted) return null;
  return (
    clans.find((clan) => clan.id === wanted || clan.name.trim().toLowerCase() === wanted) ?? null
  );
}

/** Clan names for a picker. The field stays free text — these are suggestions, not an enum. */
export function clanNames(clans: readonly Clan[]): readonly string[] {
  return clans
    .map((clan) => clan.name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

/** Every mutation the named clan offers, or none when the clan is unknown or hand-typed. */
export function mutationsFor(clans: readonly Clan[], clanName: string): readonly Mutation[] {
  return findClan(clans, clanName)?.mutations ?? [];
}

/**
 * Mutations a character carries, as readable lines.
 *
 * An id that matches nothing is shown as itself rather than dropped: a clan deleted or renamed
 * must not quietly empty somebody's sheet, and a visible unknown is something Dan can fix.
 * Same reasoning as a dangling cross-link showing its stored name (§9).
 */
/**
 * The mutations this character carries that also cost a trait slot.
 *
 * Computed, never stored — the same bargain the members roster and backlinks make. Returns the
 * mutations themselves so a caller can both count them and name them on screen.
 */
export function slotTakingMutations(
  clans: readonly Clan[],
  clanName: string,
  ids: readonly string[],
): readonly Mutation[] {
  const known = mutationsFor(clans, clanName);
  return ids
    .map((id) => known.find((mutation) => mutation.id === id))
    .filter((mutation): mutation is Mutation => Boolean(mutation?.usesTraitSlot));
}

export function describeMutations(
  clans: readonly Clan[],
  clanName: string,
  ids: readonly string[],
): readonly string[] {
  const known = mutationsFor(clans, clanName);

  return ids.map((id) => {
    const found = known.find((mutation) => mutation.id === id);
    if (!found) return id;

    const effects = found.effects.map((effect) => effect.text).join(', ');
    return [found.name, effects, found.tpCost].filter(Boolean).join(' — ');
  });
}

/** The clan bonus as readable lines, for the sheet and both export formats. */
export function describeClanBonus(
  clans: readonly Clan[],
  clanName: string,
): readonly string[] {
  return findClan(clans, clanName)?.bonuses.map((bonus) => bonus.text) ?? [];
}

/** Seats grouped by rung, top first, so the editor can draw the ladder. */
export function hierarchyTiers(clan: Clan): readonly (readonly ClanSeat[])[] {
  const tiers = new Map<number, ClanSeat[]>();
  for (const s of clan.hierarchy) {
    const bucket = tiers.get(s.tier);
    if (bucket) bucket.push(s);
    else tiers.set(s.tier, [s]);
  }
  return [...tiers.entries()].sort(([a], [b]) => a - b).map(([, seats]) => seats);
}

/** Seats nobody is in — what "fill the blanks" means. */
export function vacantSeats(clan: Clan): readonly ClanSeat[] {
  return clan.hierarchy.filter((s) => s.status === 'vacant' && !s.holder.trim());
}

/** "2 of 7 seats held · 1 contested" — the line under the clan's name. */
export function hierarchySummary(clan: Clan): string {
  if (clan.hierarchy.length === 0) return 'No hierarchy recorded';

  const held = clan.hierarchy.filter((s) => s.status === 'held').length;
  const contested = clan.hierarchy.filter((s) => s.status === 'contested').length;

  const parts = [`${held} of ${clan.hierarchy.length} seats held`];
  if (contested > 0) parts.push(`${contested} contested`);
  return parts.join(' · ');
}
