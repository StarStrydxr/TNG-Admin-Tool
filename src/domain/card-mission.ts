/**
 * The mission graphics: a compact card, and a briefing.
 *
 * Two objects, not one at two sizes (Dan, 11 Nov 2026). The **card** is a thumbnail for a
 * posting — grade, type, location, slots. The **briefing** is the posting itself laid out to
 * be read: objectives, rewards and complications in full, on a taller page.
 *
 * ⚠️ **`trueSituation`, `veil` and `support` never appear.** Those are the GM-only lines that
 * the Discord export wraps in `||spoilers||` (CLAUDE.md §9) — and a picture has no spoiler
 * tags, so on a graphic the only safe thing is to leave them out. A briefing posted in a
 * channel is read by the players it is for.
 *
 * ⚠️ **`payout` and `rewards` are different things** (§4) and both appear: the fee the client
 * pays belongs with the briefing text, the server economy belongs under Rewards.
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
  frame,
  gradeChip,
  headingRule,
  pairGrid,
  fits,
  panelClip,
  portraitBand,
  type Piece,
} from './card-blocks';
import type { ResolvedCardFonts } from './card-style';
import { entityDisplayName, type Mission } from './entities';
import { gradeAbbrev, gradeLabel } from './grades';
import type { ThemeTokens } from './theme';

export interface MissionCardInput {
  readonly mission: Mission;
  readonly options: CardOptions;
  readonly tokens: ThemeTokens;
  readonly measure: Measurer;
  readonly portrait: string;
  readonly fonts: ResolvedCardFonts;
  readonly fontFaceCss: string;
}

/** A bulleted list under a heading, returning how far it pushed the cursor. */
function listBlock(
  x: number,
  y: number,
  width: number,
  label: string,
  items: readonly string[],
  tokens: ThemeTokens,
  measure: Measurer,
  limit: number,
): Piece {
  const shown = items.filter((item) => item.trim()).slice(0, limit);
  if (shown.length === 0) return EMPTY_PIECE;

  const heading = headingRule(x, y, width, label, tokens, measure);
  const size = 23;
  const lineHeight = 31;

  let cursor = y + heading.height + 22;
  let svg = heading.svg;

  for (const item of shown) {
    const lines = wrapText(item, width - 26, size, false, measure, 2);
    svg +=
      svgText('·', { x, y: cursor, size, tone: tone(tokens, 'cursed-400'), bold: true }) +
      svgParagraph(
        lines,
        { x: x + 26, y: cursor, size, tone: tone(tokens, 'ash-300') },
        lineHeight,
      );
    cursor += lines.length * lineHeight + 8;
  }

  return { svg, defs: '', height: cursor - y + 6 };
}

export function missionCardSvg(input: MissionCardInput): string {
  const { mission, options, tokens, measure } = input;
  const preset = presetById(options.presetId);
  const wide = preset.width > preset.height;
  const briefing = preset.id === 'briefing';

  const inset = wide ? 20 : 28;
  const pad = wide ? 40 : 44;
  const panel = {
    x: inset,
    y: inset,
    width: preset.width - inset * 2,
    height: preset.height - inset * 2,
  };

  const allowed = defaultBlocks('mission', options.presetId);
  const shown = new Set(options.blocks.filter((block) => allowed.includes(block)));

  const pieces: Piece[] = [frame(preset.width, preset.height, inset, tokens)];
  const clip = panelClip('card-panel', panel, 26);

  // A briefing is mostly text, so its picture is a shallow header band rather than half the
  // page — the objectives are the reason the thing exists.
  const bandHeight = briefing ? preset.height * 0.22 : preset.height * 0.4;
  const bandBox = wide
    ? { x: panel.x + panel.width * 0.52, y: panel.y, width: panel.width * 0.48, height: panel.height }
    : { x: panel.x, y: panel.y, width: panel.width, height: bandHeight };

  const band = shown.has('portrait')
    ? portraitBand(bandBox, input.portrait, tokens, {
        fade: wide ? 'left' : 'down',
        device: gradeAbbrev(mission.grade),
        align: focusAlignment(options.focus),
      })
    : EMPTY_PIECE;

  const textX = panel.x + pad;
  const textWidth = wide ? panel.width * 0.52 - pad * 2 : panel.width - pad * 2;

  const nameSize = briefing ? 48 : wide ? 52 : 58;
  const nameLines = wrapText(
    options.title.trim() || entityDisplayName(mission),
    textWidth,
    nameSize,
    true,
    measure,
    2,
    'display',
  );
  const subtitle = options.subtitle.trim() || mission.missionType;

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
    gradeChip(
      panel.x + panel.width - pad,
      panel.y + pad - 8,
      gradeAbbrev(mission.grade),
      tokens,
      measure,
    ),
  );

  let cursor = wide
    ? nameBaseline + (nameLines.length - 1) * nameSize * 1.1 + (subtitle ? 76 : 48)
    : bandBox.y + bandBox.height + 30;
  const gap = 18;
  // Everything below stops here, leaving the footer its own line at the bottom of the panel.
  const contentLimit = panel.y + panel.height - pad - (shown.has('footer') ? 42 : 0);

  if (shown.has('profile')) {
    const block = pairGrid(
      textX,
      cursor,
      textWidth,
      2,
      [
        { label: 'Grade', value: gradeLabel(mission.grade) },
        { label: 'Recommended', value: mission.recommendedGrade },
        { label: 'Location', value: mission.location },
        { label: 'Slots', value: mission.slots },
        { label: 'Open to', value: mission.faction },
        { label: 'Client', value: mission.client },
      ],
      tokens,
      measure,
    );
    if (fits(cursor, block, contentLimit)) {
      pieces.push(block);
      cursor += block.height + gap;
    }
  }

  // The briefing text itself, on the tall shape only — a card has no room for a paragraph.
  if (briefing && mission.briefing.trim()) {
    const lines = wrapText(mission.briefing, textWidth, 23, false, measure, 4);
    pieces.push({
      svg: svgParagraph(
        lines,
        { x: textX, y: cursor + 8, size: 23, tone: tone(tokens, 'ash-300') },
        31,
      ),
      defs: '',
      height: 0,
    });
    cursor += 8 + lines.length * 31 + gap;
  }

  const listLimit = briefing ? 6 : 3;

  if (shown.has('stats')) {
    const block = listBlock(
      textX, cursor, textWidth, 'Objectives', mission.objectives, tokens, measure, listLimit,
    );
    if (fits(cursor, block, contentLimit)) {
      pieces.push(block);
      cursor += block.height + gap;
    }
  }

  if (shown.has('technique')) {
    const block = listBlock(
      textX, cursor, textWidth, 'Rewards', mission.rewards, tokens, measure, listLimit,
    );
    if (fits(cursor, block, contentLimit)) {
      pieces.push(block);
      cursor += block.height + gap;
    }
  }

  if (shown.has('extra')) {
    const block = listBlock(
      textX, cursor, textWidth, 'Complications', mission.complications, tokens, measure, listLimit,
    );
    if (fits(cursor, block, contentLimit)) {
      pieces.push(block);
      cursor += block.height + gap;
    }
  }

  if (shown.has('footer')) {
    const baseline = panel.y + panel.height - pad;
    pieces.push({
      svg:
        svgText(mission.hosts.join(' | '), {
          x: textX,
          y: baseline,
          size: 20,
          tone: tone(tokens, 'ash-500'),
        }) +
        svgText(mission.payout, {
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
    title: `${entityDisplayName(mission)} — ${preset.label}`,
  });
}
