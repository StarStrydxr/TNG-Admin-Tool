import { describe, expect, it } from 'vitest';

import {
  CARD_PRESETS,
  CARD_PRESET_IDS,
  approximateMeasurer,
  defaultBlocks,
  defaultCardOptions,
  esc,
  presetById,
  presetsForKind,
  wrapText,
  type CardOptions,
} from './card';
import { characterCardSvg } from './card-character';
import { cardFileStem } from './card-render';
import { createCharacter, type Character } from './character';
import { buildThemeTokens, defaultSeed } from './theme';
import { statValue } from './grades';

const tokens = buildThemeTokens(defaultSeed());
const measure = approximateMeasurer();

function character(patch: Partial<Character> = {}): Character {
  const base = createCharacter({
    id: 'c1',
    kind: 'pc',
    now: '2026-11-11T00:00:00.000Z',
    grade: 'grade-1',
  });
  return {
    ...base,
    name: 'Walker Masami',
    nicknames: 'The Holy Sinner',
    grade: 'grade-1',
    faction: 'Sorcerers',
    clan: 'Masami',
    occupation: 'Student',
    affiliation: 'Jujutsu Academy',
    cursedRating: '340',
    innateTechnique: {
      ...base.innateTechnique,
      name: "Through Faith's Command",
      description:
        'Binds a target to a stated article of faith; breaking it costs them in cursed energy. ' +
        'The wielder must understand the article on a truth level or the binding does not take.',
    },
    ...patch,
  };
}

function svg(options: Partial<CardOptions> = {}, patch: Partial<Character> = {}): string {
  return characterCardSvg({
    character: character(patch),
    options: { ...defaultCardOptions(), ...options },
    tokens,
    measure,
    portrait: '',
    fonts: { display: 'ui-sans-serif, sans-serif', body: 'ui-sans-serif, sans-serif' },
    fontFaceCss: '',
  });
}

describe('the card presets', () => {
  it('has an entry for every id', () => {
    for (const id of CARD_PRESET_IDS) expect(presetById(id).id).toBe(id);
    expect(CARD_PRESETS).toHaveLength(CARD_PRESET_IDS.length);
  });

  it('offers a briefing only to missions', () => {
    expect(presetsForKind('mission').map((p) => p.id)).toContain('briefing');
    expect(presetsForKind('character').map((p) => p.id)).not.toContain('briefing');
    expect(presetsForKind('clan').map((p) => p.id)).not.toContain('briefing');
  });

  it('gives the backdrop fewer blocks, because it is short and wide', () => {
    expect(defaultBlocks('character', 'backdrop').length).toBeLessThan(
      defaultBlocks('character', 'card').length,
    );
    expect(defaultBlocks('character', 'backdrop')).not.toContain('stats');
  });
});

describe('wrapping, since SVG has none of its own', () => {
  it('breaks on words', () => {
    const lines = wrapText('one two three four five', 100, 20, false, measure);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('one two three four five');
  });

  it('hard-splits a word too long for any line rather than letting it run off', () => {
    const lines = wrapText('Ryomen'.repeat(20), 100, 20, false, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line, 20, false)).toBeLessThanOrEqual(100);
  });

  it('marks a truncated paragraph so it reads as continuing', () => {
    const lines = wrapText('one two three four five six seven eight', 60, 20, false, measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
  });

  it('returns nothing for empty text, so a section can test for it', () => {
    expect(wrapText('   ', 100, 20, false, measure)).toEqual([]);
  });
});

describe('escaping', () => {
  it('escapes the five XML characters, so a name with an ampersand cannot break the file', () => {
    expect(esc(`Sukuna & "Ryomen" <the> 'King'`)).toBe(
      'Sukuna &amp; &quot;Ryomen&quot; &lt;the&gt; &apos;King&apos;',
    );
  });

  it('carries an escaped name into the document', () => {
    expect(svg({}, { name: 'Tengen & Co' })).toContain('Tengen &amp; Co');
  });
});

describe('the character card', () => {
  it('is well-formed SVG with the preset’s own dimensions', () => {
    for (const preset of presetsForKind('character')) {
      const out = svg({ presetId: preset.id });
      expect(out.startsWith('<svg')).toBe(true);
      expect(out.endsWith('</svg>')).toBe(true);
      expect(out).toContain(`viewBox="0 0 ${preset.width} ${preset.height}"`);
      // Every opened tag is closed: no stray `<g>` from the clip path.
      expect((out.match(/<g[\s>]/g) ?? []).length).toBe((out.match(/<\/g>/g) ?? []).length);
    }
  });

  it('carries the name, the grade both ways, the stats and the technique', () => {
    const out = svg();
    expect(out).toContain('Walker Masami');
    expect(out).toContain('G1');
    expect(out).toContain('Grade 1');
    expect(out).toContain('G1[C3]');
    expect(out).toContain('CE Output'.toUpperCase());
    expect(out).toContain("Through Faith&apos;s Command");
    expect(out).toContain('CR 340');
  });

  it('is deterministic — the same input gives a byte-identical document', () => {
    expect(svg()).toBe(svg());
  });

  it('drops a block that was switched off', () => {
    const out = svg({ blocks: ['portrait', 'profile'] });
    expect(out).not.toContain('STAT BLOCK');
    expect(out).not.toContain('INNATE TECHNIQUE');
    expect(out).toContain('Walker Masami');
  });

  it('honours a title and subtitle override', () => {
    const out = svg({ title: 'The Holy Sinner', subtitle: 'Masami Clan Head' });
    expect(out).toContain('The Holy Sinner');
    expect(out).toContain('Masami Clan Head');
  });

  it('still draws a header when there is no picture, using the grade as a device', () => {
    const out = svg();
    expect(out).not.toContain('<image');
    expect(out).toContain('G1');
  });

  it('embeds a portrait when one is supplied', () => {
    const out = characterCardSvg({
      character: character(),
      options: defaultCardOptions(),
      tokens,
      measure,
      portrait: 'data:image/png;base64,iVBORw0KGgo=',
      fonts: { display: 'sans-serif', body: 'sans-serif' },
      fontFaceCss: '',
    });
    expect(out).toContain('<image');
    expect(out).toContain('data:image/png;base64,iVBORw0KGgo=');
  });
});

describe('the derived reading, which §4 allows and a calculator would not', () => {
  it('stays silent when CE Efficiency does not outrank CE Output', () => {
    expect(svg()).not.toContain('EFFECTIVE RESERVES');
  });

  it('shows beside the stored band when Efficiency sits above Output', () => {
    const base = character();
    const out = svg(
      {},
      {
        stats: {
          ...base.stats,
          graded: {
            ...base.stats.graded,
            'ce-output': statValue('grade-2', 3),
            'ce-efficiency': statValue('grade-1', 3),
          },
          ceReserves: 'deep',
        },
      },
    );
    expect(out).toContain('EFFECTIVE RESERVES');
    // The stored band is still there untouched — the derived value sits next to it.
    expect(out).toContain('Deep');
  });
});

/**
 * ⚠️ The guard on CLAUDE.md §9's colour rule.
 *
 * A generated graphic is as able to smuggle in a hardcoded hex as a component is, and it would
 * survive a theme change and look wrong in exactly the same way. Every colour a card paints
 * has to trace back to one of the fourteen theme tokens.
 */
describe('no hardcoded colours', () => {
  const values = new Set(Object.values(tokens).map((value) => value.toLowerCase()));

  it('paints only with theme token values', () => {
    for (const preset of presetsForKind('character')) {
      const out = svg({ presetId: preset.id });
      const painted = [...out.matchAll(/(?:fill|stroke|stop-color)="([^"]+)"/g)].map((m) =>
        m[1]!.toLowerCase(),
      );
      expect(painted.length).toBeGreaterThan(0);
      for (const colour of painted) {
        if (colour === 'none' || colour.startsWith('url(')) continue;
        expect(values, `${preset.id}: ${colour}`).toContain(colour);
      }
    }
  });

  it('contains no hex literal that is not a token value', () => {
    const out = svg();
    for (const match of out.matchAll(/#(?:[0-9a-fA-F]{3}){1,2}\b/g)) {
      expect(values, match[0]).toContain(match[0].toLowerCase());
    }
  });

  it('repainting the theme repaints the card', () => {
    const other = buildThemeTokens({ ...defaultSeed(), accent: '#ff0000' });
    const repainted = characterCardSvg({
      character: character(),
      options: defaultCardOptions(),
      tokens: other,
      measure,
      portrait: '',
      fonts: { display: 'sans-serif', body: 'sans-serif' },
      fontFaceCss: '',
    });
    expect(repainted).not.toBe(svg());
    expect(repainted).toContain('#ff0000');
  });
});

describe('the file name', () => {
  it('slugs the character and names the preset', () => {
    expect(cardFileStem(character(), defaultCardOptions())).toBe('walker-masami-card');
  });

  it('falls back rather than producing a nameless file', () => {
    // `characterDisplayName` already supplies a placeholder for an unnamed sheet, so the stem
    // inherits it rather than needing its own.
    expect(cardFileStem(character({ name: '' }), defaultCardOptions())).toBe(
      'unnamed-character-card',
    );
  });
});

describe('references resolve', () => {
  it('declares every id it points at — a dangling url(#…) is silently ignored', () => {
    for (const preset of presetsForKind('character')) {
      const out = svg({ presetId: preset.id });
      const declared = new Set([...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));
      const referenced = [...out.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!);
      const clipped = [...out.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map((m) => m[1]!);
      for (const id of [...referenced, ...clipped]) {
        expect(declared, `${preset.id}: #${id}`).toContain(id);
      }
    }
  });
});
