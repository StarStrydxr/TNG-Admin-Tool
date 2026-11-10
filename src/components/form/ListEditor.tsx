import type { ReactNode } from 'react';

interface Identified {
  readonly id: string;
}

interface ListEditorProps<T extends Identified> {
  readonly label: string;
  readonly items: readonly T[];
  readonly onChange: (items: readonly T[]) => void;
  /** Builds a blank entry. Given the current length so it can mint a unique id. */
  readonly createItem: (index: number) => T;
  readonly renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  readonly addLabel: string;
  readonly emptyLabel: string;
  /** Rendered beside the label — used for slot counts. */
  readonly badge?: ReactNode;
}

/**
 * Add/remove list of sub-records. Deliberately dumb: no reordering, no validation, no limits.
 * Slot limits are advisory and shown as a badge, never enforced here — see CLAUDE.md §4.
 */
export function ListEditor<T extends Identified>({
  label,
  items,
  onChange,
  createItem,
  renderItem,
  addLabel,
  emptyLabel,
  badge,
}: ListEditorProps<T>) {
  function update(id: string, patch: Partial<T>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-ash-400">
          {label}
          {badge}
        </span>
        <button
          type="button"
          onClick={() => onChange([...items, createItem(items.length)])}
          className="rounded-md border border-void-700 px-2 py-1 text-xs text-ash-400 transition-colors hover:border-cursed-600 hover:text-ash-100"
        >
          {addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-void-700 px-3 py-4 text-center text-xs text-ash-500">
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="relative rounded-md border border-void-700 bg-void-850 p-3 pr-10"
            >
              {renderItem(item, (patch) => update(item.id, patch))}
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Remove"
                title="Remove"
                className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-xs text-ash-500 transition-colors hover:bg-void-700 hover:text-blood-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
