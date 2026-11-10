import { useCallback, useEffect, useMemo, useState } from 'react';

import { useHistory } from '../../hooks/useHistory';

import { createCharacter, type Character, type CharacterKind } from '../../domain/character';
import { parseCharacter } from '../../domain/character-parse';
import {
  EMPTY_VAULT_FILTER,
  filterCharacters,
  type VaultFilter,
} from '../../domain/character-search';
import type { GradeId } from '../../domain/grades';
import {
  deleteCharacter,
  listCharacters,
  revealVaultFolder,
  saveCharacter,
  type SkippedFile,
} from '../../services/storage';

/** New characters start here; the grade is the first thing the user changes anyway. */
const STARTING_GRADE: GradeId = 'grade-4';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useVault() {
  const [kind, setKind] = useState<CharacterKind>('pc');
  const [characters, setCharacters] = useState<readonly Character[]>([]);
  const [skipped, setSkipped] = useState<readonly SkippedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /**
   * The character being edited lives in a history, so every change is undoable. Coalescing is
   * keyed on which fields a patch touches, which makes typing a name one step and moving to
   * another field start a new one.
   */
  const history = useHistory<Character | null>(null);
  const draft = history.value;
  const resetDraft = history.reset;
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (nextKind: CharacterKind) => {
      setLoading(true);
      setError(null);
      try {
        const listing = await listCharacters(nextKind);
        setCharacters(listing.characters);
        setSkipped(listing.skipped);
      } catch (cause) {
        setError(errorText(cause));
        setCharacters([]);
        setSkipped([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void reload(kind);
    setSelectedId(null);
    resetDraft(null);
    setDirty(false);
  }, [kind, reload, resetDraft]);

  const select = useCallback(
    (id: string) => {
      const found = characters.find((character) => character.id === id);
      if (!found) return;
      setSelectedId(id);
      // A different record starts a clean history: undoing into the last one would be wrong.
      resetDraft(found);
      setDirty(false);
    },
    [characters, resetDraft],
  );

  const create = useCallback(() => {
    const character = createCharacter({
      id: crypto.randomUUID(),
      now: new Date().toISOString(),
      kind,
      grade: STARTING_GRADE,
    });
    resetDraft(character);
    setSelectedId(character.id);
    setDirty(true);
  }, [kind, resetDraft]);

  /**
   * Create a character from a submitted sheet.
   *
   * The import is merged over a fresh character and then run through the vault's own reader,
   * so an imported record is validated exactly like one loaded off disk — no second path into
   * the vault, and no way for the importer to produce a shape `parseCharacter` would reject.
   * It lands as an unsaved draft on purpose: nothing reaches the disk until Dan looks at it.
   */
  const createFromImport = useCallback(
    (imported: Partial<Character>) => {
      const seed = {
        id: crypto.randomUUID(),
        now: new Date().toISOString(),
        kind,
        grade: imported.grade ?? STARTING_GRADE,
      };
      const character = parseCharacter({ ...createCharacter(seed), ...imported }, seed);

      resetDraft(character);
      setSelectedId(character.id);
      setDirty(true);
    },
    [kind, resetDraft],
  );

  const patch = useCallback(
    (changes: Partial<Character>) => {
      history.set(
        (current) => (current ? { ...current, ...changes } : current),
        `patch:${Object.keys(changes).sort().join(',')}`,
      );
      setDirty(true);
    },
    [history],
  );

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);

    // The record may have moved collection; persist under whichever it now claims.
    const record: Character = { ...draft, updatedAt: new Date().toISOString() };
    try {
      await saveCharacter(record);
      // Saving stamps a timestamp; that is not an edit anyone would want to undo.
      history.replace(record);
      setDirty(false);
      await reload(record.kind);
      if (record.kind !== kind) setKind(record.kind);
      else setSelectedId(record.id);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSaving(false);
    }
  }, [draft, history, kind, reload]);

  const remove = useCallback(async () => {
    if (!draft) return;
    setError(null);
    try {
      await deleteCharacter(draft);
      resetDraft(null);
      setSelectedId(null);
      setDirty(false);
      await reload(kind);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [draft, kind, reload, resetDraft]);

  const reveal = useCallback(async () => {
    try {
      await revealVaultFolder(kind);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [kind]);

  /**
   * An unsaved new character is not in the listing yet, so splice it in — otherwise it vanishes
   * from the sidebar while you are filling it out.
   */
  const [filter, setFilter] = useState<VaultFilter>(EMPTY_VAULT_FILTER);

  const visible = useMemo(() => {
    if (!draft || characters.some((character) => character.id === draft.id)) return characters;
    return [draft, ...characters];
  }, [characters, draft]);

  const shown = useMemo(() => filterCharacters(visible, filter), [visible, filter]);

  return {
    kind,
    setKind,
    characters: shown,
    /** Before the filter — the dropdowns offer what exists, not only what survived. */
    allCharacters: visible,
    filter,
    setFilter,
    skipped,
    selectedId,
    draft,
    dirty,
    loading,
    saving,
    error,
    dismissError: useCallback(() => setError(null), []),
    select,
    create,
    createFromImport,
    patch,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    save,
    remove,
    reveal,
  };
}
