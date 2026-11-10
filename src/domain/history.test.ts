import { describe, expect, it } from 'vitest';

import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  replacePresent,
  resetHistory,
  undo,
} from './history';

function build(...values: readonly string[]) {
  return values.reduce((history, value) => pushHistory(history, value), initHistory('start'));
}

describe('the basics', () => {
  it('starts with nowhere to go', () => {
    const history = initHistory('a');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
    expect(history.present).toBe('a');
  });

  it('steps back and forward again', () => {
    const history = build('b', 'c');
    expect(history.present).toBe('c');

    const back = undo(history);
    expect(back.present).toBe('b');
    expect(canRedo(back)).toBe(true);

    expect(redo(back).present).toBe('c');
  });

  it('walks all the way back to the beginning and stops', () => {
    let history = build('b', 'c');
    history = undo(undo(undo(history)));
    expect(history.present).toBe('start');
    expect(canUndo(history)).toBe(false);
  });

  it('does nothing at the ends rather than throwing', () => {
    const empty = initHistory('a');
    expect(undo(empty)).toEqual(empty);
    expect(redo(empty)).toEqual(empty);
  });
});

describe('branching', () => {
  it('drops the future once you change something after undoing', () => {
    const history = pushHistory(undo(build('b', 'c')), 'd');
    expect(history.present).toBe('d');
    expect(canRedo(history)).toBe(false);
    expect(undo(history).present).toBe('b');
  });
});

describe('coalescing', () => {
  it('collapses consecutive changes to the same thing into one step', () => {
    let history = initHistory('');
    for (const value of ['W', 'Wa', 'Wal', 'Walk']) {
      history = pushHistory(history, value, { coalesceKey: 'field:name' });
    }

    expect(history.present).toBe('Walk');
    expect(undo(history).present).toBe('');
  });

  it('starts a new step when the thing being changed changes', () => {
    let history = pushHistory(initHistory('a'), 'b', { coalesceKey: 'field:one' });
    history = pushHistory(history, 'c', { coalesceKey: 'field:two' });

    expect(undo(history).present).toBe('b');
  });

  it('never coalesces an unkeyed push', () => {
    let history = pushHistory(initHistory('a'), 'b');
    history = pushHistory(history, 'c');
    expect(undo(history).present).toBe('b');
  });

  it('does not coalesce into the step it just undid', () => {
    let history = pushHistory(initHistory('a'), 'b', { coalesceKey: 'k' });
    history = undo(history);
    history = pushHistory(history, 'c', { coalesceKey: 'k' });

    expect(history.present).toBe('c');
    expect(undo(history).present).toBe('a');
  });
});

describe('the limit', () => {
  it('drops the oldest entries rather than growing forever', () => {
    let history = initHistory(0);
    for (let i = 1; i <= 20; i += 1) history = pushHistory(history, i, { limit: 5 });

    expect(history.past).toHaveLength(5);
    expect(history.present).toBe(20);
    expect(history.past[0]).toBe(15);
  });
});

describe('replacing and resetting', () => {
  it('replaces the present without recording a step', () => {
    const history = replacePresent(build('b'), 'loaded');
    expect(history.present).toBe('loaded');
    expect(history.past).toEqual(['start']);
  });

  it('resets to a clean history when the surface changes record', () => {
    const history = resetHistory('other');
    expect(history.present).toBe('other');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});
