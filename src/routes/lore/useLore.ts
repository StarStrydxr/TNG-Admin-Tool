import { useCallback, useEffect, useMemo, useState } from 'react';

import { createLore, isBlankLore } from '../../domain/lore';
import { visibleTo } from '../../domain/roles';
import type { Lore } from '../../domain/entities';
import { deleteEntity, listEntities, revealEntityFolder, saveEntity } from '../../services/storage';
import type { SkippedFile } from '../../services/storage';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useSettings } from '../../hooks/useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The lore collection.
 *
 * Separate from `useLibrary` rather than folded into it: lore is the one kind with no
 * generator, so it is the only one that needs *creating* from nothing, and the library's job
 * is browsing what the generators produced. Visibility is applied here the same way and for
 * the same reason — once, before anything else sees the list (CLAUDE.md §4a).
 */
export function useLore() {
  const { announce } = useAnnouncer();
  const { settings } = useSettings();
  const viewer = settings.role;

  const [all, setAll] = useState<readonly Lore[]>([]);
  const [skipped, setSkipped] = useState<readonly SkippedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const listing = await listEntities('lore');
      setAll(listing.entities.filter((entity): entity is Lore => entity.kind === 'lore'));
      setSkipped(listing.skipped);
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Rank first, and once — a count taken from the unfiltered list is how a secret leaks (§4a).
  const permitted = useMemo(() => visibleTo(all, viewer), [all, viewer]);

  const types = useMemo(() => {
    const seen = new Set<string>();
    for (const entry of permitted) if (entry.loreType.trim()) seen.add(entry.loreType.trim());
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [permitted]);

  const entries = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return permitted.filter((entry) => {
      if (type && entry.loreType !== type) return false;
      if (terms.length === 0) return true;
      const haystack = [
        entry.name,
        entry.summary,
        entry.body,
        entry.loreType,
        entry.era,
        entry.status,
        entry.location,
        entry.folder,
      ]
        .join(' \u0000 ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [permitted, query, type]);

  const selected = useMemo(
    () => permitted.find((entry) => entry.id === selectedId) ?? null,
    [permitted, selectedId],
  );

  const create = useCallback(async () => {
    const entry = createLore({ id: crypto.randomUUID(), now: new Date().toISOString() });
    try {
      await saveEntity(entry);
      await refresh();
      setSelectedId(entry.id);
      announce('New lore entry.');
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [refresh, announce]);

  const update = useCallback(
    async (entry: Lore) => {
      const next = { ...entry, updatedAt: new Date().toISOString() };
      setAll((current) => current.map((item) => (item.id === next.id ? next : item)));
      try {
        await saveEntity(next);
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [],
  );

  const remove = useCallback(
    async (entry: Lore) => {
      try {
        await deleteEntity(entry);
        setSelectedId(null);
        await refresh();
        announce('Lore entry deleted.');
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [refresh, announce],
  );

  return {
    entries,
    total: permitted.length,
    types,
    skipped,
    selected,
    select: setSelectedId,
    query,
    setQuery,
    type,
    setType,
    loading,
    error,
    dismissError: useCallback(() => setError(null), []),
    create,
    update,
    remove,
    reveal: useCallback(() => revealEntityFolder('lore'), []),
    isBlank: isBlankLore,
    viewer,
  };
}
