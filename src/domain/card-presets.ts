/**
 * Shapes, blocks and options.
 *
 * Split out of `card.ts` to keep both inside the ~300-line convention (CLAUDE.md §9). This is
 * the vocabulary of what a graphic *is* — how big, which parts, which kind — with none of the
 * string building, which lives in `card-svg.ts`.
 *
 * Pure (CLAUDE.md §3). Re-exported from `card.ts`, so callers need one import.
 */

import type { CardKind } from './card-style';

export interface CardPreset {
  readonly id: CardPresetId;
  readonly label: string;
  /** What it is for, shown under the control. */
  readonly note: string;
  readonly width: number;
  readonly height: number;
}

export const CARD_PRESET_IDS = ['card', 'backdrop', 'briefing'] as const;
export type CardPresetId = (typeof CARD_PRESET_IDS)[number];

export const CARD_PRESETS: readonly CardPreset[] = [
  {
    id: 'card',
    label: 'Card',
    note: 'Portrait. Embeds as a tall image in a channel.',
    width: 1000,
    height: 1400,
  },
  {
    id: 'backdrop',
    label: 'Backdrop',
    note: "Wide banner, Discord's own 16:9 embed proportion.",
    width: 1200,
    height: 675,
  },
  {
    id: 'briefing',
    label: 'Briefing',
    note: 'Tall poster carrying the whole posting. Missions only.',
    width: 1000,
    height: 1600,
  },
];

/**
 * Which shapes a kind offers.
 *
 * A briefing is a mission's full posting laid out to be read, and means nothing for a
 * character or a clan — offering it everywhere would be three-quarters dead options.
 */
export function presetsForKind(kind: CardKind): readonly CardPreset[] {
  return CARD_PRESETS.filter((preset) => preset.id !== 'briefing' || kind === 'mission');
}

export function presetById(id: CardPresetId): CardPreset {
  // Every id in CARD_PRESET_IDS has an entry, and the test pins that, so the fallback is for
  // a hand-edited config.json rather than a reachable branch.
  return CARD_PRESETS.find((preset) => preset.id === id) ?? CARD_PRESETS[0]!;
}

/**
 * The blocks a card may carry, in the order they stack.
 *
 * One id set, three meanings. `stats` is a character's stat block, a clan's technique and
 * bonuses, and a mission's objectives — the same slot in the layout, carrying whatever that
 * kind's primary list is. Generic ids with per-kind labels, rather than fifteen ids of which
 * each kind uses five: the layouts share `card-blocks.ts`, so the slots are genuinely the
 * same slots.
 */
export const ALL_CARD_BLOCKS = [
  'portrait',
  'profile',
  'stats',
  'technique',
  'extra',
  'footer',
] as const;
export type CardBlock = (typeof ALL_CARD_BLOCKS)[number];

/** Which of them each kind actually has. A character has no third list; a mission does. */
export const CARD_BLOCKS: Record<CardKind, readonly CardBlock[]> = {
  character: ['portrait', 'profile', 'stats', 'technique', 'footer'],
  clan: ['portrait', 'profile', 'stats', 'technique', 'footer'],
  mission: ['portrait', 'profile', 'stats', 'technique', 'extra', 'footer'],
};

export const CARD_BLOCK_LABELS: Record<CardKind, Partial<Record<CardBlock, string>>> = {
  character: {
    portrait: 'Picture',
    profile: 'Grade, faction and clan',
    stats: 'Stat block',
    technique: 'Innate technique',
    footer: 'Affiliation and Cursed Rating',
  },
  clan: {
    portrait: 'Picture',
    profile: 'Seat, status and era',
    stats: 'Technique, bonuses and mutations',
    technique: 'Hierarchy',
    footer: 'Summary and vault',
  },
  mission: {
    portrait: 'Picture',
    profile: 'Type, grade, location and slots',
    stats: 'Objectives',
    technique: 'Rewards',
    extra: 'Complications',
    footer: 'Hosts and payout',
  },
};

/**
 * Where the picture is anchored when it is cropped to the band.
 *
 * The band almost never matches the picture's aspect, and `slice` crops rather than
 * letterboxes, so something is always lost. Centring loses it from the top and the bottom
 * equally, which decapitates an ordinary portrait — the subject's head is at the top of the
 * frame, not the middle. Hence a control rather than a fixed anchor, defaulting to the top.
 */
export const CARD_FOCUS_IDS = ['top', 'centre', 'bottom'] as const;
export type CardFocus = (typeof CARD_FOCUS_IDS)[number];

export const CARD_FOCUS_LABELS: Record<CardFocus, string> = {
  top: 'Top — keeps a face when the crop is tight',
  centre: 'Centre',
  bottom: 'Bottom',
};

export function focusAlignment(focus: CardFocus): string {
  const vertical = focus === 'top' ? 'YMin' : focus === 'bottom' ? 'YMax' : 'YMid';
  return `xMid${vertical} slice`;
}

/** Raster scales offered at export. The SVG is unaffected — it has no resolution. */
export const CARD_SCALES = [1, 2, 3] as const;
export type CardScale = (typeof CARD_SCALES)[number];

export interface CardOptions {
  readonly presetId: CardPresetId;
  readonly blocks: readonly CardBlock[];
  /** Overrides the record's own name. Empty means use the record's. */
  readonly title: string;
  /** A line under the title. Empty means use whatever the record suggests. */
  readonly subtitle: string;
  readonly focus: CardFocus;
  readonly scale: CardScale;
}

export function defaultCardOptions(kind: CardKind = 'character'): CardOptions {
  return {
    presetId: 'card',
    blocks: defaultBlocks(kind, 'card'),
    title: '',
    subtitle: '',
    focus: 'top',
    scale: 2,
  };
}

/**
 * What a kind shows by default on a given shape.
 *
 * A backdrop is short and wide, so it drops the primary list — a stat block or a set of
 * objectives does not fit beside a picture at 16:9 and crammed in reads worse than absent.
 */
export function defaultBlocks(kind: CardKind, preset: CardPresetId): readonly CardBlock[] {
  const all = CARD_BLOCKS[kind];
  return preset === 'backdrop' ? all.filter((block) => block !== 'stats' && block !== 'extra') : all;
}

export function hasBlock(options: CardOptions, block: CardBlock): boolean {
  return options.blocks.includes(block);
}
