/**
 * Reader for table JSON, canon and user alike.
 *
 * A malformed user file must degrade to "this file was skipped" and never to a blank app
 * (CLAUDE.md §5), so nothing here throws: bad entries are dropped and reported.
 *
 * File shape: `{ "<tableId>": [ { id, value, weight?, grades?, tags? }, … ] }`
 */

import { isGradeId, type GradeId } from './grades';
import type { EntrySource, TableEntry, TableFile, TableId } from './tables';

export interface TableIssue {
  readonly table: TableId;
  readonly entry: string;
  readonly reason: string;
}

export interface ParsedTableFile {
  readonly file: TableFile;
  readonly issues: readonly TableIssue[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseGrades(value: unknown): readonly GradeId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const grades = value.filter((item): item is GradeId => typeof item === 'string' && isGradeId(item));
  return grades.length > 0 ? grades : undefined;
}

function parseTags(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value.filter((item): item is string => typeof item === 'string');
  return tags.length > 0 ? tags : undefined;
}

export function parseTableFile(raw: unknown, source: EntrySource): ParsedTableFile {
  const root = asRecord(raw);
  const file: Record<TableId, TableEntry[]> = {};
  const issues: TableIssue[] = [];

  for (const [tableId, rawEntries] of Object.entries(root)) {
    if (!Array.isArray(rawEntries)) {
      issues.push({ table: tableId, entry: '—', reason: 'Expected an array of entries' });
      continue;
    }

    const entries: TableEntry[] = [];
    const seen = new Set<string>();

    rawEntries.forEach((rawEntry, index) => {
      const entry = asRecord(rawEntry);
      const id = typeof entry['id'] === 'string' ? entry['id'].trim() : '';
      const value = typeof entry['value'] === 'string' ? entry['value'].trim() : '';
      const label = id || `#${index}`;

      if (!id) {
        issues.push({ table: tableId, entry: label, reason: 'Missing id' });
        return;
      }
      if (!value) {
        issues.push({ table: tableId, entry: label, reason: 'Missing value' });
        return;
      }
      if (seen.has(id)) {
        issues.push({ table: tableId, entry: label, reason: 'Duplicate id in the same file' });
        return;
      }
      seen.add(id);

      const rawWeight = entry['weight'];
      const weight =
        typeof rawWeight === 'number' && Number.isFinite(rawWeight) && rawWeight > 0
          ? rawWeight
          : undefined;
      if (rawWeight !== undefined && weight === undefined) {
        issues.push({ table: tableId, entry: label, reason: 'Weight must be a positive number' });
      }

      const grades = parseGrades(entry['grades']);
      const tags = parseTags(entry['tags']);
      const rawNote = entry['note'];
      const note = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim() : undefined;

      entries.push({
        id,
        value,
        source,
        ...(weight !== undefined ? { weight } : {}),
        ...(grades !== undefined ? { grades } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(note !== undefined ? { note } : {}),
      });
    });

    if (entries.length > 0) file[tableId] = entries;
  }

  return { file, issues };
}
