import { describe, expect, it } from 'vitest';

import {
  CARD_BLOCKS,
  CARD_BLOCK_LABELS,
  approximateMeasurer,
  defaultBlocks,
  defaultCardOptions,
  presetsForKind,
  type CardOptions,
  type CardPresetId,
} from './card';
import {
  CARD_KINDS,
  cardFontStacks,
  cardSeed,
  cardTokens,
  defaultCardStyle,
  defaultCardStyles,
} from './card-style';
import { cardFileStem, cardKindOf, renderCard, type CardSubject } from './card-render';
import { FONT_STACKS, isFontChoice, resolveFontStack, safeFamily } from './fonts';
import { parseEntity } from './entities-parse';
import type { SavedEntity } from './entities';
import { parseSettings } from './settings-parse';
import { buildThemeTokens, defaultSeed } from './theme';

const measure = approximateMeasurer();
const style = defaultCardStyle();
const tokens = cardTokens(style, defaultSeed());
const fonts = cardFontStacks(style.fonts);

/** Parses and narrows, so a fixture that drifts fails here rather than at the call site. */
function entityOfKind<K extends SavedEntity['kind']>(
  kind: K,
  raw: Record<string, unknown>,
): Extract<SavedEntity, { kind: K }> {
  const parsed = parseEntity(raw, 'x');
  if (parsed?.kind !== kind) throw new Error(`fixture did not parse as ${kind}`);
  return parsed as Extract<SavedEntity, { kind: K }>;
}

const clan = entityOfKind('clan', {
  kind: 'clan',
  id: 'k1',
  name: 'Masami Clan',
  motto: 'Faith is the blade',
  innateTechnique: "Through Faith's Command",
  seat: 'Kyoto',
  era: 'Heian onward',
  status: 'Ascendant',
  summary: 'An old house built on sworn oaths',
  bonuses: [{ text: '+2 Classes Speed, −2 Classes Strength' }],
  mutations: [{ id: 'm1', name: 'Gilded Sclera', effect: 'Sees a broken oath' }],
  hierarchy: [{ id: 's1', title: 'Clan Head', tier: 1, holder: 'Walker Masami' }],
  treasury: { yen: '¥48,000,000', assets: [], notes: '' },
});

const mission = entityOfKind('mission', {
  kind: 'mission',
  id: 'm1',
  name: 'Exorcism at the depot',
  grade: 'grade-2',
  missionType: 'Extermination',
  recommendedGrade: 'Grade 2 and Below',
  faction: 'Sorcerers',
  hosts: ['@starstrydxr'],
  location: 'A parcel depot in Nakano',
  client: 'A shift supervisor',
  slots: '0/4',
  payout: '¥40,000',
  briefing: 'One curse, grade three at worst.',
  trueSituation: 'THERE ARE TWO AND ONE IS THINKING',
  veil: 'VEIL DETAIL FOR THE GM',
  support: 'SUPPORT DETAIL FOR THE GM',
  objectives: ['Exorcise every cursed spirit on site'],
  complications: ['Standing water across the floor'],
  rewards: ['150 CR'],
});

function svg(subject: CardSubject, presetId: CardPresetId): string {
  const kind = cardKindOf(subject);
  const options: CardOptions = {
    ...defaultCardOptions(kind),
    presetId,
    blocks: defaultBlocks(kind, presetId),
  };
  return renderCard({ subject, options, tokens, measure, portrait: '', fonts, fontFaceCss: '' });
}

describe('font slots', () => {
  it('resolves a built-in choice to its stack', () => {
    expect(resolveFontStack('dyslexic')).toBe(FONT_STACKS.dyslexic);
    expect(isFontChoice('dyslexic')).toBe(true);
  });

  it('quotes a local family and keeps the sans fallbacks behind it', () => {
    expect(resolveFontStack('Cinzel Decorative')).toBe(`'Cinzel Decorative', ${FONT_STACKS.sans}`);
  });

  it('falls back rather than emitting an empty family', () => {
    expect(resolveFontStack('!!!')).toBe(FONT_STACKS.sans);
  });

  /**
   * ⚠️ The family name is dropped into the `<style>` block of a generated SVG. A quote or a
   * brace would close the declaration and let whatever followed be read as CSS.
   */
  it('strips anything that could break out of the CSS declaration', () => {
    const hostile = safeFamily("Evil'; } * { fill: red } .x{");
    for (const char of ['\'', '"', '{', '}', ';', ':', '*', '.']) {
      expect(hostile, char).not.toContain(char);
    }
    // An ordinary family name is left intact.
    expect(safeFamily('Good Font-Name 2')).toBe('Good Font-Name 2');
  });

  it('gives the document two stacks, and a display class to switch between them', () => {
    const out = svg(clan, 'card');
    expect(out).toContain('text{font-family:');
    expect(out).toContain('.d{font-family:');
    expect(out).toContain('class="d"');
  });
});

describe('card styles', () => {
  it('starts every kind on the app theme, so adding this changed nothing', () => {
    for (const kind of CARD_KINDS) expect(defaultCardStyles()[kind].followTheme).toBe(true);
  });

  it('follows the app theme until told otherwise', () => {
    const app = { ...defaultSeed(), accent: '#00ff00' };
    expect(cardSeed({ ...style, followTheme: true }, app).accent).toBe('#00ff00');
    expect(cardSeed({ ...style, followTheme: false, seed: defaultSeed() }, app).accent).toBe(
      defaultSeed().accent,
    );
  });

  it('paints with its own palette once it stops following', () => {
    const own = { ...defaultSeed(), accent: '#ff00ff' };
    const paint = (followTheme: boolean) =>
      renderCard({
        subject: clan,
        options: defaultCardOptions('clan'),
        tokens: cardTokens({ ...style, followTheme, seed: own }, defaultSeed()),
        measure,
        portrait: '',
        fonts,
        fontFaceCss: '',
      });

    expect(paint(false)).not.toBe(paint(true));
    // ⚠️ Not the seed itself. A card paints accents with `cursed-400`, which is the seed mixed
    // toward the text colour — the raw accent only ever appears on a grade chip's stroke, and
    // a clan has no grade (§4). Asserting the seed here would have been asserting a bug.
    const derived = buildThemeTokens(own)['--color-cursed-400']!;
    expect(paint(false)).toContain(derived);
  });

  it('merges a partial config onto the defaults rather than losing the rest', () => {
    const parsed = parseSettings({
      cardStyles: { mission: { followTheme: false, fonts: { display: 'Cinzel' } } },
    });
    expect(parsed.cardStyles.mission.followTheme).toBe(false);
    expect(parsed.cardStyles.mission.fonts.display).toBe('Cinzel');
    // The slot that was not named keeps its default, and the other kinds are untouched.
    expect(parsed.cardStyles.mission.fonts.body).toBe(defaultCardStyle().fonts.body);
    expect(parsed.cardStyles.character.followTheme).toBe(true);
  });

  it('survives a config with no card styles at all', () => {
    const parsed = parseSettings({});
    for (const kind of CARD_KINDS) expect(parsed.cardStyles[kind]).toBeTruthy();
  });
});

describe('blocks and presets per kind', () => {
  it('labels every block each kind actually has', () => {
    for (const kind of CARD_KINDS) {
      for (const block of CARD_BLOCKS[kind]) {
        expect(CARD_BLOCK_LABELS[kind][block], `${kind}/${block}`).toBeTruthy();
      }
    }
  });

  it('gives only missions a third list and a briefing', () => {
    expect(CARD_BLOCKS.mission).toContain('extra');
    expect(CARD_BLOCKS.character).not.toContain('extra');
    expect(presetsForKind('mission').map((p) => p.id)).toContain('briefing');
  });
});

describe('the clan card', () => {
  it('shows the clan, its technique and its bonus', () => {
    const out = svg(clan, 'card');
    expect(out).toContain('Masami Clan');
    expect(out).toContain('Faith is the blade');
    expect(out).toContain('Classes Speed');
    expect(out).toContain('Kyoto');
  });

  /** ⚠️ §4: a clan is not Grade 2, and a wrong abbreviation on every card is the failure. */
  it('puts no grade anywhere on it', () => {
    const out = svg(clan, 'card');
    for (const abbrev of ['G1', 'G2', 'G3', 'G4', 'SG', 'DG', 'CG', 'AG']) {
      expect(out, abbrev).not.toContain(`>${abbrev}<`);
    }
  });

  it('names the file by record and shape, so two shapes do not overwrite each other', () => {
    expect(cardFileStem(clan, { ...defaultCardOptions('clan'), presetId: 'card' })).toBe(
      'masami-clan-card',
    );
    expect(cardFileStem(clan, { ...defaultCardOptions('clan'), presetId: 'backdrop' })).toBe(
      'masami-clan-backdrop',
    );
  });
});

describe('the mission graphics', () => {
  it('carries the posting on a briefing', () => {
    const out = svg(mission, 'briefing');
    expect(out).toContain('Exorcism at the depot');
    expect(out).toContain('OBJECTIVES');
    expect(out).toContain('REWARDS');
    expect(out).toContain('COMPLICATIONS');
    expect(out).toContain('Exorcise every cursed spirit on site');
  });

  /**
   * ⚠️ The one that matters. GM-only lines go into the Discord export inside `||spoilers||`
   * (CLAUDE.md §9) — but a picture has no spoiler tags, so on a graphic the only safe thing is
   * to leave them out entirely. A briefing is posted to the players it is for.
   */
  it('never leaks the true situation, the veil or the support onto any shape', () => {
    for (const preset of presetsForKind('mission')) {
      const out = svg(mission, preset.id);
      expect(out, preset.id).not.toContain('THERE ARE TWO');
      expect(out, preset.id).not.toContain('VEIL DETAIL');
      expect(out, preset.id).not.toContain('SUPPORT DETAIL');
    }
  });

  it('drops the lists from a backdrop, which has no room for them', () => {
    expect(svg(mission, 'backdrop')).not.toContain('OBJECTIVES');
  });
});

describe('every kind, every shape', () => {
  const subjects: readonly CardSubject[] = [clan, mission];

  it('is well-formed, with balanced groups', () => {
    for (const subject of subjects) {
      for (const preset of presetsForKind(cardKindOf(subject))) {
        const out = svg(subject, preset.id);
        expect(out.startsWith('<svg')).toBe(true);
        expect(out.endsWith('</svg>')).toBe(true);
        expect((out.match(/<g[\s>]/g) ?? []).length).toBe((out.match(/<\/g>/g) ?? []).length);
      }
    }
  });

  it('declares every id it points at', () => {
    for (const subject of subjects) {
      for (const preset of presetsForKind(cardKindOf(subject))) {
        const out = svg(subject, preset.id);
        const declared = new Set([...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));
        for (const match of out.matchAll(/url\(#([^)]+)\)/g)) {
          expect(declared, `#${match[1]}`).toContain(match[1]!);
        }
      }
    }
  });

  /** §9's colour rule, held for the two new layouts exactly as for the first. */
  it('paints only with theme token values', () => {
    const values = new Set(
      Object.values(buildThemeTokens(defaultSeed())).map((value) => value.toLowerCase()),
    );
    for (const subject of subjects) {
      for (const preset of presetsForKind(cardKindOf(subject))) {
        const out = svg(subject, preset.id);
        for (const match of out.matchAll(/(?:fill|stroke|stop-color)="([^"]+)"/g)) {
          const colour = match[1]!.toLowerCase();
          if (colour === 'none' || colour.startsWith('url(')) continue;
          expect(values, `${cardKindOf(subject)}/${preset.id}: ${colour}`).toContain(colour);
        }
      }
    }
  });

  it('is deterministic', () => {
    for (const subject of subjects) expect(svg(subject, 'card')).toBe(svg(subject, 'card'));
  });
});

describe('content never collides with the footer', () => {
  /**
   * The footer is pinned to the bottom of the panel while the blocks stack down from the
   * header, so enough content used to put the hosts line straight through the last
   * complication. Nothing below the header may be drawn past the floor.
   */
  it('drops a block whole rather than drawing it over the footer', () => {
    const crowded = { ...mission, objectives: Array.from({ length: 12 }, (_, i) => `Objective number ${i + 1}, written at the kind of length a real posting uses`), complications: Array.from({ length: 12 }, (_, i) => `Complication number ${i + 1}, also written out at length`), rewards: Array.from({ length: 12 }, (_, i) => `Reward ${i + 1}`) };

    for (const preset of presetsForKind('mission')) {
      const out = svg(crowded, preset.id);
      // The footer still renders...
      expect(out, preset.id).toContain('@starstrydxr');
      // ...and every `y` drawn stays inside the page.
      const ys = [...out.matchAll(/\sy="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
      const height = presetsForKind('mission').find((p) => p.id === preset.id)!.height;
      for (const y of ys) expect(y, `${preset.id}: y=${y}`).toBeLessThanOrEqual(height);
    }
  });
});
