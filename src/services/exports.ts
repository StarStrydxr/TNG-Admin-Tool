/**
 * Markdown export.
 *
 * Default templates are bundled from `data/templates/*.md` at build time — the same bargain
 * canon tables make (CLAUDE.md §5) — and the user's copies in
 * `%APPDATA%/jjk-rp-vault/templates/` override them by file name. Editing one there takes
 * effect on the next export, with no rebuild. That is the point: the formats are Dan's to
 * specify later (phase 2.4).
 */

import { exportContext } from '../domain/export-context';
import { renderTemplate, tidyMarkdown } from '../domain/template';
import { isCharacter } from '../domain/sheet';
import { entityDisplayName } from '../domain/entities';
import { characterDisplayName } from '../domain/character';
import type { Character } from '../domain/character';
import type { Clan, SavedEntity } from '../domain/entities';
import { call } from './transport';
import type { SkippedFile } from './storage';

const BUNDLED = import.meta.glob('/data/templates/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

export type Exportable = SavedEntity | Character;

/**
 * Which set of templates to render with.
 *
 * `plain` is the readable markdown the app has always written — good for Obsidian, for a
 * printout, for anything a person reads as a document. `discord` is the server's own posting
 * format, corner brackets and code fences and all, so the file pastes into Discord unchanged.
 *
 * Both exist because both are wanted at different moments, and neither is a lossy version of
 * the other: the Discord form is arranged for a channel, the plain form for a page.
 */
export type ExportFormat = 'plain' | 'discord';

export const EXPORT_FORMATS: readonly ExportFormat[] = ['plain', 'discord'];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  plain: 'Readable markdown',
  discord: 'Discord posting format',
};

/** The suffix a Discord template's file name carries. */
export const DISCORD_SUFFIX = '.discord';

/** Template name for a record: its entity kind, or `character` for either vault kind. */
export function templateNameFor(record: Exportable, format: ExportFormat = 'plain'): string {
  const base = isCharacter(record) ? 'character' : record.kind;
  return format === 'discord' ? `${base}${DISCORD_SUFFIX}` : base;
}

export function displayNameFor(record: Exportable): string {
  return isCharacter(record) ? characterDisplayName(record) : entityDisplayName(record);
}

function bundledTemplates(): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(BUNDLED)) {
    const name = path.split('/').pop()?.replace(/\.md$/, '');
    if (name) out[name] = content;
  }
  return out;
}

export interface TemplateSet {
  /** Name -> template text, user copies already merged over the bundled ones. */
  readonly templates: Readonly<Record<string, string>>;
  /** Names the user has overridden, for showing which are theirs. */
  readonly overridden: readonly string[];
  readonly skipped: readonly SkippedFile[];
  readonly directory: string;
}

interface RawTemplates {
  readonly templates: readonly { readonly name: string; readonly content: string }[];
  readonly skipped: readonly SkippedFile[];
  readonly directory: string;
}

export async function loadTemplates(): Promise<TemplateSet> {
  const merged: Record<string, string> = { ...bundledTemplates() };
  const overridden: string[] = [];

  try {
    const raw = await call<RawTemplates>('templates_list');
    for (const entry of raw.templates) {
      merged[entry.name] = entry.content;
      overridden.push(entry.name);
    }
    return {
      templates: merged,
      overridden,
      skipped: raw.skipped,
      directory: raw.directory,
    };
  } catch {
    // No Rust side (a plain browser tab): the bundled defaults still work for previewing.
    return { templates: merged, overridden: [], skipped: [], directory: '' };
  }
}

/**
 * Render one record. Pure once the template is in hand — handy for a live preview.
 *
 * `clans` only matters for a character: it is what turns a ticked clan bonus and a list of
 * mutation ids into readable lines. Omit it and those lines come out empty, exactly as they do
 * for a clan nobody has a record for.
 */
export function renderRecord(
  record: Exportable,
  template: string,
  clans: readonly Clan[] = [],
): string {
  return tidyMarkdown(renderTemplate(template, exportContext(record, clans)));
}

export interface ExportResult {
  readonly name: string;
  /** Full path on disk, for telling the user where it went. */
  readonly path: string;
}

/**
 * Render and write one record.
 *
 * Exports mirror the record's own folder, so a vault organised into arcs exports into the same
 * arcs. `destination` overrides where that tree is rooted — empty means the app's own exports
 * folder, and an absolute path sends it wherever the GM keeps shared material.
 *
 * Only the three kinds the server actually has a posting format for — mission, technique and
 * character — ship a Discord template. Asking for Discord on a cursed tool falls back to the
 * readable one rather than writing an empty file, which is the right answer: there is no server
 * format to imitate, so the honest output is the one that exists.
 */
export function templateFor(
  record: Exportable,
  templates: Readonly<Record<string, string>>,
  format: ExportFormat = 'plain',
): string {
  return (
    templates[templateNameFor(record, format)] ?? templates[templateNameFor(record, 'plain')] ?? ''
  );
}

export async function exportRecord(
  record: Exportable,
  templates: Readonly<Record<string, string>>,
  destination = '',
  format: ExportFormat = 'plain',
  clans: readonly Clan[] = [],
): Promise<ExportResult> {
  const content = renderRecord(record, templateFor(record, templates, format), clans);
  const name = displayNameFor(record);
  const folder = isCharacter(record) ? '' : record.folder;

  const path = await call<string>('export_write', { folder, stem: name, content, destination });
  return { name, path };
}

export async function saveTemplate(name: string, content: string): Promise<void> {
  await call<void>('template_save', { name, content });
}

/** Drop the user's copy and go back to the bundled default. */
export async function resetTemplate(name: string): Promise<void> {
  await call<void>('template_delete', { name });
}

export async function revealTemplatesFolder(): Promise<void> {
  await call<void>('templates_reveal');
}

export async function revealExportsFolder(destination = ''): Promise<void> {
  await call<void>('exports_reveal', { destination });
}
