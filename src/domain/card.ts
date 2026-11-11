/**
 * Graphics, as SVG.
 *
 * A card is built as SVG rather than screenshotted out of the React tree, which buys three
 * things for no dependency at all (CLAUDE.md §10 — ask before adding one, and nothing was
 * added): PNG and JPEG come from the canvas already sitting in `services/images.ts`, PDF comes
 * from the print dialog the app already uses, and the SVG itself is a vector master that opens
 * in Inkscape, Illustrator or a text editor. A rasterizer would have given the first two and
 * neither of the last.
 *
 * ⚠️ **Every colour comes from the live theme tokens.** There are no hex literals here and
 * there must not be — §9's rule holds for a generated graphic exactly as it holds for a
 * component, so repainting the theme in Settings repaints the cards. `card.test.ts` fails on
 * any colour in the output that is not one of the fourteen token values. The `@media print`
 * block in `styles/index.css` stays the only place in the project allowed to name a colour,
 * and a card is screen output anyway: it is made to be posted in a channel, not printed.
 *
 * Pure (CLAUDE.md §3). Text measurement arrives as an injected `Measurer` rather than being
 * taken from a canvas here, which keeps the DOM out of `domain/` and keeps the tests
 * deterministic — see `approximateMeasurer`.
 */

import type { ThemeTokens } from './theme';

/**
 * Discord's own proportions, because that is where these are going.
 *
 * Both are resolution-independent — the SVG is vector, and the raster export multiplies by a
 * scale factor — so these are aspect ratios with a sensible nominal size rather than a
 * commitment to a pixel count. A 2× card is 2000×2800 and still sharp.
 */
/**
 * How wide a string renders.
 *
 * Injected so this module never touches a canvas. `services/cards.ts` supplies the real thing
 * from a 2D context's `measureText`, which is exact for the face actually installed; tests and
 * the first paint use `approximateMeasurer`, which is deterministic.
 */
export type Measurer = (
  text: string,
  fontSize: number,
  bold: boolean,
  face?: 'display' | 'body',
) => number;

/**
 * A measurer that needs no DOM.
 *
 * The ratios are averages for the system sans stacks this app ships with. Wrapping is
 * therefore slightly conservative rather than exact, which errs toward a short last line
 * instead of an overflowing one.
 */
export function approximateMeasurer(): Measurer {
  return (text, fontSize, bold) => text.length * fontSize * (bold ? 0.56 : 0.52);
}


/**
 * Greedy word wrap.
 *
 * SVG has no text flow — `<text>` renders one line however long it is — so a paragraph has to
 * be broken here and emitted as one `<tspan>` per line. A single word wider than the line is
 * hard-split rather than allowed to run off the edge.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  measure: Measurer,
  maxLines = Number.POSITIVE_INFINITY,
  face: 'display' | 'body' = 'body',
): readonly string[] {
  const normalised = text.replace(/\s+/g, ' ').trim();
  if (!normalised) return [];

  const lines: string[] = [];
  let line = '';

  for (const word of normalised.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, fontSize, bold, face) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = '';

    // A word that cannot fit on a line of its own, split at the last character that does.
    let rest = word;
    while (measure(rest, fontSize, bold, face) > maxWidth) {
      let cut = rest.length - 1;
      while (cut > 1 && measure(rest.slice(0, cut), fontSize, bold, face) > maxWidth) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }

  if (line) lines.push(line);

  // Wrapped in full and then clamped, rather than stopped early. Stopping early has to decide
  // mid-loop whether the line in hand is the last one, which is where this got it wrong first
  // time: it dropped a line instead of keeping the budget.
  return lines.length <= maxLines
    ? lines
    : clampLines(lines, maxLines, maxWidth, fontSize, bold, measure, face);
}

/** Keep the budget exactly and mark the last line, so a long description reads as continuing. */
function clampLines(
  lines: readonly string[],
  maxLines: number,
  maxWidth: number,
  fontSize: number,
  bold: boolean,
  measure: Measurer,
  face: 'display' | 'body',
): readonly string[] {
  const kept = lines.slice(0, maxLines);
  let last = kept[kept.length - 1] ?? '';
  while (last && measure(`${last}…`, fontSize, bold, face) > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  return [...kept.slice(0, -1), `${last}…`];
}

/**
 * A theme token's resolved value, by its short name.
 *
 * Going through here rather than writing a colour is what makes the no-hardcoded-colour rule
 * checkable: every fill and stroke in a card traces back to one of the fourteen.
 */
export function tone(tokens: ThemeTokens, name: ToneName): string {
  const value = tokens[`--color-${name}`];
  if (!value) throw new Error(`Theme token --color-${name} is missing.`);
  return value;
}

export type ToneName =
  | 'void-950'
  | 'void-900'
  | 'void-850'
  | 'void-800'
  | 'void-700'
  | 'void-600'
  | 'ash-100'
  | 'ash-300'
  | 'ash-400'
  | 'ash-500'
  | 'cursed-400'
  | 'cursed-500'
  | 'cursed-600'
  | 'blood-500';

// Re-exported so a caller needs one import for the whole feature.
export { esc } from './card-escape';
export * from './card-presets';
export * from './card-svg';

