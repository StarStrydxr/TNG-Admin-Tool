import { type ReactNode } from 'react';

import { parseLines, useLineBuffer } from '../../components/form/fields';

interface RowListProps {
  readonly title: string;
  readonly hint?: string;
  readonly addLabel: string;
  readonly onAdd: () => void;
  /** Shown in place of the rows when there are none. */
  readonly empty: string;
  readonly count: number;
  readonly children: ReactNode;
}

/**
 * A titled block of rows with an add button and nothing else clever.
 *
 * Four of the clan editor's five sections are the same shape — a heading, a list you can add to
 * and remove from, a note underneath — so the shape lives here once rather than four times. The
 * rows themselves stay in their own components, because what goes in a seat and what goes in a
 * mutation have nothing in common.
 */
export function RowList({
  title,
  hint,
  addLabel,
  onAdd,
  empty,
  count,
  children,
}: RowListProps) {
  return (
    <section className="mt-5 border-t border-void-800 pt-4">
      <div className="mb-2 flex items-baseline gap-3">
        <h4 className="mr-auto text-xs font-medium tracking-wide text-ash-400">{title}</h4>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-cursed-600 hover:text-ash-100"
        >
          {addLabel}
        </button>
      </div>

      {count === 0 ? (
        <p className="rounded-md border border-dashed border-void-800 px-3 py-4 text-center text-xs text-ash-500">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}

      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-ash-500">{hint}</p> : null}
    </section>
  );
}

interface RowProps {
  readonly onRemove: () => void;
  readonly removeLabel: string;
  readonly children: ReactNode;
}

export function Row({ onRemove, removeLabel, children }: RowProps) {
  return (
    <li className="rounded-md border border-void-800 bg-void-850/50 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
          className="shrink-0 rounded border border-void-700 px-1.5 py-0.5 text-xs leading-none text-ash-500 transition-colors hover:border-blood-600 hover:text-blood-500"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

const CELL =
  'w-full rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

interface CellProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly suggestions?: readonly string[];
  readonly className?: string;
}

/**
 * One compact labelled input inside a row.
 *
 * Its own small component rather than `TextInput` because a row holds four or five of these
 * side by side and the shared field's spacing is built for a form, not a table.
 */
export function Cell({
  label,
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}: CellProps) {
  const listId = suggestions ? `cell-${label.replace(/\W+/g, '-')}` : undefined;

  return (
    <label className={`flex min-w-0 flex-col gap-0.5 ${className ?? ''}`}>
      <span className="text-[10px] uppercase tracking-wider text-ash-500">{label}</span>
      <input
        type="text"
        className={CELL}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
        {...(listId ? { list: listId } : {})}
      />
      {suggestions && listId ? (
        <datalist id={listId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

interface AreaCellProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
  readonly placeholder?: string;
}

export function AreaCell({ label, value, onChange, rows = 2, placeholder }: AreaCellProps) {
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-ash-500">{label}</span>
      <textarea
        className={`${CELL} resize-y leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface LinesAreaProps {
  readonly label: string;
  readonly lines: readonly string[];
  readonly onChange: (lines: readonly string[]) => void;
  readonly rows?: number;
  readonly placeholder?: string;
}

/**
 * A textarea backed by a list, where you can actually press Enter.
 *
 * ⚠️ The obvious version is broken and was shipped broken: derive the value from the parsed
 * list, parse it back on every keystroke, and drop blank lines. Press Enter and the text
 * becomes `"…\n"`, the blank line is filtered out, the value re-renders without it, and the
 * newline is deleted the instant it is typed — a second line is unreachable. Dan hit exactly
 * that on the Fukai mutation.
 *
 * So the raw text is held here while it is being edited, and only the parsed list travels
 * upward. The model is taken back only when it changes to something this text does not already
 * say — switching record, or an undo — so in-progress whitespace survives a re-render.
 */
export function LinesArea({ label, lines, onChange, rows = 2, placeholder }: LinesAreaProps) {
  const buffer = useLineBuffer(lines, onChange);
  return (
    <AreaCell
      label={label}
      rows={rows}
      placeholder={placeholder ?? ''}
      value={buffer.text}
      onChange={buffer.setText}
    />
  );
}

// Re-exported so the imports that already reach for it here still resolve — the same split
// `settings.ts` makes for `FONT_STACKS`.
export { parseLines };
