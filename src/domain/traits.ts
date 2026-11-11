/**
 * Traits and defects — the server's own system, from Dan's screenshots (11 Nov 2026).
 *
 * The rules in one paragraph: traits are perks bought with **Trait Points**. A character starts
 * with 12 and earns more from events, missions and giveaways. Each trait sits at one of six
 * **rarities**, and the rarity fixes the price. A trait may be *Inherent* (start with it only)
 * or *Developed* (develop it in play alongside earning a Feat); listed as neither, it can be
 * either. Developing one later needs a free trait slot, the points, and a roleplay intense
 * enough to justify it.
 *
 * ⚠️ **Nothing here is applied and nothing is totalled.** A trait records the lines the rules
 * state; §4 is unconditional that Dan sets the resulting Class himself. And the TP balance is
 * tracked on Discord, so the app quotes a cost and never sums one — the same refusal `cursedRating`
 * already makes, confirmed by Dan when this landed.
 *
 * Pure (CLAUDE.md §3).
 */

import {
  ENTITY_SCHEMA_VERSION,
  type DefectRecord,
  type TraitAcquisition,
  type TraitEntry,
  type TraitRarity,
  type TraitRecord,
} from './entities';
import { DEFAULT_MIN_ROLE } from './roles';

export type TraitKind = 'trait' | 'defect';
export type TraitEntity = TraitRecord | DefectRecord;

/** Cheapest first, which is the order the rules list them in. */
export const RARITIES: readonly TraitRarity[] = [
  'basic',
  'uncommon',
  'rare',
  'exotic',
  'legendary',
  'extraordinary',
];

export interface RarityRule {
  readonly label: string;
  /** Trait Points, as the server's own table prices it. */
  readonly tp: number;
  /** Whose say-so is needed, or '' for none. */
  readonly permission: '' | 'Admin' | 'Owner';
  /** Legendary and above want a writing sample with the claim. */
  readonly needsSample: boolean;
}

/**
 * The price list.
 *
 * ⚠️ **Fixed in code, not a setting** (Dan, 11 Nov 2026) — the same standing as the grade
 * ladder, and unlike the mission difficulty tiers, which are editable because a GM tunes them.
 * The server sets these prices; the app only quotes them. A record stores its rarity and reads
 * the cost back through `rarityCost`, so a saved trait can never disagree with the table.
 */
export const RARITY: Record<TraitRarity, RarityRule> = {
  basic: { label: 'Basic', tp: 5, permission: '', needsSample: false },
  uncommon: { label: 'Uncommon', tp: 6, permission: '', needsSample: false },
  rare: { label: 'Rare', tp: 7, permission: '', needsSample: false },
  exotic: { label: 'Exotic', tp: 8, permission: '', needsSample: false },
  legendary: { label: 'Legendary', tp: 10, permission: 'Admin', needsSample: true },
  extraordinary: { label: 'Extraordinary', tp: 12, permission: 'Owner', needsSample: true },
};

export const ACQUISITIONS: readonly TraitAcquisition[] = ['either', 'inherent', 'developed'];

export const ACQUISITION_LABELS: Record<TraitAcquisition, string> = {
  either: 'Either',
  inherent: 'Inherent',
  developed: 'Developed',
};

export const ACQUISITION_NOTES: Record<TraitAcquisition, string> = {
  either: 'Can be started with, or developed later on.',
  inherent: 'You have to start with this trait.',
  developed: 'You have to develop this trait irp alongside your earning of a Feat.',
};

export function isRarity(value: unknown): value is TraitRarity {
  return typeof value === 'string' && value in RARITY;
}

export function isAcquisition(value: unknown): value is TraitAcquisition {
  return value === 'either' || value === 'inherent' || value === 'developed';
}

export function rarityLabel(rarity: TraitRarity): string {
  return RARITY[rarity].label;
}

/** "7 TP". The one place a trait's price is written. */
export function rarityCost(rarity: TraitRarity): string {
  return `${RARITY[rarity].tp} TP`;
}

/**
 * What a record costs, whichever kind it is.
 *
 * A trait's comes from its rarity; a defect's is whatever Dan typed, because the defect rules
 * have not been supplied. One function so no display surface has to know that.
 */
export function traitCost(entry: TraitEntity): string {
  return entry.kind === 'trait' ? rarityCost(entry.rarity) : entry.tpCost;
}

/** "Requires Admin permission, and a roleplay sample when claiming." Empty for the low rungs. */
export function rarityPermissionNote(rarity: TraitRarity): string {
  const rule = RARITY[rarity];
  if (!rule.permission) return '';
  const sample = rule.needsSample ? ', and a roleplay sample when claiming' : '';
  return `Requires ${rule.permission} permission${sample}.`;
}

export function traitEntry(patch: Partial<TraitEntry> = {}): TraitEntry {
  return {
    id: patch.id ?? `e-${Math.random().toString(36).slice(2, 10)}`,
    name: patch.name ?? '',
    text: patch.text ?? '',
    kind: patch.kind ?? 'bonus',
    note: patch.note ?? '',
    condition: patch.condition ?? '',
  };
}

export interface NewTraitInput {
  readonly kind: TraitKind;
  readonly id: string;
  readonly now: string;
  readonly folder?: string;
  readonly source?: string;
}

export function createTrait(input: NewTraitInput): TraitEntity {
  const base = {
    schemaVersion: ENTITY_SCHEMA_VERSION,
    id: input.id,
    name: '',
    createdAt: input.now,
    updatedAt: input.now,
    folder: input.folder ?? '',
    minRole: DEFAULT_MIN_ROLE,
    // Nothing rolled it, and `generated` is what marks a record as a generator's output.
    generated: null,
    image: '',
    links: [],
    notes: '',

    description: '',
    entries: [],
    source: input.source ?? '',
    requirements: [],
  } as const;

  // ⚠️ The slot default differs by kind, and the parser's must agree: a trait spends a slot,
  // a defect hands points back.
  return input.kind === 'trait'
    ? { ...base, kind: 'trait', usesTraitSlot: true, rarity: 'basic', acquisition: 'either' }
    : { ...base, kind: 'defect', usesTraitSlot: false, tpCost: '' };
}

/** A record with nothing in it — not worth saving, and not worth warning about either. */
export function isBlankTrait(entry: TraitEntity): boolean {
  return (
    !entry.name.trim() &&
    !entry.description.trim() &&
    entry.requirements.length === 0 &&
    entry.entries.every((item) => !item.name.trim() && !item.text.trim())
  );
}

/** "Genius: +2 Grades to Perception". The entry as one line, for a card or a sheet. */
export function entryLine(entry: TraitEntry): string {
  return [entry.name, entry.text].filter((part) => part.trim()).join(': ');
}

export function entryLines(entry: TraitEntity): readonly string[] {
  return entry.entries.map(entryLine).filter(Boolean);
}

export function bonuses(entry: TraitEntity): readonly TraitEntry[] {
  return entry.entries.filter((item) => item.kind === 'bonus');
}

export function drawbacks(entry: TraitEntity): readonly TraitEntry[] {
  return entry.entries.filter((item) => item.kind === 'drawback');
}

/**
 * The entries grouped by their condition, main block first.
 *
 * The server prints a conditional block under its own arrow heading — "➡ Whenever Alone (Team
 * of One):" — with its own bonuses and drawbacks beneath. Grouping on a string rather than
 * nesting a second list keeps the shape flat, which is what lets an entry be added, removed or
 * moved between blocks without restructuring anything.
 */
export function entryGroups(
  entry: TraitEntity,
): readonly { readonly condition: string; readonly entries: readonly TraitEntry[] }[] {
  const order: string[] = [];
  const byCondition = new Map<string, TraitEntry[]>();

  for (const item of entry.entries) {
    const key = item.condition.trim();
    if (!byCondition.has(key)) {
      byCondition.set(key, []);
      order.push(key);
    }
    byCondition.get(key)?.push(item);
  }

  // The unconditional block leads, whatever order the entries happen to sit in.
  order.sort((a, b) => (a === '' ? -1 : b === '' ? 1 : 0));
  return order.map((condition) => ({ condition, entries: byCondition.get(condition) ?? [] }));
}

/** Suggestions, not an enum — §4 says sources only *appear* to include these. */
export const TRAIT_SOURCES: readonly string[] = [
  'Clan',
  'Background',
  'Personality',
  'Position',
  'Mutation',
  'Heavenly Restriction',
  'Binding Vow',
  'Other',
];
