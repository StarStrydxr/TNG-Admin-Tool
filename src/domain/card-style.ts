/**
 * How a graphic is painted and lettered.
 *
 * One style per graphic kind (Dan, 11 Nov 2026), so a clan banner can read differently from a
 * character card without either of them dragging the other along. Stored in `Settings`, which
 * means `config.json` — editable by hand like everything else the user owns (CLAUDE.md §1).
 *
 * **A palette is six colours, not fourteen.** It is a `ThemeSeed`, run through the same
 * `buildThemeTokens` the app itself uses, which buys three things: the fourteen tokens stay
 * internally consistent, the live WCAG readout in the theme editor works here unchanged
 * (`checkThemeContrast`), and the card layouts need no change at all — they already take
 * `ThemeTokens` and have never known where those came from.
 *
 * ⚠️ **This does not loosen §9's colour rule.** That rule is about colour literals in the
 * *source*, which survive a theme change and look wrong; `card.test.ts` still fails on one. A
 * palette the user chose at runtime is data arriving through the same door the theme already
 * uses. The card modules remain unable to name a colour.
 *
 * Pure (CLAUDE.md §3).
 */

import { resolveFontStack, type FontChoice } from './fonts';
import { buildThemeTokens, defaultSeed, type ThemeSeed, type ThemeTokens } from './theme';

export const CARD_KINDS = ['character', 'clan', 'mission'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  character: 'Character cards',
  clan: 'Clan cards',
  mission: 'Mission cards and briefings',
};

/**
 * Two slots, because a card has two jobs for type.
 *
 * `display` letters the name, the headings and the grade chip — the things read at a glance.
 * `body` letters values and prose. Either may hold one of the five built-in choices or the
 * name of a font installed on this machine; `resolveFontStack` sorts out which.
 */
export interface CardFonts {
  readonly display: string;
  readonly body: string;
}

export interface CardStyle {
  /**
   * Follow the app theme rather than this style's own palette.
   *
   * Defaults to true, so adding this feature changed the look of nothing. A card tracked the
   * theme before and keeps tracking it until somebody turns this off deliberately.
   */
  readonly followTheme: boolean;
  readonly seed: ThemeSeed;
  readonly fonts: CardFonts;
}

export const DEFAULT_CARD_FONT: FontChoice = 'sans';

export function defaultCardStyle(): CardStyle {
  return {
    followTheme: true,
    seed: defaultSeed(),
    fonts: { display: DEFAULT_CARD_FONT, body: DEFAULT_CARD_FONT },
  };
}

export function defaultCardStyles(): Record<CardKind, CardStyle> {
  return {
    character: defaultCardStyle(),
    clan: defaultCardStyle(),
    mission: defaultCardStyle(),
  };
}

export function isCardKind(value: string): value is CardKind {
  return (CARD_KINDS as readonly string[]).includes(value);
}

/**
 * The colours a graphic of this kind should paint with.
 *
 * `highContrast` is threaded through whichever seed wins, so the accessibility setting is not
 * something a custom card palette can quietly opt out of — it is a guarantee, in the same way
 * the background-opacity cap is (CLAUDE.md §9).
 */
export function cardTokens(
  style: CardStyle,
  appTheme: ThemeSeed,
  highContrast = false,
): ThemeTokens {
  return buildThemeTokens(style.followTheme ? appTheme : style.seed, highContrast);
}

/** The seed a style is actually painting with — for the contrast readout and the swatches. */
export function cardSeed(style: CardStyle, appTheme: ThemeSeed): ThemeSeed {
  return style.followTheme ? appTheme : style.seed;
}

export interface ResolvedCardFonts {
  readonly display: string;
  readonly body: string;
}

export function cardFontStacks(fonts: CardFonts): ResolvedCardFonts {
  return { display: resolveFontStack(fonts.display), body: resolveFontStack(fonts.body) };
}
