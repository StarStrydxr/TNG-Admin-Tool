/**
 * The state behind a card: what it looks like, and getting it onto disk.
 *
 * One hook for all three kinds. It takes the record and works out the rest — which layout, which
 * style, which folder — so the character sheet, the clan editor and the mission surfaces each
 * mount the same panel with no arguments beyond the record itself.
 *
 * The preview and the export are the same document. The panel renders the SVG string inline and
 * the export writes that same string, or rasterizes it — so a preview that looks right cannot be
 * followed by a file that does not, which is the bargain `DiscordPreview` already makes for
 * markdown (CLAUDE.md §9).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  approximateMeasurer,
  defaultBlocks,
  defaultCardOptions,
  presetById,
  presetsForKind,
  tone,
  type CardBlock,
  type CardOptions,
  type CardPreset,
} from '../domain/card';
import { cardFontStacks, cardTokens, type CardKind } from '../domain/card-style';
import {
  cardFileStem,
  cardKindOf,
  cardSubjectFolder,
  renderCard,
  type CardSubject,
} from '../domain/card-render';
import { isCharacter } from '../domain/sheet';
import {
  canvasMeasurer,
  cardBytes,
  embeddedFontCss,
  writeCard,
  type CardFormat,
} from '../services/cards';
import { revealExportsFolder } from '../services/exports';
import { readImage } from '../services/images';
import { useAnnouncer } from './useAnnouncer';
import { useSettings } from './useSettings';

export interface CardState {
  readonly kind: CardKind;
  readonly options: CardOptions;
  readonly setOptions: (patch: Partial<CardOptions>) => void;
  readonly toggleBlock: (block: CardBlock) => void;
  /** The document, ready to render inline or write out. */
  readonly svg: string;
  readonly width: number;
  readonly height: number;
  readonly presets: readonly CardPreset[];
  readonly allowedBlocks: readonly CardBlock[];
  readonly exportCard: (format: CardFormat) => Promise<void>;
  /**
   * Where the last card went.
   *
   * ⚠️ Load-bearing, not a nicety. The first version confirmed a write with `announce()`
   * alone, which goes to the ARIA live region and is invisible to anyone looking at the
   * screen — so a successful export and a dead button looked exactly the same.
   */
  readonly lastPath: string;
  readonly revealFolder: () => Promise<void>;
  readonly busy: boolean;
  readonly error: string;
}

export function useCard(subject: CardSubject): CardState {
  // ⚠️ Unreachable from the app's own code: the vault renders a sheet only when it has a
  // draft, and the library passes the entity it is showing. It *was* reachable when this
  // prop was renamed `character` → `subject` and only one of the two files involved reached
  // the target machine, leaving an old parent talking to a new child. A bare "Cannot read
  // properties of undefined (reading 'kind')" thirty frames down cost an evening; a sentence
  // naming the shape of the problem is what a guard at an entry point is for.
  if (!subject) {
    throw new Error(
      'The card panel was given no record. Whatever mounted it passed nothing — most likely ' +
        'the files that mount it and the panel itself are from different versions.',
    );
  }

  const { settings } = useSettings();
  const { announce } = useAnnouncer();

  const kind = cardKindOf(subject);
  const style = settings.cardStyles[kind];

  const [options, setAll] = useState<CardOptions>(() => defaultCardOptions(kind));
  const [portrait, setPortrait] = useState('');
  const [fontFaceCss, setFontFaceCss] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastPath, setLastPath] = useState('');

  const fonts = useMemo(() => cardFontStacks(style.fonts), [style.fonts]);
  const imageName = isCharacter(subject) ? subject.portrait : subject.image;

  // The picture is read once per name. A missing file is a gap, never an error (§9).
  useEffect(() => {
    let cancelled = false;
    if (!imageName) {
      setPortrait('');
      return;
    }
    void readImage(imageName).then((url) => {
      if (!cancelled) setPortrait(url ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [imageName]);

  // Only ever non-empty when a slot uses one of the two vendored faces — see `services/cards.ts`.
  useEffect(() => {
    let cancelled = false;
    void embeddedFontCss(style.fonts).then((css) => {
      if (!cancelled) setFontFaceCss(css);
    });
    return () => {
      cancelled = true;
    };
  }, [style.fonts]);

  const tokens = useMemo(
    () => cardTokens(style, settings.theme.seed, settings.appearance.highContrast),
    [style, settings.theme.seed, settings.appearance.highContrast],
  );

  // Exact widths where a canvas exists, the deterministic approximation where one does not —
  // a plain `npm run dev` tab, or a test.
  const measure = useMemo(
    () => (typeof document === 'undefined' ? approximateMeasurer() : canvasMeasurer(fonts)),
    [fonts],
  );

  const preset = presetById(options.presetId);
  const allowedBlocks = defaultBlocks(kind, options.presetId);

  const svg = useMemo(
    () => renderCard({ subject, options, tokens, measure, portrait, fonts, fontFaceCss }),
    [subject, options, tokens, measure, portrait, fonts, fontFaceCss],
  );

  const setOptions = useCallback(
    (patch: Partial<CardOptions>) => {
      setAll((current) => {
        const next = { ...current, ...patch };
        // Switching preset resets which blocks are on, because the shapes carry different sets
        // and a block held over from the other one would simply not draw.
        return patch.presetId && patch.presetId !== current.presetId
          ? { ...next, blocks: defaultBlocks(kind, patch.presetId) }
          : next;
      });
    },
    [kind],
  );

  const toggleBlock = useCallback((block: CardBlock) => {
    setAll((current) => ({
      ...current,
      blocks: current.blocks.includes(block)
        ? current.blocks.filter((item) => item !== block)
        : [...current.blocks, block],
    }));
  }, []);

  const exportCard = useCallback(
    async (format: CardFormat) => {
      setBusy(true);
      setError('');
      setLastPath('');
      try {
        const bytes = await cardBytes({
          svg,
          width: preset.width,
          height: preset.height,
          scale: options.scale,
          background: tone(tokens, 'void-950'),
          format,
        });
        const path = await writeCard({
          folder: cardSubjectFolder(subject),
          stem: cardFileStem(subject, options),
          format,
          bytes,
          destination: settings.exportDirectory,
        });
        setLastPath(path);
        announce(`Card written to ${path}`);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(message);
        announce(`The card could not be written. ${message}`);
      } finally {
        setBusy(false);
      }
    },
    [svg, preset, options, tokens, subject, settings.exportDirectory, announce],
  );

  return {
    kind,
    options,
    setOptions,
    toggleBlock,
    svg,
    width: preset.width,
    height: preset.height,
    presets: presetsForKind(kind),
    allowedBlocks,
    exportCard,
    lastPath,
    revealFolder: useCallback(
      () => revealExportsFolder(settings.exportDirectory),
      [settings.exportDirectory],
    ),
    busy,
    error,
  };
}
