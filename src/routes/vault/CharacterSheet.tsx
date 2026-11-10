import { useEffect, useState } from 'react';

import { characterDisplayName, type Character } from '../../domain/character';
import { formatStatShort } from '../../domain/grades';
import { ExportFormatPicker } from '../../components/ExportFormatPicker';
import { UndoRedo } from '../../components/form/UndoRedo';
import { useExport } from '../../hooks/useExport';
import { usePrint } from '../../hooks/usePrint';
import { BuildSection } from './sections/BuildSection';
import { IdentitySection } from './sections/IdentitySection';
import { LinksSection } from './sections/LinksSection';
import { MissionLogSection } from './sections/MissionLogSection';
import { PersonalSection } from './sections/PersonalSection';
import { ProfileSection } from './sections/ProfileSection';
import { StatsSection } from './sections/StatsSection';
import { TechniqueSection } from './sections/TechniqueSection';

interface CharacterSheetProps {
  readonly character: Character;
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly onChange: (patch: Partial<Character>) => void;
  readonly onSave: () => void;
  readonly onDelete: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

export function CharacterSheet({
  character,
  dirty,
  saving,
  onChange,
  onSave,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CharacterSheetProps) {
  const { printRecords } = usePrint();
  const exporter = useExport();

  // Two-step delete rather than a native confirm(), which blocks the webview.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => setConfirmingDelete(false), [character.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (dirty && !saving) onSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirty, saving, onSave]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <header className="flex items-start justify-between gap-4 border-b border-void-800 pb-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl text-ash-100">
            {characterDisplayName(character)}
          </h2>
          <p className="mt-1 font-mono text-xs text-ash-500">
            {formatStatShort({
              kind: 'graded',
              grade: character.grade,
              classRank: 3,
            })}{' '}
            baseline
            {character.origin ? ` · generated from seed ${character.origin.seed}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <UndoRedo onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} />
          <ExportFormatPicker value={exporter.format} onChange={exporter.setFormat} />
          {dirty ? (
            <span className="text-xs text-ash-500" title="Ctrl+S also saves">
              Unsaved
            </span>
          ) : null}
          <button
            type="button"
            disabled={exporter.busy}
            onClick={() => void exporter.exportRecords([character])}
            title="Writes a markdown file into the exports folder"
            className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:opacity-40"
          >
            {exporter.busy ? 'Exporting…' : 'Export'}
          </button>
          <button
            type="button"
            onClick={() => printRecords([character])}
            title={
              dirty
                ? 'Unsaved edits are included — the sheet prints what is on screen'
                : 'Opens the print dialog — choose Microsoft Print to PDF to save a file'
            }
            className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:cursor-not-allowed disabled:border-void-700 disabled:bg-transparent disabled:text-ash-500"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md border border-blood-500 bg-blood-500/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-blood-500/25"
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md px-2 py-1.5 text-sm text-ash-500 hover:text-ash-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-500 transition-colors hover:border-blood-500 hover:text-blood-500"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-5 pb-8">
        <IdentitySection character={character} onChange={onChange} />
        <PersonalSection character={character} onChange={onChange} />
        <ProfileSection character={character} onChange={onChange} />
        <StatsSection character={character} onChange={onChange} />
        <BuildSection character={character} onChange={onChange} />
        <TechniqueSection character={character} onChange={onChange} />
        <LinksSection character={character} onChange={onChange} />
        <MissionLogSection character={character} onChange={onChange} />
      </div>
    </div>
  );
}
