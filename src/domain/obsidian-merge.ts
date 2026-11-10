/**
 * Bringing Obsidian edits back.
 *
 * The rule that makes this safe: **import merges onto the record already in the vault, it does
 * not reconstruct one.** A note carries the fields it carries; anything it does not mention is
 * left exactly as it was. So deleting a heading in Obsidian loses nothing, and a note that has
 * drifted from the app's format degrades to "these three fields updated" rather than to a
 * record with holes in it.
 *
 * A note whose id matches nothing in the vault is reported, not invented: creating records
 * from arbitrary markdown is a different and much riskier feature than syncing edits.
 *
 * Pure (CLAUDE.md §3).
 */

import type { SavedEntity } from './entities';
import { describeEntity } from './entities-display';
import { normaliseFolder } from './entities';
import { sectionList, type ParsedNote } from './obsidian';

export interface MergeResult {
  readonly entity: SavedEntity;
  /** Field keys that actually changed, for reporting. Empty means the note had no news. */
  readonly changed: readonly string[];
}

/**
 * Fields a note must never write back.
 *
 * `grade` is rendered through `gradeLabel()` for reading, so the body says "Grade 2" where the
 * record stores `grade-2`. Merging that back would put a display string into a typed field and
 * corrupt every imported record. Identity and grade come from frontmatter or stay put; the
 * body is prose only.
 */
const NEVER_MERGED = new Set(['grade', 'links']);

/**
 * Whether a section can be merged into this property at all.
 *
 * Only plain strings and arrays of plain strings. A technique's `shikigami` is an array of
 * *objects* rendered as "Name — form" for reading; splitting that text back into the array
 * would replace structured records with strings.
 */
function mergeKind(
  entity: SavedEntity,
  key: string,
): 'text' | 'list' | 'skip' {
  const current = (entity as unknown as Record<string, unknown>)[key];
  if (typeof current === 'string') return 'text';
  if (Array.isArray(current) && current.every((item) => typeof item === 'string')) return 'list';
  return 'skip';
}

/**
 * Apply a note's headings and filing to an existing record.
 *
 * Headings are matched by the labels `describeEntity` produced when the note was written, so
 * the mapping cannot drift from the export: both read the same source.
 */
export function mergeNote(entity: SavedEntity, note: ParsedNote): MergeResult {
  const patch: Record<string, unknown> = {};
  const changed: string[] = [];

  for (const field of describeEntity(entity)) {
    if (NEVER_MERGED.has(field.key)) continue;

    const section = note.sections.get(field.label);
    if (section === undefined) continue;

    const kind = mergeKind(entity, field.key);
    if (kind === 'skip') continue;

    const current = (entity as unknown as Record<string, unknown>)[field.key];

    if (kind === 'list') {
      const next = sectionList(section);
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        patch[field.key] = next;
        changed.push(field.key);
      }
    } else if (section.trim() !== (current as string).trim()) {
      patch[field.key] = section.trim();
      changed.push(field.key);
    }
  }

  const notes = note.sections.get('Notes');
  if (notes !== undefined && notes.trim() !== entity.notes.trim()) {
    patch['notes'] = notes.trim();
    changed.push('notes');
  }

  // Filing travels too — moving a note between folders in Obsidian should move the record.
  const folder = note.frontmatter['folder'];
  if (typeof folder === 'string') {
    const next = normaliseFolder(folder);
    if (next !== entity.folder) {
      patch['folder'] = next;
      changed.push('folder');
    }
  }

  return { entity: { ...entity, ...patch } as SavedEntity, changed };
}

export interface ImportReport {
  /** Records that changed, ready to save. */
  readonly updated: readonly MergeResult[];
  /** Notes that matched a record but said nothing new. */
  readonly unchanged: number;
  /** Notes written by this app whose record is no longer in the vault. */
  readonly orphaned: readonly string[];
  /** Files skipped because they are not ours — someone's own notes in the same vault. */
  readonly foreign: number;
}

export function emptyReport(): ImportReport {
  return { updated: [], unchanged: 0, orphaned: [], foreign: 0 };
}
