import { useState } from 'react';

import { GradeLadderReference } from '../../components/GradeLadderReference';
import { CharacterList } from './CharacterList';
import { ImportSheet } from './ImportSheet';
import { CharacterSheet } from './CharacterSheet';
import { useVault } from './useVault';

export function VaultPage() {
  const vault = useVault();
  const [importing, setImporting] = useState(false);

  return (
    <div className="flex gap-8">
      <CharacterList
        characters={vault.characters}
        selectedId={vault.selectedId}
        kind={vault.kind}
        loading={vault.loading}
        onSelect={vault.select}
        onKindChange={vault.setKind}
        onCreate={vault.create}
        onImport={() => setImporting(true)}
        onReveal={() => void vault.reveal()}
        filter={vault.filter}
        onFilterChange={vault.setFilter}
        total={vault.allCharacters.length}
        all={vault.allCharacters}
      />

      {importing ? (
        <ImportSheet
          onImport={vault.createFromImport}
          onClose={() => setImporting(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {vault.error ? (
          <div className="flex items-start justify-between gap-4 rounded-md border border-blood-500/40 bg-blood-500/10 px-4 py-3">
            <p className="text-sm text-ash-300">{vault.error}</p>
            <button
              type="button"
              onClick={vault.dismissError}
              className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {vault.skipped.length > 0 ? (
          <div className="rounded-md border border-void-700 bg-void-900 px-4 py-3">
            <p className="text-sm text-ash-300">
              {vault.skipped.length} file{vault.skipped.length === 1 ? '' : 's'} could not be read
              and {vault.skipped.length === 1 ? 'was' : 'were'} skipped.
            </p>
            <ul className="mt-2 space-y-0.5">
              {vault.skipped.map((entry) => (
                <li key={entry.file} className="font-mono text-xs text-ash-500">
                  {entry.file} — {entry.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {vault.draft ? (
          <CharacterSheet
            character={vault.draft}
            dirty={vault.dirty}
            saving={vault.saving}
            onChange={vault.patch}
            onSave={() => void vault.save()}
            onDelete={() => void vault.remove()}
            onUndo={vault.undo}
            onRedo={vault.redo}
            canUndo={vault.canUndo}
            canRedo={vault.canRedo}
          />
        ) : (
          <div className="flex flex-col gap-8">
            <div className="rounded-lg border border-dashed border-void-700 px-6 py-12 text-center">
              <p className="text-sm text-ash-400">Select a record, or create one.</p>
              <p className="mx-auto mt-2 max-w-sm text-xs text-ash-500">
                Each character is a JSON file on disk you can open and edit by hand. Stats start
                at Class 3 of the character's grade; traits and defects are yours to apply.
              </p>
            </div>
            <GradeLadderReference />
          </div>
        )}
      </div>
    </div>
  );
}
