import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createTrait,
  entryLine,
  isBlankTrait,
  traitCost,
  type TraitEntity,
  type TraitKind,
} from '../../domain/traits';
import { missingSeeds, traitSeed } from '../../domain/trait-seed';
import { ENTITY_LABELS } from '../../domain/entities';
import { visibleTo } from '../../domain/roles';
import { deleteEntity, listEntities, revealEntityFolder, saveEntity } from '../../services/storage';
import type { SkippedFile } from '../../services/storage';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useSettings } from '../../hooks/useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * One of the two trait collections.
 *
 * ⚠️ **Parameterised by kind rather than written twice.** Traits and defects are separate
 * collections on disk and separate boards on screen (Dan, 11 Nov 2026), but they are the same
 * shape — so a second copy of this file would be the clan-prop bug waiting to happen: a field
 * added to one and forgotten in the other, with nothing to catch it. `TraitLike` keeps the two
 * schemas together in `domain/entities.ts`; this keeps the two surfaces together.
 *
 * Visibility is applied here once, before anything else sees the list, for the usual reason —
 * a count taken from the unfiltered array is how a higher-rank record leaks (CLAUDE.md §4a).
 */
export function useTraitVault(kind: TraitKind) {
  const { announce } = useAnnouncer();
  const { settings, rememberSeededTraits } = useSettings();
  const viewer = settings.role;
  const label = ENTITY_LABELS[kind];

  const [all, setAll] = useState<readonly TraitEntity[]>([]);
  const [skipped, setSkipped] = useState<readonly SkippedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [rarity, setRarity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  // Read through a ref so `refresh` does not change identity every time the recorded list
  // does — which would re-run the effect that calls it, and seed in a loop.
  const seededIdsRef = useRef(settings.seededTraits);
  seededIdsRef.current = settings.seededTraits;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const listing = await listEntities(kind);
      const found = listing.entities.filter(
        (entity): entity is TraitEntity => entity.kind === kind,
      );

      // The server's own traits, written in as Dan supplies them.
      //
      // ⚠️ **Per id, not "only when the folder is empty."** The first version copied the guard
      // `masamiSeed` uses, which is right for a clan — one record, written once — and wrong
      // for a list that grows: the day six more traits were added to the code the folder
      // already held four, so the whole seed skipped and none of the six appeared. Dan ran it
      // and they were not there.
      //
      // Three conditions, and each one is load-bearing:
      //   · not already on disk — never overwrite a record he has edited
      //   · not already recorded in `seededTraits` — one he deleted on purpose stays deleted,
      //     which is the thing a plain "write whatever is missing" would silently undo
      //   · nothing in the collection failed to parse — writing into a folder whose one bad
      //     file is being skipped would look exactly like losing it (the one guard worth keeping)
      const seeds = kind === 'trait' ? traitSeed(new Date().toISOString()) : [];
      const missing = missingSeeds(
        seeds,
        found.map((entity) => entity.id),
        seededIdsRef.current,
        listing.skipped.length,
      );

      if (missing.length > 0) {
        await Promise.all(missing.map((record) => saveEntity(record)));
        setAll([...found, ...missing]);
        setAdded(missing.length);
        announce(`Added ${missing.length} ${missing.length === 1 ? 'trait' : 'traits'} from the server's rules.`);
      } else {
        setAll(found);
      }

      // Every seed is recorded, the ones already on disk included — otherwise a record he
      // deletes later would come back on the next open.
      if (seeds.length > 0 && listing.skipped.length === 0) {
        rememberSeededTraits(seeds.map((seed) => seed.id));
      }

      setSkipped(listing.skipped);
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [kind, rememberSeededTraits, announce]);

  // Switching board clears the selection: an id from the other collection matches nothing.
  useEffect(() => {
    setSelectedId(null);
    setAdded(0);
    void refresh();
  }, [refresh]);

  const permitted = useMemo(() => visibleTo(all, viewer), [all, viewer]);

  const sources = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of permitted) if (entry.source.trim()) seen.add(entry.source.trim());
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [permitted]);

  const entries = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return permitted
      .filter((entry) => {
        if (source && entry.source !== source) return false;
        if (rarity && (entry.kind !== 'trait' || entry.rarity !== rarity)) return false;
        if (terms.length === 0) return true;
        const haystack = [
          entry.name,
          entry.description,
          entry.source,
          traitCost(entry),
          ...entry.requirements,
          entry.notes,
          entry.folder,
          ...entry.entries.map(entryLine),
          ...entry.entries.map((item) => item.note),
        ]
          .join(' \u0000 ')
          .toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [permitted, query, source, rarity]);

  const selected = useMemo(
    () => permitted.find((entry) => entry.id === selectedId) ?? null,
    [permitted, selectedId],
  );

  const create = useCallback(async () => {
    const entry = createTrait({ kind, id: crypto.randomUUID(), now: new Date().toISOString() });
    try {
      await saveEntity(entry);
      await refresh();
      setSelectedId(entry.id);
      announce(`New ${label.toLowerCase()}.`);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [kind, label, refresh, announce]);

  /** Save a copy of an existing one — the quickest way to write a family of related traits. */
  const duplicate = useCallback(
    async (entry: TraitEntity) => {
      const now = new Date().toISOString();
      const copy = {
        ...entry,
        id: crypto.randomUUID(),
        name: entry.name ? `${entry.name} (copy)` : '',
        createdAt: now,
        updatedAt: now,
        // A copy is its own record, and carrying links across would point two records at one
        // target for no reason anybody asked for.
        links: [],
      };
      try {
        await saveEntity(copy);
        await refresh();
        setSelectedId(copy.id);
        announce(`Copied ${entry.name || 'the entry'}.`);
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [refresh, announce],
  );

  const update = useCallback(async (entry: TraitEntity) => {
    const next = { ...entry, updatedAt: new Date().toISOString() };
    setAll((current) => current.map((item) => (item.id === next.id ? next : item)));
    try {
      await saveEntity(next);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, []);

  const remove = useCallback(
    async (entry: TraitEntity) => {
      try {
        await deleteEntity(entry);
        setSelectedId(null);
        await refresh();
        announce(`${label} deleted.`);
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [label, refresh, announce],
  );

  return {
    kind,
    label,
    entries,
    total: permitted.length,
    sources,
    skipped,
    /** How many seeded traits this open wrote, so the board can say so. */
    added,
    dismissAdded: () => setAdded(0),
    selected,
    select: setSelectedId,
    query,
    setQuery,
    source,
    setSource,
    rarity,
    setRarity,
    loading,
    error,
    dismissError: useCallback(() => setError(null), []),
    create,
    duplicate,
    update,
    remove,
    reveal: useCallback(() => revealEntityFolder(kind), [kind]),
    isBlank: isBlankTrait,
    viewer,
  };
}
