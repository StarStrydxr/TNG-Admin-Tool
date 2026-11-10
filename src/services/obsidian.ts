/**
 * Obsidian vault export and import.
 *
 * Both work against an ordinary local folder, which is the whole trick for cloud sync: the
 * Google Drive and OneDrive desktop clients keep a folder on disk in step with the cloud, so
 * pointing this at `G:\My Drive\JJK` gives you a synced vault with **no network code in this
 * app at all**. The offline-first rule in CLAUDE.md §1 stays intact, and there are no tokens
 * to expire, no OAuth, and nothing to break when an API changes.
 */

import { buildLinkIndex, type LinkIndex } from '../domain/links';
import { noteIdentity, noteName, parseNote, toNote } from '../domain/obsidian';
import { emptyReport, mergeNote, type ImportReport, type MergeResult } from '../domain/obsidian-merge';
import { isCharacter } from '../domain/sheet';
import type { Character } from '../domain/character';
import type { SavedEntity } from '../domain/entities';
import { call } from './transport';

export type Exportable = SavedEntity | Character;

interface FoundNote {
  readonly path: string;
  readonly content: string;
}

export interface VaultExportResult {
  readonly written: number;
  readonly directory: string;
}

/** Names for every record, so links can be written as readable wikilinks. */
function nameIndex(records: readonly Exportable[]): ReadonlyMap<string, string> {
  const index: LinkIndex = buildLinkIndex(records);
  const names = new Map<string, string>();
  for (const [id, target] of index) names.set(id, target.name);
  return names;
}

/**
 * Write records as an Obsidian vault.
 *
 * Folders mirror the records' own, so a vault organised into arcs arrives organised into arcs.
 * Characters go to a `Characters/` folder, since they have no folder of their own.
 */
export async function exportVault(
  records: readonly Exportable[],
  destination: string,
): Promise<VaultExportResult> {
  const linkNames = nameIndex(records);
  let written = 0;
  let directory = '';

  for (const record of records) {
    const folder = isCharacter(record) ? 'Characters' : record.folder;
    const content = toNote(record, { linkNames });

    const path = await call<string>('export_write', {
      folder,
      stem: noteName(record),
      content,
      destination,
    });

    written += 1;
    directory = path;
  }

  return { written, directory };
}

/**
 * Read a folder of markdown and merge what it says onto the records already in the vault.
 *
 * Nothing is written here — the caller decides whether to save, which keeps "see what would
 * change" and "change it" separate actions.
 */
export async function readVault(
  directory: string,
  existing: readonly SavedEntity[],
): Promise<ImportReport> {
  const notes = await call<readonly FoundNote[]>('notes_read', { dir: directory });
  const byId = new Map(existing.map((entity) => [entity.id, entity]));

  const updated: MergeResult[] = [];
  const orphaned: string[] = [];
  let unchanged = 0;
  let foreign = 0;

  for (const note of notes) {
    const parsed = parseNote(note.content);
    const identity = noteIdentity(parsed);

    // Not one of ours: someone's own notes living in the same vault. Left strictly alone.
    if (!identity) {
      foreign += 1;
      continue;
    }

    const entity = byId.get(identity.id);
    if (!entity) {
      orphaned.push(note.path);
      continue;
    }

    const result = mergeNote(entity, parsed);
    if (result.changed.length === 0) unchanged += 1;
    else updated.push(result);
  }

  return { ...emptyReport(), updated, unchanged, orphaned, foreign };
}
