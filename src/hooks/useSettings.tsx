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

import { applyAppearance, applyBackgroundImage } from '../appearance';
import { readImage } from '../services/images';
import {
  defaultSettings,
  type Appearance,
  type BackgroundSettings,
  type Settings,
} from '../domain/settings';
import {
  DEFAULT_DIFFICULTY_PRESETS,
  type DifficultyPreset,
  type HostRewards,
} from '../domain/difficulty';
import type { Role } from '../domain/roles';
import { presetById, type ThemeSeed } from '../domain/theme';
import { loadSettings, saveSettings } from '../services/settings';

interface SettingsContextValue {
  readonly settings: Settings;
  readonly loading: boolean;
  readonly error: string | null;
  readonly dismissError: () => void;
  readonly setPreset: (presetId: string) => void;
  readonly setSeed: (seed: ThemeSeed) => void;
  readonly setAppearance: (patch: Partial<Appearance>) => void;
  readonly setRole: (role: Role) => void;
  readonly setExportDirectory: (path: string) => void;
  readonly setBackground: (background: Partial<BackgroundSettings>) => void;
  /** Replace one difficulty preset, matched by id. */
  readonly setDifficulty: (preset: DifficultyPreset) => void;
  readonly setDefaultDifficulty: (id: string) => void;
  readonly setDefaultHosts: (hosts: string) => void;
  readonly setHostRewards: (hostRewards: HostRewards) => void;
  /** Put the shipped difficulty bands back, leaving everything else alone. */
  readonly resetDifficulties: () => void;
  readonly reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** How long to wait after the last change before writing to disk. */
const SAVE_DEBOUNCE_MS = 400;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function SettingsProvider({ children }: { readonly children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nothing is written until the stored settings have been read, otherwise the first render's
  // defaults would overwrite the user's saved config.
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
      })
      .finally(() => {
        if (cancelled) return;
        hydrated.current = true;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply on every change, including the very first paint, so there is no flash of the default
  // theme before the stored one loads.
  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  // The picture is read from disk, so it lands a moment after the rest of the appearance. A
  // missing file simply clears it — same rule as a missing portrait (CLAUDE.md §9).
  const backgroundImage = settings.background.image;
  useEffect(() => {
    let cancelled = false;

    if (!backgroundImage) {
      applyBackgroundImage(null);
      return;
    }

    void readImage(backgroundImage).then((url) => {
      if (!cancelled) applyBackgroundImage(url);
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundImage]);

  // Debounced write — dragging a colour picker should not hammer the disk.
  useEffect(() => {
    if (!hydrated.current) return;
    if (timer.current !== null) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      saveSettings(settings).catch((cause: unknown) => setError(errorText(cause)));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [settings]);

  const setPreset = useCallback((presetId: string) => {
    const preset = presetById(presetId);
    if (!preset) return;
    setSettings((current) => ({
      ...current,
      theme: { presetId: preset.id, seed: preset.seed },
    }));
  }, []);

  /** Editing any colour makes the theme custom — a preset is never silently mutated. */
  const setSeed = useCallback((seed: ThemeSeed) => {
    setSettings((current) => ({ ...current, theme: { presetId: null, seed } }));
  }, []);

  const setAppearance = useCallback((patch: Partial<Appearance>) => {
    setSettings((current) => ({ ...current, appearance: { ...current.appearance, ...patch } }));
  }, []);

  const setRole = useCallback((role: Role) => {
    setSettings((current) => ({ ...current, role }));
  }, []);

  const setBackground = useCallback((patch: Partial<BackgroundSettings>) => {
    setSettings((current) => ({ ...current, background: { ...current.background, ...patch } }));
  }, []);

  const setExportDirectory = useCallback((exportDirectory: string) => {
    setSettings((current) => ({ ...current, exportDirectory }));
  }, []);

  const setDifficulty = useCallback((preset: DifficultyPreset) => {
    setSettings((current) => ({
      ...current,
      difficulties: current.difficulties.map((candidate) =>
        candidate.id === preset.id ? preset : candidate,
      ),
    }));
  }, []);

  const setDefaultDifficulty = useCallback((defaultDifficulty: string) => {
    setSettings((current) => ({ ...current, defaultDifficulty }));
  }, []);

  const setDefaultHosts = useCallback((defaultHosts: string) => {
    setSettings((current) => ({ ...current, defaultHosts }));
  }, []);

  const setHostRewards = useCallback((hostRewards: HostRewards) => {
    setSettings((current) => ({ ...current, hostRewards }));
  }, []);

  const resetDifficulties = useCallback(() => {
    setSettings((current) => ({ ...current, difficulties: DEFAULT_DIFFICULTY_PRESETS }));
  }, []);

  const reset = useCallback(() => setSettings(defaultSettings()), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      loading,
      error,
      dismissError: () => setError(null),
      setPreset,
      setSeed,
      setAppearance,
      setRole,
      setExportDirectory,
      setBackground,
      setDifficulty,
      setDefaultDifficulty,
      setDefaultHosts,
      setHostRewards,
      resetDifficulties,
      reset,
    }),
    [
      settings,
      loading,
      error,
      setPreset,
      setSeed,
      setAppearance,
      setRole,
      setExportDirectory,
      setBackground,
      setDifficulty,
      setDefaultDifficulty,
      setDefaultHosts,
      setHostRewards,
      resetDifficulties,
      reset,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside a SettingsProvider');
  return context;
}
