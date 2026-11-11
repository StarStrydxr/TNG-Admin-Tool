/**
 * What is quietly wrong across the vault.
 *
 * Everything here is already knowable from records on disk — nothing is new information. The
 * value is that nobody goes looking: a link whose target was deleted, a portrait whose file
 * someone cleared out of the images folder, two characters with the same name. Each is
 * harmless on its own and each one is found a month later at the worst moment.
 *
 * **A problem is a note, never a block.** Nothing here prevents saving, and several of these
 * are legitimate on purpose — a record over its slot limit is a soft warning by design
 * (CLAUDE.md §4), and a missing picture is "never an error" (§9). So the panel reports and
 * stops there. A checker that nagged about deliberate choices would be turned off inside a
 * week, and then it would not be there for the one that mattered.
 *
 * Pure (CLAUDE.md §3).
 */

import { artSlotUsage, characterDisplayName, traitSlotUsage, type Character } from './character';
import { slotTakingMutations } from './clans';
import type { Clan } from './entities';
import { entityDisplayName, type SavedEntity } from './entities';
import { buildLinkIndex, type LinkIndex } from './links';
import { isCharacter } from './sheet';

export type ProblemKind =
  | 'dangling-link'
  | 'missing-image'
  | 'duplicate-name'
  | 'unnamed'
  | 'over-slots'
  | 'orphan-seat'
  | 'unfiled-but-foldered';

export const PROBLEM_LABELS: Record<ProblemKind, string> = {
  'dangling-link': 'Link to something that is gone',
  'missing-image': 'Picture file missing',
  'duplicate-name': 'Two records with one name',
  unnamed: 'No name',
  'over-slots': 'Over the slot limit',
  'orphan-seat': 'Seat held by a deleted character',
  'unfiled-but-foldered': 'Folder written but empty',
};

export interface Problem {
  readonly kind: ProblemKind;
  /** The record this is about. */
  readonly recordId: string;
  readonly recordName: string;
  /** Which collection it lives in, for the jump. */
  readonly recordKind: string;
  readonly detail: string;
}

export interface ProblemInput {
  readonly records: readonly (SavedEntity | Character)[];
  /**
   * Image file names that actually exist on disk.
   *
   * Passed in rather than read here, because this module is pure. `null` means the caller
   * could not find out — without the shell, say — and the image check is then skipped rather
   * than reporting every picture as missing.
   */
  readonly imageNames: ReadonlySet<string> | null;
}

function nameOf(record: SavedEntity | Character): string {
  return isCharacter(record) ? characterDisplayName(record) : entityDisplayName(record);
}

function imageOf(record: SavedEntity | Character): string {
  return isCharacter(record) ? record.portrait : record.image;
}

function rawName(record: SavedEntity | Character): string {
  return record.name.trim();
}

function danglingLinks(
  record: SavedEntity | Character,
  index: LinkIndex,
): readonly Problem[] {
  // Only entities carry links; characters may be targets (CLAUDE.md §9).
  if (isCharacter(record)) return [];

  return record.links
    .filter((link) => !index.has(link.id))
    .map((link) => ({
      kind: 'dangling-link' as const,
      recordId: record.id,
      recordName: nameOf(record),
      recordKind: record.kind,
      detail: `Points at "${link.label || link.id}", which is no longer in the vault.`,
    }));
}

export function findProblems({ records, imageNames }: ProblemInput): readonly Problem[] {
  const index = buildLinkIndex(records);
  const problems: Problem[] = [];
  // The clans travel in the same list, so a mutation's trait-slot cost is reachable here
  // without this module reading anything — it stays pure.
  const clans = records.filter((record): record is Clan => record.kind === 'clan');

  // Names are compared case-insensitively and only among records of the same kind — a curse
  // and a mission sharing a name is ordinary, two curses sharing one is a filing mistake.
  const byName = new Map<string, (SavedEntity | Character)[]>();
  for (const record of records) {
    const key = `${record.kind}\u0000${rawName(record).toLowerCase()}`;
    if (!rawName(record)) continue;
    const bucket = byName.get(key);
    if (bucket) bucket.push(record);
    else byName.set(key, [record]);
  }

  for (const record of records) {
    problems.push(...danglingLinks(record, index));

    const image = imageOf(record);
    if (imageNames && image && !imageNames.has(image)) {
      problems.push({
        kind: 'missing-image',
        recordId: record.id,
        recordName: nameOf(record),
        recordKind: record.kind,
        detail: `${image} is not in the images folder.`,
      });
    }

    if (!rawName(record)) {
      problems.push({
        kind: 'unnamed',
        recordId: record.id,
        recordName: nameOf(record),
        recordKind: record.kind,
        detail: 'Saved without a name, so it is hard to find anywhere but here.',
      });
    }

    // A seat's `holderId` is not an `EntityLink`, so the dangling-link check above cannot see
    // it — and a clan quietly claiming a deleted character still sits in its Clan Head seat is
    // exactly the kind of thing nobody notices until it matters. The seat itself is fine; only
    // the claim is stale, which is why this reports rather than clearing anything.
    if (!isCharacter(record) && record.kind === 'clan') {
      for (const seat of record.hierarchy) {
        if (!seat.holderId || index.has(seat.holderId)) continue;
        problems.push({
          kind: 'orphan-seat',
          recordId: record.id,
          recordName: nameOf(record),
          recordKind: record.kind,
          detail: `${seat.title || 'A seat'} is held by "${
            seat.holder || seat.holderId
          }", who is no longer in the vault.`,
        });
      }
    }

    if (isCharacter(record)) {
      // The clan records are in the same list, so the mutation cost is reachable without the
      // module reading anything — it stays pure.
      const traits = traitSlotUsage(
        record,
        slotTakingMutations(clans, record.clan, record.mutations).length,
      );
      const arts = artSlotUsage(record);
      if (traits.overBy > 0) {
        problems.push({
          kind: 'over-slots',
          recordId: record.id,
          recordName: nameOf(record),
          recordKind: record.kind,
          detail: `${traits.used} traits in ${traits.total} slots.`,
        });
      }
      if (arts.overBy > 0) {
        problems.push({
          kind: 'over-slots',
          recordId: record.id,
          recordName: nameOf(record),
          recordKind: record.kind,
          detail: `${arts.used} arts in ${arts.total} slots.`,
        });
      }
    }
  }

  for (const bucket of byName.values()) {
    if (bucket.length < 2) continue;
    for (const record of bucket) {
      problems.push({
        kind: 'duplicate-name',
        recordId: record.id,
        recordName: nameOf(record),
        recordKind: record.kind,
        detail: `${bucket.length} records of this kind share this name.`,
      });
    }
  }

  return problems;
}

/** Problems grouped by kind, in the order `PROBLEM_LABELS` declares, for the panel. */
export function groupProblems(
  problems: readonly Problem[],
): readonly (readonly [ProblemKind, readonly Problem[]])[] {
  return (Object.keys(PROBLEM_LABELS) as ProblemKind[])
    .map((kind) => [kind, problems.filter((problem) => problem.kind === kind)] as const)
    .filter(([, found]) => found.length > 0);
}
