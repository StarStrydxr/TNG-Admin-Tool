import type { DraftField } from '../../generators/draft';
import { LockButton } from './LockButton';

interface DraftFieldRowProps {
  readonly field: DraftField;
  readonly onReroll: () => void;
  readonly onToggleLock: () => void;
  readonly onEdit: (values: readonly string[]) => void;
  /** Digit that toggles this field's lock from the keyboard, if it has one. */
  readonly shortcut?: string;
}

/**
 * One rolled field. Locking is the point of the whole interaction — rolling one field twenty
 * times while the rest holds still is where the value is (CLAUDE.md §6) — so the lock sits
 * first, where it is easy to hit.
 */
export function DraftFieldRow({
  field,
  onReroll,
  onToggleLock,
  onEdit,
  shortcut,
}: DraftFieldRowProps) {
  const text = field.values.join('\n');

  // Grow to fit. Technique principles and domains run to a couple of sentences, and a
  // one-row box would hide most of them behind a scrollbar. Approximate rather than measured;
  // the box stays resizable either way.
  const CHARS_PER_ROW = 78;
  const rows = Math.min(
    8,
    Math.max(
      1,
      text
        .split('\n')
        .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_ROW)), 0),
    ),
  );

  return (
    <div className="flex items-start gap-2 border-b border-void-850 py-2 last:border-b-0">
      <span className="mt-1 shrink-0">
        <LockButton locked={field.locked} onToggle={onToggleLock} label={field.label} />
      </span>

      <span className="mt-1.5 flex w-36 shrink-0 items-baseline gap-1.5 text-xs text-ash-400">
        {/* Decorative: the lock button beside it already carries the accessible name. */}
        {shortcut ? (
          <span aria-hidden className="font-mono text-[10px] text-ash-500">
            {shortcut}
          </span>
        ) : null}
        {field.label}
      </span>

      <textarea
        className="min-w-0 flex-1 resize-y rounded-md border border-transparent bg-transparent px-2 py-1 text-sm leading-relaxed text-ash-100 outline-none transition-colors hover:border-void-700 focus:border-cursed-500 focus:bg-void-850"
        rows={rows}
        value={text}
        aria-label={field.label}
        onChange={(event) =>
          onEdit(
            event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0),
          )
        }
      />

      <button
        type="button"
        onClick={onReroll}
        disabled={field.locked}
        title={field.locked ? 'Unlock to re-roll' : 'Re-roll just this field'}
        className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs text-ash-500 transition-colors enabled:hover:bg-void-800 enabled:hover:text-ash-100 disabled:opacity-30"
      >
        ↻
      </button>
    </div>
  );
}
