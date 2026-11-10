import { useEffect, useState } from 'react';

import { useAnnouncer } from '../hooks/useAnnouncer';
import { useClans } from '../hooks/useClans';
import {
  loadTemplates,
  renderRecord,
  templateFor,
  type Exportable,
  type ExportFormat,
} from '../services/exports';
import { EXPORT_FORMAT_LABELS, EXPORT_FORMATS } from '../services/exports';

interface DiscordPreviewProps {
  readonly record: Exportable;
  readonly onClose: () => void;
  /** Which format to open on. The other is a click away. */
  readonly initialFormat?: ExportFormat;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * What the export will actually write, before it writes it.
 *
 * Renders through the very same template the export uses — `templateFor` and `renderRecord`,
 * not a second rendering path — so a preview that looks right cannot be followed by a file that
 * does not. The text is monospace and selectable because the point is to read it closely, and
 * copying it straight to the clipboard is usually what someone wants next: a posting goes into
 * a Discord channel far more often than it goes onto disk.
 *
 * Reading the user's template overrides needs Rust, so this falls back to the bundled defaults
 * when the shell is not there — a browser preview still shows something useful.
 */
export function DiscordPreview({ record, onClose, initialFormat = 'discord' }: DiscordPreviewProps) {
  const { announce } = useAnnouncer();
  const { clans } = useClans();
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setText(null);
    setError(null);

    loadTemplates()
      .then((set) => {
        if (live) setText(renderRecord(record, templateFor(record, set.templates, format), clans));
      })
      .catch((cause) => {
        if (live) setError(errorText(cause));
      });

    return () => {
      live = false;
    };
  }, [record, format, clans]);

  // Escape closes, because a preview is a glance and reaching for the mouse to end one is a
  // small tax paid every time.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      announce('Posting copied to the clipboard.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export preview"
      className="fixed inset-0 z-40 flex items-center justify-center bg-void-950/80 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-3xl flex-col rounded-lg border border-void-700 bg-void-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-void-800 px-5 py-3">
          <h2 className="mr-auto font-display text-lg text-ash-100">Export preview</h2>

          <div className="flex rounded-md border border-void-700 p-0.5">
            {EXPORT_FORMATS.map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setFormat(candidate)}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  candidate === format
                    ? 'bg-cursed-600/20 text-ash-100'
                    : 'text-ash-500 hover:text-ash-300'
                }`}
              >
                {EXPORT_FORMAT_LABELS[candidate]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void copy()}
            disabled={!text}
            className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-40"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the preview"
            className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? (
            <p className="text-xs text-blood-500">{error}</p>
          ) : (
            <pre className="select-text whitespace-pre-wrap break-words rounded-md border border-void-800 bg-void-950 px-3 py-3 font-mono text-xs leading-relaxed text-ash-200">
              {text ?? 'Rendering…'}
            </pre>
          )}
        </div>

        <footer className="border-t border-void-800 px-5 py-2.5 text-[11px] text-ash-500">
          Rendered with the same template the export writes, so what you see here is what lands
          in the file. Discord will hide anything inside <code className="text-ash-400">||</code>{' '}
          until a reader clicks it.
        </footer>
      </div>
    </div>
  );
}
