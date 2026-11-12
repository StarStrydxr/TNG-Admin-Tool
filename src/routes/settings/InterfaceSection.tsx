import { useEffect, useRef } from 'react';

import { SectionCard } from '../../components/SectionCard';
import {
  INTERFACE_STYLES,
  INTERFACE_STYLE_LABELS,
  INTERFACE_STYLE_NOTES,
  type InterfaceStyle,
} from '../../domain/shell';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useSettings } from '../../hooks/useSettings';

/**
 * Set by a change of interface and read by the section when it comes back.
 *
 * ⚠️ Changing the interface swaps the whole shell, so this page is unmounted and mounted again
 * — and with it the radio button that was just pressed. Left alone, keyboard focus would fall
 * back to the top of the document and the page would jump to its top: press an arrow key to
 * try the other interface and you could not press it again to come back. A component cannot
 * remember across its own remount, so the note is kept out here.
 */
let returnFocus = false;

/**
 * Which interface is drawn.
 *
 * Two, and the choice is only about the furniture: the pages, the records, the theme and every
 * other setting are the same in both. It takes effect at once, and the page you are on stays
 * the page you are on.
 */
export function InterfaceSection() {
  const { settings, setShell } = useSettings();
  const { announce } = useAnnouncer();
  const { style } = settings.shell;
  const chosen = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!returnFocus) return;
    returnFocus = false;
    chosen.current?.focus();
    chosen.current?.scrollIntoView({ block: 'center' });
  }, []);

  const choose = (option: InterfaceStyle) => {
    if (option === style) return;
    returnFocus = true;
    setShell({ style: option });
    // The whole frame changes, which is nowhere near the radio button that did it (§9).
    announce(`${INTERFACE_STYLE_LABELS[option]} interface.`);
  };

  return (
    <SectionCard
      title="Interface"
      description="How the app is drawn. Your records, theme and settings are the same either way."
    >
      <div className="flex flex-col gap-1">
        {INTERFACE_STYLES.map((option: InterfaceStyle) => (
          <label key={option} className="flex cursor-pointer items-start gap-2.5 py-1">
            <input
              ref={style === option ? chosen : undefined}
              type="radio"
              name="interface-style"
              className="mt-1 h-3.5 w-3.5 shrink-0 accent-cursed-500"
              checked={style === option}
              onChange={() => choose(option)}
            />
            <span className="min-w-0">
              <span className="block text-sm text-ash-300">{INTERFACE_STYLE_LABELS[option]}</span>
              <span className="block text-xs text-ash-500">{INTERFACE_STYLE_NOTES[option]}</span>
            </span>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}
