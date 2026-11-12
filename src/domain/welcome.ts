/**
 * The welcome at start-up: which one plays, how long it stays, and what it says.
 *
 * Three sequences and an off switch (Dan, 11 Nov 2026 — asked to choose between them, he asked
 * to be able to swap). The drawing is in `components/brand/Welcome.tsx`; what lives here is
 * everything about it that is a decision rather than a picture, so it can be tested.
 *
 * Pure (CLAUDE.md §3).
 */

export type WelcomeStyle = 'veil' | 'seal' | 'card' | 'off';

/** A style that actually draws something. */
export type WelcomeSequence = Exclude<WelcomeStyle, 'off'>;

export const WELCOME_STYLES: readonly WelcomeStyle[] = ['veil', 'seal', 'card', 'off'];

export const WELCOME_STYLE_LABELS: Record<WelcomeStyle, string> = {
  veil: 'The veil lifts',
  seal: 'The seal breaks',
  card: 'Quiet title card',
  off: 'No welcome',
};

export const WELCOME_STYLE_NOTES: Record<WelcomeStyle, string> = {
  veil: 'The window opens under a dark curtain, which rises off the app with a lit hem.',
  seal: 'A paper talisman holds the window shut, then tears down the middle and parts.',
  card: 'The seal and the welcome fade in over the app and out again.',
  off: 'Straight into the app.',
};

export interface WelcomeSettings {
  readonly style: WelcomeStyle;
  /** What to call whoever opens the app. Empty is fine — the line simply leaves the name out. */
  readonly name: string;
}

export const DEFAULT_WELCOME: WelcomeSettings = { style: 'veil', name: '' };

/** Long enough for any real name; short enough that it cannot wrap the line it sits on. */
export const WELCOME_NAME_MAX = 40;

export function isWelcomeStyle(value: unknown): value is WelcomeStyle {
  return typeof value === 'string' && (WELCOME_STYLES as readonly string[]).includes(value);
}

/** Whitespace collapsed and capped. Called on the way in from `config.json` and from the field. */
export function cleanWelcomeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, WELCOME_NAME_MAX);
}

export function parseWelcome(value: unknown): WelcomeSettings {
  const raw = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    style: isWelcomeStyle(raw['style']) ? raw['style'] : DEFAULT_WELCOME.style,
    name: typeof raw['name'] === 'string' ? cleanWelcomeName(raw['name']) : '',
  };
}

export interface WelcomeLines {
  readonly greeting: string;
  readonly viewing: string;
}

/**
 * The two lines under the title.
 *
 * ⚠️ **"Viewing as", never "signed in as".** The rank is a view filter, not a login (CLAUDE.md
 * §4a), and the app is required to say so plainly wherever it comes up. The line earns its
 * place for the same reason the filter exists: it tells you, before anything is on screen,
 * which rank's material is about to be — which is the thing to know before sharing a window.
 */
export function welcomeLines(name: string, roleLabel: string): WelcomeLines {
  const who = cleanWelcomeName(name);
  return {
    // A shared client: with no name set on this machine, it greets the staff. "Back" only when
    // there is somebody named to say it to.
    greeting: who ? `Welcome back, ${who}.` : 'Welcome, TNG Staff.',
    viewing: `Viewing as ${roleLabel}.`,
  };
}

export interface WelcomeTiming {
  /** Milliseconds the title stays up before the sequence starts to leave. */
  readonly show: number;
  /** Milliseconds the leaving takes. */
  readonly leave: number;
}

/**
 * How long each sequence runs.
 *
 * Kept under three seconds end to end on purpose. This plays on every launch of a tool that is
 * opened several times a day, and an entrance that is charming at two seconds is a tax at five.
 * The timers, not `animationend`, move the sequence on — so reduced motion, which collapses
 * every animation to nothing, still gets the title for the same length of time and then a cut.
 */
export const WELCOME_TIMING: Record<WelcomeSequence, WelcomeTiming> = {
  veil: { show: 1900, leave: 900 },
  seal: { show: 1900, leave: 850 },
  card: { show: 1500, leave: 450 },
};

/** A key or a click ends it early, and it leaves faster than it would have on its own. */
export const WELCOME_SKIP_LEAVE = 240;

/**
 * How long after it starts before anything can end it.
 *
 * "Play it now" in Settings is a button, and the welcome appears under the pointer that just
 * pressed it — so the second click of a double-click would land on the welcome and end it
 * before a frame had been seen.
 */
export const WELCOME_SKIP_GUARD = 250;

export interface WelcomeKey {
  readonly key: string;
  readonly repeat: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

/**
 * What a key press does while the welcome is up.
 *
 * - `skip` — end it, and the press goes no further.
 * - `swallow` — the press goes no further, but the welcome stays.
 * - `pass` — none of the welcome's business.
 */
export type WelcomeKeyVerdict = 'skip' | 'swallow' | 'pass';

const BARE_MODIFIERS: readonly string[] = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph'];

/**
 * Any ordinary key ends the welcome. Three exceptions:
 *
 * - A modifier on its own passes — reaching for Ctrl is not pressing a key.
 * - A real shortcut passes: Alt+F4, Ctrl+R and the like belong to the window.
 * - ⚠️ A key that is being *held* is swallowed. Enter on a button fires on the way down and
 *   again on every auto-repeat, so holding Enter on "Play it now" would otherwise press the
 *   button over and over underneath the welcome and restart it for as long as the key was
 *   down. It must not end the welcome either: the press that started it is not a wish to
 *   stop it.
 */
export function welcomeKey(event: WelcomeKey): WelcomeKeyVerdict {
  if (BARE_MODIFIERS.includes(event.key)) return 'pass';
  if (event.ctrlKey || event.altKey || event.metaKey) return 'pass';
  return event.repeat ? 'swallow' : 'skip';
}

export function welcomeDuration(style: WelcomeStyle): number {
  return style === 'off' ? 0 : WELCOME_TIMING[style].show + WELCOME_TIMING[style].leave;
}
