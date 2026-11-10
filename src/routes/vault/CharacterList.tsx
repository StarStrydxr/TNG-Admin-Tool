import {
  CHARACTER_KINDS,
  CHARACTER_KIND_LABELS,
  characterDisplayName,
  type Character,
  type CharacterKind,
} from '../../domain/character';
import { LISTED_GRADE_IDS, gradeAbbrev, gradeLabel, type GradeId } from '../../domain/grades';
import {
  distinctValues,
  isVaultFilterActive,
  type VaultFilter,
} from '../../domain/character-search';

interface CharacterListProps {
  readonly characters: readonly Character[];
  readonly selectedId: string | null;
  readonly kind: CharacterKind;
  readonly loading: boolean;
  readonly onSelect: (id: string) => void;
  readonly onKindChange: (kind: CharacterKind) => void;
  readonly onCreate: () => void;
  readonly onImport: () => void;
  readonly onReveal: () => void;
  readonly filter: VaultFilter;
  readonly onFilterChange: (filter: VaultFilter) => void;
  /** Before filtering — the dropdowns offer what exists, and the count says what was hidden. */
  readonly total: number;
  readonly all: readonly Character[];
}

export function CharacterList({
  characters,
  selectedId,
  kind,
  loading,
  onSelect,
  onKindChange,
  onCreate,
  onImport,
  onReveal,
  filter,
  onFilterChange,
  total,
  all,
}: CharacterListProps) {
  const factions = distinctValues(all, (character) => character.faction);
  const clans = distinctValues(all, (character) => character.clan);
  const narrowed = isVaultFilterActive(filter);

  const set = (change: Partial<VaultFilter>) => onFilterChange({ ...filter, ...change });

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3">
      <div className="flex rounded-md border border-void-700 p-0.5">
        {CHARACTER_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onKindChange(option)}
            className={[
              'flex-1 rounded px-2 py-1 text-xs transition-colors',
              option === kind ? 'bg-void-700 text-ash-100' : 'text-ash-500 hover:text-ash-300',
            ].join(' ')}
          >
            {CHARACTER_KIND_LABELS[option]}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-cursed-600/25"
      >
        New {kind === 'pc' ? 'character' : 'NPC'}
      </button>

      <button
        type="button"
        onClick={onImport}
        title="Paste a submitted sheet in the server's format"
        className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
      >
        Import a sheet
      </button>

      <div className="flex flex-col gap-2 border-t border-void-800 pt-3">
        <input
          type="search"
          value={filter.query}
          onChange={(event) => set({ query: event.target.value })}
          placeholder="Search"
          aria-label="Search characters"
          className="w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filter.grade}
            onChange={(event) => set({ grade: event.target.value as GradeId | '' })}
            aria-label="Filter by grade"
            className="min-w-0 rounded-md border border-void-700 bg-void-850 px-1.5 py-1 text-xs text-ash-300 outline-none focus:border-cursed-500"
          >
            <option value="">Any grade</option>
            {LISTED_GRADE_IDS.map((id) => (
              <option key={id} value={id}>
                {gradeLabel(id)}
              </option>
            ))}
          </select>

          <select
            value={filter.faction}
            onChange={(event) => set({ faction: event.target.value })}
            aria-label="Filter by faction"
            className="min-w-0 rounded-md border border-void-700 bg-void-850 px-1.5 py-1 text-xs text-ash-300 outline-none focus:border-cursed-500"
          >
            <option value="">Any faction</option>
            {factions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={filter.clan}
            onChange={(event) => set({ clan: event.target.value })}
            aria-label="Filter by clan"
            className="col-span-2 min-w-0 rounded-md border border-void-700 bg-void-850 px-1.5 py-1 text-xs text-ash-300 outline-none focus:border-cursed-500"
          >
            <option value="">Any clan</option>
            {clans.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-ash-500">
          <input
            type="checkbox"
            checked={filter.withPortrait}
            onChange={(event) => set({ withPortrait: event.target.checked })}
            className="accent-cursed-500"
          />
          Has a portrait
        </label>

        {narrowed ? (
          <p className="flex items-center justify-between gap-2 text-[11px] text-ash-500">
            <span>
              {characters.length} of {total}
            </span>
            <button
              type="button"
              onClick={() => onFilterChange({ query: '', grade: '', faction: '', clan: '', withPortrait: false })}
              className="rounded px-1.5 py-0.5 transition-colors hover:bg-void-800 hover:text-ash-300"
            >
              Clear
            </button>
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-1 py-3 text-xs text-ash-500">Loading…</p>
        ) : characters.length === 0 ? (
          <p className="rounded-md border border-dashed border-void-700 px-3 py-6 text-center text-xs text-ash-500">
            {narrowed ? 'Nothing matches that.' : 'Nothing here yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {characters.map((character) => {
              const active = character.id === selectedId;
              return (
                <li key={character.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(character.id)}
                    className={[
                      'w-full rounded-md px-3 py-2 text-left transition-colors',
                      active
                        ? 'bg-void-700 text-ash-100'
                        : 'text-ash-400 hover:bg-void-800 hover:text-ash-300',
                    ].join(' ')}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm">{characterDisplayName(character)}</span>
                      <code className="shrink-0 font-mono text-[11px] text-cursed-400">
                        {gradeAbbrev(character.grade)}
                      </code>
                    </span>
                    {character.affiliation ? (
                      <span className="mt-0.5 block truncate text-xs text-ash-500">
                        {character.affiliation}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onReveal}
        className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
        title="These records are plain JSON files you can edit by hand"
      >
        Open data folder
      </button>
    </aside>
  );
}
