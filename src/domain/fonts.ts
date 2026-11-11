/**
 * Typefaces.
 *
 * A leaf module: `settings.ts` and `card-style.ts` both need these, and card styles live in
 * settings, so leaving them in `settings.ts` would make that import circular. Same split as
 * `Clan` (type in `entities.ts`, constructor in `clans.ts`) — `settings.ts` re-exports them,
 * so every existing import still resolves.
 *
 * ⚠️ **Offline-first (CLAUDE.md §1).** The five stacks are system faces plus the two vendored
 * ones. A font is never fetched, and a name typed into a card style resolves against what is
 * installed on this machine or falls back — it does not reach for a CDN.
 *
 * Pure (CLAUDE.md §3).
 */

export type FontChoice = 'sans' | 'serif' | 'mono' | 'dyslexic' | 'hyperlegible';

export const FONT_CHOICES: readonly FontChoice[] = [
  'sans',
  'serif',
  'mono',
  'hyperlegible',
  'dyslexic',
];

export const FONT_LABELS: Record<FontChoice, string> = {
  sans: 'Sans — the default UI face',
  serif: 'Serif — softer for long reading',
  mono: 'Monospace — fixed width throughout',
  hyperlegible: 'Atkinson Hyperlegible — designed for low vision',
  dyslexic: 'OpenDyslexic — weighted letterforms, designed for dyslexia',
};

export const FONT_STACKS: Record<FontChoice, string> = {
  sans: "ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
  serif: "ui-serif, Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'Cascadia Mono', 'Consolas', monospace",
  hyperlegible: "'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif",
  dyslexic: "'OpenDyslexic', ui-sans-serif, system-ui, sans-serif",
};

/** True when the value names one of the five built-in choices rather than a local family. */
export function isFontChoice(value: string): value is FontChoice {
  return (FONT_CHOICES as readonly string[]).includes(value);
}

/**
 * A family name reduced to what is safe to drop inside a CSS `font-family`.
 *
 * ⚠️ This string ends up inside the `<style>` block of a generated SVG, so a quote or a brace
 * in it would end the declaration and let the rest be read as CSS. Whitelisting to letters,
 * digits, spaces and hyphens is the same bargain `images.rs` makes with file names: a
 * whitelist rather than a sanitiser, because a sanitiser invites argument about what it missed.
 */
export function safeFamily(name: string): string {
  return name.replace(/[^A-Za-z0-9 -]/g, '').trim().slice(0, 64);
}

/**
 * The CSS stack for a card's font slot.
 *
 * A slot holds either one of the five choice ids or the name of a font installed on this
 * machine. A local family is quoted and given the sans fallbacks, so a name that resolves to
 * nothing degrades to the default face rather than to whatever the browser picks last.
 */
export function resolveFontStack(value: string): string {
  if (isFontChoice(value)) return FONT_STACKS[value];
  const family = safeFamily(value);
  return family ? `'${family}', ${FONT_STACKS.sans}` : FONT_STACKS.sans;
}
