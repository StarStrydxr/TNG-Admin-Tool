import type { CSSProperties } from 'react';

import type { WelcomeLines, WelcomeSequence } from '../../domain/welcome';
import { TEAR_LEFT, TEAR_RIGHT } from './art';
import { BrushRule, SealMark, VeilHem } from './SealMark';

/**
 * The welcome at start-up, drawn.
 *
 * Three sequences over one overlay. What plays, for how long and what it says are decided in
 * `domain/welcome.ts`; when it moves on is decided by the timers in `hooks/useWelcome.tsx`.
 * This file only draws the frame it is told to, and the motion itself is the `welcome-*` rules
 * in `styles/index.css`.
 *
 * - **Tokens only** (CLAUDE.md §9). The one vermilion thing on screen is the seal, in
 *   `blood-500`; the veil's lit hem is `cursed-500`. Both repaint with the theme.
 * - **`aria-hidden`.** There is one live region in this app (§9) and the provider announces
 *   the two lines through it, once. Reading them a second time out of the overlay would be
 *   the same sentence twice.
 * - **Inside `#root`**, so print hides it with the rest of the chrome.
 */

interface WelcomeProps {
  /** Null while settings are still being read: a plain cover, since the style is not known. */
  readonly style: WelcomeSequence | null;
  readonly leaving: boolean;
  readonly leaveMs: number;
  readonly lines: WelcomeLines;
  readonly onSkip: () => void;
}

interface TitleProps {
  readonly lines: WelcomeLines;
  /** Whether each part arrives on its own. The quiet card fades in as one piece instead. */
  readonly staged: boolean;
}

/** The seal beside the title: a vertical stamp against horizontal text, as on a print. */
function Title({ lines, staged }: TitleProps) {
  const part = (name: string, order: string) => (staged ? `${name} ${order}` : '');

  return (
    <div className="flex max-w-2xl items-center gap-7">
      {/* A seal pressed by hand never lands square. */}
      <SealMark
        className={`h-44 w-auto shrink-0 -rotate-2 text-blood-500 ${part('welcome-stamp', '')}`}
      />
      <div className="min-w-0">
        <p className={`font-display text-4xl leading-tight text-ash-100 ${part('welcome-in', 'welcome-2')}`}>
          The Next Generation
        </p>
        <BrushRule className={`mt-2 h-1.5 w-full text-ash-400 ${part('welcome-stroke', 'welcome-3')}`} />
        <p className={`mt-4 text-lg text-ash-100 ${part('welcome-in', 'welcome-4')}`}>
          {lines.greeting}
        </p>
        <p className={`mt-1 text-sm text-ash-400 ${part('welcome-in', 'welcome-5')}`}>
          {lines.viewing}
        </p>
      </div>
    </div>
  );
}

/** The window opens under a curtain; the curtain rises off it, lit along the hem. */
function Veil({ lines }: { readonly lines: WelcomeLines }) {
  return (
    <>
      <div className="welcome-veil absolute inset-0">
        <div className="absolute inset-0 bg-void-950" />
        {/* Hangs below the curtain, so it is off-screen until the curtain starts to rise. */}
        <VeilHem
          className="absolute left-0 top-full -mt-px h-16 w-full overflow-visible text-void-950"
          lineClassName="welcome-hem-line text-cursed-500"
        />
      </div>
      <div className="welcome-content relative">
        <Title lines={lines} staged />
      </div>
    </>
  );
}

interface TalismanProps {
  readonly className: string;
  readonly clipPath?: string;
}

/** A strip of paper with the seal on it. Drawn three times: whole, and as the two torn halves. */
function Talisman({ className, clipPath }: TalismanProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-between bg-ash-100 px-3 py-4 text-void-950 ${className}`}
      style={clipPath ? { clipPath } : undefined}
    >
      <BrushRule className="h-1 w-full" />
      <SealMark className="h-3/5 w-auto text-blood-500" />
      <BrushRule className="h-1 w-full" />
    </div>
  );
}

/** A paper talisman holds the window shut, then tears down the middle and parts. */
function Seal({ lines }: { readonly lines: WelcomeLines }) {
  return (
    <>
      <div className="welcome-backdrop absolute inset-0 bg-void-950" />
      <div className="relative flex flex-col items-center gap-7">
        <div className="welcome-stamp relative aspect-[4/11] h-[min(24rem,50vh)]">
          {/* The halves meet along an antialiased edge, which shows as a hairline before the
              tear. The whole strip sits over them until the moment it tears. */}
          <Talisman className="welcome-tear-left" clipPath={TEAR_LEFT} />
          <Talisman className="welcome-tear-right" clipPath={TEAR_RIGHT} />
          <Talisman className="welcome-whole" />
        </div>
        <div className="welcome-content text-center">
          <p className="welcome-in welcome-2 font-display text-2xl text-ash-100">
            The Next Generation
          </p>
          <p className="welcome-in welcome-4 mt-2 text-base text-ash-100">{lines.greeting}</p>
          <p className="welcome-in welcome-5 mt-0.5 text-sm text-ash-400">{lines.viewing}</p>
        </div>
      </div>
    </>
  );
}

/** The seal and the two lines over the app, in and out again. Nothing else moves. */
function Card({ lines }: { readonly lines: WelcomeLines }) {
  return (
    <>
      <div className="welcome-scrim absolute inset-0 bg-void-950" />
      {/* A panel of its own: set straight on the dimmed app, the title ran through whatever
          text happened to be behind it. */}
      <div className="welcome-in relative rounded-lg border border-void-700 bg-void-900 px-10 py-9">
        <Title lines={lines} staged={false} />
      </div>
    </>
  );
}

export function Welcome({ style, leaving, leaveMs, lines, onSkip }: WelcomeProps) {
  // A custom property, so one number in `domain/welcome.ts` sets every leaving animation.
  const timing = { '--welcome-leave': `${leaveMs}ms` } as CSSProperties;

  return (
    <div
      aria-hidden
      data-style={style ?? 'cover'}
      data-leaving={leaving}
      style={timing}
      onPointerDown={onSkip}
      className={[
        'welcome-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-8',
        // Once it is leaving it is no longer in the way: the app underneath takes the click.
        leaving ? 'pointer-events-none' : '',
      ].join(' ')}
    >
      {style === null ? <div className="absolute inset-0 bg-void-950" /> : null}
      {style === 'veil' ? <Veil lines={lines} /> : null}
      {style === 'seal' ? <Seal lines={lines} /> : null}
      {style === 'card' ? <Card lines={lines} /> : null}
    </div>
  );
}
