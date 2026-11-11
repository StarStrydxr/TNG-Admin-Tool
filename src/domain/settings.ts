/**
 * User settings — appearance and accessibility.
 *
 * Persisted to `%APPDATA%/jjk-rp-vault/config.json`, which CLAUDE.md §3 also reserves for the
 * usage-guard thresholds in Phase 3. Keep additions as separate top-level keys so the two can
 * grow independently.
 *
 * Pure.
 */

import type { FontChoice } from './fonts';
import {
  defaultCardStyles,
  type CardKind,
  type CardStyle,
} from './card-style';
import {
  DEFAULT_DIFFICULTY_ID,
  DEFAULT_DIFFICULTY_PRESETS,
  DEFAULT_HOST_REWARDS,
  type DifficultyPreset,
  type HostRewards,
} from './difficulty';
import { DEFAULT_ROLE, type Role } from './roles';
import { DEFAULT_PRESET_ID, defaultSeed, type ThemeSeed } from './theme';

export const SETTINGS_SCHEMA_VERSION = 1;

/**
 * System stacks, plus two accessibility faces vendored into the bundle. Nothing is ever
 * fetched at runtime — offline-first (CLAUDE.md §1).
 */


export type { CardKind, CardStyle } from './card-style';

// Re-exported so every existing import of these still resolves — see `fonts.ts` for why
// they had to move out.
export {
  FONT_CHOICES,
  FONT_LABELS,
  FONT_STACKS,
  isFontChoice,
  resolveFontStack,
  safeFamily,
  type FontChoice,
} from './fonts';

export const TEXT_SCALES = [0.9, 1, 1.1, 1.25, 1.5] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const TEXT_SCALE_LABELS: Record<string, string> = {
  '0.9': 'Small',
  '1': 'Default',
  '1.1': 'Large',
  '1.25': 'Larger',
  '1.5': 'Largest',
};

export interface Appearance {
  readonly textScale: TextScale;
  readonly fontFamily: FontChoice;
  /** Also defaults on when the OS asks for reduced motion. */
  readonly reducedMotion: boolean;
  /** Pushes text and borders away from the background; composes with any theme. */
  readonly highContrast: boolean;
  /** Thicker, always-visible keyboard focus ring. */
  readonly strongFocus: boolean;
  /**
   * Speak status messages aloud through the system voice, on top of the ARIA live region
   * that is always present for real screen readers.
   */
  readonly speakAnnouncements: boolean;
}

export interface ThemeSettings {
  /** Null means the seed below is a custom palette rather than a preset. */
  readonly presetId: string | null;
  readonly seed: ThemeSeed;
}

/** How far the background image is allowed to come forward. */
export const BACKGROUND_OPACITY_MAX = 0.4;

export interface BackgroundSettings {
  /**
   * File name in the images folder, or `''` for none. Same store as portraits — a background
   * is just another picture the user chose (CLAUDE.md §9).
   */
  readonly image: string;
  /**
   * 0 to BACKGROUND_OPACITY_MAX. Capped deliberately: the whole interface sits on top of this,
   * and a full-strength photograph behind body text destroys the contrast every theme is
   * checked for. The cap is the accessibility guarantee, not a style preference.
   */
  readonly opacity: number;
  /** Pixels of blur, 0–24. Blur is what makes a busy image survivable behind text. */
  readonly blur: number;
}

export const DEFAULT_BACKGROUND: BackgroundSettings = { image: '', opacity: 0.18, blur: 8 };

export interface Settings {
  readonly schemaVersion: number;
  readonly theme: ThemeSettings;
  readonly appearance: Appearance;
  readonly background: BackgroundSettings;
  /**
   * Which rank the app is currently showing. A view filter locally; the real enforcement is at
   * the publish boundary. See `domain/roles.ts`.
   */
  readonly role: Role;
  /**
   * Where markdown exports are written. Empty means the app's own `exports/` folder.
   *
   * This is how a GM sends work to the others: point it at a shared or synced folder and the
   * export lands there directly. It is a plain text field, not a folder picker — the native
   * dialog plugin was declined (CLAUDE.md §11, phase 2.3), and a path typed once is a small
   * price for one fewer dependency.
   */
  readonly exportDirectory: string;
  /**
   * Mission difficulty presets, editable in Settings.
   *
   * They live here rather than in a table because they are numbers in bands, not flavour — see
   * the note at the top of `domain/difficulty.ts`. Easy, Medium and Hard carry the server's own
   * amounts; `custom` is there for a posting harder than anything shipped.
   */
  readonly difficulties: readonly DifficultyPreset[];
  /** Primary and secondary host multipliers, and what they are applied to. */
  readonly hostRewards: HostRewards;
  /** Which preset a new mission starts on. */
  readonly defaultDifficulty: string;
  /**
   * Hosts prefilled on a new posting — "@starstrydxr | @izumidagoat". Free text, split on `|`
   * and newlines when a mission is rolled.
   */
  readonly defaultHosts: string;
  /**
   * Fonts and colours for the generated graphics, one style per kind.
   *
   * Additive: a config.json written before this parses with the defaults, and every style
   * starts on `followTheme`, so nothing looked different the day it landed. See
   * `domain/card-style.ts`.
   */
  readonly cardStyles: Record<CardKind, CardStyle>;
}

export const DEFAULT_APPEARANCE: Appearance = {
  textScale: 1,
  fontFamily: 'sans',
  reducedMotion: false,
  highContrast: false,
  strongFocus: false,
  speakAnnouncements: false,
};

export function defaultSettings(): Settings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    theme: { presetId: DEFAULT_PRESET_ID, seed: defaultSeed() },
    appearance: DEFAULT_APPEARANCE,
    background: DEFAULT_BACKGROUND,
    role: DEFAULT_ROLE,
    exportDirectory: '',
    difficulties: DEFAULT_DIFFICULTY_PRESETS,
    hostRewards: DEFAULT_HOST_REWARDS,
    defaultDifficulty: DEFAULT_DIFFICULTY_ID,
    defaultHosts: '',
    cardStyles: defaultCardStyles(),
  };
}

/** Hosts as a list, however they were typed. */
export function hostList(raw: string): readonly string[] {
  return raw
    .split(/[|\n,]/)
    .map((host) => host.trim())
    .filter((host) => host.length > 0);
}

export function isCustomTheme(settings: Settings): boolean {
  return settings.theme.presetId === null;
}
