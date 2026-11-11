/**
 * The character card.
 *
 * First of the three kinds (clan and mission follow), and deliberately first because the stat
 * block is the hardest thing on any of them: eight values, two of which are not shaped like
 * the others, in a column narrow enough to need wrapping.
 *
 * ⚠️ **Nothing here calculates a stat.** The card prints `character.stats` exactly as typed.
 * The one derived value is effective reserves, which is shown beside the stored band in the
 * accent colour and never written back — the same line §4 draws for the sheet and the printed
 * sheet, and for the same reason: it restates two stats Dan entered by a rule he stated.
 *
 * Pure (CLAUDE.md §3). No colour literals — see the header of `card.ts`.
 */

import { characterDisplayName, type Character } from './character';
import {
  defaultBlocks,
  focusAlignment,
  hasBlock,
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
  gradeChip,
  headingRule,
  pairGrid,
  panelClip,
  portraitBand,
  type Pair,
  type Piece,
} from './card-blocks';
import { formatStatShort, gradeAbbrev, gradeLabel } from './grades';
import {
  CE_RESERVES_LABELS,
  GRADED_STAT_IDS,
  GRADED_STAT_LABELS,
  effectiveReserves,
} from './stats';
import type { ResolvedCardFonts } from './card-style';
import type { ThemeTokens } from './theme';

export interface CharacterCardInput {
  readonly character: Character;
  readonly options: CardOptions;
  readonly tokens: ThemeTokens;
  readonly measure: Measurer;
  /** The portrait as a `data:` URL, or empty. Read by the caller; never fetched here. */
  readonly portrait: string;
  /** Resolved CSS stacks for the two slots — see `domain/card-style.ts`. */
  readonly fonts: ResolvedCardFonts;
  readonly fontFaceCss: string;
}

/** Which blocks this card will actually draw, given the preset and what was asked for. */
export function effectiveBlocks(options: CardOptions): readonly string[] {
  const allowed = defaultBlocks('character', options.presetId);
  return options.blocks.filter((block) => allowed.includes(block));
}

export function characterCardSvg(input: CharacterCardInput): string {
  const { character, options, tokens, measure } = input;
  const preset = presetById(options.presetId);
  const wide = preset.width > preset.height;

  const inset = wide ? 20 : 28;
  const pad = wide ? 40 : 44;
  const radius = 26;
  const panel = {
    x: inset,
    y: inset,
    width: preset.width - inset * 2,
    height: preset.height - inset * 2,
  };

  const shown = new Set(effectiveBlocks(options));
  const withPortrait = shown.has('portrait');

  const pieces: Piece[] = [frame(preset.width, preset.height, inset, tokens)];
  const clip = panelClip('card-panel', panel, radius);

  // ── The header region: picture, name, grade ────────────────────────────────────────────
  const bandBox = wide
    ? {
        x: panel.x + panel.width * 0.52,
        y: panel.y,
        width: panel.width * 0.48,
        height: panel.height,
      }
    : { x: panel.x, y: panel.y, width: panel.width, height: preset.height * 0.4 };

  const band = withPortrait
    ? portraitBand(bandBox, input.portrait, tokens, {
        fade: wide ? 'left' : 'down',
        device: gradeAbbrev(character.grade),
        align: focusAlignment(options.focus),
      })
    : EMPTY_PIECE;

  const textX = panel.x + pad;
  const textWidth = wide ? panel.width * 0.52 - pad * 2 : panel.width - pad * 2;

  const nameSize = wide ? 52 : 60;
  const nameLines = wrapText(
    options.title.trim() || characterDisplayName(character),
    textWidth,
    nameSize,
    true,
    measure,
    2,
    'display',
  );
  const subtitle = options.subtitle.trim() || character.nicknames;

  // On a tall card the name sits on the picture, so it is anchored to the band's bottom edge.
  // On a wide one the picture is beside the text, so the name anchors to the top instead.
  const nameBaseline = wide
    ? panel.y + pad + nameSize
    : bandBox.y + bandBox.height - (subtitle ? 74 : 44) - (nameLines.length - 1) * nameSize * 1.1;

  const header =
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
    });

  const chip = gradeChip(
    panel.x + panel.width - pad,
    panel.y + pad - 8,
    gradeAbbrev(character.grade),
    tokens,
    measure,
  );

  pieces.push(
    // ⚠️ `clip.defs` has to travel with the markup that references it. Left out, `url(#…)`
    // resolves to nothing, the browser silently drops the clip, and the bled picture squares
    // off the panel's rounded corners.
    { svg: clip.open + band.svg + clip.close, defs: clip.defs + band.defs, height: 0 },
    { svg: header, defs: '', height: 0 },
    chip,
  );

  // ── The stacked blocks ────────────────────────────────────────────────────────────────
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
        { label: 'Grade', value: gradeLabel(character.grade) },
        { label: 'Faction', value: character.faction },
        { label: 'Clan', value: character.clan },
        { label: 'Occupation', value: character.occupation },
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
    const heading = headingRule(textX, cursor, textWidth, 'Stat block', tokens, measure);
    const derived = effectiveReserves(character.stats);
    const pairs: Pair[] = [
      ...GRADED_STAT_IDS.map((id) => ({
        label: GRADED_STAT_LABELS[id],
        value: formatStatShort(character.stats.graded[id]),
      })),
      { label: 'CE Reserves', value: CE_RESERVES_LABELS[character.stats.ceReserves] },
    ];
    // Shown only when Efficiency outranks Output, so an ordinary sheet reads as it always did.
    if (derived.steps > 0) {
      pairs.push({
        label: 'Effective reserves',
        value: CE_RESERVES_LABELS[derived.band],
        valueTone: 'cursed-400',
      });
    }

    const grid = pairGrid(textX, cursor + heading.height, textWidth, 3, pairs, tokens, measure);
    pieces.push(heading, grid);
    cursor += heading.height + grid.height + gap;
  }

  if (shown.has('technique') && (character.innateTechnique.name || character.innateTechnique.description)) {
    const heading = headingRule(textX, cursor, textWidth, 'Innate technique', tokens, measure);
    const name = svgText(character.innateTechnique.name, {
      x: textX,
      y: cursor + heading.height + 30,
      size: 32,
      tone: tone(tokens, 'cursed-400'),
      bold: true,
      face: 'display',
    });
    const lines = wrapText(
      character.innateTechnique.description,
      textWidth,
      23,
      false,
      measure,
      wide ? 2 : 3,
    );
    const body = svgParagraph(
      lines,
      {
        x: textX,
        y: cursor + heading.height + (character.innateTechnique.name ? 72 : 30),
        size: 23,
        tone: tone(tokens, 'ash-300'),
      },
      31,
    );
    const used =
      heading.height +
      (character.innateTechnique.name ? 72 : 30) +
      Math.max(0, lines.length - 1) * 31 +
      12;
    pieces.push({ svg: name + body, defs: '', height: 0 }, heading);
    cursor += used + gap;
  }

  if (shown.has('footer')) {
    const baseline = panel.y + panel.height - pad;
    const left = [character.affiliation, character.occupation].filter(Boolean)[0] ?? '';
    const right = character.cursedRating ? `CR ${character.cursedRating}` : '';
    pieces.push({
      svg:
        svgText(left, {
          x: textX,
          y: baseline,
          size: 20,
          tone: tone(tokens, 'ash-500'),
        }) +
        svgText(right, {
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
    title: `${characterDisplayName(character)} — ${preset.label}`,
  });
}

/** Re-export so a caller needs one import for the whole feature. */
export { hasBlock };
