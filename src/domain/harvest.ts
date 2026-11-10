/**
 * Turning Dan's own writing into table entries.
 *
 * ## What this is, and what it is not
 *
 * The generators are **deterministic table rolls**, not a model that learns. There is nothing
 * here that trains on anything. "Generation that fits what we need" means one concrete thing:
 * getting his vocabulary into the pools the generators draw from, so a rolled mission reads
 * like one of his rather than like one of mine.
 *
 * So this reads text he has written, splits it into fragments, works out which table each
 * belongs in, and proposes them. He approves; approved entries are written to the **user
 * table overlay**, which already merges over canon by id (CLAUDE.md §5). Canon is never
 * touched.
 *
 * ## How a fragment finds its table
 *
 * Only from structure he actually wrote — never from guessing at the content:
 *
 *   * `Location: a parcel depot` — an inline label.
 *   * A `## Complications` heading, with the bullets or paragraphs under it.
 *
 * Labels and headings are matched against the **generator specs**, so the mapping cannot drift
 * from the fields that exist. Anything with no structure to go on is returned unassigned for
 * him to place by hand or discard. A keyword guesser would be the obvious next step and a bad
 * one: silently filing "the client was nervous" under `client` produces tables full of
 * near-misses, and nobody audits a hundred of those.
 *
 * Pure (CLAUDE.md §3).
 */

import type { GeneratorSpec } from '../generators/draft';
import type { TableEntry, TableId, TableSet } from './tables';
import { tableEntries } from './tables';

export interface HarvestTarget {
  readonly tableId: TableId;
  readonly label: string;
}

/**
 * Label → table, built from the specs so it always matches the fields that exist.
 *
 * Both the field label ("Briefing says") and the field key ("briefing") are accepted, because
 * someone's own notes are more likely to say `Briefing:` than `Briefing says:`.
 */
export function harvestTargets(specs: readonly GeneratorSpec[]): ReadonlyMap<string, HarvestTarget> {
  const targets = new Map<string, HarvestTarget>();

  for (const spec of specs) {
    for (const field of spec.fields) {
      const target: HarvestTarget = { tableId: field.tableId, label: field.label };
      for (const alias of [field.label, field.key]) {
        const normalised = normaliseLabel(alias);
        // First spec wins, so an earlier generator's "Location" is not redefined by a later one.
        if (normalised && !targets.has(normalised)) targets.set(normalised, target);
      }
    }
  }

  return targets;
}

/**
 * Fold a written label to something comparable.
 *
 * The NFKC pass is what lets the server's formats be read at all. Discord headers are typed in
 * mathematical alphanumerics — `𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍` is U+1D403 and friends, not `D`, `E`, `S` — so
 * stripping to `[a-z0-9]` without normalising first reduces every one of them to the empty
 * string and nothing ever matches. NFKC maps them back to ASCII, and does the same for the
 * fullwidth and sans-serif variants, so a label pasted straight out of Discord matches the same
 * field as one typed plainly.
 */
export function normaliseLabel(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[*_`#]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Wrappers the server's formats use around a section heading.
 *
 * `➤ 『𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍』`, `«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»`, `` `[ Reversal ]` `` — all of them mean the same thing as
 * `## Description` and should set the context for the lines beneath exactly as a `#` heading
 * does. The pair must enclose the *whole* line, so a sentence that happens to quote something
 * is not mistaken for a heading.
 */
const HEADING_WRAPPERS: readonly (readonly [string, string])[] = [
  ['『', '』'],
  ['«', '»'],
  ['《', '》'],
  ['【', '】'],
  ['[', ']'],
];

/** The label a line is announcing, or null when the line is ordinary content. */
function headingLabel(line: string): string | null {
  const hashes = /^#{1,6}\s+(.*)$/.exec(line);
  if (hashes) return hashes[1] as string;

  const bare = line.replace(/^[\s➤⋙⋘▸▹▪►»>•\-*_`]+/u, '').replace(/[\s*_`]+$/u, '');
  for (const [open, close] of HEADING_WRAPPERS) {
    if (bare.length > open.length + close.length && bare.startsWith(open) && bare.endsWith(close)) {
      return bare.slice(open.length, -close.length);
    }
  }
  return null;
}

/**
 * Find the field a written label names.
 *
 * Tried twice, because the server's templates carry their own guidance inside the heading —
 * `𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲 (Can be many different types of objectives, typically 1-3)`. The aside is
 * instructions to whoever is filling the form in, not part of the field name.
 */
function lookup(
  targets: ReadonlyMap<string, HarvestTarget>,
  text: string,
): HarvestTarget | null {
  const direct = targets.get(normaliseLabel(text));
  if (direct) return direct;

  const withoutAside = text.replace(/\s*[(（][^)）]*[)）]\s*$/u, '');
  if (withoutAside && withoutAside !== text) {
    return targets.get(normaliseLabel(withoutAside)) ?? null;
  }
  return null;
}

export type FragmentSource = 'label' | 'heading';

export interface Fragment {
  readonly text: string;
  /** Null when nothing in the document said where this belongs. */
  readonly tableId: TableId | null;
  readonly label: string;
  readonly source: FragmentSource | 'none';
  /** True when an entry with this text is already in the table. */
  readonly duplicate: boolean;
}

/** Too short to be a useful table entry — a stray word, a heading echo. */
const MIN_LENGTH = 12;
/** Longer than this is a passage, not a fragment; tables want evocative lines (§5). */
const MAX_LENGTH = 320;

function cleanLine(line: string): string {
  return line
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split written material into candidate table entries.
 *
 * `existing` is the live table set, used only to mark duplicates — a fragment already in the
 * pool is shown and skipped rather than silently dropped, so the count he sees adds up.
 */
export function harvest(
  text: string,
  targets: ReadonlyMap<string, HarvestTarget>,
  existing: TableSet,
): readonly Fragment[] {
  const fragments: Fragment[] = [];
  const seen = new Set<string>();

  let heading: HarvestTarget | null = null;

  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // A fence is punctuation around a block, not a line of it. The mission format wraps its
    // briefing in one, and the briefing itself is worth keeping.
    if (/^(```|~~~)/.test(line)) continue;

    // A heading sets the context for the lines beneath it, and is never an entry itself.
    const announced = headingLabel(line);
    if (announced !== null) {
      heading = lookup(targets, announced);
      continue;
    }

    // `Label: value`, with or without markdown emphasis. The colon must come early, or an
    // ordinary sentence containing a colon would be read as a label.
    const labelMatch = /^([^:]{2,40}):\s*(.+)$/.exec(cleanLine(line));
    if (labelMatch) {
      const target = lookup(targets, labelMatch[1] as string);
      if (target) {
        push(labelMatch[2] as string, target, 'label');
        continue;
      }
    }

    push(cleanLine(line), heading, heading ? 'heading' : 'none');
  }

  return fragments;

  function push(value: string, target: HarvestTarget | null, source: FragmentSource | 'none') {
    const trimmed = value.trim().replace(/[.,;]$/, '');
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) return;

    // The same line twice in one document is one candidate.
    const fingerprint = `${target?.tableId ?? ''}::${trimmed.toLowerCase()}`;
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);

    fragments.push({
      text: trimmed,
      tableId: target?.tableId ?? null,
      label: target?.label ?? '',
      source,
      duplicate: target ? isDuplicate(existing, target.tableId, trimmed) : false,
    });
  }
}

function isDuplicate(existing: TableSet, tableId: TableId, text: string): boolean {
  const normalised = text.trim().toLowerCase();
  return tableEntries(existing, tableId).some(
    (entry) => entry.value.trim().toLowerCase() === normalised,
  );
}

/** A stable, readable id from the text itself, so re-importing does not duplicate an entry. */
export function entryId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 5)
    .join('-');

  // A short hash keeps two fragments with the same opening words apart.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `mine-${slug || 'entry'}-${(hash >>> 0).toString(36).slice(0, 4)}`;
}

/**
 * Build the user table file from approved fragments.
 *
 * Merged over whatever the user file already holds, by id, so importing twice is idempotent
 * and nothing previously added is lost.
 */
export function toUserTables(
  fragments: readonly Fragment[],
  current: Readonly<Record<TableId, readonly TableEntry[]>> = {},
): Record<TableId, TableEntry[]> {
  const out: Record<TableId, TableEntry[]> = {};
  for (const [tableId, entries] of Object.entries(current)) out[tableId] = [...entries];

  for (const fragment of fragments) {
    if (!fragment.tableId || fragment.duplicate) continue;

    const id = entryId(fragment.text);
    const list = (out[fragment.tableId] ??= []);
    const at = list.findIndex((entry) => entry.id === id);

    // `source` is stamped by the loader, never written by hand (§5).
    const entry = { id, value: fragment.text } as TableEntry;
    if (at === -1) list.push(entry);
    else list[at] = entry;
  }

  return out;
}

export interface HarvestSummary {
  readonly total: number;
  readonly assigned: number;
  readonly unassigned: number;
  readonly duplicates: number;
  /** Table id → how many new entries it would gain. */
  readonly perTable: ReadonlyMap<TableId, number>;
}

export function summarise(fragments: readonly Fragment[]): HarvestSummary {
  const perTable = new Map<TableId, number>();
  let assigned = 0;
  let duplicates = 0;

  for (const fragment of fragments) {
    if (fragment.duplicate) {
      duplicates += 1;
      continue;
    }
    if (!fragment.tableId) continue;

    assigned += 1;
    perTable.set(fragment.tableId, (perTable.get(fragment.tableId) ?? 0) + 1);
  }

  return {
    total: fragments.length,
    assigned,
    unassigned: fragments.length - assigned - duplicates,
    duplicates,
    perTable,
  };
}
