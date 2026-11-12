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

import { Welcome } from '../components/brand/Welcome';
import { ROLE_LABELS } from '../domain/roles';
import {
  WELCOME_SKIP_GUARD,
  WELCOME_SKIP_LEAVE,
  WELCOME_TIMING,
  welcomeKey,
  welcomeLines,
  type WelcomeSequence,
  type WelcomeStyle,
} from '../domain/welcome';
import { useAnnouncer } from './useAnnouncer';
import { useSettings } from './useSettings';

interface WelcomeValue {
  /** Play a welcome now — what "Play it now" in Settings calls. `off` plays nothing. */
  readonly replay: (style: WelcomeStyle) => void;
}

const WelcomeContext = createContext<WelcomeValue | null>(null);

/** One playing of the welcome. `id` changes per playing, so a replay starts from the top. */
interface Run {
  readonly id: number;
  readonly style: WelcomeSequence;
  readonly leaving: boolean;
  readonly leaveMs: number;
}

/**
 * The welcome at start-up, and the door Settings uses to play it again.
 *
 * Three things here are deliberate:
 *
 * - **The window starts covered**, and stays covered until the saved settings are in. Which
 *   welcome plays is itself a setting, so without the cover the app would flash on screen for
 *   a frame, in the default theme, before the welcome that was supposed to open it.
 * - **Timers move it on, not `animationend`.** Reduced motion collapses every animation to
 *   nothing, and a sequence that waited for one to finish would be over before it was seen.
 *   This way the title stays up for the same time either way and the leaving is a cut.
 * - **It never holds the app back.** Everything underneath mounts and loads behind it, and
 *   any key or click ends it early.
 */
export function WelcomeProvider({ children }: { readonly children: ReactNode }) {
  const { settings, loading } = useSettings();
  const { announce } = useAnnouncer();

  const [covered, setCovered] = useState(true);
  const [run, setRun] = useState<Run | null>(null);

  const counter = useRef(0);
  const startedAt = useRef(0);
  const opened = useRef(false);

  const lines = useMemo(
    () => welcomeLines(settings.welcome.name, ROLE_LABELS[settings.role]),
    [settings.welcome.name, settings.role],
  );
  // Read at the moment a playing starts, without making every effect below depend on it.
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const replay = useCallback((style: WelcomeStyle) => {
    if (style === 'off') return;
    counter.current += 1;
    startedAt.current = performance.now();
    setRun({ id: counter.current, style, leaving: false, leaveMs: WELCOME_TIMING[style].leave });
  }, []);

  // Start-up: once, the moment the saved settings are known. The ref rather than state is what
  // keeps StrictMode's doubled effect from playing it twice in development.
  const startupStyle = settings.welcome.style;
  useEffect(() => {
    if (loading || opened.current) return;
    opened.current = true;
    setCovered(false);
    replay(startupStyle);
  }, [loading, startupStyle, replay]);

  const runId = run?.id ?? null;
  const leaving = run?.leaving ?? false;
  const leaveMs = run?.leaveMs ?? 0;
  const style = run?.style ?? null;

  // The overlay is `aria-hidden`; this is how a screen reader gets the same two lines.
  useEffect(() => {
    if (runId === null) return;
    announce(`${linesRef.current.greeting} ${linesRef.current.viewing}`);
  }, [runId, announce]);

  useEffect(() => {
    if (runId === null || style === null) return;
    const wait = leaving ? leaveMs : WELCOME_TIMING[style].show;
    const timer = window.setTimeout(() => {
      setRun((current) => {
        if (current === null || current.id !== runId) return current;
        return current.leaving ? null : { ...current, leaving: true };
      });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [runId, style, leaving, leaveMs]);

  const skip = useCallback(() => {
    if (performance.now() - startedAt.current < WELCOME_SKIP_GUARD) return;
    setRun((current) =>
      current === null || current.leaving
        ? current
        : { ...current, leaving: true, leaveMs: WELCOME_SKIP_LEAVE },
    );
  }, []);

  // Keys, while it is up. Capture phase, and the event stops here: the press that dismisses
  // the welcome must not also re-roll a generator or press the button that has focus.
  useEffect(() => {
    if (runId === null || leaving) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const verdict = welcomeKey(event);
      if (verdict === 'pass') return;
      event.preventDefault();
      event.stopPropagation();
      if (verdict === 'skip') skip();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [runId, leaving, skip]);

  const value = useMemo<WelcomeValue>(() => ({ replay }), [replay]);

  return (
    <WelcomeContext.Provider value={value}>
      {children}
      {covered || run !== null ? (
        <Welcome
          key={runId ?? 'cover'}
          style={style}
          leaving={leaving}
          leaveMs={leaveMs}
          lines={lines}
          onSkip={skip}
        />
      ) : null}
    </WelcomeContext.Provider>
  );
}

export function useWelcome(): WelcomeValue {
  const value = useContext(WelcomeContext);
  if (!value) throw new Error('useWelcome must be used inside <WelcomeProvider>');
  return value;
}
