import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** What failed, in the user's words — "the Card panel", "the Character Vault". */
  readonly what: string;
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
}

/**
 * A crash in one part of the screen should cost you that part, not the whole app.
 *
 * ⚠️ React unmounts the entire tree when a render throws and nothing catches it, so one bad
 * section takes the sidebar, the record and everything else with it — the window goes empty and
 * says nothing about why. That happened: a sheet went blank and the only thing left was the
 * background image. With no boundary there is no message, no stack and nothing to act on.
 *
 * This is the same bargain `tables.rs` already makes for a malformed user table (CLAUDE.md §5):
 * degrade to "this one was skipped", never to a blank app. The error text is shown rather than
 * swallowed, because the first question is always *what* broke.
 *
 * A class component deliberately — `componentDidCatch` has no hook equivalent, and this is the
 * one exception to the function-components rule in §9.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Goes to the devtools console, where the component stack is readable.
    console.error(`[${this.props.what}] crashed`, error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <section className="rounded-lg border border-blood-500/40 bg-blood-500/5 p-5">
        <h2 className="font-display text-base text-ash-100">{this.props.what} could not load</h2>
        <p className="mt-1 text-xs leading-relaxed text-ash-400">
          The rest of the app is unaffected. Your data on disk has not been touched — nothing is
          saved until you press Save.
        </p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded border border-void-700 bg-void-950 p-3 text-[11px] leading-relaxed text-ash-300">
          {error.message || String(error)}
        </pre>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-3 rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-300 transition-colors hover:border-cursed-500 hover:text-ash-100"
        >
          Try again
        </button>
      </section>
    );
  }
}
