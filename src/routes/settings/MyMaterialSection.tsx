import { useCallback, useMemo, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { harvest, harvestTargets, summarise, type Fragment } from '../../domain/harvest';
import { EMPTY_TABLE_SET, type TableId } from '../../domain/tables';
import { ALL_SPECS } from '../../generators/specs';
import { loadTables } from '../../services/tables';
import { currentHarvest, readMaterial, saveHarvest } from '../../services/harvest';
import { useAnnouncer } from '../../hooks/useAnnouncer';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const TARGETS = harvestTargets(ALL_SPECS);

const EXAMPLE = `## Complications
- Standing water across the loading floor
- A hard deadline nobody is willing to move

Location: A parcel depot that runs all night
Client: A shift supervisor who filed it himself`;

/**
 * Feed your own missions and techniques into the tables.
 *
 * The honest framing matters here and is repeated in the UI: nothing learns. Fragments of
 * Dan's writing are added to the pools the generators roll from, which is what actually makes
 * output sound like his. Everything is reviewed before a line is written, and it all lands in
 * one user table file that can be deleted to undo the lot.
 */
export function MyMaterialSection() {
  const { announce } = useAnnouncer();

  const [text, setText] = useState('');
  const [folder, setFolder] = useState('');
  const [fragments, setFragments] = useState<readonly Fragment[] | null>(null);
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const summary = useMemo(() => (fragments ? summarise(fragments) : null), [fragments]);

  const scan = useCallback(
    async (source: string) => {
      setBusy(true);
      setError(null);
      setNote('');
      try {
        const loaded = await loadTables().catch(() => ({ set: EMPTY_TABLE_SET }));
        const found = harvest(source, TARGETS, loaded.set);
        setFragments(found);
        // Pre-tick everything that has somewhere to go and is not already there.
        setChosen(
          new Set(
            found
              .map((fragment, index) => ({ fragment, index }))
              .filter(({ fragment }) => fragment.tableId && !fragment.duplicate)
              .map(({ index }) => index),
          ),
        );
      } catch (cause) {
        setError(errorText(cause));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const scanFolder = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const notes = await readMaterial(folder.trim());
      if (notes.length === 0) {
        setError('No markdown files in that folder.');
        return;
      }
      await scan(notes.map((note_) => note_.content).join('\n\n'));
      setNote(`Read ${notes.length} file${notes.length === 1 ? '' : 's'}.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [folder, scan]);

  const apply = useCallback(async () => {
    if (!fragments) return;
    setBusy(true);
    setError(null);
    try {
      const approved = fragments.filter((_, index) => chosen.has(index));
      const result = await saveHarvest(approved, await currentHarvest());

      setNote(`Added ${result.added} entries to your tables.`);
      setFragments(null);
      setChosen(new Set());
      announce(`Added ${result.added} entries from your own material.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [fragments, chosen, announce]);

  const toggle = (index: number) => {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const retarget = (index: number, tableId: TableId | '') => {
    setFragments((current) => {
      if (!current) return current;
      return current.map((fragment, at) =>
        at === index
          ? {
              ...fragment,
              tableId: tableId || null,
              label: tableId ? (tableLabel(tableId) ?? '') : '',
            }
          : fragment,
      );
    });
    if (tableId) setChosen((current) => new Set(current).add(index));
  };

  return (
    <SectionCard
      title="Your own material"
      description="Add your missions and techniques to the tables, so rolls draw on your writing."
    >
      <p className="mb-4 text-xs leading-relaxed text-ash-500">
        Nothing is trained here — the generators roll from tables, so this adds your lines to
        the pools they roll from. A fragment is placed only where your own{' '}
        <code className="text-ash-400">Label:</code> or <code className="text-ash-400">##</code>{' '}
        heading says it belongs; anything else is left for you to place or discard. Everything
        lands in <code className="text-ash-400">my-material.json</code> beside your other user
        tables, so deleting that one file undoes all of it.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-ash-400">Paste a mission</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={EXAMPLE}
          rows={8}
          spellCheck={false}
          className="w-full resize-y rounded-md border border-void-700 bg-void-850 px-2.5 py-2 font-mono text-xs leading-relaxed text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void scan(text)}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-40"
        >
          {busy ? 'Reading…' : 'Read this'}
        </button>

        <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <span className="text-xs text-ash-400">…or a folder of your notes</span>
          <input
            type="text"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder="C:\\Users\\you\\Obsidian\\JJK\\Missions"
            spellCheck={false}
            className="w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 font-mono text-sm text-ash-100 outline-none placeholder:font-sans placeholder:text-ash-500 focus:border-cursed-500"
          />
        </label>

        <button
          type="button"
          disabled={busy || !folder.trim()}
          onClick={() => void scanFolder()}
          className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-40"
        >
          Read the folder
        </button>

        {note ? <span className="pb-2 text-xs text-ash-500">{note}</span> : null}
      </div>

      {summary && fragments ? (
        <div className="mt-4 border-t border-void-800 pt-4">
          <p className="mb-3 text-xs text-ash-400">
            {summary.total} fragments — {summary.assigned} ready, {summary.unassigned} need a
            table, {summary.duplicates} already in your tables.
          </p>

          <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pr-1">
            {fragments.map((fragment, index) => (
              <li
                key={`${fragment.text}-${index}`}
                className={`flex items-start gap-2 rounded border px-2 py-1.5 ${
                  fragment.duplicate
                    ? 'border-void-800 opacity-50'
                    : 'border-void-800 bg-void-850/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={chosen.has(index)}
                  disabled={!fragment.tableId || fragment.duplicate}
                  onChange={() => toggle(index)}
                  aria-label={`Add "${fragment.text}"`}
                  className="mt-1 shrink-0 accent-cursed-500 disabled:opacity-40"
                />

                <span className="min-w-0 flex-1 text-xs leading-snug text-ash-200">
                  {fragment.text}
                  {fragment.duplicate ? (
                    <span className="ml-1.5 text-ash-500">— already in your tables</span>
                  ) : null}
                </span>

                <select
                  value={fragment.tableId ?? ''}
                  onChange={(event) => retarget(index, event.target.value)}
                  disabled={fragment.duplicate}
                  aria-label="Which table"
                  className="shrink-0 rounded border border-void-700 bg-void-850 px-1.5 py-0.5 text-[11px] text-ash-300 outline-none focus:border-cursed-500 disabled:opacity-40"
                >
                  <option value="">— no table —</option>
                  {allTargets().map(([tableId, label]) => (
                    <option key={tableId} value={tableId}>
                      {label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={busy || chosen.size === 0}
            onClick={() => void apply()}
            className="mt-3 rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-40"
          >
            Add {chosen.size} to my tables
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-blood-500">{error}</p> : null}
    </SectionCard>
  );
}

/** Table id → label, deduplicated, for the per-fragment picker. */
function allTargets(): readonly (readonly [TableId, string])[] {
  const seen = new Map<TableId, string>();
  for (const target of TARGETS.values()) {
    if (!seen.has(target.tableId)) seen.set(target.tableId, `${target.label} · ${target.tableId}`);
  }
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function tableLabel(tableId: TableId): string | undefined {
  for (const target of TARGETS.values()) if (target.tableId === tableId) return target.label;
  return undefined;
}
