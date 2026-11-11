/**
 * Forgiving reader for `config.json`.
 *
 * Settings are hand-editable like everything else, and a bad value here would otherwise make
 * the app unreadable or refuse to start. Anything unrecognised falls back to the default.
 */

import {
  CARD_KINDS,
  defaultCardStyles,
  type CardKind,
  type CardStyle,
} from './card-style';
import { isHexColor } from './color';
import {
  CHEST_TIERS,
  DEFAULT_DIFFICULTY_PRESETS,
  DEFAULT_HOST_REWARDS,
  type Band,
  type ChestTier,
  type DifficultyPreset,
  type HostRewards,
  type RewardBucket,
} from './difficulty';
import { isGradeId } from './grades';
import { isRole, type Role } from './roles';
import { presetById, type ThemeSeed } from './theme';
import {
  BACKGROUND_OPACITY_MAX,
  DEFAULT_APPEARANCE,
  DEFAULT_BACKGROUND,
  FONT_CHOICES,
  SETTINGS_SCHEMA_VERSION,
  TEXT_SCALES,
  defaultSettings,
  type Appearance,
  type BackgroundSettings,
  type FontChoice,
  type Settings,
  type TextScale,
} from './settings';

/** A number within bounds, or the fallback. Rejects NaN, strings and nonsense alike. */
function clamped(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/**
 * The background, clamped rather than trusted.
 *
 * Opacity especially: a hand-edited `1` would put a photograph at full strength behind every
 * piece of text in the app. The cap is enforced on the way in, not only in the slider.
 */
function parseBackground(value: unknown): BackgroundSettings {
  const raw = asRecord(value);
  return {
    image: str(raw['image']),
    opacity: clamped(raw['opacity'], 0, BACKGROUND_OPACITY_MAX, DEFAULT_BACKGROUND.opacity),
    blur: clamped(raw['blur'], 0, 24, DEFAULT_BACKGROUND.blur),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && isHexColor(value) ? value.trim().toLowerCase() : fallback;
}

function parseSeed(value: unknown, fallback: ThemeSeed): ThemeSeed {
  const raw = asRecord(value);
  return {
    background: asColor(raw['background'], fallback.background),
    surface: asColor(raw['surface'], fallback.surface),
    border: asColor(raw['border'], fallback.border),
    text: asColor(raw['text'], fallback.text),
    accent: asColor(raw['accent'], fallback.accent),
    danger: asColor(raw['danger'], fallback.danger),
  };
}

/**
 * One graphic kind's style, merged onto the default.
 *
 * Partial by design, like every other parser here: a config.json naming only the mission
 * palette keeps the shipped defaults for character and clan, and a seed missing two of its six
 * colours keeps those two. A font slot is free text — it may name a built-in choice or a
 * family installed on this machine — so it is taken as written and resolved at render time.
 */
function parseCardStyle(value: unknown, fallback: CardStyle): CardStyle {
  const raw = asRecord(value);
  const fonts = asRecord(raw['fonts']);
  return {
    followTheme:
      typeof raw['followTheme'] === 'boolean' ? raw['followTheme'] : fallback.followTheme,
    seed: parseSeed(raw['seed'], fallback.seed),
    fonts: {
      display: str(fonts['display']) || fallback.fonts.display,
      body: str(fonts['body']) || fallback.fonts.body,
    },
  };
}

function parseCardStyles(value: unknown): Record<CardKind, CardStyle> {
  const raw = asRecord(value);
  const defaults = defaultCardStyles();
  const out = {} as Record<CardKind, CardStyle>;
  for (const kind of CARD_KINDS) out[kind] = parseCardStyle(raw[kind], defaults[kind]);
  return out;
}

function parseTextScale(value: unknown): TextScale {
  return typeof value === 'number' && (TEXT_SCALES as readonly number[]).includes(value)
    ? (value as TextScale)
    : DEFAULT_APPEARANCE.textScale;
}

function parseFont(value: unknown): FontChoice {
  return typeof value === 'string' && (FONT_CHOICES as readonly string[]).includes(value)
    ? (value as FontChoice)
    : DEFAULT_APPEARANCE.fontFamily;
}

function parseAppearance(value: unknown): Appearance {
  const raw = asRecord(value);
  return {
    textScale: parseTextScale(raw['textScale']),
    fontFamily: parseFont(raw['fontFamily']),
    reducedMotion: asBool(raw['reducedMotion'], DEFAULT_APPEARANCE.reducedMotion),
    highContrast: asBool(raw['highContrast'], DEFAULT_APPEARANCE.highContrast),
    strongFocus: asBool(raw['strongFocus'], DEFAULT_APPEARANCE.strongFocus),
    speakAnnouncements: asBool(
      raw['speakAnnouncements'],
      DEFAULT_APPEARANCE.speakAnnouncements,
    ),
  };
}

function parseBand(value: unknown, fallback: Band): Band {
  const raw = asRecord(value);
  return {
    min: clamped(raw['min'], 0, Number.MAX_SAFE_INTEGER, fallback.min),
    max: clamped(raw['max'], 0, Number.MAX_SAFE_INTEGER, fallback.max),
  };
}

/** `null` is a real value here — most tiers offer no Grade Up — so absence keeps the default. */
function parseGradeUpCap(
  value: unknown,
  fallback: DifficultyPreset['gradeUpMaxGrade'],
): DifficultyPreset['gradeUpMaxGrade'] {
  if (value === null) return null;
  if (value === undefined) return fallback;
  const grade = str(value);
  return isGradeId(grade) ? grade : fallback;
}

function parseChest(value: unknown, fallback: ChestTier): ChestTier {
  const tier = str(value).toLowerCase();
  return (CHEST_TIERS as readonly string[]).includes(tier) ? (tier as ChestTier) : fallback;
}

function parseBucket(value: unknown, fallback: RewardBucket): RewardBucket {
  const raw = asRecord(value);
  return {
    cr: parseBand(raw['cr'], fallback.cr),
    traitPoints: parseBand(raw['traitPoints'], fallback.traitPoints),
    yen: parseBand(raw['yen'], fallback.yen),
    chest: parseChest(raw['chest'], fallback.chest),
    gradeUp: asBool(raw['gradeUp'], fallback.gradeUp),
  };
}

/**
 * Host multipliers.
 *
 * Clamped rather than trusted: a hand-edited ×500 would print a payout nobody meant, and a
 * negative one is meaningless. Fractions are allowed — ×1.5 is a reasonable house rule.
 */
function parseHostRewards(value: unknown): HostRewards {
  if (value === undefined) return DEFAULT_HOST_REWARDS;
  const raw = asRecord(value);
  const basis = str(raw['basis']);

  return {
    primary: clamped(raw['primary'], 0, 100, DEFAULT_HOST_REWARDS.primary),
    secondary: clamped(raw['secondary'], 0, 100, DEFAULT_HOST_REWARDS.secondary),
    basis: basis === 'base-and-objective' ? 'base-and-objective' : 'base',
  };
}

/**
 * Difficulty presets, merged onto the shipped ones by id.
 *
 * Merged rather than replaced, so a `config.json` written before these existed — or one where
 * Dan edited only the rewards of one preset — still yields four usable presets. An id that is
 * not shipped is kept as an extra preset, which is how someone adds a fifth by hand.
 */
function parseDifficulties(value: unknown): readonly DifficultyPreset[] {
  if (!Array.isArray(value)) return DEFAULT_DIFFICULTY_PRESETS;

  const byId = new Map<string, DifficultyPreset>(
    DEFAULT_DIFFICULTY_PRESETS.map((preset) => [preset.id, preset]),
  );

  for (const item of value) {
    const raw = asRecord(item);
    const id = str(raw['id']).trim();
    if (!id) continue;

    const base =
      byId.get(id) ?? (DEFAULT_DIFFICULTY_PRESETS[0] as DifficultyPreset);

    byId.set(id, {
      id,
      label: str(raw['label']).trim() || base.label,
      description: str(raw['description']) || base.description,
      objectives: parseBand(raw['objectives'], base.objectives),
      complications: parseBand(raw['complications'], base.complications),
      slots: clamped(raw['slots'], 0, 64, base.slots),
      gradeDrift: clamped(raw['gradeDrift'], 0, 13, base.gradeDrift),
      base: parseBucket(raw['base'], base.base),
      objective: parseBucket(raw['objective'], base.objective),
      mvp: parseBucket(raw['mvp'], base.mvp),
      gradeUpMaxGrade: parseGradeUpCap(raw['gradeUpMaxGrade'], base.gradeUpMaxGrade),
    });
  }

  // Shipped order first, then anything the user added, so the picker stays stable.
  const shipped = DEFAULT_DIFFICULTY_PRESETS.map(
    (preset) => byId.get(preset.id) as DifficultyPreset,
  );
  const shippedIds = new Set(DEFAULT_DIFFICULTY_PRESETS.map((preset) => preset.id));
  const extra = [...byId.values()].filter((preset) => !shippedIds.has(preset.id));

  return [...shipped, ...extra];
}

export function parseSettings(value: unknown): Settings {
  const defaults = defaultSettings();
  const raw = asRecord(value);
  const themeRaw = asRecord(raw['theme']);

  // Three distinct cases, and conflating them loses user data:
  //   no theme block at all        -> the default preset
  //   a seed but no preset named   -> custom, keep the seed
  //   a preset named but unknown   -> custom, keep the seed (survives a typo in the name)
  const rawPresetId = themeRaw['presetId'];
  const namesPreset = 'presetId' in themeRaw;
  const hasSeed = 'seed' in themeRaw;

  let presetId: string | null;
  if (typeof rawPresetId === 'string' && presetById(rawPresetId) !== undefined) {
    presetId = rawPresetId;
  } else if (namesPreset || hasSeed) {
    presetId = null;
  } else {
    presetId = defaults.theme.presetId;
  }

  const base = presetId !== null ? presetById(presetId)!.seed : defaults.theme.seed;

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    theme: {
      presetId,
      seed: presetId !== null ? base : parseSeed(themeRaw['seed'], base),
    },
    appearance: parseAppearance(raw['appearance']),
    role: isRole(str(raw['role'])) ? (raw['role'] as Role) : defaults.role,
    background: parseBackground(raw['background']),
    exportDirectory: str(raw['exportDirectory']),
    difficulties: parseDifficulties(raw['difficulties']),
    hostRewards: parseHostRewards(raw['hostRewards']),
    defaultDifficulty: str(raw['defaultDifficulty']) || defaults.defaultDifficulty,
    defaultHosts: str(raw['defaultHosts']),
    cardStyles: parseCardStyles(raw['cardStyles']),
  };
}
