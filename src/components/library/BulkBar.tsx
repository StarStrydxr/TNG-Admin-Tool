import { useState } from 'react';

import { ROLE_LABELS, assignableRoles, type Role } from '../../domain/roles';
import type { SavedEntity } from '../../domain/entities';

interface BulkBarProps {
  readonly marked: readonly SavedEntity[];
  readonly viewer: Role;
  readonly onClear: () => void;
  readonly onMarkAll: () => void;
  readonly onRefile: (folder: string) => void;
  readonly onRerank: (minRole: Role) => void;
  readonly onExport: () => void;
  readonly onPrint: () => void;
  readonly onDelete: () => void;
  readonly busy: boolean;
}

/**
 * Act on several records at once.
 *
 * Appears only when something is ticked, because a permanently visible bar of destructive
 * buttons is a hazard rather than a feature. Delete asks twice — bulk deletion is the one
 * action here with no undo, and `backup.rs` is not a substitute for not doing it by accident.
 *
 * Everything it acts on is the *shown* selection, which is already rank-filtered, so a bulk
 * action can never touch a record the viewer is not allowed to see (CLAUDE.md §4a).
 */
export function BulkBar({
  marked,
  viewer,
  onClear,
  onMarkAll,
  onRefile,
  onRerank,
  onExport,
  onPrint,
  onDelete,
  busy,
}: BulkBarProps) {
  const [folder, setFolder] = useState('');
  const [confirming, setConfirming] = useState(false);

  if (marked.length === 0) return null;

  return (
    <div className="mt-3 rounded-md border border-cursed-600/50 bg-void-850 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ash-300">
          {marked.length} selected
        </span>
        <button
          type="button"
          onClick={onMarkAll}
          className="rounded px-1.5 py-0.5 text-[11px] text-ash-500 transition-colors hover:bg-void-800 hover:text-ash-300"
        >
          Select all shown
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onClear();
          }}
          className="rounded px-1.5 py-0.5 text-[11px] text-ash-500 transition-colors hover:bg-void-800 hover:text-ash-300"
        >
          Clear
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          placeholder="Move to folder…"
          aria-label="Move the selection to a folder"
          className="w-40 rounded-md border border-void-700 bg-void-900 px-2 py-1 text-xs text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onRefile(folder.trim());
            setFolder('');
          }}
          className="rounded-md border border-void-700 px-2 py-1 text-[11px] text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-40"
          title="Moves the files on disk, as a single-record move does"
        >
          Move
        </button>

        <select
          defaultValue=""
          disabled={busy}
          onChange={(event) => {
            if (event.target.value) onRerank(event.target.value as Role);
            event.target.value = '';
          }}
          aria-label="Set visibility for the selection"
          className="rounded-md border border-void-700 bg-void-900 px-1.5 py-1 text-[11px] text-ash-400 outline-none focus:border-cursed-500"
        >
          <option value="">Visible to…</option>
          {assignableRoles(viewer).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]} and above
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={busy}
          onClick={onExport}
          className="rounded-md border border-void-700 px-2 py-1 text-[11px] text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-40"
        >
          Export
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-md border border-void-700 px-2 py-1 text-[11px] text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
        >
          Print
        </button>

        {confirming ? (
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-blood-500">Delete {marked.length}?</span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
              className="rounded-md border border-blood-600 px-2 py-1 text-[11px] text-blood-500 transition-colors hover:bg-blood-500/10"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-void-700 px-2 py-1 text-[11px] text-ash-400 transition-colors hover:border-void-600"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="ml-auto rounded-md border border-void-700 px-2 py-1 text-[11px] text-ash-500 transition-colors enabled:hover:border-blood-600 enabled:hover:text-blood-500 disabled:opacity-40"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
