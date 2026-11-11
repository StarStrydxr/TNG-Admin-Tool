import { insigniaFor, type GlyphId, type InsigniaKind } from '../domain/insignia';

interface InsigniaProps {
  readonly kind: InsigniaKind;
  readonly size?: number;
  /** Set when the glyph is the only thing identifying the record; otherwise it stays decorative. */
  readonly titled?: boolean;
  readonly className?: string;
}

/**
 * The glyph for a kind of record.
 *
 * Line art on `currentColor`, so it takes the colour of whatever it sits in and repaints with
 * the theme. No icon library — that would be a dependency (CLAUDE.md §10) for eight shapes.
 *
 * Decorative by default: these sit beside a name that already says what the record is, and a
 * screen reader announcing "Mission" immediately before the word "Mission" is noise. Pass
 * `titled` where the glyph stands alone.
 */
export function Insignia({ kind, size = 16, titled = false, className }: InsigniaProps) {
  const { glyph, label } = insigniaFor(kind);

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={titled ? 'img' : undefined}
      aria-label={titled ? label : undefined}
      aria-hidden={titled ? undefined : true}
    >
      <Glyph id={glyph} />
    </svg>
  );
}

function Glyph({ id }: { readonly id: GlyphId }) {
  switch (id) {
    // A high-collared uniform: shoulders and a standing collar.
    case 'sorcerer':
      return (
        <>
          <path d="M8 2.2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z" />
          <path d="M3 14v-1.4A3.6 3.6 0 0 1 6.6 9h2.8A3.6 3.6 0 0 1 13 12.6V14" />
          <path d="M6.4 9 8 11.4 9.6 9" />
        </>
      );

    // The same figure, broken: a sorcerer who went over.
    case 'curse-user':
      return (
        <>
          <path d="M8 2.2a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z" />
          <path d="M3 14v-1.4A3.6 3.6 0 0 1 6.6 9H8" strokeDasharray="2 1.4" />
          <path d="M8 9h1.4A3.6 3.6 0 0 1 13 12.6V14" />
          <path d="M8 7.6V14" />
        </>
      );

    // A mask with too many eyes.
    case 'curse':
      return (
        <>
          <path d="M8 2c3.1 0 5.2 2.2 5.2 5.1 0 3.4-2.3 6.9-5.2 6.9S2.8 10.5 2.8 7.1C2.8 4.2 4.9 2 8 2Z" />
          <path d="M5.6 6.4h1.2M9.2 6.4h1.2M7.4 9.2h1.2" />
        </>
      );

    // A sealed assignment: a folded sheet with a stamp.
    case 'mission':
      return (
        <>
          <path d="M3.4 2.6h6.1l3.1 3.1v8.1a.6.6 0 0 1-.6.6H3.4a.6.6 0 0 1-.6-.6V3.2a.6.6 0 0 1 .6-.6Z" />
          <path d="M9.4 2.6v3.2h3.2" />
          <circle cx="8" cy="10.4" r="1.9" />
        </>
      );

    // A box bound with paper.
    case 'object':
      return (
        <>
          <path d="M2.8 5.2h10.4v8.2a.6.6 0 0 1-.6.6H3.4a.6.6 0 0 1-.6-.6Z" />
          <path d="M2.2 3h11.6v2.2H2.2z" />
          <path d="M8 5.2V14" strokeDasharray="1.6 1.2" />
        </>
      );

    // A blade and its guard.
    case 'tool':
      return (
        <>
          <path d="M11.6 2.2 5.4 8.4" />
          <path d="M3 13.4 5.4 8.4l2.4 2.4-4.8 2.6Z" />
          <path d="M9.4 4.4l2.2 2.2" />
          <path d="M11.6 2.2h2.2v2.2" />
        </>
      );

    // Interlocking rings: a technique and its extensions.
    case 'technique':
      return (
        <>
          <circle cx="6.1" cy="8" r="3.5" />
          <circle cx="9.9" cy="8" r="3.5" />
        </>
      );

    // A bound beast: ears, muzzle, and the cord that holds it.
    case 'shikigami':
      return (
        <>
          <path d="M3.6 3.2 5 7m7.4-3.8L11 7" />
          <path d="M8 13.2c-2.6 0-4.3-2-4.3-4.3C3.7 7 5.6 5.6 8 5.6s4.3 1.4 4.3 3.3c0 2.3-1.7 4.3-4.3 4.3Z" />
          <path d="M6.6 8.8h.1m2.6 0h.1" />
          <path d="M2.4 11.4h11.2" strokeDasharray="1.4 1.2" />
        </>
      );

    // An open scroll: two rolled ends and ruled lines between them.
    case 'lore':
      return (
        <>
          <path d="M4.2 3.4h7.6a1.4 1.4 0 0 1 1.4 1.4v6.4a1.4 1.4 0 0 1-1.4 1.4H4.2" />
          <path d="M4.2 3.4a1.4 1.4 0 0 0 0 2.8h1.4V4.8a1.4 1.4 0 0 0-1.4-1.4Z" />
          <path d="M4.2 12.6a1.4 1.4 0 0 0 0-2.8h1.4v1.4a1.4 1.4 0 0 1-1.4 1.4Z" />
          <path d="M7.4 6.6h3.4m-3.4 2.8h3.4" />
        </>
      );

    // A posted notice with a face on it, nailed at the corners.
    case 'bounty':
      return (
        <>
          <rect x="3" y="2.5" width="10" height="11" rx="0.6" />
          <circle cx="8" cy="6.4" r="1.6" />
          <path d="M5.6 10.6a2.6 2.6 0 0 1 4.8 0" />
          <path d="M4.6 4.1h.01M11.4 4.1h.01M4.6 11.9h.01M11.4 11.9h.01" />
        </>
      );

    // A mon with a lineage inside it: one head, and the line branching below.
    case 'clan':
      return (
        <>
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="4.8" r="0.9" />
          <path d="M8 5.7v1.7" />
          <path d="M5.2 7.4h5.6M5.2 7.4v1.5M10.8 7.4v1.5" />
          <circle cx="5.2" cy="9.9" r="0.9" />
          <circle cx="10.8" cy="9.9" r="0.9" />
        </>
      );
  }
}
