/**
 * Table loading.
 *
 * Canon is bundled into the frontend at build time from `data/canon/*.json`. The user's overlay
 * is read from `%APPDATA%/jjk-rp-vault/tables/` by the Rust side and merged on top: same entry
 * id overrides, new id adds, and canon is never rewritten (CLAUDE.md §5).
 *
 * Bundling canon rather than shipping it as a Tauri resource keeps the whole resource-path
 * problem out of the app. The trade is that editing `data/canon/` needs a rebuild — which is
 * what the user overlay exists for.
 */

import { parseTableFile, type TableIssue } from '../domain/tables-parse';
import { buildTableSet, type TableFile, type TableSet } from '../domain/tables';
import { call } from './transport';
import type { SkippedFile } from './storage';

const CANON_MODULES = import.meta.glob('/data/canon/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export interface LoadedTables {
  readonly set: TableSet;
  /** Entries dropped during parsing, canon or user. */
  readonly issues: readonly TableIssue[];
  /** User files that could not be read at all. */
  readonly skipped: readonly SkippedFile[];
  readonly userDirectory: string;
  readonly canonFileCount: number;
  readonly userFileCount: number;
}

interface RawUserTables {
  readonly files: readonly { readonly file: string; readonly content: unknown }[];
  readonly skipped: readonly SkippedFile[];
  readonly directory: string;
}

function loadCanon(): { files: TableFile[]; issues: TableIssue[] } {
  const files: TableFile[] = [];
  const issues: TableIssue[] = [];

  // Sorted so merge order is stable across platforms.
  for (const path of Object.keys(CANON_MODULES).sort()) {
    const parsed = parseTableFile(CANON_MODULES[path], 'canon');
    files.push(parsed.file);
    issues.push(...parsed.issues);
  }

  return { files, issues };
}

export async function loadTables(): Promise<LoadedTables> {
  const canon = loadCanon();

  let user: RawUserTables = { files: [], skipped: [], directory: '' };
  try {
    user = await call<RawUserTables>('tables_list');
  } catch {
    // No shell, or the folder is unreadable. Canon alone is still a working app.
    user = { files: [], skipped: [], directory: '' };
  }

  const userIssues: TableIssue[] = [];
  const userFiles: TableFile[] = [];
  for (const entry of user.files) {
    const parsed = parseTableFile(entry.content, 'user');
    userFiles.push(parsed.file);
    userIssues.push(...parsed.issues);
  }

  return {
    set: buildTableSet([...canon.files, ...userFiles]),
    issues: [...canon.issues, ...userIssues],
    skipped: user.skipped,
    userDirectory: user.directory,
    canonFileCount: canon.files.length,
    userFileCount: userFiles.length,
  };
}

export async function revealTablesFolder(): Promise<void> {
  await call<void>('tables_reveal');
}
