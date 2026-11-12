import { useEffect, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { ROLE_LABELS } from '../../domain/roles';
import {
  WELCOME_NAME_MAX,
  WELCOME_STYLES,
  WELCOME_STYLE_LABELS,
  WELCOME_STYLE_NOTES,
  cleanWelcomeName,
  welcomeLines,
  type WelcomeStyle,
} from '../../domain/welcome';
import { useSettings } from '../../hooks/useSettings';
import { useWelcome } from '../../hooks/useWelcome';

/**
 * Which welcome plays when the app opens, and what it calls you.
 *
 * ⚠️ The name box holds its own raw text. The stored name is cleaned — trimmed, whitespace
 * collapsed — and a box that showed the cleaned value back would swallow the space at the end
 * of "Dan " as fast as it was typed, so a second word could never be started. Same trap as a
 * textarea backed by a parsed list (CLAUDE.md §9), on a smaller scale.
 */
export function WelcomeSection() {
  const { settings, setWelcome } = useSettings();
  const { replay } = useWelcome();
  const { style, name } = settings.welcome;

  const [draft, setDraft] = useState(name);

  // Take the stored name back only when it says something the box does not — a reset, or the
  // settings arriving from disk — never merely because cleaning it changed it.
  useEffect(() => {
    setDraft((current) => (cleanWelcomeName(current) === name ? current : name));
  }, [name]);

  const lines = welcomeLines(name, ROLE_LABELS[settings.role]);

  return (
    <SectionCard
      title="Welcome"
      description="What plays when the app opens. Any key or a click ends it early."
    >
      <div className="flex flex-col gap-1">
        {WELCOME_STYLES.map((option: WelcomeStyle) => (
          <label key={option} className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              type="radio"
              name="welcome-style"
              className="mt-1 h-3.5 w-3.5 shrink-0 accent-cursed-500"
              checked={style === option}
              onChange={() => setWelcome({ style: option })}
            />
            <span className="min-w-0">
              <span className="block text-sm text-ash-300">{WELCOME_STYLE_LABELS[option]}</span>
              <span className="block text-xs text-ash-500">{WELCOME_STYLE_NOTES[option]}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-void-800 pt-4">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-ash-400">What to call you</span>
          <input
            type="text"
            value={draft}
            maxLength={WELCOME_NAME_MAX}
            onChange={(event) => {
              setDraft(event.target.value);
              setWelcome({ name: cleanWelcomeName(event.target.value) });
            }}
            placeholder="Leave empty to greet TNG Staff"
            spellCheck={false}
            className="w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
          />
        </label>
        <button
          type="button"
          disabled={style === 'off'}
          onClick={() => replay(style)}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Play it now
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ash-500">
        {style === 'off'
          ? 'Nothing plays. The app opens straight onto the vault.'
          : `It says “${lines.greeting} ${lines.viewing}” The second line is which rank's records are about to be on screen — worth knowing before you share the window. It follows your theme, and with reduced motion on it holds still and cuts.`}
      </p>
    </SectionCard>
  );
}
