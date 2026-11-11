import { Insignia } from '../../components/Insignia';
import { ROLE_LABELS } from '../../domain/roles';
import { entryLine, rarityLabel, traitCost, type TraitEntity } from '../../domain/traits';

interface TraitCardProps {
  readonly entry: TraitEntity;
  readonly active: boolean;
  readonly onSelect: () => void;
}

/**
 * One trait or defect, as a card.
 *
 * No picture band, unlike the lore card: a trait is a line of rules, and a 96px photograph
 * above two words of effect would push the thing worth reading off the card. The effect lines
 * *are* the card.
 */
export function TraitCard({ entry, active, onSelect }: TraitCardProps) {
  const lines = entry.entries.map(entryLine).filter(Boolean);
  const cost = traitCost(entry);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex h-full w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border-cursed-600 bg-void-800'
          : 'border-void-700 bg-void-900 hover:border-void-600 hover:bg-void-850'
      }`}
    >
      <span className="flex items-baseline gap-2">
        <Insignia kind={entry.kind} size={14} className="shrink-0 translate-y-0.5 text-ash-500" />
        <span className="min-w-0 flex-1 truncate text-sm text-ash-100">
          {entry.name || <span className="text-ash-500">Unnamed</span>}
        </span>
        {cost ? (
          <span className="shrink-0 font-mono text-[10px] text-ash-500">{cost}</span>
        ) : null}
      </span>

      {lines.length > 0 ? (
        <span className="flex flex-col gap-0.5">
          {lines.slice(0, 3).map((text, index) => (
            <span key={index} className="truncate text-xs leading-relaxed text-ash-400">
              {text}
            </span>
          ))}
          {lines.length > 3 ? (
            <span className="text-[10px] text-ash-500">+{lines.length - 3} more</span>
          ) : null}
        </span>
      ) : entry.description ? (
        <span className="line-clamp-2 text-xs leading-relaxed text-ash-500">
          {entry.description}
        </span>
      ) : (
        <span className="text-xs text-ash-500">Nothing written yet.</span>
      )}

      <span className="mt-auto flex items-center gap-2 pt-1 text-[10px] text-ash-500">
        <span className="truncate">
          {[
            entry.kind === 'trait' ? rarityLabel(entry.rarity) : '',
            entry.source,
            entry.usesTraitSlot ? '1 slot' : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {entry.minRole !== 'player' ? (
          <span className="ml-auto shrink-0">{ROLE_LABELS[entry.minRole]}+</span>
        ) : null}
      </span>
    </button>
  );
}
