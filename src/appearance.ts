/**
 * Pushes settings into the document.
 *
 * Themes work by overriding the CSS custom properties Tailwind generates from `@theme`, so
 * every utility class picks up a theme change with no re-render and no class churn.
 *
 * This is the one module allowed to touch `document` directly.
 */

import { isLight } from './domain/color';
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
