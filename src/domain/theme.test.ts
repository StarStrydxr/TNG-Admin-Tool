import { describe, expect, it } from 'vitest';

import { BACKGROUND_OPACITY_MAX, DEFAULT_BACKGROUND } from './settings';
import {
  contrastRatio,
  hexToRgb,
  isHexColor,
  isLight,
  mix,
  rateContrast,
  relativeLuminance,
  rgbToHex,
} from './color';
import {
  DEFAULT_PRESET_ID,
  THEME_PRESETS,
  buildThemeTokens,
  checkThemeContrast,
  defaultSeed,
  presetById,
} from './theme';
import { parseSettings } from './settings-parse';
import { defaultSettings } from './settings';

describe('colour', () => {
  it('parses both hex lengths and tolerates a missing hash', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#7c5cff')).toEqual({ r: 124, g: 92, b: 255 });
  });

  it('round-trips through rgb', () => {
    expect(rgbToHex(hexToRgb('#7c5cff'))).toBe('#7c5cff');
  });

  it('rejects nonsense', () => {
    expect(isHexColor('#12345')).toBe(false);
    expect(isHexColor('rebeccapurple')).toBe(false);
    expect(isHexColor('#abc')).toBe(true);
  });

  it('clamps and interpolates when mixing', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#000000', '#ffffff', -5)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 5)).toBe('#ffffff');
  });

  it('computes WCAG luminance at the extremes', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('gives 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrastRatio('#7c5cff', '#7c5cff')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(
      contrastRatio('#fedcba', '#123456'),
      10,
    );
  });

  it('rates against the WCAG thresholds', () => {
    expect(rateContrast(21)).toBe('aaa');
    expect(rateContrast(7)).toBe('aaa');
    expect(rateContrast(4.5)).toBe('aa');
    expect(rateContrast(3)).toBe('aa-large');
    expect(rateContrast(2.9)).toBe('fail');
  });

  it('knows light from dark', () => {
    expect(isLight('#ffffff')).toBe(true);
    expect(isLight('#08080b')).toBe(false);
  });
});

describe('theme tokens', () => {
  const seed = defaultSeed();

  it('derives every token the stylesheet declares', () => {
    const tokens = buildThemeTokens(seed);
    const expected = [
      '--color-void-950',
      '--color-void-900',
      '--color-void-850',
      '--color-void-800',
      '--color-void-700',
      '--color-void-600',
      '--color-ash-100',
      '--color-ash-300',
      '--color-ash-400',
      '--color-ash-500',
      '--color-cursed-400',
      '--color-cursed-500',
      '--color-cursed-600',
      '--color-blood-500',
    ];
    expect(Object.keys(tokens).sort()).toEqual([...expected].sort());
  });

  it('passes the seed through unchanged where it maps directly', () => {
    const tokens = buildThemeTokens(seed);
    expect(tokens['--color-void-950']).toBe(seed.background);
    expect(tokens['--color-void-900']).toBe(seed.surface);
    expect(tokens['--color-cursed-500']).toBe(seed.accent);
  });

  it('raises dim-text contrast under high contrast', () => {
    const normal = buildThemeTokens(seed, false);
    const boosted = buildThemeTokens(seed, true);
    const ratio = (tokens: Record<string, string>) =>
      contrastRatio(tokens['--color-ash-500'] ?? '', seed.background);
    expect(ratio(boosted)).toBeGreaterThan(ratio(normal));
  });

  it('emits valid hex for every token of every preset, contrast on or off', () => {
    for (const preset of THEME_PRESETS) {
      for (const highContrast of [false, true]) {
        for (const value of Object.values(buildThemeTokens(preset.seed, highContrast))) {
          expect(isHexColor(value)).toBe(true);
        }
      }
    }
  });

  it('keeps body text readable in every shipped preset', () => {
    for (const preset of THEME_PRESETS) {
      const body = checkThemeContrast(preset.seed).find(
        (check) => check.label === 'Body text on background',
      );
      expect(body, preset.name).toBeDefined();
      expect(body!.ratio, preset.name).toBeGreaterThanOrEqual(7);
    }
  });

  it('flags an unreadable custom palette instead of accepting it quietly', () => {
    const awful = { ...defaultSeed(), text: '#0a0a0c', background: '#08080b' };
    const body = checkThemeContrast(awful).find((c) => c.label === 'Body text on background');
    expect(body?.rating).toBe('fail');
  });

  it('resolves presets by id', () => {
    expect(presetById(DEFAULT_PRESET_ID)?.name).toBe('Void');
    expect(presetById('nope')).toBeUndefined();
  });
});

describe('settings parsing', () => {
  it('returns defaults for rubbish', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('hello')).toEqual(defaultSettings());
  });

  it('keeps an export folder, and defaults it to empty for a config written before it existed', () => {
    expect(parseSettings({ exportDirectory: 'D:\\JJK\\shared' }).exportDirectory).toBe(
      'D:\\JJK\\shared',
    );
    expect(parseSettings({ theme: { presetId: 'paper' } }).exportDirectory).toBe('');
    expect(parseSettings({ exportDirectory: 42 }).exportDirectory).toBe('');
  });

  it('keeps a known preset', () => {
    const parsed = parseSettings({ theme: { presetId: 'paper' } });
    expect(parsed.theme.presetId).toBe('paper');
    expect(parsed.theme.seed).toEqual(presetById('paper')?.seed);
  });

  it('treats an unknown preset as custom rather than discarding the seed', () => {
    const parsed = parseSettings({
      theme: { presetId: 'typo', seed: { accent: '#ff0000' } },
    });
    expect(parsed.theme.presetId).toBeNull();
    expect(parsed.theme.seed.accent).toBe('#ff0000');
  });

  it('drops an invalid colour but keeps the valid ones beside it', () => {
    const parsed = parseSettings({
      theme: { presetId: null, seed: { accent: 'not-a-colour', background: '#101010' } },
    });
    expect(parsed.theme.seed.background).toBe('#101010');
    expect(parsed.theme.seed.accent).toBe(defaultSeed().accent);
  });

  it('rejects an out-of-range text scale', () => {
    expect(parseSettings({ appearance: { textScale: 99 } }).appearance.textScale).toBe(1);
    expect(parseSettings({ appearance: { textScale: 1.25 } }).appearance.textScale).toBe(1.25);
  });

  it('keeps accessibility toggles', () => {
    const parsed = parseSettings({
      appearance: { reducedMotion: true, highContrast: true, strongFocus: true, fontFamily: 'mono' },
    });
    expect(parsed.appearance).toMatchObject({
      reducedMotion: true,
      highContrast: true,
      strongFocus: true,
      fontFamily: 'mono',
    });
  });
});

describe('background settings', () => {
  it('caps opacity on the way in, so a hand-edited config cannot wash out the text', () => {
    expect(parseSettings({ background: { opacity: 1 } }).background.opacity).toBe(
      BACKGROUND_OPACITY_MAX,
    );
    expect(parseSettings({ background: { opacity: -5 } }).background.opacity).toBe(0);
  });

  it('clamps blur and falls back on nonsense', () => {
    expect(parseSettings({ background: { blur: 200 } }).background.blur).toBe(24);
    expect(parseSettings({ background: { blur: 'lots' } }).background.blur).toBe(
      DEFAULT_BACKGROUND.blur,
    );
  });

  it('defaults to no image for a config written before backgrounds existed', () => {
    expect(parseSettings({ theme: { presetId: 'void' } }).background).toEqual(DEFAULT_BACKGROUND);
  });

  it('keeps a chosen image name', () => {
    expect(parseSettings({ background: { image: 'abc123.png' } }).background.image).toBe(
      'abc123.png',
    );
  });
});

describe('the faction presets', () => {
  it('ships one for each of the three', () => {
    for (const id of ['sorcerer', 'curse-user', 'curse']) {
      expect(presetById(id), id).toBeDefined();
    }
  });

  it('holds body text to the same AAA bar as every other preset', () => {
    for (const id of ['sorcerer', 'curse-user', 'curse']) {
      const preset = presetById(id);
      const body = checkThemeContrast(preset!.seed).find(
        (check) => check.label === 'Body text on background',
      );
      expect(body!.ratio, id).toBeGreaterThanOrEqual(7);
    }
  });
});
