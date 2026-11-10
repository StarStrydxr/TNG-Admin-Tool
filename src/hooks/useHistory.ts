import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  canRedo as canRedoOf,
  canUndo as canUndoOf,
  initHistory,
  pushHistory,
  redo as redoOf,
  replacePresent,
  resetHistory,
  undo as undoOf,
  type History,
} from '../domain/history';

export interface HistoryControls<T> {
  readonly value: T;
  /** Record an edit. `coalesceKey` collapses a run of changes to the same thing. */
  readonly set: (next: T | ((current: T) => T), coalesceKey?: string) => void;
  /** Change the value without recording a step — loading, or an external update. */
  readonly replace: (next: T) => void;
  /** Start again from a new value, forgetting the history. */
  readonly reset: (next: T) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * State with undo and redo, and the keyboard shortcuts people already expect.
 *
 * Ctrl+Z and Ctrl+Y (and Ctrl+Shift+Z, which half the world uses instead) are bound while the
 * hook is mounted, except while the user is typing in a field — the browser's own undo inside
 * an input is better than ours, and stealing it would be infuriating.
 */
export function useHistory<T>(initial: T, options: { readonly shortcuts?: boolean } = {}) {
  const { shortcuts = true } = options;
  const [history, setHistory] = useState<History<T>>(() => initHistory(initial));

  const set = useCallback((next: T | ((current: T) => T), coalesceKey?: string) => {
    setHistory((current) => {
      const value =
        typeof next === 'function' ? (next as (c: T) => T)(current.present) : next;
      if (Object.is(value, current.present)) return current;
      return pushHistory(current, value, coalesceKey === undefined ? {} : { coalesceKey });
    });
  }, []);

  const replace = useCallback((next: T) => {
    setHistory((current) => replacePresent(current, next));
  }, []);

  const reset = useCallback((next: T) => {
    setHistory(resetHistory(next));
  }, []);

  const undo = useCallback(() => setHistory(undoOf), []);
  const redo = useCallback(() => setHistory(redoOf), []);

  // Read inside the listener so the handler can stay registered once.
  const latest = useRef({ undo, redo });
  latest.current = { undo, redo };

  useEffect(() => {
    if (!shortcuts) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;

      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (typing) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        latest.current.undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        latest.current.redo();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);

  return useMemo<HistoryControls<T>>(
    () => ({
      value: history.present,
      set,
      replace,
      reset,
      undo,
      redo,
      canUndo: canUndoOf(history),
      canRedo: canRedoOf(history),
    }),
    [history, set, replace, reset, undo, redo],
  );
}
