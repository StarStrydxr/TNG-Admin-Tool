import { useEffect, useRef } from 'react';

export interface GeneratorKeyActions {
  /** Space — re-roll everything unlocked. */
  readonly rerollAll: () => void;
  /** R — a fresh seed and a fresh roll. */
  readonly roll: () => void;
  /** 1–9 — toggle the lock on that numbered field. */
  readonly toggleLock: (index: number) => void;
  /** L — lock every field; U — unlock every field. */
  readonly lockAll: (locked: boolean) => void;
  readonly enabled: boolean;
}

/**
 * Keyboard rolling.
 *
 * Most of the value of this app is rolling one field twenty times while the rest holds still,
 * and doing that with the mouse is twenty round trips to a small button. Space re-rolls, the
 * digits toggle locks, so a run of rolls never leaves the keyboard.
 *
 * Inert while focus is in a field, a button or anything editable: Space means "press this" on
 * a focused button and "type a space" in an input, and stealing either would be worse than
 * having no shortcuts at all. Modifier combinations are left alone too, so Ctrl+Z still
 * reaches `useHistory`.
 */
export function useGeneratorKeys(actions: GeneratorKeyActions) {
  // Read through a ref so the listener registers once and still sees current handlers.
  const latest = useRef(actions);
  latest.current = actions;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const current = latest.current;
      if (!current.enabled) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          tag === 'A' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        current.rerollAll();
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'r') {
        event.preventDefault();
        current.roll();
        return;
      }

      if (key === 'l') {
        event.preventDefault();
        current.lockAll(true);
        return;
      }

      if (key === 'u') {
        event.preventDefault();
        current.lockAll(false);
        return;
      }

      if (key >= '1' && key <= '9') {
        event.preventDefault();
        current.toggleLock(Number(key) - 1);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
