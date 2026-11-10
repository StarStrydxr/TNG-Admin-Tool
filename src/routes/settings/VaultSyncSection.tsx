import { useCallback, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { ENTITY_KINDS, type SavedEntity } from '../../domain/entities';
import { visibleTo } from '../../domain/roles';
import type { ImportReport } from '../../domain/obsidian-merge';
import { exportVault, readVault } from '../../services/obsidian';
import { listAllRecords, listEntities, saveEntity } from '../../services/storage';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useSettings } from '../../hooks/useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Obsidian vault export and import, against any local folder.
 *
 * Including a Google Drive or OneDrive folder: those clients sync a folder on disk, so the
 * cloud round trip happens outside this app entirely. No tokens, no OAuth, no network code —
 * the offline-first rule holds (CLAUDE.md §1).
 *
 * Import is two steps on purpose. Reading tells you what *would* change; applying is a
 * separate click. Markdown someone has been editing by hand is exactly the input you want to
 * look at before it overwrites a vault.
 */
export function VaultSyncSection() {
  const { settings } = useSettings();
  const { announce } = useAnnouncer();

  const [folder, setFolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);

  const target = folder.trim() || settings.exportDirectory.trim();

  /** Everything the current rank may see — an export is a publish boundary (§4a). */
  const exportable = useCallback(async () => {
    const all = await listAllRecords();
    const entities = all.filter(
      (record) => record.kind !== 'pc' && record.kind !== 'npc',
    ) as SavedEntity[];
    const characters = all.filter((record) => record.kind === 'pc' || record.kind === 'npc');
    return [...visibleTo(entities, settings.role), ...characters];
  }, [settings.role]);

  const onExport = useCallback(async () => {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const records = await exportable();
      const result = await exportVault(records, target);
      setNote(`Wrote ${result.written} notes.`);
      announce(`Exported ${result.written} notes as an Obsidian vault.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [exportable, target, announce]);

  const onRead = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNote('');
    try {
      const listings = await Promise.all(ENTITY_KINDS.map((kind) => listEntities(kind)));
      const existing = listings.flatMap((listing) => listing.entities);
      setReport(await readVault(target, existing));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [target]);

  const onApply = useCallback(async () => {
    if (!report) return;
    setBusy(true);
    setError(null);
    try {
      for (const result of report.updated) await saveEntity(result.entity);
      setNote(`Brought ${report.updated.length} edited records back.`);
      setReport(null);
      announce(`Imported ${report.updated.length} records.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [report, announce]);

  return (
    <SectionCard
      title="Obsidian vault"
      description="Write the vault as Obsidian notes, and bring edits back. Any local folder — including a synced one."
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-ash-400">Vault folder</span>
        <input
          type="text"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          placeholder={
            settings.exportDirectory || 'G:\\My Drive\\JJK   or   C:\\Users\\you\\Obsidian\\JJK'
          }
          spellCheck={false}
          className="w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 font-mono text-sm text-ash-100 outline-none placeholder:font-sans placeholder:text-ash-500 focus:border-cursed-500"
        />
      </label>

      <p className="mt-2 text-xs leading-relaxed text-ash-500">
        Empty uses your export folder. <strong>For Google Drive or OneDrive, point this at the
        synced folder on disk</strong> — their desktop app does the uploading, so this stays
        entirely offline and there is nothing to sign into.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onExport()}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-40"
        >
          {busy ? 'Working…' : 'Write the vault'}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onRead()}
          className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-40"
        >
          See what changed there
        </button>

        {note ? <span className="text-xs text-ash-500">{note}</span> : null}
      </div>

      {report ? (
        <div className="mt-4 rounded-md border border-void-700 bg-void-850 px-3 py-3">
          {report.updated.length === 0 ? (
            <p className="text-xs text-ash-400">
              Nothing to bring back — {report.unchanged} notes match the vault already.
            </p>
          ) : (
            <>
              <p className="text-xs text-ash-300">
                {report.updated.length} record{report.updated.length === 1 ? '' : 's'} edited in
                Obsidian:
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {report.updated.slice(0, 10).map((result) => (
                  <li key={result.entity.id} className="text-xs text-ash-500">
                    <span className="text-ash-400">{result.entity.name || 'Unnamed'}</span>{' '}
                    — {result.changed.join(', ')}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={busy}
                onClick={() => void onApply()}
                className="mt-3 rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-xs text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-40"
              >
                Bring these back
              </button>
            </>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-ash-500">
            {report.unchanged} unchanged · {report.foreign} not written by this app, left alone
            {report.orphaned.length > 0
              ? ` · ${report.orphaned.length} note${
                  report.orphaned.length === 1 ? '' : 's'
                } whose record is no longer here`
              : ''}
            . Import only updates records that already exist; it never creates one from a note.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-blood-500">{error}</p> : null}
    </SectionCard>
  );
}
