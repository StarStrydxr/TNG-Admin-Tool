import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ENTITY_KINDS, foldersIn, normaliseFolder, type EntityKind, type SavedEntity } from '../domain/entities';
import { visibleTo, type Role } from '../domain/roles';
import {
  EMPTY_FILTER,
  applyFilter,
  gradesPresent,
  isFilterActive,
  type LibraryFilter,
} from '../domain/entity-search';
import {
  deleteEntity,
  listEntities,
  revealEntityFolder,
  saveEntity,
  type SkippedFile,
} from '../services/storage';
import { useSettings } from './useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** `null` means "everything"; `''` means the collection root specifically. */
export type FolderFilter = string | null;

export function useLibrary() {
  const { settings } = useSettings();
  const viewer: Role = settings.role;

  const [kind, setKind] = useState<EntityKind>('mission');
  const [all, setAll] = useState<readonly SavedEntity[]>([]);
  const [skipped, setSkipped] = useState<readonly SkippedFile[]>([]);
  const [directory, setDirectory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folder, setFolder] = useState<FolderFilter>(null);
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_FILTER);

  const reload = useCallback(async (next: EntityKind) => {
    setLoading(true);
    setError(null);
    try {
      const listing = await listEntities(next);
      setAll(listing.entities);
      setSkipped(listing.skipped);
      setDirectory(listing.directory);
    } catch (cause) {
      setError(errorText(cause));
      setAll([]);
      setSkipped([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set by `goTo` so that following a link into another collection does not have its selection
   * wiped by the switch. A ref rather than state: it must survive the render that changes the
   * tab without itself being a reason to re-run this effect.
   */
  const pendingSelection = useRef<string | null>(null);

  useEffect(() => {
    void reload(kind);
    setSelectedId(pendingSelection.current);
    pendingSelection.current = null;
    setFolder(null);
    setFilter(EMPTY_FILTER);
  }, [kind, reload]);

  /**
   * Rank filtering happens here, once, before anything else sees the list — so no screen can
   * forget it and leak a higher-tier record into a view or a count.
   */
  const permitted = useMemo(() => visibleTo(all, viewer), [all, viewer]);

  /** How many records the active rank is not being shown, for an honest footnote. */
  const hiddenCount = all.length - permitted.length;

  /**
   * Search and filters narrow what the rank already permits — never the other way round. The
   * folder tree and the counts are built from this same array, so a search that hides a record
   * also drops it from its folder's count.
   */
  const matched = useMemo(() => applyFilter(permitted, filter), [permitted, filter]);

  /** How many the rank can see but the current search is hiding. */
  const filteredOutCount = permitted.length - matched.length;

  const folders = useMemo(() => foldersIn(matched), [matched]);

  const entities = useMemo(() => {
    if (folder === null) return matched;
    return matched.filter((entity) => entity.folder === folder);
  }, [matched, folder]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entity of matched) {
      const parts = entity.folder.split('/').filter(Boolean);
      for (let i = 1; i <= parts.length; i += 1) {
        const path = parts.slice(0, i).join('/');
        map.set(path, (map.get(path) ?? 0) + 1);
      }
    }
    return map;
  }, [matched]);

  // Selection follows the rank filter, not the search: narrowing the list should not throw
  // away the record you are reading.
  const selected = useMemo(
    () => permitted.find((entity) => entity.id === selectedId) ?? null,
    [permitted, selectedId],
  );

  const update = useCallback(
    async (next: SavedEntity) => {
      setError(null);
      try {
        const record: SavedEntity = {
          ...next,
          folder: normaliseFolder(next.folder),
          updatedAt: new Date().toISOString(),
        };
        await saveEntity(record);
        await reload(record.kind);
        setSelectedId(record.id);
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [reload],
  );

  const remove = useCallback(
    async (entity: SavedEntity) => {
      setError(null);
      try {
        await deleteEntity(entity);
        setSelectedId(null);
        await reload(entity.kind);
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [reload],
  );

  /* ---------------- bulk ---------------- */

  /**
   * Records ticked for a bulk action.
   *
   * Kept by id rather than by record so a reload does not strand the selection, and
   * intersected with what is *currently shown* before anything acts on it — a mark left behind
   * by a since-narrowed filter must not be swept up by "delete selected". That intersection is
   * also what keeps a record the viewer's rank hides out of every bulk action, since
   * `entities` is already `visibleTo()`-filtered (CLAUDE.md §4a).
   */
  const [markedIds, setMarkedIds] = useState<ReadonlySet<string>>(new Set());

  const marked = useMemo(
    () => entities.filter((entity) => markedIds.has(entity.id)),
    [entities, markedIds],
  );

  const toggleMark = useCallback((id: string) => {
    setMarkedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const markAllShown = useCallback(() => {
    setMarkedIds(new Set(entities.map((entity) => entity.id)));
  }, [entities]);

  const clearMarks = useCallback(() => setMarkedIds(new Set()), []);

  /** Apply the same change to every marked record, then reload once. */
  const updateMarked = useCallback(
    async (change: Partial<Pick<SavedEntity, 'folder' | 'minRole'>>) => {
      if (marked.length === 0) return;
      setError(null);
      const now = new Date().toISOString();
      try {
        for (const entity of marked) {
          await saveEntity({
            ...entity,
            ...change,
            folder: normaliseFolder(change.folder ?? entity.folder),
            updatedAt: now,
          } as SavedEntity);
        }
        await reload(kind);
        clearMarks();
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [marked, reload, kind, clearMarks],
  );

  const removeMarked = useCallback(async () => {
    if (marked.length === 0) return;
    setError(null);
    try {
      for (const entity of marked) await deleteEntity(entity);
      setSelectedId(null);
      await reload(kind);
      clearMarks();
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [marked, reload, kind, clearMarks]);

  /**
   * Follow a link to another collection: switch tab, clear the narrowing, select the target.
   *
   * The selection is set before the reload finishes; `selected` resolves against whatever is
   * loaded, so it simply appears once the new collection arrives.
   */
  const goTo = useCallback((nextKind: EntityKind, id: string) => {
    pendingSelection.current = id;
    setFilter(EMPTY_FILTER);
    setFolder(null);
    // Already on that tab: the effect will not fire, so select directly.
    setKind((current) => {
      if (current === nextKind) {
        pendingSelection.current = null;
        setSelectedId(id);
      }
      return nextKind;
    });
  }, []);

  const reveal = useCallback(async () => {
    try {
      await revealEntityFolder(kind);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [kind]);

  return {
    kinds: ENTITY_KINDS,
    kind,
    setKind,
    entities,
    folders,
    counts,
    total: matched.length,
    hiddenCount,
    filteredOutCount,
    filter,
    setFilter,
    filterActive: isFilterActive(filter),
    clearFilter: useCallback(() => setFilter(EMPTY_FILTER), []),
    availableGrades: useMemo(() => gradesPresent(permitted), [permitted]),
    skipped,
    directory,
    loading,
    error,
    dismissError: useCallback(() => setError(null), []),
    folder,
    setFolder,
    selected,
    select: setSelectedId,
    goTo,
    update,
    remove,
    marked,
    markedIds,
    toggleMark,
    markAllShown,
    clearMarks,
    updateMarked,
    removeMarked,
    reveal,
    viewer,
  };
}
