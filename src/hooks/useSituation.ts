import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_MIN_ROLE, type Role } from '../domain/roles';
import { linkTo, type EntityLink } from '../domain/links';
import { normaliseFolder, type SavedEntity } from '../domain/entities';
import { seedFromNumber } from '../domain/seed-words';
import { EMPTY_TABLE_SET, type TableSet } from '../domain/tables';
import { rerollPart, rollSituation, type Situation } from '../generators/situation';
import { entityFromDraft } from '../generators/to-entity';
import { loadTables } from '../services/tables';
import { saveEntity } from '../services/storage';
import { useAnnouncer } from './useAnnouncer';
import { useSettings } from './useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function newSeed(): string {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return seedFromNumber(value ?? 0);
}

type Part = 'mission' | 'curse' | 'tool';

/**
 * Rolling and saving a whole situation.
 *
 * Saving writes three records and links them to each other, which is the part that would be
 * tedious by hand: the mission points at the curse and the tool, and each of those points back
 * at the mission. Links are one-directional (CLAUDE.md §9), so both directions are written
 * explicitly rather than inferred.
 */
export function useSituation() {
  const { announce } = useAnnouncer();
  const { settings } = useSettings();

  const [tableSet, setTableSet] = useState<TableSet>(EMPTY_TABLE_SET);
  const [seed, setSeed] = useState(newSeed);
  const [situation, setSituation] = useState<Situation | null>(null);
  const [nonces, setNonces] = useState<Record<Part, number>>({ mission: 0, curse: 0, tool: 0 });

  const [folder, setFolder] = useState('');
  const [minRole, setMinRole] = useState<Role>(DEFAULT_MIN_ROLE);
  const [honest, setHonest] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTables()
      .then((loaded) => {
        if (!cancelled) setTableSet(loaded.set);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorText(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roll = useCallback(
    (nextSeed?: string) => {
      const used = nextSeed ?? newSeed();
      setSeed(used);
      setNonces({ mission: 0, curse: 0, tool: 0 });
      setSaved(false);
      setError(null);
      setSituation(rollSituation(tableSet, used, honest ? { noDrift: true } : {}));
    },
    [tableSet, honest],
  );

  const reroll = useCallback(
    (part: Part) => {
      setSituation((current) => {
        if (!current) return current;
        const nonce = nonces[part] + 1;
        setNonces((previous) => ({ ...previous, [part]: nonce }));
        setSaved(false);
        return rerollPart(current, tableSet, part, nonce);
      });
    },
    [tableSet, nonces],
  );

  /**
   * Write all three, then link them.
   *
   * Ids are minted up front so the links can be built before anything is written — otherwise
   * the mission would have to be saved twice.
   */
  const save = useCallback(async () => {
    if (!situation) return;
    setSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const cleanFolder = normaliseFolder(folder);
      const ids = {
        mission: crypto.randomUUID(),
        curse: crypto.randomUUID(),
        tool: crypto.randomUUID(),
      };

      const base = (part: Part) => ({
        id: ids[part],
        now,
        folder: cleanFolder,
        minRole,
      });

      // The curse is a vault character in its own right in some specs; here it is an entity,
      // so all three go through the entity converter.
      const mission = entityFromDraft(situation.mission, base('mission'), []);
      const curse = entityFromDraft(situation.curse, base('curse'), []);
      const tool = entityFromDraft(situation.tool, base('tool'), []);

      if (!mission || !curse || !tool) {
        throw new Error('That situation could not be converted into saved records.');
      }

      const withLinks = (entity: SavedEntity, links: readonly EntityLink[]): SavedEntity =>
        ({ ...entity, links } as SavedEntity);

      const linkedMission = withLinks(mission, [
        linkTo(curse, 'the curse actually on site'),
        linkTo(tool, 'recovered from the site'),
      ]);
      const linkedCurse = withLinks(curse, [linkTo(mission, 'found on this mission')]);
      const linkedTool = withLinks(tool, [linkTo(mission, 'recovered on this mission')]);

      await Promise.all([
        saveEntity(linkedMission),
        saveEntity(linkedCurse),
        saveEntity(linkedTool),
      ]);

      setSaved(true);
      announce('Situation saved: three linked records.');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSaving(false);
    }
  }, [situation, folder, minRole, announce]);

  return useMemo(
    () => ({
      tableSet,
      seed,
      setSeed,
      situation,
      roll,
      reroll,
      folder,
      setFolder,
      minRole,
      setMinRole,
      honest,
      setHonest,
      viewer: settings.role,
      saving,
      saved,
      save,
      error,
    }),
    [
      tableSet,
      seed,
      situation,
      roll,
      reroll,
      folder,
      minRole,
      honest,
      settings.role,
      saving,
      saved,
      save,
      error,
    ],
  );
}
