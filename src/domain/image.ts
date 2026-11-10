/**
 * Image rules, with no browser in them.
 *
 * The canvas work lives in `services/images.ts`; everything decidable without a DOM is here so
 * it can be tested. Pure (CLAUDE.md §3).
 */

/** What a file picker and a drop target will accept. Mirrors the Rust whitelist. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** The `accept` attribute for a file input. */
export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Longest edge of a stored image, in pixels.
 *
 * Portraits are shown at a few hundred pixels at most, and these files sit next to a vault the
 * user backs up by copying a folder. 1024 keeps a picture sharp on a high-DPI screen without
 * turning the vault into a photo library.
 */
export const MAX_IMAGE_EDGE = 1024;

export function isAcceptedImageType(type: string): type is AcceptedImageType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * The extension to store under.
 *
 * Downscaling re-encodes, so an animated GIF would lose its animation and a transparent PNG
 * would gain a black background if it went to JPEG. Anything that is not already JPEG is kept
 * as PNG; GIFs are passed through untouched (see `shouldReencode`).
 */
export function storageExtension(type: string): string {
  switch (type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
}

/** GIFs are stored as-is: re-encoding one through a canvas keeps only the first frame. */
export function shouldReencode(type: string): boolean {
  return type !== 'image/gif';
}

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Fit within `maxEdge`, preserving aspect ratio. An image already small enough is returned
 * unchanged — upscaling would add bytes and no detail.
 */
export function scaledDimensions(source: Dimensions, maxEdge = MAX_IMAGE_EDGE): Dimensions {
  const longest = Math.max(source.width, source.height);
  if (longest <= maxEdge || longest === 0) return source;

  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(source.width * ratio)),
    height: Math.max(1, Math.round(source.height * ratio)),
  };
}

/** Human-readable size, for telling someone why their 40MB scan was refused. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
