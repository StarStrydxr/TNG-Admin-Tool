/**
 * The clan card.
 *
 * Second of the three, and mostly re-skinning: the furniture in `card-blocks.ts` was split out
 * for exactly this, so a clan card is a different choice of blocks rather than a second layout
 * engine.
 *
 * ⚠️ **A clan has no grade** (CLAUDE.md §4), so there is no chip in the corner and nothing
 * reaches for `entityGrade()` here. The device behind an absent picture is the clan's initial
 * instead — a wrong abbreviation on a clan card is exactly the mistake §4 warns about.
 *
 * ⚠️ **It shows a bonus. It does not apply one.** The modifier lines are printed as written,
 * the same as the sheet and both exports; nothing here touches a Class.
 *
 * Pure (CLAUDE.md §3). No colour literals — see the header of `card.ts`.
 */

import {
  defaultBlocks,
  focusAlignment,
  presetById,
  svgDocument,
  svgParagraph,
  svgText,
  tone,
  wrapText,
  type CardOptions,
  type Measurer,
} from './card';
import {
  EMPTY_PIECE,
  fits,
  frame,
  headingRule,
  pairGrid,
  panelClip,
  portraitBand,
  type Piece,
} from './card-blocks';
import type { ResolvedCardFonts } from './card-style';
import { entityDisplayName, type Clan } from './entities';
import { mutationLine, seatLine } from './entities-display';
import type { ThemeTokens } from './theme';

export interface ClanCardInput {
  readonly clan: Clan;
  readonly options: CardOptions;
  readonly tokens: ThemeTokens;
  readonly measure: Measurer;
  readonly portrait: string;
  readonly fonts: ResolvedCardFonts;
  readonly fontFaceCss: string;
}

export function clanCardSvg(input: ClanCardInput): string {
  const { clan, options, tokens, measure } = input;
  const preset = presetById(options.presetId);
  const wide = preset.width > preset.height;

  const inset = wide ? 20 : 28;
  const pad = wide ? 40 : 44;
  const panel = {
    x: inset,
    y: inset,
    width: preset.width - inset * 2,
    height: preset.height - inset * 2,
  };

  const allowed = defaultBlocks('clan', options.presetId);
  const shown = new Set(options.blocks.filter((block) => allowed.includes(block)));
  const pieces: Piece[] = [frame(preset.width, preset.height, inset, tokens)];
  const clip = panelClip('card-panel', panel, 26);

  const bandBox = wide
    ? { x: panel.x + panel.width * 0.52, y: panel.y, width: panel.width * 0.48, height: panel.height }
    : { x: panel.x, y: panel.y, width: panel.width, height: preset.height * 0.4 };

  const band = shown.has('portrait')
    ? portraitBand(bandBox, input.portrait, tokens, {
        fade: wide ? 'left' : 'down',
        // The clan's initial, because it has no grade to show. §4.
        device: (entityDisplayName(clan).trim()[0] ?? '·').toUpperCase(),
        align: focusAlignment(options.focus),
      })
    : EMPTY_PIECE;

  const textX = panel.x + pad;
  const textWidth = wide ? panel.width * 0.52 - pad * 2 : panel.width - pad * 2;

  const nameSize = wide ? 52 : 60;
  const nameLines = wrapText(
    options.title.trim() || entityDisplayName(clan),
    textWidth,
    nameSize,
    true,
    measure,
    2,
    'display',
  );
  const subtitle = options.subtitle.trim() || clan.motto;

  const nameBaseline = wide
    ? panel.y + pad + nameSize
    : bandBox.y + bandBox.height - (subtitle ? 74 : 44) - (nameLines.length - 1) * nameSize * 1.1;

  pieces.push(
    { svg: clip.open + band.svg + clip.close, defs: clip.defs + band.defs, height: 0 },
    {
      svg:
        svgParagraph(
          nameLines,
          {
            x: textX,
            y: nameBaseline,
            size: nameSize,
            tone: tone(tokens, 'ash-100'),
            bold: true,
            face: 'display',
          },
          nameSize * 1.1,
        ) +
        svgText(subtitle, {
          x: textX,
          y: nameBaseline + (nameLines.length - 1) * nameSize * 1.1 + 36,
          size: 25,
          tone: tone(tokens, 'ash-400'),
        }),
      defs: '',
      height: 0,
    },
  );

  let cursor = wide
    ? nameBaseline + (nameLines.length - 1) * nameSize * 1.1 + (subtitle ? 76 : 48)
    : bandBox.y + bandBox.height + 30;
  const gap = 20;
  // See `fits` — the footer is pinned to the bottom, so the stack needs a floor.
  const contentLimit = panel.y + panel.height - pad - (shown.has('footer') ? 42 : 0);

  if (shown.has('profile')) {
    const block = pairGrid(
      textX,
      cursor,
      textWidth,
      2,
      [
        { label: 'Seat', value: clan.seat },
        { label: 'Status', value: clan.status },
        { label: 'Era', value: clan.era },
        { label: 'Members', value: String(clan.hierarchy.length || '') },
      ],
      tokens,
      measure,
    );
    if (fits(cursor, block, contentLimit)) {
      pieces.push(block);
      cursor += block.height + gap;
    }
  }

  if (shown.has('stats')) {
    const heading = headingRule(textX, cursor, textWidth, 'The clan', tokens, measure);
    cursor += heading.height;
    pieces.push(heading);

    // Technique and mutations are short enough to pair up; a bonus line is a sentence
    // ("+2 Classes Speed, −2 Classes Strength") and was being ellipsised in a half-width
    // cell, so bonuses get the full width one per row.
    const top = pairGrid(
      textX,
      cursor,
      textWidth,
      2,
      [
        { label: 'Innate technique', value: clan.innateTechnique },
        ...clan.mutations.slice(0, wide ? 1 : 3).map((mutation) => ({
          label: 'Mutation',
          value: mutationLine(mutation),
        })),
      ],
      tokens,
      measure,
    );
    pieces.push(top);
    cursor += top.height;

    const bonuses = pairGrid(
      textX,
      cursor,
      textWidth,
      1,
      clan.bonuses.slice(0, wide ? 1 : 2).map((bonus) => ({
        label: 'Bonus',
        value: bonus.text,
        valueTone: 'cursed-400' as const,
      })),
      tokens,
      measure,
    );
    pieces.push(bonuses);
    cursor += bonuses.height + gap;
  }

  if (shown.has('technique')) {
    const heading = headingRule(textX, cursor, textWidth, 'Hierarchy', tokens, measure);
    const seats = clan.hierarchy.slice(0, wide ? 3 : 6).map(seatLine);
    const lines = seats.flatMap((line) =>
      wrapText(line, textWidth, 23, false, measure, 1),
    );
    const body = svgParagraph(
      lines,
      { x: textX, y: cursor + heading.height + 28, size: 23, tone: tone(tokens, 'ash-300') },
      31,
    );
    pieces.push(heading, { svg: body, defs: '', height: 0 });
    cursor += heading.height + 28 + Math.max(0, lines.length - 1) * 31 + 20 + gap;
  }

  if (shown.has('footer')) {
    const baseline = panel.y + panel.height - pad;
    pieces.push({
      svg:
        svgText(clan.summary || clan.seat, {
          x: textX,
          y: baseline,
          size: 20,
          tone: tone(tokens, 'ash-500'),
        }) +
        svgText(clan.treasury.yen ? `Vault ${clan.treasury.yen}` : '', {
          x: wide ? panel.x + panel.width * 0.52 - pad : panel.x + panel.width - pad,
          y: baseline,
          size: 20,
          tone: tone(tokens, 'cursed-400'),
          anchor: 'end',
        }),
      defs: '',
      height: 0,
    });
  }

  return svgDocument({
    width: preset.width,
    height: preset.height,
    defs: pieces.map((piece) => piece.defs).join(''),
    body: pieces.map((piece) => piece.svg).join(''),
    fonts: input.fonts,
    fontFaceCss: input.fontFaceCss,
    title: `${entityDisplayName(clan)} — ${preset.label}`,
  });
}
