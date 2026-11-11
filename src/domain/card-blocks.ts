/**
 * The composite pieces a card is assembled from.
 *
 * Kept apart from `card.ts` (primitives) and from the per-kind layouts so that clan and
 * mission cards reuse the same furniture rather than growing their own near-copies — the same
 * bargain `describeEntity()` makes for the reading view.
 *
 * Every piece returns its own `defs` alongside its markup, because a gradient or clip path has
 * to be declared before it is referenced and the caller is what knows the document order.
 *
 * Pure (CLAUDE.md §3). No colour literals — see the header of `card.ts`.
 */

import {
  esc,
  round,
  svgLine,
  svgRect,
  svgText,
  tone,
  wrapText,
  type Measurer,
  type ToneName,
} from './card';
import type { ThemeTokens } from './theme';

export interface Piece {
  readonly svg: string;
  readonly defs: string;
  /** How far down the cursor should move. */
  readonly height: number;
}

export const EMPTY_PIECE: Piece = { svg: '', defs: '', height: 0 };

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The picture, bled to the edge of its box and faded into the surface beneath it.
 *
 * `slice` crops rather than letterboxes, so a portrait of any aspect fills the band — a letter-
 * boxed picture with bars of background either side looks like a mistake, where a crop looks
 * deliberate. The scrim is a gradient to the surface colour, which is what lets the name sit on
 * top of the picture and stay readable whatever the picture happens to be.
 *
 * With no picture, the band becomes a plain panel carrying the grade as a large faint device,
 * so a card for a character with no portrait still reads as designed rather than as broken. A
 * missing picture is never an error (CLAUDE.md §9).
 */
export function portraitBand(
  box: Box,
  href: string,
  tokens: ThemeTokens,
  options: { readonly fade: 'down' | 'left'; readonly device: string; readonly align: string },
): Piece {
  const surface = tone(tokens, 'void-900');
  const vertical = options.fade === 'down';

  const scrim = [
    `<linearGradient id="card-scrim" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${
      vertical ? 1 : 0
    }">`,
    `<stop offset="0" stop-color="${surface}" stop-opacity="0"/>`,
    `<stop offset="0.55" stop-color="${surface}" stop-opacity="0.35"/>`,
    `<stop offset="1" stop-color="${surface}" stop-opacity="1"/>`,
    `</linearGradient>`,
  ].join('');

  if (!href) {
    const device = svgText(options.device, {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2 + box.height * 0.18,
      size: box.height * 0.42,
      tone: tone(tokens, 'void-700'),
      bold: true,
      anchor: 'middle',
      opacity: 0.5,
    });
    return {
      svg:
        svgRect(box.x, box.y, box.width, box.height, { fill: tone(tokens, 'void-850') }) +
        device +
        svgRect(box.x, box.y, box.width, box.height, { fill: 'url(#card-scrim)' }),
      defs: scrim,
      height: box.height,
    };
  }

  const image =
    `<image x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" height="${round(
      box.height,
    )}" preserveAspectRatio="${esc(options.align)}" href="${esc(href)}" xlink:href="${esc(href)}"/>`;

  return {
    svg:
      svgRect(box.x, box.y, box.width, box.height, { fill: tone(tokens, 'void-850') }) +
      image +
      svgRect(box.x, box.y, box.width, box.height, { fill: 'url(#card-scrim)' }),
    defs: scrim,
    height: box.height,
  };
}

/**
 * The grade, as a pill.
 *
 * Abbreviated (`G1`, `S-SG`) because that is the short form the server uses in dense views and
 * on printed sheets alike (CLAUDE.md §4), and because a card has no room for "Semi-Special
 * Grade" in the corner. The full label goes in the profile block underneath.
 */
export function gradeChip(
  x: number,
  y: number,
  abbrev: string,
  tokens: ThemeTokens,
  measure: Measurer,
): Piece {
  const size = 30;
  const padding = 20;
  const width = Math.max(78, measure(abbrev, size, true, 'display') + padding * 2);
  const height = 52;

  return {
    svg:
      svgRect(x - width, y, width, height, {
        rx: height / 2,
        fill: tone(tokens, 'void-950'),
        'fill-opacity': 0.82,
        stroke: tone(tokens, 'cursed-500'),
        'stroke-width': 2,
      }) +
      svgText(abbrev, {
        x: x - width / 2,
        y: y + height / 2 + size * 0.36,
        size,
        tone: tone(tokens, 'cursed-400'),
        bold: true,
        anchor: 'middle',
        face: 'display',
      }),
    defs: '',
    height,
  };
}

/** A tracked small-caps label with a rule running off to the right. The section divider. */
export function headingRule(
  x: number,
  y: number,
  width: number,
  label: string,
  tokens: ThemeTokens,
  measure: Measurer,
): Piece {
  const size = 18;
  const upper = label.toUpperCase();
  const tracking = 2.4;
  const textWidth = measure(upper, size, true, 'display') + upper.length * tracking;

  return {
    svg:
      svgText(upper, {
        x,
        y: y + size,
        size,
        tone: tone(tokens, 'ash-500'),
        bold: true,
        tracking,
        face: 'display',
      }) +
      svgLine(x + textWidth + 14, y + size * 0.62, x + width, y + size * 0.62, tone(tokens, 'void-700')),
    defs: '',
    height: size + 18,
  };
}

export interface Pair {
  readonly label: string;
  readonly value: string;
  /** Overrides the value's colour — used for a derived reading, which is not a stored stat. */
  readonly valueTone?: ToneName;
}

/**
 * Label-above-value pairs in a grid.
 *
 * Label above rather than beside because the values are short and the labels are not: "CE
 * Efficiency" and "G1[C3]" side by side either truncates the label or wastes half the column.
 */
export function pairGrid(
  x: number,
  y: number,
  width: number,
  columns: number,
  pairs: readonly Pair[],
  tokens: ThemeTokens,
  measure: Measurer,
): Piece {
  const shown = pairs.filter((pair) => pair.value.trim());
  if (shown.length === 0) return EMPTY_PIECE;

  const gutter = 24;
  const columnWidth = (width - gutter * (columns - 1)) / columns;
  const rowHeight = 66;
  const rows = Math.ceil(shown.length / columns);
  const valueSize = 27;

  const svg = shown
    .map((pair, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellX = x + column * (columnWidth + gutter);
      const cellY = y + row * rowHeight;
      // ⚠️ Clamped to the column. A value wider than its cell used to run off the edge of the
      // card entirely — "Abysmal — 2 grades of CE Efficiency over Output" in a third of the
      // width. Reusing the wrapper at one line gives the ellipsis for free.
      const value = wrapText(pair.value, columnWidth, valueSize, true, measure, 1)[0] ?? '';
      return (
        svgText(pair.label.toUpperCase(), {
          x: cellX,
          y: cellY + 16,
          size: 16,
          tone: tone(tokens, 'ash-500'),
          tracking: 1.4,
        }) +
        svgText(value, {
          x: cellX,
          y: cellY + 48,
          size: valueSize,
          tone: tone(tokens, pair.valueTone ?? 'ash-100'),
          bold: true,
        })
      );
    })
    .join('');

  return { svg, defs: '', height: rows * rowHeight };
}

/**
 * Will this block fit above the footer?
 *
 * ⚠️ The blocks stack downward from the header while the footer is pinned to the bottom of the
 * panel, so with enough content the two meet — a mission card with three full lists put the
 * hosts line straight through the last complication. A graphic shows what fits: a block that
 * would cross the line is dropped whole rather than drawn over something else, because half a
 * complication under a host handle is worse than no complications at all.
 */
export function fits(cursor: number, block: Piece, limit: number): boolean {
  return block.height > 0 && cursor + block.height <= limit;
}

/** The outer frame: bled background, then an inset panel. */
export function frame(width: number, height: number, inset: number, tokens: ThemeTokens): Piece {
  return {
    svg:
      svgRect(0, 0, width, height, { fill: tone(tokens, 'void-950') }) +
      svgRect(inset, inset, width - inset * 2, height - inset * 2, {
        rx: 26,
        fill: tone(tokens, 'void-900'),
        stroke: tone(tokens, 'void-700'),
        'stroke-width': 2,
      }),
    defs: '',
    height: 0,
  };
}

/** Rounds the panel's corners so a bled picture cannot square them off again. */
export function panelClip(
  id: string,
  box: Box,
  radius: number,
): { readonly defs: string; readonly open: string; readonly close: string } {
  return {
    defs: `<clipPath id="${id}"><rect x="${round(box.x)}" y="${round(box.y)}" width="${round(
      box.width,
    )}" height="${round(box.height)}" rx="${radius}"/></clipPath>`,
    open: `<g clip-path="url(#${id})">`,
    close: `</g>`,
  };
}
