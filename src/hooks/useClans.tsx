import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { createClan, masamiSeed } from '../domain/clans';
import { visibleTo } from '../domain/roles';
import type { Clan } from '../domain/entities';
import { deleteEntity, listEntities, revealEntityFolder, saveEntity } from '../services/storage';
import type { SkippedFile } from '../services/storage';
import { useAnnouncer } from './useAnnouncer';
import { useSettings } from './useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ClansContextValue {
  /** Rank-filtered, once, before anything else sees it (CLAUDE.md §4a). */
  readonly clans: readonly Clan[];
  readonly skipped: readonly SkippedFile[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly dismissError: () => void;
  readonly refresh: () => Promise<void>;
  readonly create: (name?: string) => Promise<Clan | null>;
  readonly update: (clan: Clan) => Promise<void>;
  readonly remove: (clan: Clan) => Promise<void>;
  readonly reveal: () => Promise<void>;
}

const ClansContext = createContext<ClansContextValue | null>(null);

/**
 * The clan collection, loaded once for the whole window.
 *
 * A provider rather than a hook per consumer because three unrelated surfaces need the same
 * list — the clan board, the character sheet's bonus block, and printing and export, which
 * turn a ticked bonus and a list of mutation ids into readable lines. Three independent loads
 * would also mean three racing attempts at the first-run seed.
 *
 * Why the sheet reads clans at all: `domain/clans.ts` is pure and cannot touch the vault, so
 * `describeClanBonus` and friends take the list as an argument and somebody has to hold it.
 */
export function ClansProvider({ children }: { readonly children: ReactNode }) {
  const { announce } = useAnnouncer();
  const { settings } = useSettings();
  const viewer = settings.role;

  const [all, setAll] = useState<readonly Clan[]>([]);
  const [skipped, setSkipped] = useState<readonly SkippedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // One attempt per session, whatever the outcome. A failed seed must not retry on every
  // refresh, or a read-only vault would write the same error to the screen forever.
  const seeded = useRef(false);

  const load = useCallback(async (): Promise<readonly Clan[]> => {
    const listing = await listEntities('clan');
    const clans = listing.entities.filter((entity): entity is Clan => entity.kind === 'clan');
    setAll(clans);
    setSkipped(listing.skipped);
    return clans;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await load();
      setError(null);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [load]);

  /**
   * Put the Masami in an empty vault, once.
   *
   * So the editor opens on something real rather than a blank board, and so the clan Walker's
   * sheet already names resolves to a record. Skipped the moment the collection holds anything
   * at all, or a file failed to parse — seeding over a vault whose one clan file has a typo in
   * it would look exactly like losing it.
   */
  const seed = useCallback(async () => {
    if (seeded.current) return;
    seeded.current = true;
    try {
      await saveEntity(masamiSeed(crypto.randomUUID(), new Date().toISOString()));
      await load();
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const listing = await listEntities('clan');
        if (cancelled) return;

        const clans = listing.entities.filter((e): e is Clan => e.kind === 'clan');
        setAll(clans);
        setSkipped(listing.skipped);
        setError(null);

        if (clans.length === 0 && listing.skipped.length === 0) await seed();
      } catch (cause) {
        if (!cancelled) setError(errorText(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seed]);

  // Rank first, and once — a list built from the unfiltered set is how a secret leaks (§4a).
  const clans = useMemo(() => visibleTo(all, viewer), [all, viewer]);

  const create = useCallback(
    async (name = '') => {
      const clan = createClan({ id: crypto.randomUUID(), now: new Date().toISOString(), name });
      try {
        await saveEntity(clan);
        await load();
        announce(name ? `Clan ${name} created.` : 'New clan.');
        return clan;
      } catch (cause) {
        setError(errorText(cause));
        return null;
      }
    },
    [load, announce],
  );

  // Optimistic: the editor is a form, and waiting for a disk write between keystrokes would
  // make it feel broken. A failed write surfaces as an error without rolling the field back,
  // so nothing the user typed disappears under them.
  const update = useCallback(async (clan: Clan) => {
    const next = { ...clan, updatedAt: new Date().toISOString() };
    setAll((current) => current.map((item) => (item.id === next.id ? next : item)));
    try {
      await saveEntity(next);
    } catch (cause) {
      setError(errorText(cause));
    }
  }, []);

  const remove = useCallback(
    async (clan: Clan) => {
      try {
        await deleteEntity(clan);
        await load();
        announce('Clan deleted.');
      } catch (cause) {
        setError(errorText(cause));
      }
    },
    [load, announce],
  );

  const value = useMemo<ClansContextValue>(
    () => ({
      clans,
      skipped,
      loading,
      error,
      dismissError: () => setError(null),
      refresh,
      create,
      update,
      remove,
      reveal: () => revealEntityFolder('clan'),
    }),
    [clans, skipped, loading, error, refresh, create, update, remove],
  );

  return <ClansContext.Provider value={value}>{children}</ClansContext.Provider>;
}

const NO_CLANS: ClansContextValue = {
  clans: [],
  skipped: [],
  loading: false,
  error: null,
  dismissError: () => undefined,
  refresh: async () => undefined,
  create: async () => null,
  update: async () => undefined,
  remove: async () => undefined,
  reveal: async () => undefined,
};

/**
 * The clans.
 *
 * Degrades to an empty list without a provider, the same way `usePrint` does: a clan bonus is
 * an annotation on a sheet, and a missing provider should cost that annotation, not the screen.
 */
export function useClans(): ClansContextValue {
  return useContext(ClansContext) ?? NO_CLANS;
}
