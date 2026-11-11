import { useCallback, useEffect, useMemo, useState } from 'react';

import { canSaveToVault, draftToCharacter } from '../generators/to-character';
import { entityFromDraft, type BountyExtras, type MissionExtras } from '../generators/to-entity';
import { NO_REWARDS, recommendedGradeLine, rollBountyPurse, rollRewards } from '../generators/rewards';
import type { RolledRewards } from '../generators/rewards';
import { bandToCount, findPreset } from '../domain/difficulty';
import { gradeLabel } from '../domain/grades';
import { hostList } from '../domain/settings';
import { useSettings } from './useSettings';
import { DEFAULT_MIN_ROLE, type Role } from '../domain/roles';
import {
  rerollField,
  rerollUnlocked,
  rollDraft,
  setFieldLocked,
  setFieldValues,
  setGradeLocked,
  setVariantLocked,
  specTableIds,
  type Draft,
  type GeneratorSpec,
  type RollConstraints,
} from '../generators/draft';
import { EMPTY_TABLE_SET, missingTables, tableEntries } from '../domain/tables';
import { useHistory } from './useHistory';
import { seedFromNumber } from '../domain/seed-words';
import { findSimilar, type SimilarRecord } from '../domain/similarity';
import { ENTITY_KINDS, type EntityKind, type SavedEntity } from '../domain/entities';
import type { GradeId } from '../domain/grades';
import { loadTables, revealTablesFolder, type LoadedTables } from '../services/tables';
import { listEntities, saveCharacter, saveEntity } from '../services/storage';

/**
 * A fresh seed, as three readable words.
 *
 * Randomness comes from the platform; turning it into words is pure and lives in
 * `domain/seed-words.ts`. Hex seeds from before this change still work — a seed is just a
 * string fed to the hash, so nothing saved needs migrating.
 */
function newSeed(): string {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return seedFromNumber(value ?? 0);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useGenerator(specs: readonly GeneratorSpec[]) {
  const first = specs[0];
  if (!first) throw new Error('useGenerator needs at least one spec');

  const [kind, setKind] = useState(first.kind);
  const [tables, setTables] = useState<LoadedTables | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * The draft lives in a history so rolls, re-rolls and hand edits are all undoable. Field
   * edits coalesce per field, so typing a name is one undo step rather than one per letter.
   */
  const history = useHistory<Draft | null>(null);
  const draft = history.value;
  const setDraft = history.set;
  const [seed, setSeed] = useState(newSeed);
  const [pinnedGrade, setPinnedGrade] = useState<GradeId | ''>('');
  const [pinnedVariant, setPinnedVariant] = useState('');
  /** fieldKey -> entry id, for fields the user has pinned to a specific table entry. */
  const [picks, setPicks] = useState<Readonly<Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  /** Sub-drafts owned by the current draft — a shikigami technique's household. */
  const [children, setChildren] = useState<readonly Draft[]>([]);
  const [folder, setFolder] = useState('');
  const [minRole, setMinRole] = useState<Role>(DEFAULT_MIN_ROLE);
  /**
   * Stored image file name. Kept across re-rolls on purpose — a portrait usually outlives the
   * text it sits beside, and the picker's Remove button is there when it doesn't.
   */
  const [image, setImage] = useState('');

  /**
   * Records already saved in this draft's collection, for the duplicate check. Loaded once per
   * generator and refreshed after a save, rather than on every roll.
   */
  const [existing, setExisting] = useState<readonly SavedEntity[]>([]);

  /*
   * The parts of a posting that are not table rolls: difficulty, hosts, slots, the recommended
   * grade line and the rewards. Only missions use them, and they are all editable after the
   * roll — the difficulty decides the starting point, not the final answer.
   */
  const { settings } = useSettings();
  const [difficultyId, setDifficultyId] = useState(settings.defaultDifficulty);
  const [hosts, setHosts] = useState('');
  const [slotsFilled, setSlotsFilled] = useState(0);
  const [slotsTotal, setSlotsTotal] = useState(4);
  const [faction, setFaction] = useState('');
  /**
   * The recommendation is held as a grade rather than the sentence, so the picker has something
   * to select and the "and Below" phrasing stays in one place (`recommendedGradeLine`).
   */
  const [recommendedGrade, setRecommendedGrade] = useState<GradeId>('grade-4');
  const [rewards, setRewards] = useState<RolledRewards>(NO_REWARDS);
  const [rewardsNonce, setRewardsNonce] = useState(0);

  /** Edit one bucket's lines by hand without disturbing the other three. */
  const setRewardLines = useCallback(
    (bucket: keyof RolledRewards, lines: readonly string[]) => {
      setRewards((current) => ({ ...current, [bucket]: lines }));
      setSavedId(null);
    },
    [],
  );

  const difficulty = useMemo(
    () => findPreset(settings.difficulties, difficultyId),
    [settings.difficulties, difficultyId],
  );

  const spec = useMemo(
    () => specs.find((candidate) => candidate.kind === kind) ?? first,
    [specs, kind, first],
  );

  const tableSet = tables?.set ?? EMPTY_TABLE_SET;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadTables()
      .then((loaded) => {
        if (!cancelled) setTables(loaded);
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
  }, []);

  const missing = useMemo(
    () => missingTables(tableSet, specTableIds(spec)),
    [tableSet, spec],
  );

  /** Options for the variant picker, empty for specs that have no variants. */
  const variantOptions = useMemo(
    () =>
      spec.variantTable
        ? tableEntries(tableSet, spec.variantTable).map((entry) => ({
            id: entry.id,
            label: entry.value,
          }))
        : [],
    [spec, tableSet],
  );

  /** Fields that offer a pick list, with their entries, for the UI to render. */
  const pickableFields = useMemo(
    () =>
      spec.fields
        .filter((field) => field.pickTableId !== undefined)
        .map((field) => ({
          key: field.key,
          label: field.pickLabel ?? field.label,
          entries: tableEntries(tableSet, field.pickTableId as string),
        }))
        .filter((group) => group.entries.length > 0),
    [spec, tableSet],
  );

  /**
   * Force every picked field back to its chosen entry. Applied after any roll, so a pick
   * survives re-rolling the rest of the draft.
   */
  const withPicks = useCallback(
    (draft: Draft): Draft =>
      Object.entries(picks).reduce((current, [key, entryId]) => {
        const field = spec.fields.find((candidate) => candidate.key === key);
        if (!field?.pickTableId) return current;
        const entry = tableEntries(tableSet, field.pickTableId).find((e) => e.id === entryId);
        return entry ? setFieldValues(current, key, [entry.value]) : current;
      }, draft),
    [picks, spec, tableSet],
  );

  /** Choose a fixed entry for a field, or pass null to go back to rolling it. */
  const setPick = useCallback(
    (fieldKey: string, entryId: string | null) => {
      setPicks((current) => {
        const next = { ...current };
        if (entryId === null) delete next[fieldKey];
        else next[fieldKey] = entryId;
        return next;
      });

      // A canonical entry may name its technique type; honour it so the rest of the draft
      // rolls from the right tables.
      const field = spec.fields.find((candidate) => candidate.key === fieldKey);
      if (entryId !== null && field?.pickTableId) {
        const entry = tableEntries(tableSet, field.pickTableId).find((e) => e.id === entryId);
        const tag = entry?.tags?.[0];
        if (tag && variantOptions.some((option) => option.id === tag)) setPinnedVariant(tag);
      }
    },
    [spec, tableSet, variantOptions],
  );

  const isMission = spec.kind === 'mission';
  const isBounty = spec.kind === 'bounty';

  // The posting fields a bounty carries that no table rolls. Free text throughout — the
  // server's real options for the first three are not written down anywhere (see
  // `domain/bounty.ts`), and the purse is rolled from its own economy, not the mission tiers.
  const [bountyTarget, setBountyTarget] = useState('');
  const [targetGrade, setTargetGrade] = useState<GradeId>('grade-1');
  const [conspicuousity, setConspicuousity] = useState('Public');
  const [bountyState, setBountyState] = useState('Dead');
  const [pings, setPings] = useState('');
  const [purse, setPurse] = useState('');

  // The chosen difficulty follows the setting until the setting itself changes, so a new
  // session starts where Settings says and an in-session choice is not overwritten by a render.
  const defaultDifficulty = settings.defaultDifficulty;
  useEffect(() => setDifficultyId(defaultDifficulty), [defaultDifficulty]);

  const roll = useCallback(
    (withSeed?: string) => {
      const next = withSeed ?? newSeed();
      setSeed(next);
      setSavedId(null);

      const constraints: RollConstraints = {
        ...(pinnedGrade === '' ? {} : { grade: pinnedGrade }),
        ...(pinnedVariant === '' ? {} : { variantId: pinnedVariant }),
        // Difficulty decides how much there is to do, not what it is.
        ...(isMission
          ? {
              counts: {
                objectives: bandToCount(difficulty.objectives),
                complications: bandToCount(difficulty.complications),
              },
            }
          : {}),
      };

      const rolled = rollDraft(spec, tableSet, next, constraints);
      setDraft(withPicks(rolled), undefined);

      if (isMission) {
        setRewardsNonce(0);
        setRewards(rollRewards(difficulty, settings.hostRewards, next, 0));
        setRecommendedGrade(rolled.grade);
        setSlotsFilled(0);
        setSlotsTotal(difficulty.slots);
        setHosts((current) => current || settings.defaultHosts);
      }
    },
    [
      setDraft,
      spec,
      tableSet,
      pinnedGrade,
      pinnedVariant,
      withPicks,
      isMission,
      difficulty,
      settings.defaultHosts,
      settings.hostRewards,
    ],
  );

  /**
   * Switch difficulty, and bring the derived parts of the posting with it.
   *
   * Rewards and the slot count are *entirely* decided by the preset, so leaving them showing
   * Easy's numbers under a Hard heading would be a lie on the screen. The rolled fields are
   * left alone: objective and complication counts change what the next roll asks for, and
   * silently re-rolling someone's objectives because they looked at another difficulty would
   * throw away work they might have locked or edited.
   */
  const chooseDifficulty = useCallback(
    (id: string) => {
      setDifficultyId(id);
      if (!draft) return;

      const next = findPreset(settings.difficulties, id);
      setRewardsNonce(0);
      setRewards(rollRewards(next, settings.hostRewards, draft.seed, 0));
      setSlotsTotal(next.slots);
      setSavedId(null);
    },
    [draft, settings.difficulties, settings.hostRewards],
  );

  /** Re-roll just the rewards, leaving the posting alone. */
  const rerollRewards = useCallback(() => {
    if (!draft) return;
    const nonce = rewardsNonce + 1;
    setRewardsNonce(nonce);
    setRewards(rollRewards(difficulty, settings.hostRewards, draft.seed, nonce));
    setSavedId(null);
  }, [draft, difficulty, rewardsNonce, settings.hostRewards]);

  /** Re-roll against the seed already in the box, for reproducing a result. */
  const rollCurrentSeed = useCallback(() => roll(seed), [roll, seed]);

  const rerollAll = useCallback(() => {
    setDraft((current) => (current ? withPicks(rerollUnlocked(current, spec, tableSet)) : current));
    setSavedId(null);
  }, [setDraft, spec, tableSet, withPicks]);

  const rerollOne = useCallback(
    (key: string) => {
      setDraft((current) =>
        current ? withPicks(rerollField(current, spec, tableSet, key)) : current,
      );
      setSavedId(null);
    },
    [setDraft, spec, tableSet, withPicks],
  );

  // Locking is not an edit to undo — it changes what the next roll touches, not the content.
  const toggleLock = useCallback(
    (key: string, locked: boolean) => {
      setDraft((current) => (current ? setFieldLocked(current, key, locked) : current));
    },
    [setDraft],
  );

  /** Lock or unlock every field at once — the keyboard's L and U. */
  const lockAll = useCallback(
    (locked: boolean) => {
      setDraft((current) => {
        if (!current) return current;
        return current.fields.reduce(
          (draft, field) => setFieldLocked(draft, field.key, locked),
          current,
        );
      });
    },
    [setDraft],
  );

  const toggleGradeLock = useCallback(
    (locked: boolean) => {
      setDraft((current) => (current ? setGradeLocked(current, locked) : current));
    },
    [setDraft],
  );

  const toggleVariantLock = useCallback(
    (locked: boolean) => {
      setDraft((current) => (current ? setVariantLocked(current, locked) : current));
    },
    [setDraft],
  );

  const editField = useCallback((key: string, values: readonly string[]) => {
    setDraft((current) => (current ? setFieldValues(current, key, values) : current), `field:${key}`);
    setSavedId(null);
  }, [setDraft]);

  /** The collection this generator writes to, or null for one that saves a character. */
  const collectionKind: EntityKind | null = (ENTITY_KINDS as readonly string[]).includes(kind)
    ? (kind as EntityKind)
    : null;

  const refreshExisting = useCallback(async () => {
    if (!collectionKind) {
      setExisting([]);
      return;
    }
    try {
      const listing = await listEntities(collectionKind);
      setExisting(listing.entities);
    } catch {
      // No shell, or an unreadable folder. The duplicate note is an extra, never a blocker.
      setExisting([]);
    }
  }, [collectionKind]);

  useEffect(() => {
    void refreshExisting();
  }, [refreshExisting]);

  /**
   * Sorcerers and curse users become vault characters; everything else becomes a typed saved
   * entity in its own collection.
   */
  /**
   * A fresh roll gets a fresh purse; a hand-typed one survives until the next roll.
   *
   * Keyed on the seed and the threat grade, which are the only two things the purse derives
   * from. Same reasoning as switching a mission's difficulty rewriting its reward buckets:
   * the derived part follows the roll, and anything typed over it is the author's until they
   * roll again.
   */
  // `draft` is null until the first roll, which is also when there is nothing to price.
  const draftGrade = draft?.grade;
  const draftSeed = draft?.seed;
  useEffect(() => {
    if (!isBounty || !draftGrade || !draftSeed) return;
    setPurse(rollBountyPurse(draftGrade, draftSeed));
    // The target's ranking follows the roll too, so a fresh posting reads consistently and
    // the "despite the target's ranking" line stays quiet until somebody creates the gap on
    // purpose. Same default the parser applies to a posting that names only one grade.
    setTargetGrade(draftGrade);
  }, [isBounty, draftGrade, draftSeed]);

  const bountyExtras: BountyExtras = useMemo(
    () =>
      isBounty
        ? {
            targetGrade,
            target: bountyTarget,
            conspicuousity,
            state: bountyState,
            pings: pings.split('\n').map((line) => line.trim()).filter(Boolean),
            rewards: purse.split('\n').map((line) => line.trim()).filter(Boolean),
          }
        : {},
    [isBounty, targetGrade, bountyTarget, conspicuousity, bountyState, pings, purse],
  );

  const missionExtras: MissionExtras = useMemo(
    () =>
      isMission
        ? {
            recommendedGrade: recommendedGradeLine(gradeLabel(recommendedGrade)),
            faction,
            hosts: hostList(hosts),
            rewards: rewards.base,
            objectiveRewards: rewards.objective,
            mvpRewards: rewards.mvp,
            hostRewards: rewards.hosts,
            difficulty: difficulty.label,
            slots: `${slotsFilled}/${slotsTotal}`,
          }
        : {},
    [
      isMission,
      recommendedGrade,
      faction,
      hosts,
      rewards,
      difficulty.label,
      slotsFilled,
      slotsTotal,
    ],
  );

  const saveToVault = useCallback(async () => {
    if (!draft) return;
    setError(null);
    const meta = { id: crypto.randomUUID(), now: new Date().toISOString(), folder, minRole, image };

    try {
      if (canSaveToVault(draft)) {
        const character = draftToCharacter(draft, { ...meta, portrait: image });
        await saveCharacter(character);
        setSavedId(character.id);
        return;
      }

      const entity = entityFromDraft(draft, meta, children, missionExtras, bountyExtras);
      if (!entity) {
        setError(`Nothing to save for a ${draft.kind} draft.`);
        return;
      }
      await saveEntity(entity);
      setSavedId(entity.id);
      await refreshExisting();
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [draft, children, folder, minRole, image, missionExtras, bountyExtras, refreshExisting]);

  /**
   * Saved records this draft closely resembles.
   *
   * Recomputed as the draft changes, which is cheap: a word-set comparison over one
   * collection. A note for the user to judge, never a block — two similar missions are often
   * deliberate (see `domain/similarity.ts`).
   */
  const similar: readonly SimilarRecord[] = useMemo(() => {
    if (!draft || existing.length === 0) return [];
    const candidate = entityFromDraft(draft, { id: 'candidate', now: '' }, children, missionExtras, bountyExtras);
    return candidate ? findSimilar(candidate, existing) : [];
  }, [draft, children, existing, missionExtras, bountyExtras]);

  /**
   * The record as it would be saved, for the export preview.
   *
   * Built from the same converter the save path uses, so a preview cannot drift from what
   * actually lands on disk. Null for a draft that has nowhere to go — a sorcerer, say, which
   * becomes a character rather than an entity.
   */
  const previewEntity = useMemo(
    () =>
      draft
        ? entityFromDraft(draft, { id: 'preview', now: '' }, children, missionExtras, bountyExtras)
        : null,
    [draft, children, missionExtras, bountyExtras],
  );

  const revealTables = useCallback(async () => {
    try {
      await revealTablesFolder();
    } catch (cause) {
      setError(errorText(cause));
    }
  }, []);

  // Switching generator discards the draft rather than showing a stale one. The history goes
  // with it: undoing into another generator's draft would be nonsense.
  const resetHistory = history.reset;
  useEffect(() => {
    resetHistory(null);
    setSavedId(null);
    setChildren([]);
  }, [kind, resetHistory]);

  return {
    spec,
    kind,
    setKind,
    specs,
    tables,
    tableSet,
    loading,
    missing,
    draft,
    seed,
    setSeed,
    pinnedGrade,
    setPinnedGrade,
    pinnedVariant,
    setPinnedVariant,
    variantOptions,
    toggleVariantLock,
    picks,
    setPick,
    pickableFields,
    children,
    setChildren,
    folder,
    setFolder,
    minRole,
    setMinRole,
    image,
    setImage,
    isMission,
    isBounty,
    bountyTarget,
    setBountyTarget,
    targetGrade,
    setTargetGrade,
    conspicuousity,
    setConspicuousity,
    bountyState,
    setBountyState,
    pings,
    setPings,
    purse,
    setPurse,
    difficulty,
    difficultyId,
    setDifficultyId: chooseDifficulty,
    difficulties: settings.difficulties,
    hosts,
    setHosts,
    slotsFilled,
    setSlotsFilled,
    slotsTotal,
    setSlotsTotal,
    faction,
    setFaction,
    recommendedGrade,
    setRecommendedGrade,
    previewEntity,
    rewards,
    setRewardLines,
    rerollRewards,
    hostRewards: settings.hostRewards,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    similar,
    error,
    dismissError: useCallback(() => setError(null), []),
    savedId,
    roll,
    rollCurrentSeed,
    rerollAll,
    rerollOne,
    toggleLock,
    lockAll,
    toggleGradeLock,
    editField,
    saveToVault,
    revealTables,
  };
}
