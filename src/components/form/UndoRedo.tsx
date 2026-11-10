interface UndoRedoProps {
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

const BUTTON =
  'rounded-md border border-void-700 px-2 py-1 text-ash-400 transition-colors ' +
  'enabled:hover:border-void-600 enabled:hover:text-ash-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-30';

/**
 * Visible undo and redo.
 *
 * The keyboard shortcuts work anyway (`useHistory`), but a shortcut nobody can see is a
 * feature nobody uses. Arrows are drawn as SVG rather than ↶/↷ — those render as different
 * glyphs across Windows fonts, the same trap the padlock emoji set earlier.
 */
export function UndoRedo({ onUndo, onRedo, canUndo, canRedo }: UndoRedoProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        className={BUTTON}
      >
        <Arrow />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
        className={BUTTON}
      >
        <Arrow flipped />
      </button>
    </div>
  );
}

function Arrow({ flipped = false }: { readonly flipped?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={flipped ? 'scale-x-[-1]' : undefined}
    >
      <path d="M6 4 2.5 7.5 6 11" />
      <path d="M2.5 7.5H9a4.5 4.5 0 0 1 0 9H7" />
    </svg>
  );
}
