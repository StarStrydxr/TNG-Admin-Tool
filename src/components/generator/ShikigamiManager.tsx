import { useCallback, useEffect, useRef } from 'react';

import { useAnnouncer } from '../../hooks/useAnnouncer';
import { SHIKIGAMI_SPEC } from '../../generators/specs';
import {
  rerollUnlocked,
  rollDraft,
  setFieldLocked,
  setFieldValues,
  type Draft,
} from '../../generators/draft';
import { deriveSeed } from '../../generators/rng';
import { gradeLabel } from '../../domain/grades';
import type { TableSet } from '../../domain/tables';
import { DraftFieldRow } from './DraftFieldRow';
import { GradeSeal } from '../GradeSeal';

const BUTTON =
  'rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100';

interface ShikigamiManagerProps {
  /** The parent technique's seed; children derive from it so the whole set is reproducible. */
  readonly parentSeed: string;
  readonly tableSet: TableSet;
  /** Held by the generator hook, so saving the technique can include the household. */
  readonly drafts: readonly Draft[];
  readonly onChange: (drafts: readonly Draft[]) => void;
}

/**
 * Shikigami belonging to a technique.
 *
 * One is rolled automatically when a shikigami technique comes up, because a shikigami
 * technique with no shikigami is not a finished result. After that it is entirely manual:
 * add, remove, re-roll or edit.
 *
 * Each child's seed derives from the parent's plus its index, so the whole household rebuilds
 * from the technique's seed alone.
 */
export function ShikigamiManager({
  parentSeed,
  tableSet,
  drafts,
  onChange,
}: ShikigamiManagerProps) {
  const { announce } = useAnnouncer();
  const counter = useRef(0);

  const make = useCallback(
    (index: number) =>
      rollDraft(SHIKIGAMI_SPEC, tableSet, deriveSeed(parentSeed, 'shikigami', index)),
    [parentSeed, tableSet],
  );

  // Reset and seed one whenever the parent technique is re-rolled.
  useEffect(() => {
    counter.current = 1;
    onChange([make(0)]);
    // onChange is intentionally omitted: it changes identity on every render of the parent,
    // and including it would re-seed the household on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [make]);

  function add() {
    const index = counter.current;
    counter.current += 1;
    onChange([...drafts, make(index)]);
    announce('Added a shikigami.');
  }

  function remove(seed: string) {
    onChange(drafts.filter((draft) => draft.seed !== seed));
    announce('Removed a shikigami.');
  }

  function regen(seed: string) {
    onChange(
      drafts.map((draft) =>
        draft.seed === seed ? rerollUnlocked(draft, SHIKIGAMI_SPEC, tableSet) : draft,
      ),
    );
    announce('Re-rolled a shikigami.');
  }

  function update(seed: string, next: Draft) {
    onChange(drafts.map((draft) => (draft.seed === seed ? next : draft)));
  }

  return (
    <section className="mt-5 border-t border-void-800 pt-5">
      <header className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base text-ash-100">
            Shikigami ({drafts.length})
          </h3>
          <p className="mt-0.5 text-xs text-ash-500">
            Rolled with the technique. Add, remove, re-roll or edit freely.
          </p>
        </div>
        <button type="button" onClick={add} className={BUTTON}>
          Add shikigami
        </button>
      </header>

      {drafts.length === 0 ? (
        <p className="rounded-md border border-dashed border-void-700 px-4 py-6 text-center text-xs text-ash-500">
          None. The technique can bind them; this one currently holds nothing.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <li key={draft.seed} className="rounded-lg border border-void-700 bg-void-850 p-4">
              <div className="mb-2 flex items-center justify-between gap-3 border-b border-void-800 pb-2">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm text-ash-100">
                    {draft.fields.find((f) => f.key === 'name')?.values[0] ?? 'Unnamed'}
                  </span>
                  <GradeSeal grade={draft.grade} size="sm" className="self-center" />
                  <span className="text-xs text-ash-500">{gradeLabel(draft.grade)}</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => regen(draft.seed)} className={BUTTON}>
                    Re-roll
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(draft.seed)}
                    className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-blood-500 hover:text-blood-500"
                  >
                    Remove
                  </button>
                </span>
              </div>

              <div className="flex flex-col">
                {draft.fields.map((field) => (
                  <DraftFieldRow
                    key={field.key}
                    field={field}
                    onReroll={() => regen(draft.seed)}
                    onToggleLock={() =>
                      update(draft.seed, setFieldLocked(draft, field.key, !field.locked))
                    }
                    onEdit={(values) =>
                      update(draft.seed, setFieldValues(draft, field.key, values))
                    }
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
