/**
 * Pushes settings into the document.
 *
 * Themes work by overriding the CSS custom properties Tailwind generates from `@theme`, so
 * every utility class picks up a theme change with no re-render and no class churn.
 *
 * This is the one module allowed to touch `document` directly.
 */

import kanjiFaceUrl from './assets/fonts/zen-antique-kanji-400-normal.woff2';
import { isLight } from './domain/color';
import { KANJI_SUBSET, kanjiUnicodeRange } from './domain/shell';
import { buildThemeTokens } from './domain/theme';
import { FONT_STACKS, type Settings } from './domain/settings';

const BASE_FONT_SIZE_PX = 16;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function applyAppearance(settings: Settings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const { appearance, theme } = settings;

  for (const [name, value] of Object.entries(buildThemeTokens(theme.seed, appearance.highContrast))) {
    root.style.setProperty(name, value);
  }

  root.style.setProperty('--font-sans', FONT_STACKS[appearance.fontFamily]);
  root.style.fontSize = `${BASE_FONT_SIZE_PX * appearance.textScale}px`;

  // The system preference can only ever turn motion off, never back on.
  root.dataset['reducedMotion'] = String(appearance.reducedMotion || prefersReducedMotion());
  root.dataset['strongFocus'] = String(appearance.strongFocus);

  // Which interface is drawn. Components that differ in structure read the setting; this is
  // for what differs only in shape — corner radii, scrollbars — and can be said once in CSS.
  root.dataset['interface'] = settings.shell.style;

  // Drives `color-scheme`, so native selects, checkboxes and scrollbars follow a light theme
  // instead of staying dark against it.
  root.dataset['themeLight'] = String(isLight(theme.seed.background));

  // Only the knobs here; the picture itself is set separately, because reading it is async.
  root.style.setProperty('--bg-image-opacity', String(settings.background.opacity));
  root.style.setProperty('--bg-image-blur', `${settings.background.blur}px`);
}

/**
 * Set (or clear) the background picture.
 *
 * Separate from `applyAppearance` because the bytes come off disk asynchronously, and the rest
 * of the appearance must not wait on that. A `data:` URL, like every other image in the app.
 */
export function applyBackgroundImage(dataUrl: string | null): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (dataUrl) {
    root.style.setProperty('--bg-image', `url("${dataUrl}")`);
    root.dataset['hasBackground'] = 'true';
  } else {
    root.style.removeProperty('--bg-image');
    delete root.dataset['hasBackground'];
  }
}

let kanjiFaceRegistered = false;

/**
 * Declare the kanji subset of the display face.
 *
 * Done here rather than as an `@font-face` in the stylesheet so that its `unicode-range` is
 * *built from* `KANJI_SUBSET` — the same list the pages are checked against — instead of being
 * a second copy of it. Same family name as the Latin files, so `font-display` reaches the
 * kanji with no extra class: the browser picks this file for exactly these code points.
 *
 * `block`, not `swap`: a frame of the system's gothic face before this one lands would be the
 * wrong letterform, and the file is local, so the wait is nothing. It is loaded straight away
 * for the same reason. A file that fails to load is not an error — the characters fall back
 * to a system face, which is what they would have been without it.
 */
export function registerKanjiFace(): void {
  if (kanjiFaceRegistered) return;
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  kanjiFaceRegistered = true;

  const face = new FontFace('Zen Antique', `url("${kanjiFaceUrl}") format("woff2")`, {
    style: 'normal',
    weight: '100 900',
    display: 'block',
    unicodeRange: kanjiUnicodeRange(KANJI_SUBSET),
  });
  document.fonts.add(face);
  face.load().catch(() => undefined);
}
