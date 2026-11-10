import { EntityDetail } from '../../components/library/EntityDetail';
import { BulkBar } from '../../components/library/BulkBar';
import { FolderTree } from '../../components/library/FolderTree';
import { useLibrary } from '../../hooks/useLibrary';
import { ENTITY_LABELS, entityDisplayName, entityGrade } from '../../domain/entities';
import { entitySummary } from '../../domain/entities-display';
import { Insignia } from '../../components/Insignia';
import { gradeAbbrev, gradeLabel, type GradeId } from '../../domain/grades';
import { ROLES, ROLE_LABELS, type Role } from '../../domain/roles';
import { useExport } from '../../hooks/useExport';
import { usePrint } from '../../hooks/usePrint';

export function LibraryPage() {
  const lib = useLibrary();
  const { printRecords } = usePrint();
  const exporter = useExport();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-md border border-void-700 p-0.5">
        {lib.kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => lib.setKind(kind)}
            className={[
              'flex-1 rounded px-3 py-1.5 text-sm transition-colors',
              kind === lib.kind ? 'bg-void-700 text-ash-100' : 'text-ash-500 hover:text-ash-300',
            ].join(' ')}
          >
            {ENTITY_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-void-800 bg-void-900 p-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="text-xs text-ash-400">Search</span>
          <input
            type="search"
            value={lib.filter.query}
            onChange={(event) => lib.setFilter({ ...lib.filter, query: event.target.value })}
            placeholder="Any word in the record — name, briefing, notes, folder…"
            className="w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Grade</span>
          <select
            value={lib.filter.grade}
            onChange={(event) =>
              lib.setFilter({ ...lib.filter, grade: event.target.value as GradeId | '' })
            }
            className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
          >
            <option value="">Any grade</option>
            {lib.availableGrades.map((id) => (
              <option key={id} value={id}>
                {gradeLabel(id)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Visible to</span>
          <select
            value={lib.filter.minRole}
            onChange={(event) =>
              lib.setFilter({ ...lib.filter, minRole: event.target.value as Role | '' })
            }
            className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
          >
            <option value="">Any rank</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pb-1.5 text-xs text-ash-400">
          <input
            type="checkbox"
            checked={lib.filter.withImage}
            onChange={(event) =>
              lib.setFilter({ ...lib.filter, withImage: event.target.checked })
            }
            className="accent-cursed-500"
          />
          Has a picture
        </label>

        {lib.filterActive ? (
          <button
            type="button"
            onClick={lib.clearFilter}
            className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
          >
            Clear
          </button>
        ) : null}
      </div>

      {lib.error ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-blood-500/40 bg-blood-500/10 px-4 py-3">
          <p className="text-sm text-ash-300">{lib.error}</p>
          <button
            type="button"
            onClick={lib.dismissError}
            className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {lib.skipped.length > 0 ? (
        <div className="rounded-md border border-void-700 bg-void-900 px-4 py-3">
          <p className="text-sm text-ash-300">
            {lib.skipped.length} file{lib.skipped.length === 1 ? '' : 's'} could not be read.
          </p>
          <ul className="mt-2 space-y-0.5">
            {lib.skipped.map((entry) => (
              <li key={entry.file} className="font-mono text-xs text-ash-500">
                {entry.file} — {entry.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-6">
        <aside className="flex w-52 shrink-0 flex-col gap-3">
          <FolderTree
            folders={lib.folders}
            counts={lib.counts}
            total={lib.total}
            active={lib.folder}
            onSelect={lib.setFolder}
          />
          {/*
            Prints `lib.entities` — already rank-filtered at source and narrowed to the chosen
            folder — so a booklet can never carry a record the active rank cannot see.
          */}
          <button
            type="button"
            disabled={lib.entities.length === 0}
            onClick={() => printRecords(lib.entities, lib.folder ?? '')}
            title="Opens the print dialog — choose Microsoft Print to PDF to save a booklet"
            className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Print {lib.folder === null ? 'everything shown' : 'this folder'}
            {lib.entities.length > 0 ? ` (${lib.entities.length})` : ''}
          </button>

          {/* Same filtered list as printing: an export is a publish boundary (§4a). */}
          <button
            type="button"
            disabled={lib.entities.length === 0 || exporter.busy}
            onClick={() => void exporter.exportRecords(lib.entities)}
            title="Writes one markdown file per record into the exports folder"
            className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporter.busy
              ? 'Exporting…'
              : `Export ${lib.folder === null ? 'everything shown' : 'this folder'} as markdown`}
          </button>

          <button
            type="button"
            disabled={lib.entities.length === 0 || exporter.busy}
            onClick={() => void exporter.exportRecords(lib.entities, 'discord')}
            title="Writes the server's posting format for each record. Kinds with no server format fall back to readable markdown."
            className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporter.busy ? 'Exporting…' : 'Export in Discord format'}
          </button>

          <div className="flex flex-col gap-1 border-t border-void-800 pt-3">
            <button
              type="button"
              onClick={() => void lib.reveal()}
              className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
            >
              Open data folder
            </button>
            <button
              type="button"
              onClick={() => void exporter.revealExports()}
              className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
            >
              Open exports folder
            </button>
            <button
              type="button"
              onClick={() => void exporter.revealTemplates()}
              title="Drop a .md file named after the record kind here to change its export format"
              className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
            >
              Open templates folder
            </button>
          </div>

          {exporter.error ? (
            <p className="rounded-md border border-blood-500/40 bg-blood-500/10 px-3 py-2 text-xs text-ash-300">
              {exporter.error}
            </p>
          ) : null}
        </aside>

        <div className="w-64 shrink-0">
          {lib.loading ? (
            <p className="px-1 py-3 text-xs text-ash-500">Loading…</p>
          ) : lib.entities.length === 0 ? (
            <p className="rounded-md border border-dashed border-void-700 px-3 py-8 text-center text-xs text-ash-500">
              {lib.filterActive
                ? 'Nothing matches that search.'
                : 'Nothing saved here yet. Roll something and save it.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {lib.entities.map((entity) => {
                const active = entity.id === lib.selected?.id;
                return (
                  <li key={entity.id} className="flex items-start gap-1.5">
                    <input
                      type="checkbox"
                      checked={lib.markedIds.has(entity.id)}
                      onChange={() => lib.toggleMark(entity.id)}
                      aria-label={`Select ${entityDisplayName(entity)}`}
                      className="mt-3 shrink-0 accent-cursed-500"
                    />
                    <button
                      type="button"
                      onClick={() => lib.select(entity.id)}
                      className={[
                        'min-w-0 flex-1 rounded-md px-3 py-2 text-left transition-colors',
                        active
                          ? 'bg-void-700 text-ash-100'
                          : 'text-ash-400 hover:bg-void-800 hover:text-ash-300',
                      ].join(' ')}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <Insignia kind={entity.kind} size={13} className="shrink-0 self-center" />
                          <span className="truncate text-sm">{entityDisplayName(entity)}</span>
                        </span>
                        {entityGrade(entity) ? (
                          <code className="shrink-0 font-mono text-[11px] text-cursed-400">
                            {gradeAbbrev(entityGrade(entity) as GradeId)}
                          </code>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ash-500">
                        {entitySummary(entity)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <BulkBar
            marked={lib.marked}
            viewer={lib.viewer}
            busy={exporter.busy}
            onClear={lib.clearMarks}
            onMarkAll={lib.markAllShown}
            onRefile={(folder) => void lib.updateMarked({ folder })}
            onRerank={(minRole) => void lib.updateMarked({ minRole })}
            onExport={() => void exporter.exportRecords(lib.marked)}
            onPrint={() => printRecords(lib.marked, lib.folder ?? '')}
            onDelete={() => void lib.removeMarked()}
          />

          {lib.filteredOutCount > 0 ? (
            <p className="mt-3 text-xs text-ash-500">
              {lib.filteredOutCount} more {lib.filteredOutCount === 1 ? 'record is' : 'records are'}{' '}
              hidden by the search.
            </p>
          ) : null}

          {lib.hiddenCount > 0 ? (
            <p className="mt-3 rounded-md border border-void-800 px-3 py-2 text-xs text-ash-500">
              {lib.hiddenCount} record{lib.hiddenCount === 1 ? ' is' : 's are'} marked above{' '}
              {ROLE_LABELS[lib.viewer]} and hidden. Change rank in Settings to see{' '}
              {lib.hiddenCount === 1 ? 'it' : 'them'}.
            </p>
          ) : null}
        </div>

        {lib.selected ? (
          <EntityDetail
            entity={lib.selected}
            viewer={lib.viewer}
            onSave={(entity) => void lib.update(entity)}
            onDelete={(entity) => void lib.remove(entity)}
            onOpen={(kind, id) => {
              // Characters are not a library collection; their links are shown, not followed.
              if (kind !== 'pc' && kind !== 'npc') lib.goTo(kind, id);
            }}
          />
        ) : (
          <div className="flex-1 rounded-lg border border-dashed border-void-700 px-6 py-16 text-center">
            <p className="text-sm text-ash-400">Select a record.</p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-ash-500">
              Everything here is a JSON file under{' '}
              <code className="font-mono">{lib.directory || '%APPDATA%\\jjk-rp-vault\\vault'}</code>.
              Folders in the app are folders on disk.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
