/**
 * Generator tables.
 *
 * A table is a pool of weighted entries. Canon ships with the app; the user's own entries live
 * in %APPDATA% and are merged over canon by entry id — same id overrides, new id adds, and
 * canon is never rewritten (CLAUDE.md §5).
 *
 * Pure. Loading is `services/tables.ts`; this file only models and merges.
 */

import type { GradeId } from './grades';

export type TableId = string;

export type EntrySource = 'canon' | 'user';

export interface TableEntry {
  readonly id: string;
  readonly value: string;
  /** Relative draw weight. Absent means 1. */
  readonly weight?: number;
  /** Grades allowed to draw this entry. Absent means all. */
  readonly grades?: readonly GradeId[];
  /** Used for coherence filtering between fields. */
  readonly tags?: readonly string[];
  /**
   * Secondary text, shown as a subtitle where an entry is picked rather than rolled.
   * Never part of the generated value.
   */
  readonly note?: string;
  /** Set by the loader, never written by hand. */
  readonly source: EntrySource;
}

/** One file's worth of tables: `{ "<tableId>": [entry, …] }`. */
export type TableFile = Readonly<Record<TableId, readonly TableEntry[]>>;

export interface TableSet {
  readonly tables: Readonly<Record<TableId, readonly TableEntry[]>>;
  /** Changes whenever the loaded content changes, so drafts can record what they rolled against. */
  readonly version: string;
}

export const EMPTY_TABLE_SET: TableSet = { tables: {}, version: 'empty' };

export function tableEntries(set: TableSet, id: TableId): readonly TableEntry[] {
  return set.tables[id] ?? [];
}

export function tableIds(set: TableSet): readonly TableId[] {
  return Object.keys(set.tables).sort();
}

/**
 * Entries this grade may draw. An entry with no `grades` is always eligible.
 *
 * If a filter would empty the pool the unfiltered pool is returned instead — a thin table
 * should still produce something rather than leaving a blank field.
 */
export function entriesForGrade(
  entries: readonly TableEntry[],
  grade: GradeId | null,
): readonly TableEntry[] {
  if (grade === null) return entries;

  const eligible = entries.filter(
    (entry) => entry.grades === undefined || entry.grades.includes(grade),
  );
  return eligible.length > 0 ? eligible : entries;
}

/**
 * Merge table files in order. Later files win on a clashing entry id, which is what makes the
 * user overlay an override rather than a duplicate.
 */
export function mergeTableFiles(files: readonly TableFile[]): Record<TableId, TableEntry[]> {
  const merged: Record<TableId, TableEntry[]> = {};

  for (const file of files) {
    for (const [tableId, entries] of Object.entries(file)) {
      const target = merged[tableId] ?? [];
      for (const entry of entries) {
        const existing = target.findIndex((candidate) => candidate.id === entry.id);
        if (existing >= 0) target[existing] = entry;
        else target.push(entry);
      }
      merged[tableId] = target;
    }
  }

  return merged;
}

/** Cheap content fingerprint, recorded on every draft so a roll can be traced to its tables. */
export function tableSetVersion(tables: Readonly<Record<TableId, readonly TableEntry[]>>): string {
  const ids = Object.keys(tables).sort();
  const count = ids.reduce((sum, id) => sum + (tables[id]?.length ?? 0), 0);
  return `${ids.length}t-${count}e`;
}

export function buildTableSet(files: readonly TableFile[]): TableSet {
  const tables = mergeTableFiles(files);
  return { tables, version: tableSetVersion(tables) };
}

/** A table named by a spec but absent or empty. Surfaced in the UI as a gap to fill. */
export function missingTables(set: TableSet, required: readonly TableId[]): readonly TableId[] {
  return required.filter((id) => tableEntries(set, id).length === 0);
}
