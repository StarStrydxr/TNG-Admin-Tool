import { useCallback, useEffect, useState } from 'react';

import {
  exportRecord,
  loadTemplates,
  revealExportsFolder,
  revealTemplatesFolder,
  type Exportable,
  type ExportFormat,
  type TemplateSet,
} from '../services/exports';
import { useAnnouncer } from './useAnnouncer';
import { useClans } from './useClans';
import { useSettings } from './useSettings';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Markdown export, shared by every surface that offers it.
 *
 * Templates load once per mounting and are reread on demand, so editing one in Notepad takes
 * effect without restarting the app.
 */
export function useExport() {
  const { announce } = useAnnouncer();
  // Where exports land, if the user has nominated a folder of their own.
  const { settings } = useSettings();
  // A character's clan bonus and mutation lines are resolved against the saved clans.
  const { clans } = useClans();
  const destination = settings.exportDirectory;
  const [set, setSet] = useState<TemplateSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState('');

  const refresh = useCallback(async () => {
    try {
      setSet(await loadTemplates());
    } catch (cause) {
      setError(errorText(cause));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Export a batch. Templates are reloaded first so a template edited a moment ago is the one
   * that gets used.
   */
  /**
   * Which template set the next export uses. Remembered for the session but not persisted —
   * the choice belongs to what is being exported right now, and defaulting to readable
   * markdown is the safer surprise.
   */
  const [format, setFormat] = useState<ExportFormat>('plain');

  const exportRecords = useCallback(
    async (records: readonly Exportable[], using: ExportFormat = format) => {
      if (records.length === 0) return;
      setBusy(true);
      setError(null);

      try {
        const current = await loadTemplates();
        setSet(current);

        let last = '';
        for (const record of records) {
          const result = await exportRecord(
            record,
            current.templates,
            destination,
            using,
            clans,
          );
          last = result.path;
        }

        setLastPath(last);
        const what = using === 'discord' ? 'Discord-format' : 'markdown';
        announce(
          records.length === 1
            ? `Exported one ${what} file.`
            : `Exported ${records.length} ${what} files.`,
        );
      } catch (cause) {
        setError(errorText(cause));
      } finally {
        setBusy(false);
      }
    },
    [announce, clans, destination, format],
  );

  return {
    templates: set,
    format,
    setFormat,
    busy,
    error,
    dismissError: useCallback(() => setError(null), []),
    lastPath,
    exportRecords,
    refresh,
    revealExports: useCallback(async () => {
      try {
        await revealExportsFolder(destination);
      } catch (cause) {
        setError(errorText(cause));
      }
    }, [destination]),
    revealTemplates: useCallback(async () => {
      try {
        await revealTemplatesFolder();
      } catch (cause) {
        setError(errorText(cause));
      }
    }, []),
  };
}
