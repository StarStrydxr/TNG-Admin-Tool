import { useEffect, useMemo, useState } from 'react';

import {
  LINK_KIND_LABELS,
  addLink,
  buildLinkIndex,
  linkTo,
  removeLink,
  resolveLinks,
  targetOf,
  updateLinkNote,
  type EntityLink,
  type LinkKind,
} from '../../domain/links';
import type { Character } from '../../domain/character';
import type { SavedEntity } from '../../domain/entities';
import { visibleTo, type Role } from '../../domain/roles';
import { listAllRecords } from '../../services/storage';

interface LinksEditorProps {
  readonly selfId: string;
  readonly links: readonly EntityLink[];
  readonly onChange: (links: readonly EntityLink[]) => void;
  readonly viewer: Role;
  /** Jump to another saved entity. Characters live in another module, so they do not navigate. */
  readonly onOpen: (kind: LinkKind, id: string) => void;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Link this record to others.
 *
 * The picker lists every record in the vault, rank-filtered — linking is not a way to learn
 * that something above your rank exists (CLAUDE.md §4a). Characters are filtered too, by the
 * same ladder, even though they carry no `minRole` of their own: they are simply always
 * visible, which is the existing behaviour everywhere else.
 */
export function LinksEditor({ selfId, links, onChange, viewer, onOpen }: LinksEditorProps) {
  const [records, setRecords] = useState<readonly (SavedEntity | Character)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!picking || records.length > 0) return;

    let cancelled = false;
    setLoading(true);
    listAllRecords()
      .then((all) => {
        if (!cancelled) setRecords(all);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorText(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [picking, records.length]);

  /** Rank filter first, then drop this record and anything already linked. */
  const choices = useMemo(() => {
    const permitted = records.filter(
      (record) => record.kind === 'pc' || record.kind === 'npc'
        ? true
        : visibleTo([record as SavedEntity], viewer).length > 0,
    );

    return permitted
      .map(targetOf)
      .filter((target) => target.id !== selfId)
      .filter((target) => !links.some((link) => link.id === target.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, viewer, selfId, links]);

  const resolved = useMemo(() => resolveLinks(links, buildLinkIndex(records)), [links, records]);

  // Resolve names as soon as there is a link to resolve, not only when picking.
  useEffect(() => {
    if (links.length === 0 || records.length > 0 || loading) return;
    let cancelled = false;
    listAllRecords()
      .then((all) => {
        if (!cancelled) setRecords(all);
      })
      .catch(() => {
        // Names fall back to what the link stored. Not worth an error here.
      });
    return () => {
      cancelled = true;
    };
  }, [links.length, records.length, loading]);

  return (
    <section className="mt-6 rounded-lg border border-void-800 bg-void-900 p-4">
      <h3 className="mb-3 text-xs font-medium tracking-wide text-ash-400">Linked records</h3>

      {resolved.length === 0 ? (
        <p className="text-xs text-ash-500">
          Nothing linked yet. Point this at the curse from the briefing, the tool that was used,
          or whoever was there.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {resolved.map(({ link, name, found }) => (
            <li key={link.id} className="flex items-center gap-2">
              <code className="w-24 shrink-0 font-mono text-[11px] text-ash-500">
                {LINK_KIND_LABELS[link.kind]}
              </code>

              {found && link.kind !== 'pc' && link.kind !== 'npc' ? (
                <button
                  type="button"
                  onClick={() => onOpen(link.kind, link.id)}
                  className="shrink-0 text-sm text-cursed-400 underline-offset-2 hover:underline"
                >
                  {name}
                </button>
              ) : (
                <span
                  className={`shrink-0 text-sm ${found ? 'text-ash-200' : 'text-ash-500 line-through'}`}
                  title={found ? undefined : 'That record is no longer in the vault'}
                >
                  {name}
                </span>
              )}

              <input
                type="text"
                value={link.note}
                onChange={(event) => onChange(updateLinkNote(links, link.id, event.target.value))}
                placeholder="why these two are connected"
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-ash-400 outline-none placeholder:text-ash-500 hover:border-void-700 focus:border-cursed-500"
              />

              <button
                type="button"
                onClick={() => onChange(removeLink(links, link.id))}
                aria-label={`Unlink ${name}`}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs text-ash-500 transition-colors hover:text-blood-500"
              >
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        {picking ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              autoFocus
              defaultValue=""
              onChange={(event) => {
                const target = choices.find((choice) => choice.id === event.target.value);
                if (target) {
                  const record = records.find((candidate) => candidate.id === target.id);
                  if (record) onChange(addLink(links, linkTo(record), selfId));
                }
                setPicking(false);
              }}
              className="max-w-sm rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
            >
              <option value="">{loading ? 'Loading…' : 'Choose a record…'}</option>
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {LINK_KIND_LABELS[choice.kind]} — {choice.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="px-2 py-1 text-xs text-ash-500 hover:text-ash-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-400 transition-colors hover:border-cursed-600 hover:text-ash-100"
          >
            Link a record…
          </button>
        )}
      </div>

      {error ? <p className="mt-2 text-xs text-blood-500">{error}</p> : null}

      <p className="mt-3 text-xs leading-relaxed text-ash-500">
        Links point one way and nothing keeps them in step — delete a record and its links turn
        into its last known name, struck through. Characters are shown but not clickable; they
        live in the Vault.
      </p>
    </section>
  );
}
