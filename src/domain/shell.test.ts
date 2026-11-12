import { describe, expect, it } from 'vitest';

import { parseSettings } from './settings-parse';
import {
  DEFAULT_SHELL,
  INTERFACE_STYLES,
  INTERFACE_STYLE_LABELS,
  INTERFACE_STYLE_NOTES,
  KANJI_SUBSET,
  MODULE_MARKS,
  kanjiOf,
  kanjiUnicodeRange,
  parseShell,
} from './shell';

describe('the interface setting', () => {
  it('has a label and a note for both', () => {
    for (const style of INTERFACE_STYLES) {
      expect(INTERFACE_STYLE_LABELS[style]).toBeTruthy();
      expect(INTERFACE_STYLE_NOTES[style]).toBeTruthy();
    }
  });

  // Classic was asked to be *retained*, so it has to be reachable and it has to stick.
  it('keeps classic once it is chosen', () => {
    expect(parseShell({ style: 'classic' }).style).toBe('classic');
    expect(parseSettings({ shell: { style: 'classic', railCollapsed: true } }).shell).toEqual({
      style: 'classic',
      railCollapsed: true,
    });
  });

  it('falls back to the default for anything it does not recognise', () => {
    expect(parseShell(undefined)).toEqual(DEFAULT_SHELL);
    expect(parseShell({ style: 'neon', railCollapsed: 'yes' })).toEqual(DEFAULT_SHELL);
  });

  // Additive: a config.json from before this existed must still load.
  it('is absent from an older config and parses to the default', () => {
    expect(parseSettings({}).shell).toEqual(DEFAULT_SHELL);
  });
});

describe('the kanji on each page', () => {
  const marks = Object.entries(MODULE_MARKS);

  it('is two characters, with a reading that says what they mean', () => {
    for (const [id, mark] of marks) {
      expect(kanjiOf(mark), id).toHaveLength(2);
      expect(mark.reading, id).toContain(' — ');
    }
  });

  // ⚠️ The one that matters. The font ships only these characters; one outside the list does
  // not fail, it quietly renders in a different face beside the ones that match.
  it('uses only characters the vendored subset holds', () => {
    for (const [id, mark] of marks) {
      for (const ch of kanjiOf(mark)) expect(KANJI_SUBSET.includes(ch), `${id}: ${ch}`).toBe(true);
    }
  });

  it('has no page sharing its kanji with another', () => {
    const seen = marks.map(([, mark]) => mark.kanji);
    expect(new Set(seen).size).toBe(seen.length);
  });

  // The font is registered with a range built from the same list, so the two cannot drift.
  it('turns the subset into a unicode-range covering every character once', () => {
    const range = kanjiUnicodeRange(KANJI_SUBSET).split(', ');
    expect(range).toHaveLength(Array.from(KANJI_SUBSET).length);
    expect(new Set(range).size).toBe(range.length);
    for (const ch of Array.from(KANJI_SUBSET)) {
      expect(range).toContain(`U+${ch.codePointAt(0)?.toString(16).toUpperCase()}`);
    }
    expect(kanjiUnicodeRange('務任任')).toBe('U+4EFB, U+52D9');
  });
});
