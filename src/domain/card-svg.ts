/**
 * SVG primitives.
 *
 * Split out of `card.ts` to keep both files inside the ~300-line convention (CLAUDE.md §9).
 * Everything here is string building and arithmetic — it knows nothing about characters,
 * clans or missions, and nothing about the theme beyond being handed a colour.
 *
 * Pure (CLAUDE.md §3). Re-exported from `card.ts`, so callers need one import.
 */

import { esc } from './card-escape';

export interface TextSpec {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly tone: string;
  readonly bold?: boolean;
  /** Letter spacing in user units — used for the small upper-case labels. */
  readonly tracking?: number;
  readonly anchor?: 'start' | 'middle' | 'end';
  readonly opacity?: number;
  /**
   * Which font slot letters this.
   *
   * `display` for names, headings and the grade chip — what is read at a glance. Body is the
   * default, so only the things that want the display face have to say so. Emitted as a class
   * rather than an inline `font-family`, because the two stacks are declared once in the
   * document's `<style>` and a per-element copy would be the same string a hundred times.
   */
  readonly face?: 'display' | 'body';
}

export function svgText(value: string, spec: TextSpec): string {
  if (!value.trim()) return '';
  const attrs = [
    `x="${round(spec.x)}"`,
    `y="${round(spec.y)}"`,
    `font-size="${round(spec.size)}"`,
    `fill="${spec.tone}"`,
    spec.bold ? 'font-weight="700"' : '',
    spec.tracking ? `letter-spacing="${round(spec.tracking)}"` : '',
    spec.anchor && spec.anchor !== 'start' ? `text-anchor="${spec.anchor}"` : '',
    spec.opacity !== undefined ? `opacity="${spec.opacity}"` : '',
    spec.face === 'display' ? 'class="d"' : '',
  ].filter(Boolean);
  return `<text ${attrs.join(' ')}>${esc(value)}</text>`;
}

/** One `<text>` carrying a wrapped paragraph as `<tspan>` lines. */
export function svgParagraph(
  lines: readonly string[],
  spec: TextSpec,
  lineHeight: number,
): string {
  if (lines.length === 0) return '';
  const spans = lines
    .map(
      (line, index) =>
        `<tspan x="${round(spec.x)}" dy="${index === 0 ? 0 : round(lineHeight)}">${esc(line)}</tspan>`,
    )
    .join('');
  const attrs = [
    `x="${round(spec.x)}"`,
    `y="${round(spec.y)}"`,
    `font-size="${round(spec.size)}"`,
    `fill="${spec.tone}"`,
    spec.bold ? 'font-weight="700"' : '',
    spec.face === 'display' ? 'class="d"' : '',
  ].filter(Boolean);
  return `<text ${attrs.join(' ')}>${spans}</text>`;
}

export function svgRect(
  x: number,
  y: number,
  width: number,
  height: number,
  attrs: Readonly<Record<string, string | number>>,
): string {
  const pairs = Object.entries(attrs).map(([key, value]) => `${key}="${value}"`);
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(
    height,
  )}" ${pairs.join(' ')}/>`;
}

export function svgLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  opacity = 1,
): string {
  return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(
    y2,
  )}" stroke="${stroke}" stroke-width="1" opacity="${opacity}"/>`;
}

/** Trims float noise so the same input gives byte-identical output. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface DocumentSpec {
  readonly width: number;
  readonly height: number;
  readonly defs: string;
  readonly body: string;
  /**
   * The resolved CSS stacks for the two slots. Passed in from settings, never assumed here.
   */
  readonly fonts: { readonly display: string; readonly body: string };
  /**
   * An `@font-face` block with the face embedded as a data URL, or empty.
   *
   * Only needed for the two vendored faces, which are on nobody else's machine: a raster
   * export has the glyphs baked in, but a shared `.svg` renders with whatever the opener has.
   * Supplied by `services/cards.ts`, which can read the file; never fetched (CLAUDE.md §1).
   */
  readonly fontFaceCss: string;
  readonly title: string;
}

export function svgDocument(spec: DocumentSpec): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` width="${spec.width}" height="${spec.height}"`,
    ` viewBox="0 0 ${spec.width} ${spec.height}">`,
    `<title>${esc(spec.title)}</title>`,
    `<defs>${spec.defs}</defs>`,
    `<style>${spec.fontFaceCss}text{font-family:${spec.fonts.body};}.d{font-family:${spec.fonts.display};}</style>`,
    spec.body,
    `</svg>`,
  ].join('');
}
