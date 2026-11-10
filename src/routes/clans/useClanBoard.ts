import { useCallback, useEffect, useMemo, useState } from 'react';

import { characterDisplayName, type Character } from '../../domain/character';
import { addLink, linkTo } from '../../domain/links';
import { seedFromNumber } from '../../domain/seed-words';
import { EMPTY_TABLE_SET, type TableSet } from '../../domain/tables';
import type { Clan, ClanSeat, SavedEntity } from '../../domain/entities';
import type { GradeId } from '../../domain/grades';
import { rollDraft } from '../../generators/draft';
import { SORCERER_SPEC } from '../../generators/specs';
import { draftToCharacter } from '../../generators/to-character';
import { listCharacters, listEntities, saveCharacter } from '../../services/storage';
import { loadTables } from '../../services/tables';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useClans } from '../../hooks/useClans';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function newSeed(): string {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return seedFromNumber(value ?? 0);
}

/** A character belongs to a clan when their free-text clan field names it. */
function inClan(character: Character, clanName: string): boolean {
  const wanted = clanName.trim().toLowerCase();
  return wanted.length > 0 && character.clan.trim().toLowerCase() === wanted;
}

/**
 * The clan board.
 *
 * The clans themselves come from `useClans`, which is shared with the character sheet and the
 * export path. What this adds is everything the board needs *around* them: the characters, for
 * the member roster and the seat links; the saved tools and objects, for the vault's holdings;
 * and the tables, for rolling somebody into an empty seat.
 */
export function useClanBoard() {
  const { announce } = useAnnouncer();
  const clanStore = useClans();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [characters, setCharacters] = useState<readonly Character[]>([]);
  const [holdables, setHoldables] = useState<readonly SavedEntity[]>([]);
  const [tableSet, setTableSet] = useState<TableSet>(EMPTY_TABLE_SET);

  const [filling, setFilling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    const [pcs, npcs] = await Promise.all([listCharacters('pc'), listCharacters('npc')]);
    setCharacters([...pcs.characters, ...npcs.characters]);
  }, []);

  // Three independent loads, each allowed to fail on its own. Bundled into one `Promise.all`
  // they were not: a table that would not load cost the holdings picker its list, which has
  // nothing to do with tables.
  useEffect(() => {
    let cancelled = false;
    const guard = (work: Promise<unknown>) =>
      void work.catch((cause: unknown) => {
        if (!cancelled) setError(errorText(cause));
      });

    guard(loadCharacters());

    guard(
      Promise.all([listEntities('cursed-tool'), listEntities('cursed-object')]).then(
        ([tools, objects]) => {
          if (!cancelled) setHoldables([...tools.entities, ...objects.entities]);
        },
      ),
    );

    guard(
      loadTables().then((tables) => {
        if (!cancelled) setTableSet(tables.set);
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [loadCharacters]);

  const clans = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return clanStore.clans;

    return clanStore.clans.filter((clan) => {
      const haystack = [clan.name, clan.motto, clan.innateTechnique, clan.summary, clan.seat]
        .join(' \u0000 ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [clanStore.clans, query]);

  const selected = useMemo(
    () => clanStore.clans.find((clan) => clan.id === selectedId) ?? null,
    [clanStore.clans, selectedId],
  );

  /** Who names each clan, counted for the cards. */
  const memberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const clan of clanStore.clans) {
      counts.set(clan.id, characters.filter((character) => inClan(character, clan.name)).length);
    }
    return counts;
  }, [clanStore.clans, characters]);

  const roster = useMemo(
    () => (selected ? characters.filter((character) => inClan(character, selected.name)) : []),
    [selected, characters],
  );

  const patch = useCallback(
    (clan: Clan, change: Partial<Clan>) => void clanStore.update({ ...clan, ...change }),
    [clanStore],
  );

  /**
   * Roll somebody into an empty seat.
   *
   * One roll from the sorcerer tables, saved as an NPC, then written into the seat and linked
   * both ways — the character's clan names this clan, and the clan's links point at them. The
   * NPC's stats come out at Class 3 of the rolled grade, as every generated NPC's do, because
   * the app does not calculate stats (§4); the clan bonus is ticked to record that it applies,
   * which is what the tick box is for and changes no Class.
   */
  const fillSeat = useCallback(
    async (clan: Clan, seat: ClanSeat, grade: GradeId) => {
      setFilling(seat.id);
      setError(null);

      try {
        const draft = rollDraft(SORCERER_SPEC, tableSet, newSeed(), { grade });
        const rolled = draftToCharacter(draft, {
          id: crypto.randomUUID(),
          now: new Date().toISOString(),
        });

        const character: Character = {
          ...rolled,
          clan: clan.name,
          clanBonus: true,
          // The seat is the job, so it belongs under Occupation rather than in the notes.
          occupation: seat.title || rolled.occupation,
        };

        await saveCharacter(character);
        await loadCharacters();

        await clanStore.update({
          ...clan,
          hierarchy: clan.hierarchy.map((other) =>
            other.id === seat.id
              ? {
                  ...other,
                  holder: characterDisplayName(character),
                  holderId: character.id,
                  status: 'held',
                }
              : other,
          ),
          links: addLink(
            clan.links,
            linkTo(character, seat.title ? `holds the ${seat.title} seat` : 'clan member'),
            clan.id,
          ),
        });

        announce(
          `${characterDisplayName(character)} rolled into the ${seat.title || 'open'} seat.`,
        );
      } catch (cause) {
        setError(errorText(cause));
      } finally {
        setFilling(null);
      }
    },
    [tableSet, clanStore, loadCharacters, announce],
  );

  return {
    clans,
    total: clanStore.clans.length,
    selected,
    select: setSelectedId,
    query,
    setQuery,
    memberCounts,
    roster,
    characters,
    holdables,
    /** Null until the tables are in, so the generate button is not offered before it can work. */
    tablesReady: tableSet !== EMPTY_TABLE_SET,
    filling,
    loading: clanStore.loading,
    error: error ?? clanStore.error,
    dismissError: useCallback(() => {
      setError(null);
      clanStore.dismissError();
    }, [clanStore]),
    create: clanStore.create,
    patch,
    remove: clanStore.remove,
    reveal: clanStore.reveal,
    skipped: clanStore.skipped,
    fillSeat,
  };
}
