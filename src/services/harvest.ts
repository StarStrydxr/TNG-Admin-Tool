/**
 * Reading Dan's own material in, and writing the approved entries out.
 *
 * Approved fragments land in one user table file, `my-material.json`, which the loader already
 * merges over canon by id (CLAUDE.md §5). Canon is untouched, the file is readable and
 * hand-editable like any other user table, and deleting it undoes the whole import.
 */

import { toUserTables, type Fragment } from '../domain/harvest';
import type { TableEntry, TableId } from '../domain/tables';
import { call } from './transport';

/** One file, so an import is easy to find, inspect and throw away. */
export const HARVEST_FILE = 'my-material';

interface FoundNote {
  readonly path: string;
  readonly content: string;
}

interface RawUserTables {
  readonly files: readonly { readonly name: string; readonly tables: unknown }[];
  readonly directory: string;
}

/** Read every markdown file in a folder — the same reader the Obsidian import uses. */
export async function readMaterial(directory: string): Promise<readonly FoundNote[]> {
  return call<readonly FoundNote[]>('notes_read', { dir: directory });
}

/** What `my-material.json` currently holds, so an import adds rather than replaces. */
export async function currentHarvest(): Promise<Record<TableId, readonly TableEntry[]>> {
  try {
    const raw = await call<RawUserTables>('tables_list');
    const file = raw.files.find((candidate) => candidate.name === HARVEST_FILE);
    if (!file || typeof file.tables !== 'object' || file.tables === null) return {};

    const out: Record<TableId, readonly TableEntry[]> = {};
    for (const [tableId, entries] of Object.entries(file.tables as Record<string, unknown>)) {
      if (!Array.isArray(entries)) continue;
      out[tableId] = entries.filter(
        (entry): entry is TableEntry =>
          typeof entry === 'object' && entry !== null && 'id' in entry && 'value' in entry,
      );
    }
    return out;
  } catch {
    // No Rust side, or nothing written yet. Either way there is nothing to merge onto.
    return {};
  }
}

export interface SaveResult {
  readonly path: string;
  readonly added: number;
}

export async function saveHarvest(
  approved: readonly Fragment[],
  current: Record<TableId, readonly TableEntry[]>,
): Promise<SaveResult> {
  const before = Object.values(current).reduce((sum, entries) => sum + entries.length, 0);
  const tables = toUserTables(approved, current);
  const after = Object.values(tables).reduce((sum, entries) => sum + entries.length, 0);

  const path = await call<string>('tables_save', {
    name: HARVEST_FILE,
    content: `${JSON.stringify(tables, null, 2)}\n`,
  });

  return { path, added: after - before };
}
