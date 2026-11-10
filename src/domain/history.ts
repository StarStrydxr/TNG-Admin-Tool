/**
 * Undo and redo, as data.
 *
 * A past/present/future triple rather than a mutable stack, so the whole history is one value
 * React can hold in state and this module stays pure (CLAUDE.md §3).
 *
 * Two things make it usable rather than merely correct:
 *
 *   * **Coalescing.** Typing a name is dozens of state changes and one *edit*. A push carries
 *     a `coalesceKey`; consecutive pushes sharing a key replace the present instead of
 *     stacking, so one undo clears the whole word rather than one letter.
 *   * **A limit.** Drafts are small but a long session is long. The oldest entries fall off
 *     the back rather than growing without end.
 */

export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  /** What produced the present, for coalescing the next push. Null after undo or redo. */
  readonly lastKey: string | null;
}

/** Roughly a long session of fiddling, and still trivial in memory for a draft. */
export const DEFAULT_HISTORY_LIMIT = 100;

export interface PushOptions {
  /**
   * Consecutive pushes with the same key collapse into one undo step. Use a key that names
   * the thing being changed — `field:name`, not `keystroke`.
   */
  readonly coalesceKey?: string;
  readonly limit?: number;
}

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null };
}

/**
 * Record a new present.
 *
 * Pushing always clears the future: once you change something after undoing, the branch you
 * undid is gone. That is what every editor does, and the alternative is a tree nobody asked
 * for.
 */
export function pushHistory<T>(
  history: History<T>,
  present: T,
  options: PushOptions = {},
): History<T> {
  const { coalesceKey, limit = DEFAULT_HISTORY_LIMIT } = options;

  // Same key as the change before it: replace rather than stack.
  if (coalesceKey !== undefined && history.lastKey === coalesceKey) {
    return { ...history, present, future: [], lastKey: coalesceKey };
  }

  const past = [...history.past, history.present];

  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    present,
    future: [],
    lastKey: coalesceKey ?? null,
  };
}

/** Replace the present without recording a step — for a change that is not the user's edit. */
export function replacePresent<T>(history: History<T>, present: T): History<T> {
  return { ...history, present, lastKey: null };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    // Cleared so the next edit starts a fresh step rather than coalescing into the one undone.
    lastKey: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  const next = history.future[0];
  if (next === undefined) return history;

  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
    lastKey: null,
  };
}

/** Forget everything but the present — used when the surface switches to a different record. */
export function resetHistory<T>(present: T): History<T> {
  return initHistory(present);
}
