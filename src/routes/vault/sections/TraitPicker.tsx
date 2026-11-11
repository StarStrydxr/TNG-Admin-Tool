import { useCallback, useEffect, useMemo, useState } from 'react';

import { Insignia } from '../../../components/Insignia';
import { alreadyCarries, traitFromRecord } from '../../../domain/attach';
import { visibleTo } from '../../../domain/roles';
import { entryLine, traitCost, type TraitEntity, type TraitKind } from '../../../domain/traits';
import type { Trait } from '../../../domain/character';
import { listEntities } from '../../../services/storage';
import { useAnnouncer } from '../../../hooks/useAnnouncer';
import { useSettings } from '../../../hooks/useSettings';

interface PickerProps {
  readonly kind: TraitKind;
  /** What the sheet already carries, so a duplicate can be marked rather than silently added. */
  readonly carried: readonly Trait[];
  readonly onPick: (line: Trait) => void;
}

const BUTTON =
  'self-start rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 ' +
  'transition-colors hover:border-cursed-500 hover:text-ash-100';

/** Its named lines on one row — the same text `traitFromRecord` will put on the sheet. */
function summarise(entry: TraitEntity): string {
  return entry.entries.map(entryLine).filter(Boolean).join('; ');
}

/**
 * Pick a trait or defect out of its vault and copy it onto this sheet.
 *
 * ⚠️ **A copy** (`traitFromRecord`) — the record stays where it is and nothing links back to
 * it, so editing the vault entry later does not rewrite a sheet and deleting it does not empty
 * one. And nothing is applied: the effect lines land as text beside the stat block, and Dan
 * sets the Class himself (CLAUDE.md §4).
 *
 * The collection is read when the list is opened rather than held by a provider. Opening it is
 * a deliberate click and the read is one directory, so a `TraitsProvider` beside `ClansProvider`
 * would be machinery bought for nothing — the clans are loaded for the window because three
 * separate surfaces resolve a bonus against them, and this is one surface.
 */
export function TraitPicker({ kind, carried, onPick }: PickerProps) {
  const { settings } = useSettings();
  const { announce } = useAnnouncer();

  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<readonly TraitEntity[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const listing = await listEntities(kind);
      setAll(listing.entities.filter((entity): entity is TraitEntity => entity.kind === kind));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setAll([]);
    }
  }, [kind]);

  useEffect(() => {
    if (open && all === null) void load();
  }, [open, all, load]);

  // Rank first, before the count or the rows see it (§4a).
  const permitted = useMemo(
    () => (all ? visibleTo(all, settings.role) : []),
    [all, settings.role],
  );

  const matches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return permitted
      .filter((entry) => {
        if (terms.length === 0) return true;
        const haystack = [entry.name, entry.description, entry.source, summarise(entry)]
          .join(' \u0000 ')
          .toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [permitted, query]);

  const label = kind === 'trait' ? 'trait' : 'defect';

  if (!open) {
    return (
      <button type="button" className={BUTTON} onClick={() => setOpen(true)}>
        Pick from {label} vault
      </button>
    );
  }

  return (
    <div className="rounded-md border border-void-700 bg-void-850 p-3">
      <div className="flex items-center gap-2">
        <Insignia kind={kind} size={14} className="shrink-0 text-ash-500" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search the ${label} vault`}
          aria-label={`Search the ${label} vault`}
          className="min-w-0 flex-1 rounded border border-void-700 bg-void-900 px-2 py-1 text-xs text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />
        <button
          type="button"
          className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          onClick={() => {
            setOpen(false);
            setQuery('');
          }}
        >
          Close
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-blood-500">{error}</p>
      ) : all === null ? (
        <p className="mt-2 text-xs text-ash-500">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-ash-500">
          {permitted.length === 0
            ? `Nothing in the ${label} vault yet. Write one there and it will show up here.`
            : 'Nothing matches that.'}
        </p>
      ) : (
        <ul className="mt-2 max-h-56 overflow-y-auto">
          {matches.map((entry) => {
            const duplicate = alreadyCarries(carried, entry.name);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-void-800"
                  onClick={() => {
                    onPick(traitFromRecord(entry, `${kind}-${crypto.randomUUID()}`));
                    announce(`${entry.name || 'Entry'} copied onto the sheet.`);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-ash-200">
                      {entry.name || 'Unnamed'}
                      {duplicate ? (
                        <span className="ml-2 text-[10px] text-ash-500">already on the sheet</span>
                      ) : null}
                    </span>
                    {summarise(entry) ? (
                      <span className="block truncate text-[11px] text-ash-500">
                        {summarise(entry)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right font-mono text-[10px] text-ash-500">
                    {traitCost(entry) ? <span className="block">{traitCost(entry)}</span> : null}
                    {entry.usesTraitSlot ? <span className="block">1 slot</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-ash-500">
        Picking copies the text onto this sheet. The vault record is not linked, so editing or
        deleting it later leaves this build exactly as it is — and no Class is changed either way.
      </p>
    </div>
  );
}
