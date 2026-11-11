/**
 * Turning a card into a file.
 *
 * Three formats, none of which needed a dependency (CLAUDE.md §10):
 *
 * - **SVG** — the document itself, written out as text. The vector master: it opens in
 *   Inkscape, Illustrator, Affinity or Notepad, which is what makes a card editable after it
 *   leaves the app rather than only before.
 * - **PNG / JPEG** — the SVG drawn into a canvas and read back with `toBlob`, the same canvas
 *   trick `services/images.ts` already uses to downscale a portrait.
 * - **PDF** — not here. That is the print dialog, which the app already drives through
 *   `hooks/usePrint.tsx`; "Microsoft Print to PDF" is in every Windows print dialog, so a PDF
 *   writer would be a dependency bought for nothing (§9).
 *
 * ⚠️ **An SVG loaded into an `Image` renders in its own isolated context.** It cannot see the
 * host document's stylesheets, so the `@font-face` rules in `styles/index.css` do not reach
 * it: only fonts installed on the machine do. The two vendored faces are webfonts and are
 * installed nowhere, so when one of them is the chosen face it has to travel *inside* the
 * document or the rasterized card silently falls back to a system sans. Hence
 * `embeddedFontCss`. The file is read from the bundle, never fetched (§1).
 */

import { round, type Measurer } from '../domain/card';
import { cardFontStacks, type CardFonts, type ResolvedCardFonts } from '../domain/card-style';
import { isFontChoice, type FontChoice } from '../domain/fonts';
import { call } from './transport';

/** Quality for card JPEGs. Higher than a portrait's, because flat colour shows banding. */
const JPEG_QUALITY = 0.95;

export type CardFormat = 'png' | 'jpg' | 'svg';

export const CARD_FORMATS: readonly CardFormat[] = ['png', 'jpg', 'svg'];

export const CARD_FORMAT_LABELS: Record<CardFormat, string> = {
  png: 'PNG — transparent-capable, best for Discord',
  jpg: 'JPEG — smaller, no transparency',
  svg: 'SVG — vector, editable in Inkscape or Illustrator',
};

/**
 * Real text widths from a 2D context.
 *
 * Exact for the face actually installed, which is what keeps a wrapped description from
 * overflowing its column. `approximateMeasurer` in `domain/card.ts` is the fallback for tests
 * and for any context with no canvas; it errs short rather than long.
 */
export function canvasMeasurer(fonts: ResolvedCardFonts): Measurer {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return (text, size, bold) => text.length * size * (bold ? 0.56 : 0.52);

  return (text, size, bold, face) => {
    const stack = face === 'display' ? fonts.display : fonts.body;
    context.font = `${bold ? '700 ' : ''}${round(size)}px ${stack}`;
    return context.measureText(text).width;
  };
}

/**
 * The vendored faces, as data URLs, loaded only when one is actually in use.
 *
 * `?inline` makes Vite emit the file as base64 at build time; the glob is lazy, so the
 * ~310KB OpenDyslexic pair is not in the bundle's startup path for anyone using the default
 * sans. Both weights go in, because the card uses bold for every heading and value.
 */
const FONT_FILES = import.meta.glob('../assets/fonts/*.woff2', {
  query: '?inline',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const EMBEDDABLE: Partial<Record<FontChoice, { readonly family: string; readonly slug: string }>> =
  {
    dyslexic: { family: 'OpenDyslexic', slug: 'opendyslexic' },
    hyperlegible: { family: 'Atkinson Hyperlegible', slug: 'atkinson-hyperlegible' },
  };

/**
 * The `@font-face` blocks a card needs, for whichever of its two slots use a vendored face.
 *
 * Both slots may name the same face, so the set is deduplicated — otherwise a card with
 * OpenDyslexic in both slots would carry 620KB of identical base64 rather than 310KB.
 */
export async function embeddedFontCss(fonts: CardFonts): Promise<string> {
  const wanted = [fonts.display, fonts.body].filter(
    (value, index, all) => all.indexOf(value) === index,
  );
  const blocks = await Promise.all(
    wanted.map((value) => (isFontChoice(value) ? faceCss(value) : Promise.resolve(''))),
  );
  return blocks.join('');
}

async function faceCss(choice: FontChoice): Promise<string> {
  const face = EMBEDDABLE[choice];
  if (!face) return '';

  const blocks = await Promise.all(
    [400, 700].map(async (weight) => {
      const key = Object.keys(FONT_FILES).find(
        (path) => path.includes(face.slug) && path.includes(`-${weight}-`),
      );
      const loader = key ? FONT_FILES[key] : undefined;
      if (!loader) return '';
      const url = await loader();
      return `@font-face{font-family:'${face.family}';font-style:normal;font-weight:${weight};src:url(${url}) format('woff2');}`;
    }),
  );

  return blocks.join('');
}

export { cardFontStacks };

function loadSvg(svg: string): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve({ image, revoke: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That card could not be rendered. The SVG may be malformed.'));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode that card.'))),
      type,
      type === 'image/jpeg' ? JPEG_QUALITY : undefined,
    );
  });
}

export interface RasterInput {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly format: 'png' | 'jpg';
  /** Painted under the card before it is drawn, so a JPEG has no black where alpha would be. */
  readonly background: string;
}

/**
 * Draw the card into a canvas at `scale` and read the pixels back.
 *
 * The canvas is not tainted: the SVG comes from a blob URL of our own making and every picture
 * inside it is a `data:` URL, so `toBlob` is allowed. An external `href` would break that, and
 * is the reason a portrait is embedded rather than linked.
 */
export async function rasterize(input: RasterInput): Promise<Blob> {
  const { image, revoke } = await loadSvg(input.svg);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(input.width * input.scale);
    canvas.height = Math.round(input.height * input.scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('This machine could not provide a drawing canvas.');

    if (input.format === 'jpg') {
      context.fillStyle = input.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await canvasBlob(canvas, input.format === 'jpg' ? 'image/jpeg' : 'image/png');
  } finally {
    revoke();
  }
}

export interface CardFileInput extends Omit<RasterInput, 'format'> {
  readonly format: CardFormat;
}

/** The bytes for whichever format was asked for. SVG needs no canvas at all. */
export async function cardBytes(input: CardFileInput): Promise<Uint8Array> {
  if (input.format === 'svg') return new TextEncoder().encode(input.svg);

  const blob = await rasterize({ ...input, format: input.format });
  return new Uint8Array(await blob.arrayBuffer());
}

export interface WriteCardInput {
  readonly folder: string;
  readonly stem: string;
  readonly format: CardFormat;
  readonly bytes: Uint8Array;
  /** `Settings.exportDirectory`, or empty for the vault's own exports folder. */
  readonly destination: string;
}

/** Writes through Rust, which owns the filesystem (CLAUDE.md §3). Returns the full path. */
export function writeCard(input: WriteCardInput): Promise<string> {
  return call<string>('card_write', {
    folder: input.folder,
    stem: input.stem,
    ext: input.format,
    // Tauri's IPC carries JSON, so the bytes travel as a number array and Rust takes a Vec<u8>.
    bytes: Array.from(input.bytes),
    destination: input.destination,
  });
}

/**
 * A data URL of the card, for the preview pane and for copying.
 *
 * The preview could render the SVG markup directly — and does — but a PNG data URL is what a
 * "copy the picture" affordance needs, and rendering it through the same `rasterize` path the
 * export uses means what is copied is what is written.
 */
export async function cardDataUrl(input: Omit<RasterInput, 'format'>): Promise<string> {
  const blob = await rasterize({ ...input, format: 'png' });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the rendered card back.'));
    reader.readAsDataURL(blob);
  });
}
