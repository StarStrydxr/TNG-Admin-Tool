import { Insignia } from '../../components/Insignia';
import { RARITIES, rarityCost, rarityLabel, type TraitKind } from '../../domain/traits';
import { useTraitVault } from './useTraitVault';
import { TraitCard } from './TraitCard';
import { TraitEditor, type EditorCopy } from './TraitEditor';
interface BoardProps {
  readonly kind: TraitKind;
}

/** What the two boards say about themselves. The only difference between them. */
const COPY: Record<
  TraitKind,
  EditorCopy & {
    readonly heading: string;
    readonly blurb: string;
    readonly empty: string;
  }
> = {
  trait: {
    heading: 'Traits',
    blurb: 'Perks a character can take, with what each one costs and what it moves.',
    empty:
      'Nothing here yet. A trait is a description plus its named bonuses and drawbacks, the ' +
      'way the server writes them. Written once here, it can be put on any sheet.',
    namePlaceholder: 'Eccentric Genius',
    descriptionPlaceholder:
      "With your 530,000 IQ, you're by far one of the quickest thinkers in battle…",
    slotHint: 'Most do. Counted against a sheet’s trait slots where it is shown, never stored.',
  },
  defect: {
    heading: 'Defects',
    blurb: 'Drawbacks a character can take, and what taking one gives back.',
    empty:
      'Nothing here yet. A defect is a drawback with what it hands back for taking it. The ' +
      'server’s defect rules have not been written down here yet, so every field is free text.',
    namePlaceholder: 'Glass Jaw',
    descriptionPlaceholder: 'What it is, in a sentence or two.',
    slotHint: 'Usually not — a defect pays for itself. Tick it where the rules say otherwise.',
  },
};

/**
 * One of the two vaults, as a board.
 *
 * ⚠️ **Nothing on this screen applies anything.** A trait record holds the lines the rules
 * state; putting one on a sheet copies those lines onto it and changes no Class. §4 is
 * unconditional — Dan applies modifiers by hand — and this is also what stops a bonus already
 * typed into a stat from being counted twice, exactly as the clan bonus tick box does (§9).
 *
 * One component for both kinds, parameterised the same way the hook is: a second copy would be
 * a field added to one board and forgotten on the other, with nothing to catch it.
 */
function TraitVaultPage({ kind }: BoardProps) {
  const vault = useTraitVault(kind);
  const copy = COPY[kind];
  const entry = vault.selected;
  const lower = vault.label.toLowerCase();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-xl text-ash-100">{copy.heading}</h2>
          <p className="mt-0.5 text-xs text-ash-500">{copy.blurb}</p>
        </div>

        <input
          type="search"
          value={vault.query}
          onChange={(event) => vault.setQuery(event.target.value)}
          placeholder={`Search ${copy.heading.toLowerCase()}`}
          aria-label={`Search ${copy.heading.toLowerCase()}`}
          className="w-56 rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />

        <select
          value={vault.source}
          onChange={(event) => vault.setSource(event.target.value)}
          aria-label="Filter by source"
          className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-300 outline-none focus:border-cursed-500"
        >
          <option value="">Any source</option>
          {vault.sources.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        {kind === 'trait' ? (
          <select
            value={vault.rarity}
            onChange={(event) => vault.setRarity(event.target.value)}
            aria-label="Filter by rarity"
            className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-300 outline-none focus:border-cursed-500"
          >
            <option value="">Any rarity</option>
            {RARITIES.map((id) => (
              <option key={id} value={id}>
                {rarityLabel(id)} — {rarityCost(id)}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={() => void vault.create()}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-cursed-600/25"
        >
          New {lower}
        </button>
      </header>

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

      {/* ⚠️ Said on screen, not only through `announce()`. The same lesson the card export
          taught: a write nobody can see is indistinguishable from a dead button. */}
      {vault.added > 0 ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-cursed-600/40 bg-cursed-600/5 px-4 py-3">
          <p className="text-sm text-ash-300">
            Added {vault.added} {vault.added === 1 ? 'trait' : 'traits'} from the server's rules.
            They are ordinary records now — edit, refile or delete them, and they will not come
            back.
          </p>
          <button
            type="button"
            onClick={vault.dismissAdded}
            className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {vault.skipped.length > 0 ? (
        <p className="rounded-md border border-void-700 bg-void-850 px-4 py-2.5 text-xs text-ash-400">
          {vault.skipped.length} file{vault.skipped.length === 1 ? '' : 's'} could not be read and
          {vault.skipped.length === 1 ? ' was' : ' were'} skipped: {' '}
          {vault.skipped.map((file) => file.file).join(', ')}
        </p>
      ) : null}

      {vault.loading ? (
        <p className="text-xs text-ash-500">Loading…</p>
      ) : vault.entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-void-700 px-6 py-14 text-center">
          <Insignia kind={kind} size={28} className="mx-auto mb-3 text-ash-500" />
          <p className="text-sm text-ash-300">
            {vault.total === 0 ? `No ${copy.heading.toLowerCase()} yet.` : 'Nothing matches that.'}
          </p>
          {vault.total === 0 ? (
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ash-500">
              {copy.empty}
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
          {vault.entries.map((item) => (
            <li key={item.id}>
              <TraitCard
                entry={item}
                active={item.id === entry?.id}
                onSelect={() => vault.select(item.id === entry?.id ? null : item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {entry ? (
        <TraitEditor
          entry={entry}
          kind={kind}
          copy={copy}
          viewer={vault.viewer}
          onChange={(next) => void vault.update(next)}
          onDuplicate={() => void vault.duplicate(entry)}
          onRemove={() => void vault.remove(entry)}
          onClose={() => vault.select(null)}
          onReveal={() => void vault.reveal()}
        />
      ) : null}
    </div>
  );
}

// Two modules, one board. `ModuleDefinition.Page` takes no props, so the kind is bound here.
export function TraitsPage() {
  return <TraitVaultPage kind="trait" />;
}

export function DefectsPage() {
  return <TraitVaultPage kind="defect" />;
}
