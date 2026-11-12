import { kanjiOf } from '../../domain/shell';
import { ROLE_LABELS } from '../../domain/roles';
import { useSettings } from '../../hooks/useSettings';
import {
  FOOTER_MODULES,
  MODULE_GROUPS,
  markFor,
  modulesIn,
  type ModuleDefinition,
  type ModuleId,
} from '../../routes/modules';
import { JujutsuIcon } from '../brand/JujutsuIcon';
import { BrushRule, SealMark } from '../brand/SealMark';
import { ErrorBoundary } from '../ErrorBoundary';
import { ShellStatus } from '../ShellStatus';
import type { ShellProps } from './props';

/**
 * The Jujutsu interface: the registry of an institution, rather than a list beside a page.
 *
 * - **The sidebar is a board of plaques.** Each page is a tag with its stamped icon and its
 *   kanji; the one you are on is turned over, paper side out. The board folds down to its
 *   icons, which is the thing the Classic sidebar could never do — it had none.
 * - **Every page opens on a title card**: its kanji on a paper nameplate, its name beside it,
 *   and the rank you are viewing as, stamped in the corner where it cannot be missed before a
 *   window is shared (CLAUDE.md §4a).
 *
 * Tokens only (§9). Vermilion marks three things and nothing else: the seal (whose registry
 * this is), the edge of the open plaque (where you are), and the rank stamp (who you are
 * viewing as).
 */

interface PlaqueProps {
  readonly module: ModuleDefinition;
  readonly active: boolean;
  readonly folded: boolean;
  readonly onSelect: (id: ModuleId) => void;
}

function Plaque({ module, active, folded, onSelect }: PlaqueProps) {
  const mark = markFor(module.id);

  return (
    <button
      type="button"
      onClick={() => onSelect(module.id)}
      aria-current={active ? 'page' : undefined}
      // Folded, the icon is all there is — so it has to carry the name itself.
      aria-label={folded ? module.label : undefined}
      title={folded ? module.label : undefined}
      className={[
        'group flex w-full items-center gap-2.5 border-l-2 py-1 text-left text-sm transition-colors',
        folded ? 'justify-center' : 'pl-2 pr-2.5',
        active
          ? 'border-blood-500 bg-ash-100 text-void-950'
          : 'border-transparent text-ash-400 hover:bg-void-800 hover:text-ash-100',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-7 w-7 shrink-0 place-items-center border',
          active ? 'border-void-950/30' : 'border-void-600 bg-void-850',
        ].join(' ')}
      >
        <JujutsuIcon id={mark.icon} className="h-4 w-4" />
      </span>
      {folded ? null : (
        <>
          <span className="min-w-0 flex-1 truncate">{module.label}</span>
          <span
            aria-hidden
            lang="ja"
            title={mark.reading}
            className={['font-display text-xs', active ? 'text-void-950/70' : 'text-ash-500'].join(' ')}
          >
            {mark.kanji}
          </span>
        </>
      )}
    </button>
  );
}

interface FoldButtonProps {
  readonly folded: boolean;
  readonly onToggle: () => void;
}

function FoldButton({ folded, onToggle }: FoldButtonProps) {
  const label = folded ? 'Unfold the sidebar' : 'Fold the sidebar down to its icons';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!folded}
      aria-controls="jj-board"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center text-ash-500 transition-colors hover:bg-void-800 hover:text-ash-300"
    >
      <svg
        viewBox="0 0 16 16"
        className={['h-3.5 w-3.5', folded ? 'rotate-180' : ''].join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        <path d="M8.5 3.5 4 8l4.5 4.5M12.5 3.5 8 8l4.5 4.5" />
      </svg>
    </button>
  );
}

interface RankStampProps {
  readonly onOpen: () => void;
}

/**
 * Which rank's records are on screen, as the stamp it would be on the paperwork.
 *
 * ⚠️ "Viewing as", never "signed in as" (§4a) — and the tooltip says the rest. It is a button
 * because the next thing anyone wants after reading it is to change it.
 */
function RankStamp({ onOpen }: RankStampProps) {
  const { settings } = useSettings();

  return (
    <button
      type="button"
      onClick={onOpen}
      title="A view filter, not a lock. Change it in Settings."
      className="shrink-0 border-2 border-blood-500 bg-void-950 p-0.5 text-left transition-opacity hover:opacity-80"
    >
      <span className="block border border-blood-500/60 px-3 py-1">
        <span className="block text-xs leading-tight text-ash-400">Viewing as</span>
        <span className="block font-display text-base leading-tight text-ash-100">
          {ROLE_LABELS[settings.role]}
        </span>
      </span>
    </button>
  );
}

export function JujutsuShell({ activeId, active, onSelect, children }: ShellProps) {
  const { settings, setShell } = useSettings();
  const folded = settings.shell.railCollapsed;
  const mark = markFor(active.id);

  return (
    <div className="flex h-full">
      <nav
        id="jj-board"
        aria-label="Modules"
        className={[
          'flex shrink-0 flex-col border-r border-void-700 bg-void-900',
          // Unfolded, the same width as the Classic sidebar — so a page has exactly the room
          // it had, and nothing that fitted there is squeezed here.
          folded ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        {/* 次世代 — the server's own name — as its seal. */}
        <div
          className={[
            'flex items-center gap-3 border-b border-void-700 py-3',
            folded ? 'justify-center' : 'px-4',
          ].join(' ')}
        >
          <SealMark
            className={['w-auto shrink-0 -rotate-2 text-blood-500', folded ? 'h-12' : 'h-14'].join(' ')}
          />
          {folded ? null : (
            <div className="min-w-0">
              <div className="font-display text-lg leading-tight text-ash-100">
                The Next Generation
              </div>
              <div className="mt-1 text-xs leading-tight text-ash-500">GM and Admin Tool</div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {MODULE_GROUPS.map((group) => (
            <div key={group.id}>
              {folded ? (
                <BrushRule className="mx-auto mb-2 mt-3 h-1 w-8 text-void-600" />
              ) : (
                <p className="flex items-center gap-2 px-1 pb-1 pt-3 text-xs text-ash-500">
                  {group.label}
                  <BrushRule className="h-1 min-w-0 flex-1 text-void-700" />
                </p>
              )}
              <ul aria-label={group.label} className="flex flex-col gap-0.5">
                {modulesIn(group.id).map((module) => (
                  <li key={module.id}>
                    <Plaque
                      module={module}
                      active={module.id === activeId}
                      folded={folded}
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Settings and the fold: side by side on the board, stacked on the rail. A row each
            would be one row too many — the whole board has to fit the default window. */}
        <div
          className={[
            'flex gap-1 border-t border-void-800 p-2',
            folded ? 'flex-col items-center' : 'items-center',
          ].join(' ')}
        >
          <ul className="min-w-0 flex-1 self-stretch">
            {FOOTER_MODULES.map((module) => (
              <li key={module.id}>
                <Plaque
                  module={module}
                  active={module.id === activeId}
                  folded={folded}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
          <FoldButton folded={folded} onToggle={() => setShell({ railCollapsed: !folded })} />
        </div>

        <ShellStatus compact={folded} />
      </nav>

      <main className="flex-1 overflow-y-auto">
        <header className="relative px-8 pt-6">
          {/* Screentone, fading out toward the title. Decoration, and behind everything. */}
          <div
            aria-hidden
            className="jj-halftone pointer-events-none absolute inset-y-0 right-0 w-3/5"
          />
          <div className="relative flex items-center gap-5">
            {/* The page's name as it would be lettered on its file: top to bottom, ink on paper. */}
            <div
              aria-hidden
              lang="ja"
              title={mark.reading}
              className="flex shrink-0 flex-col items-center bg-ash-100 px-2 py-2 font-display text-3xl leading-none text-void-950"
            >
              {kanjiOf(mark).map((character) => (
                <span key={character}>{character}</span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl leading-tight text-ash-100">{active.label}</h1>
              <p className="mt-1 text-sm text-ash-500">{active.blurb}</p>
            </div>
            <RankStamp onOpen={() => onSelect('settings')} />
          </div>
          <BrushRule className="relative mt-5 h-1.5 w-full text-void-600" />
        </header>
        {/* Keyed on the module, so moving to another one clears a crash rather than
            stranding you on the error (CLAUDE.md §9). */}
        <div className="px-8 py-7">
          <ErrorBoundary key={active.id} what={active.label}>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
