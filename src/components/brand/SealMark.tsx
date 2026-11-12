import {
  BRUSH_RULE,
  SEAL_BODY,
  SEAL_GLYPHS,
  SEAL_VIEWBOX,
  VEIL_HEM_FILL,
  VEIL_HEM_LINE,
} from './art';

/**
 * The brand marks, drawn from `art.ts`.
 *
 * Everything here is `currentColor` and takes its size from a class, so each one is coloured
 * by a token on the element that holds it and repaints with the theme (CLAUDE.md §9). They are
 * decoration: every one is `aria-hidden`, and the words beside them carry the meaning.
 */

interface MarkProps {
  readonly className?: string;
}

interface SealMarkProps extends MarkProps {
  /**
   * `stamp` is the pressed seal — a solid body with 次世代 knocked out of it. `ink` is the
   * three characters alone, for where the seal sits on paper rather than on the dark.
   */
  readonly variant?: 'stamp' | 'ink';
}

/**
 * 次世代 — "next generation", the server's own name — as a seal.
 *
 * One path with `evenodd`, so the characters are holes in the body rather than a second shape
 * painted over it in the background colour. That matters: painted over, they would be the
 * wrong colour the moment the seal sat on anything but the page background.
 */
export function SealMark({ variant = 'stamp', className }: SealMarkProps) {
  return (
    <svg viewBox={SEAL_VIEWBOX} className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d={variant === 'stamp' ? SEAL_BODY + SEAL_GLYPHS : SEAL_GLYPHS}
      />
    </svg>
  );
}

/** A dry-brush stroke. Give it a width and a height; it stretches to both. */
export function BrushRule({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 1000 12"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path fill="currentColor" d={BRUSH_RULE} />
    </svg>
  );
}

interface VeilHemProps extends MarkProps {
  /** Token class for the lit line along the edge, kept apart from the drape's own colour. */
  readonly lineClassName: string;
}

/** The lower edge of the veil: the drape in `currentColor`, and the lit line along it. */
export function VeilHem({ className, lineClassName }: VeilHemProps) {
  return (
    <svg
      viewBox="0 0 1000 60"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path fill="currentColor" d={VEIL_HEM_FILL} />
      <path
        className={lineClassName}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        d={VEIL_HEM_LINE}
      />
    </svg>
  );
}
