import { useCallback, useEffect, useState } from 'react';

import { attachTechnique, hasInnateTechnique } from '../../domain/attach';
import { CHARACTER_KINDS, characterDisplayName, type Character } from '../../domain/character';
import { gradeAbbrev } from '../../domain/grades';
import { techniqueFromDraft } from '../../generators/to-entity';
import type { Draft } from '../../generators/draft';
import { listCharacters, saveCharacter } from '../../services/storage';
import { useAnnouncer } from '../../hooks/useAnnouncer';

interface AttachTechniqueProps {
  readonly draft: Draft;
  /** The shikigami rolled alongside, so the household travels with the technique. */
  readonly household: readonly Draft[];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Put the rolled technique onto a vault character.
 *
 * Deliberately a copy, not a link: the character ends up owning its own innate technique, so
 * editing the saved technique record later does not silently rewrite someone's sheet. Whether
 * tools and techniques should become shared references is still open (CLAUDE.md §12.7).
 */
export function AttachTechnique({ draft, household }: AttachTechniqueProps) {
  const { announce } = useAnnouncer();
  const [characters, setCharacters] = useState<readonly Character[]>([]);
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all(CHARACTER_KINDS.map((kind) => listCharacters(kind)))
      .then((listings) => {
        if (cancelled) return;
        setCharacters(listings.flatMap((listing) => listing.characters));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorText(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A different roll invalidates the "attached" note, but not the chosen target.
  useEffect(() => {
    setDone('');
    setConfirming(false);
  }, [draft.seed, draft.fields]);

  const target = characters.find((character) => character.id === targetId) ?? null;

  const attach = useCallback(async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const technique = techniqueFromDraft(draft, { id: crypto.randomUUID(), now: new Date().toISOString() }, household);
      const next = attachTechnique(target, technique, new Date().toISOString());
      await saveCharacter(next);
      setCharacters((current) => current.map((c) => (c.id === next.id ? next : c)));
      setDone(characterDisplayName(next));
      setConfirming(false);
      announce(`Attached to ${characterDisplayName(next)}.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [target, draft, household, announce]);

  const willOverwrite = target ? hasInnateTechnique(target) : false;

  return (
    <section className="mt-4 border-t border-void-800 pt-4">
      <h3 className="mb-3 text-xs font-medium tracking-wide text-ash-400">
        Attach to a vault character
      </h3>

      {error ? (
        <p className="mb-3 rounded-md border border-blood-500/40 bg-blood-500/10 px-3 py-2 text-sm text-ash-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Character</span>
          <select
            value={targetId}
            onChange={(event) => {
              setTargetId(event.target.value);
              setConfirming(false);
              setDone('');
            }}
            className="w-64 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
          >
            <option value="">Choose one…</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {characterDisplayName(character)} · {gradeAbbrev(character.grade)}
              </option>
            ))}
          </select>
        </label>

        {confirming ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void attach()}
              className="rounded-md border border-blood-500 bg-blood-500/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-blood-500/25 disabled:opacity-40"
            >
              Overwrite their technique
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-2 py-1.5 text-sm text-ash-500 hover:text-ash-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!target || busy}
            onClick={() => (willOverwrite ? setConfirming(true) : void attach())}
            className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-300 transition-colors enabled:hover:border-cursed-600 enabled:hover:text-ash-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Attaching…' : 'Attach'}
          </button>
        )}

        {done ? <span className="pb-2 text-xs text-ash-500">Written onto {done}.</span> : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ash-500">
        {target && willOverwrite && !done
          ? `${characterDisplayName(target)} already has an innate technique. Attaching replaces it.`
          : 'The character gets its own copy — cost, limitation, tell and any shikigami are kept as notes under the description. Editing the saved technique later will not change their sheet.'}
      </p>
    </section>
  );
}
