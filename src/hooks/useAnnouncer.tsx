import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useSettings } from './useSettings';

type Politeness = 'polite' | 'assertive';

interface AnnouncerValue {
  /** Announce a status change. Screen readers always hear it; speech is opt-in. */
  readonly announce: (message: string, politeness?: Politeness) => void;
  readonly speechSupported: boolean;
}

const AnnouncerContext = createContext<AnnouncerValue | null>(null);

function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Status announcements.
 *
 * Two layers, deliberately separate:
 *
 *   1. An ARIA live region, always on. Costs nothing and is what Windows Narrator, NVDA and
 *      JAWS actually read. Rolling a mission or saving a character is otherwise silent to a
 *      screen reader, because the change happens somewhere other than the focused element.
 *   2. The system voice via the Web Speech API, off by default. Uses installed Windows voices,
 *      so it still works with no network.
 *
 * The live region is rendered here rather than per-screen so there is exactly one, which is
 * what assistive tech expects.
 */
export function AnnouncerProvider({ children }: { readonly children: ReactNode }) {
  const { settings } = useSettings();
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const speak = settings.appearance.speakAnnouncements;
  const supported = useMemo(speechSupported, []);

  // Stop any queued speech when the setting is turned off mid-sentence.
  useEffect(() => {
    if (!speak && supported) window.speechSynthesis.cancel();
  }, [speak, supported]);

  const lastMessage = useRef('');

  const announce = useCallback(
    (message: string, politeness: Politeness = 'polite') => {
      const trimmed = message.trim();
      if (!trimmed) return;

      // Re-announce an identical message by blanking first, otherwise the live region sees no
      // change and stays silent.
      const setter = politeness === 'assertive' ? setAssertive : setPolite;
      if (lastMessage.current === trimmed) setter('');
      lastMessage.current = trimmed;
      window.setTimeout(() => setter(trimmed), 0);

      if (speak && supported) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(trimmed));
      }
    },
    [speak, supported],
  );

  const value = useMemo<AnnouncerValue>(
    () => ({ announce, speechSupported: supported }),
    [announce, supported],
  );

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerValue {
  const context = useContext(AnnouncerContext);
  // A missing provider must not crash a screen; announcements are an enhancement.
  return context ?? { announce: () => undefined, speechSupported: false };
}
