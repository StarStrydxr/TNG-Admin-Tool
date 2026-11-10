/**
 * Obsidian vault format: writing records out, and reading edits back.
 *
 * An Obsidian vault is a folder of markdown files, which is exactly what this app already
 * exports. What makes it a *vault* rather than a pile of markdown is three things: YAML
 * frontmatter so properties are queryable, `[[wikilinks]]` so the graph works, and folders
 * that mirror the structure. All three are offline; nothing here touches a network.
 *
 * ## Why the split between frontmatter and body
 *
 * **Frontmatter is identity and metadata. The body is content, under one heading per field.**
 *
 * The alternative — everything in frontmatter — round-trips perfectly but gives you a vault
 * that is unpleasant to read and impossible to edit comfortably, which defeats the point of
 * putting it in Obsidian. Putting everything in the body reads well but cannot survive a round
 * trip, because nothing says which paragraph was which field.
 *
 * So: the id and the filing live in frontmatter where Obsidian can query them and a human
 * rarely needs to touch them; the prose lives under `## Field` headings where it can be
 * edited. Import reads both. The failure mode is a renamed or deleted heading, which loses
 * that one field rather than the record — recoverable, and explainable.
 *
 * Pure (CLAUDE.md §3). The caller does the file I/O.
 */

import { CHARACTER_KIND_LABELS, characterDisplayName, type Character } from './character';
import {
  ENTITY_LABELS,
  entityDisplayName,
  entityGrade,
  type EntityKind,
  type SavedEntity,
} from './entities';
import { describeEntity } from './entities-display';
import { gradeLabel, isGradeId, type GradeId } from './grades';
import { isRole, type Role } from './roles';
import { isCharacter } from './sheet';

export type Exportable = SavedEntity | Character;

/** Marks a file as ours, so import can skip a user's own notes sitting in the same vault. */
export const VAULT_MARKER = 'jjk-vault';

/* ------------------------------------------------------------------ writing */

/**
 * A YAML scalar, quoted when it has to be.
 *
 * Deliberately small: the values here are names, grades and ids, not arbitrary documents. A
 * value containing a newline is folded to a space rather than emitted as a block scalar —
 * frontmatter holds metadata, and metadata with line breaks in it is a mistake upstream.
 */
export function yamlScalar(value: string): string {
  const flat = value.replace(/\s*\n\s*/g, ' ').trim();
  if (flat === '') return "''";

  const needsQuotes =
    /^[\s>|*&!%@`,[\]{}#?-]/.test(flat) ||
    /: /.test(flat) ||
    /\s$/.test(flat) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(flat) ||
    /^-?\d+(\.\d+)?$/.test(flat);

  return needsQuotes ? `'${flat.replace(/'/g, "''")}'` : flat;
}

function yamlList(values: readonly string[]): string {
  if (values.length === 0) return '[]';
  return `\n${values.map((value) => `  - ${yamlScalar(value)}`).join('\n')}`;
}

/** A file name safe on Windows and unambiguous as a wikilink target. */
export function noteName(record: Exportable): string {
  const raw = isCharacter(record) ? characterDisplayName(record) : entityDisplayName(record);

  const cleaned = raw
    .replace(/[\\/:*?"<>|[\]#^]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
    .slice(0, 80)
    .trim();

  return cleaned || 'Untitled record';
}

function kindOf(record: Exportable): string {
  return record.kind;
}

function labelOf(record: Exportable): string {
  return isCharacter(record)
    ? CHARACTER_KIND_LABELS[record.kind]
    : ENTITY_LABELS[record.kind as EntityKind];
}

export interface NoteOptions {
  /** Resolved names for this record's links, so they can be written as wikilinks. */
  readonly linkNames?: ReadonlyMap<string, string>;
}

/**
 * One record as an Obsidian note.
 *
 * Characters are written with the same frontmatter but no field headings — their shape is not
 * `describeEntity`-driven, and a half-mapped character would round-trip badly. Their prose
 * goes under the headings the sheet already uses.
 */
export function toNote(record: Exportable, options: NoteOptions = {}): string {
  const lines: string[] = ['---'];

  lines.push(`${VAULT_MARKER}: true`);
  lines.push(`id: ${yamlScalar(record.id)}`);
  lines.push(`kind: ${yamlScalar(kindOf(record))}`);
  lines.push(`type: ${yamlScalar(labelOf(record))}`);
  // Lore has no grade, and writing an empty one would import back as a real value.
  const grade = isCharacter(record) ? record.grade : entityGrade(record);
  if (grade) {
    lines.push(`grade: ${yamlScalar(grade)}`);
    lines.push(`grade_label: ${yamlScalar(gradeLabel(grade))}`);
  }

  if (!isCharacter(record)) {
    lines.push(`folder: ${yamlScalar(record.folder)}`);
    lines.push(`visible_to: ${yamlScalar(record.minRole)}`);
  }

  const origin = isCharacter(record) ? record.origin : record.generated;
  if (origin) {
    lines.push(`seed: ${yamlScalar(origin.seed)}`);
    lines.push(`table_version: ${yamlScalar(origin.tableVersion)}`);
  }

  // Obsidian's own tag property, so the vault's tag pane groups records by kind.
  lines.push(`tags:${yamlList([`jjk/${kindOf(record)}`])}`);

  if (!isCharacter(record) && record.links.length > 0) {
    const names = record.links.map(
      (link) => `[[${options.linkNames?.get(link.id) ?? (link.label || link.id)}]]`,
    );
    lines.push(`links:${yamlList(names)}`);
  }

  lines.push('---', '');
  lines.push(`# ${noteName(record)}`, '');

  if (isCharacter(record)) {
    lines.push(...characterBody(record));
  } else {
    for (const field of describeEntity(record)) {
      // Both of these are already in frontmatter, and neither can be merged back from the
      // body: a repeated heading would just be a second copy that silently does nothing.
      // (`grade` reads as "Grade 2" here but is stored as `grade-2` — see obsidian-merge.)
      if (field.key === 'links' || field.key === 'grade') continue;
      lines.push(`## ${field.label}`, '');
      lines.push(...field.values.map((value) => (field.values.length > 1 ? `- ${value}` : value)));
      lines.push('');
    }
  }

  if (record.notes.trim()) {
    lines.push('## Notes', '', record.notes.trim(), '');
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
}

function characterBody(character: Character): readonly string[] {
  const technique = character.innateTechnique;
  const out: string[] = [];

  const section = (heading: string, body: readonly string[]) => {
    const kept = body.filter((line) => line.trim().length > 0);
    if (kept.length === 0) return;
    out.push(`## ${heading}`, '', ...kept, '');
  };

  section('Background', [character.background]);
  section('Affiliation', [character.affiliation]);
  section('Clan', [character.clan]);
  section(
    'Traits',
    character.traits.map((t) => `- ${[t.name, t.effect].filter(Boolean).join(' — ')}`),
  );
  section(
    'Arts',
    character.arts.map((a) => `- ${[a.name, a.description].filter(Boolean).join(' — ')}`),
  );
  section('Innate technique', [technique.name, '', technique.description]);
  section('Extensions', technique.extensions.map((e) => `- ${e}`));
  section('Maximum technique', [technique.maximum]);
  section('Domain expansion', [technique.domainExpansion]);

  return out;
}

/* ------------------------------------------------------------------ reading */

export interface ParsedNote {
  readonly frontmatter: Readonly<Record<string, string | readonly string[]>>;
  /** Heading text → the lines under it, trimmed. */
  readonly sections: ReadonlyMap<string, string>;
  readonly title: string;
}

/**
 * Split a note into frontmatter and headed sections.
 *
 * Forgiving throughout: a note with no frontmatter, an unterminated block, or no headings at
 * all still parses into whatever it does have. These are files a person edits by hand, and
 * refusing to read one because of a stray character would be the wrong trade.
 */
export function parseNote(text: string): ParsedNote {
  const normalised = text.replace(/\r\n/g, '\n');
  let body = normalised;
  const frontmatter: Record<string, string | readonly string[]> = {};

  if (normalised.startsWith('---\n')) {
    const end = normalised.indexOf('\n---', 3);
    if (end !== -1) {
      const block = normalised.slice(4, end);
      body = normalised.slice(end + 4).replace(/^\n/, '');

      let listKey: string | null = null;
      const list: string[] = [];

      const flush = () => {
        if (listKey) frontmatter[listKey] = [...list];
        listKey = null;
        list.length = 0;
      };

      for (const line of block.split('\n')) {
        const item = /^\s*-\s+(.*)$/.exec(line);
        if (item && listKey) {
          list.push(unquote(item[1] as string));
          continue;
        }

        const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
        if (!pair) continue;

        flush();
        const [, key, rawValue] = pair as unknown as [string, string, string];
        if (rawValue.trim() === '') listKey = key;
        else frontmatter[key] = unquote(rawValue);
      }

      flush();
    }
  }

  const sections = new Map<string, string>();
  let title = '';
  let heading: string | null = null;
  let buffer: string[] = [];

  const commit = () => {
    if (heading !== null) sections.set(heading, buffer.join('\n').trim());
    buffer = [];
  };

  for (const line of body.split('\n')) {
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) {
      commit();
      heading = null;
      title = (h1[1] as string).trim();
      continue;
    }

    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      commit();
      heading = (h2[1] as string).trim();
      continue;
    }

    if (heading !== null) buffer.push(line);
  }
  commit();

  return { frontmatter, sections, title };
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Lines of a section as a list, whether they were written as bullets or not. */
export function sectionList(section: string | undefined): readonly string[] {
  if (!section) return [];
  return section
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean);
}

export interface NoteIdentity {
  readonly id: string;
  readonly kind: string;
  readonly grade: GradeId | null;
  readonly folder: string;
  readonly minRole: Role | null;
}

/** Null when the note was not written by this app — someone else's note in the same vault. */
export function noteIdentity(note: ParsedNote): NoteIdentity | null {
  const marker = note.frontmatter[VAULT_MARKER];
  const id = asText(note.frontmatter['id']);
  const kind = asText(note.frontmatter['kind']);

  if (marker !== 'true' || !id || !kind) return null;

  const grade = asText(note.frontmatter['grade']);
  const minRole = asText(note.frontmatter['visible_to']);

  return {
    id,
    kind,
    grade: isGradeId(grade) ? grade : null,
    folder: asText(note.frontmatter['folder']),
    minRole: isRole(minRole) ? minRole : null,
  };
}

function asText(value: string | readonly string[] | undefined): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : (value[0] ?? '');
}
