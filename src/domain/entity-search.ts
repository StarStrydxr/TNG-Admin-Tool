/**
 * Searching and filtering the library.
 *
 * Pure (CLAUDE.md §3). The rank filter is *not* part of this — `visibleTo()` runs first and
 * separately, because narrowing a view and enforcing visibility are different jobs and mixing
 * them is how a record ends up in a count it should not be in (§4a).
 */

import type { GradeId } from './grades';
import { gradeAbbrev, gradeLabel } from './grades';
import type { Role } from './roles';
import { entityGrade, type SavedEntity } from './entities';

export interface LibraryFilter {
  /** Free text. Every term must match somewhere in the record. */
  readonly query: string;
  /** Exactly this grade, or `''` for any. */
  readonly grade: GradeId | '';
  /** Exactly this visibility, or `''` for any. */
  readonly minRole: Role | '';
  /** Only records with a picture. */
  readonly withImage: boolean;
}

export const EMPTY_FILTER: LibraryFilter = {
  query: '',
  grade: '',
  minRole: '',
  withImage: false,
};

export function isFilterActive(filter: LibraryFilter): boolean {
  return (
    filter.query.trim().length > 0 ||
    filter.grade !== '' ||
    filter.minRole !== '' ||
    filter.withImage
  );
}

/**
 * Fields kept out of the haystack.
 *
 * Ids and timestamps are machine text, and leaving them in breaks the all-terms rule in a way
 * nobody can see: a search for `ito grade 1` once matched a **Grade 3** record because the "1"
 * landed in a uuid. The same trap as `character-search.ts`, and the same answer. `generated`
 * stays in deliberately — searching by seed is useful.
 */
const NOT_SEARCHABLE = new Set(['id', 'schemaVersion', 'createdAt', 'updatedAt', 'image']);

/**
 * Everything about a record worth matching against, lowercased.
 *
 * Built from the record's own string and list fields rather than a hand-kept list, so a new
 * field is searchable the moment it exists — the same bargain `describeEntity()` makes. The
 * grade is included by both label and abbreviation, so "G2" and "grade 2" both find it.
 */
export function searchableText(entity: SavedEntity): string {
  const grade = entityGrade(entity);
  const parts: string[] = [entity.folder];
  if (grade) parts.push(gradeLabel(grade), gradeAbbrev(grade));

  for (const [key, value] of Object.entries(entity)) {
    if (NOT_SEARCHABLE.has(key)) continue;
    collectStrings(value, parts, 0);
  }

  return parts.join(' \u0000 ').toLowerCase();
}

/**
 * Every string anywhere in a record, down to a fixed depth.
 *
 * Recursive rather than one level deep because the structured kinds nest: a technique's
 * shikigami are objects in a list, and a clan's treasury is an object holding a list of
 * objects. Walking generically is what keeps the promise that a new field is searchable the
 * moment it exists. The depth cap is a guard against a cycle a hand-edited file could contain,
 * not a limit anyone should be designing against.
 */
function collectStrings(value: unknown, into: string[], depth: number): void {
  if (depth > 4) return;

  if (typeof value === 'string') {
    into.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into, depth + 1);
    return;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, into, depth + 1);
    }
  }
}

/** Terms are ANDed. Quoting is deliberately not supported — nobody would discover it. */
export function queryTerms(query: string): readonly string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

export function matchesFilter(entity: SavedEntity, filter: LibraryFilter): boolean {
  if (filter.grade !== '' && entityGrade(entity) !== filter.grade) return false;
  if (filter.minRole !== '' && entity.minRole !== filter.minRole) return false;
  if (filter.withImage && !entity.image) return false;

  const terms = queryTerms(filter.query);
  if (terms.length === 0) return true;

  const haystack = searchableText(entity);
  return terms.every((term) => haystack.includes(term));
}

export function applyFilter(
  entities: readonly SavedEntity[],
  filter: LibraryFilter,
): readonly SavedEntity[] {
  if (!isFilterActive(filter)) return entities;
  return entities.filter((entity) => matchesFilter(entity, filter));
}

/** Grades actually present, so the filter offers real choices rather than all fourteen rungs. */
export function gradesPresent(entities: readonly SavedEntity[]): readonly GradeId[] {
  const seen = new Set<GradeId>();
  for (const entity of entities) {
    const grade = entityGrade(entity);
    if (grade) seen.add(grade);
  }
  return [...seen];
}
