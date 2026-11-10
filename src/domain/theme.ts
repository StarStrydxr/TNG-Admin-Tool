/**
 * Themes.
 *
 * A theme is six colours. Everything the UI actually uses — fourteen CSS custom properties —
 * is derived from those six, so the custom-theme editor stays six pickers rather than fourteen,
 * and a half-filled palette can never produce an unreadable interface.
 *
 * The token names match the ones Tailwind generates from `@theme` in `styles/index.css`, which
 * is what lets a theme be applied at runtime by overriding the variables on `:root`.
 *
 * Pure, no DOM.
 */

import { away, contrastRatio, mix, rateContrast, type ContrastRating } from './color';

export interface ThemeSeed {
  /** Page background. */
  readonly background: string;
  /** Panels and cards sitting on the background. */
  readonly surface: string;
  /** Hairlines and input outlines. */
  readonly border: string;
  /** Brightest body text. */
  readonly text: string;
  /** Interactive accent. */
  readonly accent: string;
  /** Destructive actions and warnings. */
  readonly danger: string;
}

export type ThemeTokens = Readonly<Record<string, string>>;

export interface ThemePreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly seed: ThemeSeed;
}

/**
 * Derive the full token set.
 *
 * `highContrast` pushes text and borders further from the background rather than swapping in a
 * different palette, so it composes with any theme including a custom one.
 */
export function buildThemeTokens(seed: ThemeSeed, highContrast = false): ThemeTokens {
  const { background, surface, border, text, accent, danger } = seed;

  // How far the dim text tiers fade toward the background. Compressed under high contrast so
  // secondary text stays readable instead of becoming decoration.
  const dim = highContrast ? [0.08, 0.18, 0.26] : [0.15, 0.35, 0.5];
  const [dim1, dim2, dim3] = dim as [number, number, number];

  const strongBorder = highContrast ? away(border, background, 0.35) : border;
  const strongText = highContrast ? away(text, background, 0.25) : text;

  return {
    '--color-void-950': background,
    '--color-void-900': surface,
    '--color-void-850': mix(surface, background, 0.45),
    '--color-void-800': mix(strongBorder, background, 0.55),
    '--color-void-700': strongBorder,
    '--color-void-600': mix(strongBorder, strongText, 0.25),

    '--color-ash-100': strongText,
    '--color-ash-300': mix(strongText, background, dim1),
    '--color-ash-400': mix(strongText, background, dim2),
    '--color-ash-500': mix(strongText, background, dim3),

    '--color-cursed-400': mix(accent, strongText, 0.3),
    '--color-cursed-500': accent,
    '--color-cursed-600': mix(accent, background, 0.3),

    '--color-blood-500': highContrast ? away(danger, background, 0.15) : danger,
  };
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'void',
    name: 'Void',
    description: 'The default. Near-black with a cursed-energy violet.',
    seed: {
      background: '#08080b',
      surface: '#0e0e13',
      border: '#23232e',
      text: '#e9e9f1',
      accent: '#7c5cff',
      danger: '#c2413f',
    },
  },
  {
    id: 'ash',
    name: 'Ash',
    description: 'Light, low-glare, for daytime work.',
    seed: {
      background: '#f4f4f6',
      surface: '#ffffff',
      border: '#d3d3dc',
      text: '#1b1b22',
      accent: '#5b3fd6',
      danger: '#b4302e',
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    description: 'Warm dark, paper-and-ink rather than neon.',
    seed: {
      background: '#131210',
      surface: '#1b1a17',
      border: '#332f28',
      text: '#eee7da',
      accent: '#c08a3e',
      danger: '#b9503c',
    },
  },
  {
    id: 'jade',
    name: 'Jade',
    description: 'Cool green, easy on long sessions.',
    seed: {
      background: '#07100d',
      surface: '#0d1814',
      border: '#1e2f28',
      text: '#e2efe9',
      accent: '#3fb98a',
      danger: '#c2543f',
    },
  },
  // The three factions. Each is a full six-colour seed like any other preset, so they go
  // through the same derivation and the same contrast checking — a theme with a story is not
  // an excuse for one that cannot be read.
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    description: 'Jujutsu High at night: indigo dark, uniform navy, a cold blue accent.',
    seed: {
      background: '#070910',
      surface: '#0d111c',
      border: '#1f2740',
      text: '#e4e9f7',
      accent: '#5b8def',
      danger: '#c84b45',
    },
  },
  {
    id: 'curse-user',
    name: 'Curse User',
    description: 'Something gone over: ash and bruise, with a sickly gold.',
    seed: {
      background: '#0c0810',
      surface: '#140e1a',
      border: '#2e2038',
      text: '#ece2f0',
      accent: '#b98adb',
      danger: '#cf4a6a',
    },
  },
  {
    id: 'curse',
    name: 'Curse',
    description: 'Fear left to ferment: bile green on near-black, and a wound red.',
    seed: {
      background: '#060906',
      surface: '#0c120c',
      border: '#223022',
      text: '#e6f0e2',
      accent: '#8fbf4a',
      danger: '#d1453c',
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Maximum contrast, dark. Pure white on pure black.',
    seed: {
      background: '#000000',
      surface: '#0b0b0b',
      border: '#4a4a4a',
      text: '#ffffff',
      accent: '#9db4ff',
      danger: '#ff6b6b',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Maximum contrast, light. For bright rooms.',
    seed: {
      background: '#ffffff',
      surface: '#f6f6f6',
      border: '#8a8a8a',
      text: '#000000',
      accent: '#4324c0',
      danger: '#9b1c1c',
    },
  },
];

export const DEFAULT_PRESET_ID = 'void';

export function presetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

export function defaultSeed(): ThemeSeed {
  return presetById(DEFAULT_PRESET_ID)?.seed ?? THEME_PRESETS[0]!.seed;
}

export interface ContrastCheck {
  readonly label: string;
  readonly ratio: number;
  readonly rating: ContrastRating;
}

/**
 * The pairings worth warning about. Shown live in the editor so a custom palette can be judged
 * before it is saved, instead of after it has made the app unreadable.
 */
export function checkThemeContrast(seed: ThemeSeed): readonly ContrastCheck[] {
  const tokens = buildThemeTokens(seed);
  const dimText = tokens['--color-ash-400'] ?? seed.text;

  const pairs: readonly (readonly [string, string, string])[] = [
    ['Body text on background', seed.text, seed.background],
    ['Body text on panels', seed.text, seed.surface],
    ['Dim text on panels', dimText, seed.surface],
    ['Accent on background', seed.accent, seed.background],
    ['Danger on panels', seed.danger, seed.surface],
  ];

  return pairs.map(([label, a, b]) => {
    const ratio = contrastRatio(a, b);
    return { label, ratio, rating: rateContrast(ratio) };
  });
}
