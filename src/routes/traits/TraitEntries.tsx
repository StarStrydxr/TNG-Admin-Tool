import { entryGroups, traitEntry, type TraitEntity } from '../../domain/traits';
import type { TraitEntry } from '../../domain/entities';

interface EntriesProps {
  readonly entry: TraitEntity;
  readonly onChange: (entries: readonly TraitEntry[]) => void;
}

const FIELD =
  'rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

const QUIET = 'border-transparent bg-transparent text-ash-500';

const KIND_CLASS: Record<TraitEntry['kind'], string> = {
  bonus: 'text-cursed-400',
  drawback: 'text-blood-500',
};

/**
 * The «Bonuses and Drawbacks» block.
 *
 * Laid out the way the server writes it: a named line, a colour, and an optional grey note
 * under it. ⚠️ **The colour is a stored choice, not a reading of the text** — "Supervision"
 * is a bonus with no plus in it and "Quirky" a drawback with no minus, so a button toggles it
 * rather than `modifier()` guessing from a sign. That is the whole reason a `ClanModifier`
 * could not be reused here.
 *
 * A conditional group ("Whenever Alone (Team of One)") is a string on each entry, not a nested
 * list. Flat means an entry can be moved between blocks by typing, and means nothing has to be
 * restructured to add one.
 */
export function TraitEntries({ entry, onChange }: EntriesProps) {
  const entries = entry.entries;
  const groups = entryGroups(entry);

  const patch = (id: string, change: Partial<TraitEntry>) =>
    onChange(entries.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const add = (condition: string) =>
    onChange([...entries, traitEntry(condition ? { condition } : {})]);

  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h4 className="text-xs font-medium tracking-wide text-ash-400">Bonuses and drawbacks</h4>
        <span className="text-[11px] text-ash-500">
          Recorded, never applied — set the resulting Class yourself in the Stats section.
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-void-700 px-3 py-4 text-center text-xs text-ash-500">
          Nothing yet. Each line is one named bonus or drawback, the way the server writes them.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.condition || 'main'}>
            {group.condition ? (
              <p className="mb-1.5 text-xs text-ash-300">
                <span aria-hidden className="mr-1 text-ash-500">
                  ➡
                </span>
                {group.condition}
              </p>
            ) : null}

            <ul className="flex flex-col gap-2">
              {group.entries.map((item) => (
                <li
                  key={item.id}
                  className="rounded border border-void-800 bg-void-850/50 px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`${item.name || 'This line'} is a ${item.kind}. Change it.`}
                      title="Bonus or drawback"
                      className={`shrink-0 font-mono text-sm ${KIND_CLASS[item.kind]}`}
                      onClick={() =>
                        patch(item.id, { kind: item.kind === 'bonus' ? 'drawback' : 'bonus' })
                      }
                    >
                      ◆
                    </button>
                    <input
                      type="text"
                      value={item.name}
                      aria-label="Name"
                      placeholder="Genius"
                      className={`${FIELD} w-40 shrink-0`}
                      onChange={(event) => patch(item.id, { name: event.target.value })}
                    />
                    <input
                      type="text"
                      value={item.text}
                      aria-label="Effect"
                      placeholder="+2 Grades to Perception"
                      className={`${FIELD} min-w-0 flex-1`}
                      onChange={(event) => patch(item.id, { text: event.target.value })}
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${item.name || 'this line'}`}
                      className="shrink-0 px-1 text-xs text-ash-500 transition-colors hover:text-blood-500"
                      onClick={() => onChange(entries.filter((other) => other.id !== item.id))}
                    >
                      ✕
                    </button>
                  </div>

                  {/* One row, not two stacked: three full-width boxes per line made a trait
                      with eight bonuses taller than the screen. */}
                  <div className="mt-1 flex items-center gap-2 pl-6">
                    <input
                      type="text"
                      value={item.note}
                      aria-label="Note"
                      placeholder="A smaller line underneath — a caveat, or an example"
                      className={`${FIELD} ${QUIET} min-w-0 flex-1`}
                      onChange={(event) => patch(item.id, { note: event.target.value })}
                    />
                    <input
                      type="text"
                      value={item.condition}
                      aria-label="Only when"
                      placeholder="Only when…"
                      className={`${FIELD} ${QUIET} w-44 shrink-0 text-[11px]`}
                      onChange={(event) => patch(item.id, { condition: event.target.value })}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="mt-1.5 rounded border border-void-700 px-2 py-1 text-[11px] text-ash-400 transition-colors hover:border-cursed-500 hover:text-ash-100"
              onClick={() => add(group.condition)}
            >
              Add line{group.condition ? ` to “${group.condition}”` : ''}
            </button>
          </div>
        ))}

        {groups.length === 0 ? (
          <button
            type="button"
            className="self-start rounded border border-void-700 px-2 py-1 text-[11px] text-ash-400 transition-colors hover:border-cursed-500 hover:text-ash-100"
            onClick={() => add('')}
          >
            Add line
          </button>
        ) : null}
      </div>
    </section>
  );
}
