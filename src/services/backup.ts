/**
 * Backups.
 *
 * There is no cloud and no sync, by design, so the folder under `%APPDATA%` is the only copy
 * of everything Dan has written. This makes a dated second one beside it, which he can drag
 * onto a stick or copy back to restore.
 */

import { call } from './transport';

export interface BackupResult {
  readonly path: string;
  readonly files: number;
  readonly bytes: number;
}

export interface BackupEntry {
  readonly name: string;
  readonly path: string;
}

/**
 * `YYYY-MM-DD-HHMM` in the user's own timezone.
 *
 * Built here rather than in Rust because a backup named in UTC would read as the wrong day to
 * someone who made it late at night, and Rust has no timezone to work from.
 */
export function backupStamp(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    `${pad(now.getHours())}${pad(now.getMinutes())}`,
  ].join('-');
}

export async function createBackup(): Promise<BackupResult> {
  return call<BackupResult>('backup_create', { stamp: backupStamp() });
}

export async function listBackups(): Promise<readonly BackupEntry[]> {
  return call<readonly BackupEntry[]>('backup_list');
}

export async function revealBackupsFolder(): Promise<void> {
  await call<void>('backup_reveal');
}

export interface RestoreResult {
  /** Where the pre-restore state was put, so the user can get back to it. */
  readonly safetyBackup: string;
  readonly files: number;
}

/**
 * Replace the live data folder with a backup.
 *
 * Destructive by nature, so the Rust side takes a safety backup first and the UI asks twice.
 * The app does not reload itself afterwards — the caller tells the user to restart, because
 * every hook in the tree is holding data that has just been replaced underneath it.
 */
export async function restoreBackup(name: string): Promise<RestoreResult> {
  return call<RestoreResult>('backup_restore', { name, stamp: backupStamp() });
}
