import { useMemo, useState } from 'react';

import { importCharacterSheet } from '../../domain/oc-import';
import { gradeLabel } from '../../domain/grades';
import type { Character } from '../../domain/character';
import { useAnnouncer } from '../../hooks/useAnnouncer';

interface ImportSheetProps {
  readonly onImport: (patch: Partial<Character>) => void;
  readonly onClose: () => void;
}

const PLACEHOLDER = `⋙《 Walker Masami (Wally) 》

«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»
Name: Walker Masami
Age: 17
…`;

/**
 * Paste a submitted sheet, see what the app understood, then create the character.
 *
 * The review step is the point. An importer that silently produced a character would be
 * trusted until the day it quietly dropped half a sheet; showing the matched and unmatched
 * labels side by side makes a misread obvious before anything is saved — and the result lands
 * as an unsaved draft, so even approving it is not yet a commitment.
 */
export function ImportSheet({ onImport, onClose }: ImportSheetProps) {
  const { announce } = useAnnouncer();
  const [text, setText] = useState('');

  const result = useMemo(() => (text.trim() ? importCharacterSheet(text) : null), [text]);

  function create() {
    if (!result) return;
    onImport(result.patch);
    announce(`Imported ${result.matched.length} fields from the pasted sheet.`);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import a character sheet"
      className="fixed inset-0 z-40 flex items-center justify-center bg-void-950/80 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-4xl flex-col rounded-lg border border-void-700 bg-void-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-void-800 px-5 py-3">
          <h2 className="mr-auto font-display text-lg text-ash-100">Import a sheet</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
          >
            Close
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-5 overflow-y-auto p-5">
          <label className="flex min-h-0 flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-ash-400">
              Paste the submission
            </span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              rows={22}
              className="w-full flex-1 resize-none rounded-md border border-void-700 bg-void-850 px-2.5 py-2 font-mono text-xs leading-relaxed text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
            />
          </label>

          <div className="flex min-h-0 flex-col">
            {!result ? (
              <p className="text-xs leading-relaxed text-ash-500">
                Paste a sheet in the server&rsquo;s own format — the{' '}
                <code className="text-ash-400">«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»</code> headings and all — and what the
                app reads out of it appears here before anything is created. The two{' '}
                <em>Affiliation</em> lines are told apart by the section they sit under, so the
                school and the side land in different fields.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-ash-400">
                  {result.matched.length} field{result.matched.length === 1 ? '' : 's'} read
                  {result.grade ? ` · ${gradeLabel(result.grade)}` : ' · no grade found'}
                  {result.unmatched.length > 0
                    ? ` · ${result.unmatched.length} not recognised`
                    : ''}
                </p>

                <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {result.matched.map((field, index) => (
                    <li
                      key={`${field.label}-${index}`}
                      className="flex gap-2 border-b border-void-850 py-1 text-xs last:border-0"
                    >
                      <span className="w-36 shrink-0 truncate text-ash-500">{field.label}</span>
                      <span className="min-w-0 flex-1 truncate text-ash-200">{field.value}</span>
                    </li>
                  ))}
                </ul>

                {result.unmatched.length > 0 ? (
                  <div className="mt-3 rounded-md border border-void-700 bg-void-850 px-3 py-2">
                    <p className="text-xs text-ash-400">
                      Not recognised — left for you to place by hand:
                    </p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {result.unmatched.map((field, index) => (
                        <li key={`${field.label}-${index}`} className="text-xs text-ash-500">
                          <span className="text-ash-400">{field.label}</span> — {field.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-3 border-t border-void-800 px-5 py-3">
          <p className="mr-auto text-[11px] text-ash-500">
            Creates an unsaved draft — nothing reaches the disk until you save it.
          </p>
          <button
            type="button"
            disabled={!result || result.matched.length === 0}
            onClick={create}
            className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-40"
          >
            Create character
          </button>
        </footer>
      </div>
    </div>
  );
}
