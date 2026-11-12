import { describe, expect, it } from 'vitest';

import { parseSettings } from './settings-parse';
import {
  DEFAULT_WELCOME,
  WELCOME_NAME_MAX,
  WELCOME_STYLES,
  WELCOME_STYLE_LABELS,
  WELCOME_STYLE_NOTES,
  WELCOME_TIMING,
  cleanWelcomeName,
  parseWelcome,
  welcomeDuration,
  welcomeKey,
  welcomeLines,
} from './welcome';

describe('what the welcome says', () => {
  it('greets by name when one is set', () => {
    expect(welcomeLines('Dan', 'Owner').greeting).toBe('Welcome back, Dan.');
  });

  // A shared client: no name on this machine means it greets the staff, without the "back".
  it('greets the staff when no name is set', () => {
    expect(welcomeLines('', 'Owner').greeting).toBe('Welcome, TNG Staff.');
    expect(welcomeLines('   ', 'Owner').greeting).toBe('Welcome, TNG Staff.');
  });

  // ⚠️ §4a: the rank is a view filter, not a login, and the app must never imply otherwise.
  it('says "viewing as", never "signed in"', () => {
    const { viewing } = welcomeLines('Dan', 'Senior Admin');
    expect(viewing).toBe('Viewing as Senior Admin.');
    expect(viewing.toLowerCase()).not.toContain('signed');
    expect(viewing.toLowerCase()).not.toContain('logged');
  });
});

describe('the name', () => {
  it('is trimmed and its whitespace collapsed', () => {
    expect(cleanWelcomeName('  Dan \n  the   GM ')).toBe('Dan the GM');
  });

  it('is capped, so it cannot wrap the line it sits on', () => {
    expect(cleanWelcomeName('x'.repeat(200))).toHaveLength(WELCOME_NAME_MAX);
  });
});

describe('the setting', () => {
  it('has a label and a note for every style', () => {
    for (const style of WELCOME_STYLES) {
      expect(WELCOME_STYLE_LABELS[style]).toBeTruthy();
      expect(WELCOME_STYLE_NOTES[style]).toBeTruthy();
    }
  });

  it('falls back to the default for anything it does not recognise', () => {
    expect(parseWelcome(undefined)).toEqual(DEFAULT_WELCOME);
    expect(parseWelcome({ style: 'fireworks', name: 7 })).toEqual(DEFAULT_WELCOME);
    expect(parseWelcome({ style: 'card', name: '  Dan ' })).toEqual({ style: 'card', name: 'Dan' });
  });

  // Additive: a config.json written before this existed must still load, with the welcome on.
  it('is absent from an older config and parses to the default', () => {
    expect(parseSettings({}).welcome).toEqual(DEFAULT_WELCOME);
    expect(parseSettings({ welcome: { style: 'off' } }).welcome.style).toBe('off');
  });
});

describe('how long it runs', () => {
  // Played on every launch of a tool opened several times a day.
  it('is over inside three seconds, whichever one it is', () => {
    for (const style of WELCOME_STYLES) expect(welcomeDuration(style)).toBeLessThanOrEqual(3000);
  });

  it('takes no time at all when it is off', () => {
    expect(welcomeDuration('off')).toBe(0);
  });

  it('stays up long enough to be read', () => {
    for (const timing of Object.values(WELCOME_TIMING)) expect(timing.show).toBeGreaterThanOrEqual(1200);
  });
});

describe('a key, while it is up', () => {
  const press = (
    key: string,
    held: Partial<{ repeat: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }> = {},
  ) => welcomeKey({ key, repeat: false, ctrlKey: false, altKey: false, metaKey: false, ...held });

  it('ends it, for any ordinary key', () => {
    for (const key of [' ', 'Enter', 'Escape', 'a', 'Tab', 'ArrowDown']) expect(press(key)).toBe('skip');
  });

  it('passes a modifier on its own', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta']) expect(press(key)).toBe('pass');
  });

  // Alt+F4 and Ctrl+R belong to the window, not to the welcome.
  it('passes real shortcuts', () => {
    expect(press('F4', { altKey: true })).toBe('pass');
    expect(press('r', { ctrlKey: true })).toBe('pass');
  });

  // Held Enter on "Play it now" re-presses the button on every repeat. Swallowed, so it
  // neither restarts the welcome underneath nor ends the one that key just started.
  it('swallows a held key without ending it', () => {
    expect(press('Enter', { repeat: true })).toBe('swallow');
    expect(press(' ', { repeat: true })).toBe('swallow');
  });
});
