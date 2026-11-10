import { useCallback, useEffect, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { useSettings } from '../../hooks/useSettings';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import {
  createBackup,
  listBackups,
  restoreBackup,
  revealBackupsFolder,
  type BackupEntry,
} from '../../services/backup';
import { formatBytes } from '../../domain/image';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Backups and where exports go.
 *
 * Both exist for the same reason: this app deliberately has no cloud, so moving data off the
 * machine — to a backup, or to another GM — is something the user does on purpose.
 */
export function DataSection() {
  const { settings, setExportDirectory } = useSettings();
  const { announce } = useAnnouncer();

  const [backups, setBackups] = useState<readonly BackupEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Two-step, because restoring replaces everything and nobody should do it by one stray click.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [restored, setRestored] = useState('');

  const refresh = useCallback(async () => {
    try {
      setBackups(await listBackups());
    } catch {
      // Not running under Tauri, or the folder is unreadable. Nothing to show either way.
      setBackups([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await createBackup();
      setNote(`${result.files} files, ${formatBytes(result.bytes)} → ${result.path}`);
      announce('Backup complete.');
      await refresh();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [announce, refresh]);

  const restore = useCallback(
    async (name: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await restoreBackup(name);
        setConfirming(null);
        setRestored(
          `Restored ${result.files} files from ${name}. Your previous data was saved to ` +
            `${result.safetyBackup} first.`,
        );
        announce('Backup restored. Restart the app.');
        await refresh();
      } catch (cause) {
        setError(errorText(cause));
      } finally {
        setBusy(false);
      }
    },
    [announce, refresh],
  );

  return (
    <SectionCard
      title="Data"
      description="Your vault is files on this machine and nowhere else. These two are how it leaves."
    >
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Copying…' : 'Back up now'}
            </button>
            <button
              type="button"
              onClick={() => void revealBackupsFolder()}
              className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
            >
              Open backups folder
            </button>
            {backups.length > 0 ? (
              <span className="text-xs text-ash-500">
                {backups.length} so far, newest {backups[0]?.name.replace('backup-', '')}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs leading-relaxed text-ash-500">
            Copies everything — characters, saved records, your tables, templates and images —
            into a dated folder beside them. A folder rather than a zip, so you can drag it to a
            stick and copy it straight back to restore. Backups are not themselves backed up.
          </p>

          {note ? <p className="mt-2 font-mono text-[11px] text-ash-500">{note}</p> : null}

          {backups.length > 0 ? (
            <div className="mt-4 border-t border-void-850 pt-3">
              <h4 className="mb-2 text-xs font-medium tracking-wide text-ash-400">Restore</h4>

              <ul className="flex flex-col gap-1">
                {backups.slice(0, 8).map((entry) => (
                  <li key={entry.name} className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[11px] text-ash-400">
                      {entry.name.replace('backup-', '')}
                    </code>

                    {confirming === entry.name ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void restore(entry.name)}
                          className="rounded-md border border-blood-500 bg-blood-500/15 px-2.5 py-1 text-xs text-ash-100 transition-colors enabled:hover:bg-blood-500/25 disabled:opacity-40"
                        >
                          Replace everything with this
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="px-2 py-1 text-xs text-ash-500 hover:text-ash-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirming(entry.name)}
                        className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:opacity-40"
                      >
                        Restore…
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-xs leading-relaxed text-ash-500">
                Restoring replaces everything — characters, records, tables, templates and
                images — with that backup. Your current data is backed up automatically first,
                so a mistaken restore is undoable. <strong>Restart the app afterwards</strong>:
                what is on screen was loaded from the files that have just been replaced.
              </p>

              {restored ? (
                <p className="mt-2 rounded-md border border-void-700 bg-void-850 px-3 py-2 text-xs text-ash-300">
                  {restored}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-t border-void-800 pt-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-ash-400">Export folder</span>
            <input
              type="text"
              value={settings.exportDirectory}
              onChange={(event) => setExportDirectory(event.target.value)}
              placeholder="Leave empty to use the app's own exports folder"
              spellCheck={false}
              className="w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 font-mono text-sm text-ash-100 outline-none placeholder:font-sans placeholder:text-ash-500 focus:border-cursed-500"
            />
          </label>

          <p className="mt-2 text-xs leading-relaxed text-ash-500">
            Where <em>Export markdown</em> writes. Point it at a shared or synced folder and
            exports land where the other GMs can read them. It must be a full path starting with
            a drive letter, and it is created if it does not exist. Typed rather than picked —
            adding a folder-picker plugin was a dependency you turned down.
          </p>

          <p className="mt-2 text-xs leading-relaxed text-ash-500">
            Exports still obey the rank on each record: anything above the rank you are viewing
            as is never written. That filter is the real one, because withheld data never
            travels.
          </p>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-blood-500">{error}</p> : null}
    </SectionCard>
  );
}
