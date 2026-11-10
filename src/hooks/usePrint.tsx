import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  bookletCover,
  buildSheet,
  imageNameOf,
  type BookletCover,
  type Sheet,
} from '../domain/sheet';
import type { Character } from '../domain/character';
import type { SavedEntity } from '../domain/entities';
import { PrintCover } from '../components/print/PrintCover';
import { PrintSheet } from '../components/print/PrintSheet';
import { readImage } from '../services/images';
import { useAnnouncer } from './useAnnouncer';
import { useClans } from './useClans';

export type Printable = SavedEntity | Character;

interface PrintContextValue {
  /**
   * Queue records and open the print dialog. Empty input is a no-op.
   *
   * `folder` titles the cover page, which only appears for more than one record.
   */
  readonly printRecords: (records: readonly Printable[], folder?: string) => void;
}

const PrintContext = createContext<PrintContextValue | null>(null);

/**
 * Printing, and therefore PDFs.
 *
 * No PDF library and no Rust: the records are rendered into a hidden container that only the
 * print stylesheet reveals, then `window.print()` opens the system dialog, where "Microsoft
 * Print to PDF" is already present on Windows. Zero dependencies, works offline, and the
 * layout is ordinary CSS we control rather than a library's idea of a document.
 *
 * The trade is that saving goes through the print dialog rather than straight to a file. A
 * direct "save as PDF" button would need a PDF dependency — worth asking for, not assuming.
 */
export function PrintProvider({ children }: { readonly children: ReactNode }) {
  const [sheets, setSheets] = useState<readonly Sheet[]>([]);
  const [cover, setCover] = useState<BookletCover | null>(null);
  const { announce } = useAnnouncer();
  // So a printed character sheet can say why its Classes are what they are.
  const { clans } = useClans();

  const printRecords = useCallback(
    (records: readonly Printable[], folder = '') => {
      if (records.length === 0) return;

      setCover(
        bookletCover(
          records,
          folder,
          new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        ),
      );

      announce(
        records.length === 1
          ? 'Opening the print dialog for one sheet.'
          : `Opening the print dialog for ${records.length} sheets.`,
      );

      // Pictures are read from disk, so building the sheets is async. A record whose image is
      // missing prints without one rather than holding up the dialog.
      void Promise.all(
        records.map(async (record) =>
          buildSheet(record, await readImage(imageNameOf(record)), clans),
        ),
      ).then((built) => {
        setSheets(built);
        // One frame so the sheets are in the DOM before the dialog snapshots the page.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.print());
        });
      });
    },
    [announce, clans],
  );

  const value = useMemo<PrintContextValue>(() => ({ printRecords }), [printRecords]);

  return (
    <PrintContext.Provider value={value}>
      {children}
      <div className="print-root" aria-hidden>
        {cover ? <PrintCover cover={cover} /> : null}
        {sheets.map((sheet) => (
          <PrintSheet key={sheet.id} sheet={sheet} />
        ))}
      </div>
    </PrintContext.Provider>
  );
}

export function usePrint(): PrintContextValue {
  // Printing is an enhancement; a missing provider must not crash a screen.
  return useContext(PrintContext) ?? { printRecords: () => undefined };
}
