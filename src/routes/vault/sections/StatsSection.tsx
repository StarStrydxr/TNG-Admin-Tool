import { SectionCard } from '../../../components/SectionCard';
import { StatEditor } from '../../../components/StatEditor';
import { Select } from '../../../components/form/fields';
import type { Character } from '../../../domain/character';
import type { StatValue } from '../../../domain/grades';
import {
  CE_RESERVES_BANDS,
  CE_RESERVES_LABELS,
  GRADED_STAT_IDS,
  GRADED_STAT_LABELS,
  effectiveReserves,
  type CeReservesBand,
  type GradedStatId,
} from '../../../domain/stats';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

export function StatsSection({ character, onChange }: SectionProps) {
  function setStat(id: GradedStatId, value: StatValue) {
    onChange({
      stats: { ...character.stats, graded: { ...character.stats.graded, [id]: value } },
    });
  }

  return (
    <SectionCard
      title="Stats"
      description="Everything starts at Class 3 of the character's grade. Traits and defects move individual classes — set them here by hand."
    >
      <div className="flex flex-col">
        {GRADED_STAT_IDS.map((id) => (
          <StatEditor
            key={id}
            label={GRADED_STAT_LABELS[id]}
            value={character.stats.graded[id]}
            onChange={(value) => setStat(id, value)}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-5">
        <div className="max-w-xs flex-1">
          <Select<CeReservesBand>
            label="CE Reserves"
            value={character.stats.ceReserves}
            options={CE_RESERVES_BANDS.map((band) => ({
              value: band,
              label: CE_RESERVES_LABELS[band],
            }))}
            onChange={(ceReserves) => onChange({ stats: { ...character.stats, ceReserves } })}
            hint="A band, not a grade. Abysmal means abyssally deep — second from the top."
          />
        </div>

        <EffectiveReserves stats={character.stats} />
      </div>
    </SectionCard>
  );
}

/**
 * What the reserves come to once CE Efficiency is taken into account.
 *
 * Read-only on purpose. Dan's rule adds one stage of reserves per grade Efficiency sits above
 * Output, and showing the result beside the band — rather than quietly raising the band — is
 * what keeps this a reading of two stats he typed instead of the stat calculator §4 forbids.
 * Nothing here writes to the record. Hidden entirely when the two are level, so an ordinary
 * sheet is no busier than before.
 */
function EffectiveReserves({ stats }: { readonly stats: Character['stats'] }) {
  const { base, band, steps, capped } = effectiveReserves(stats);
  if (steps === 0) return null;

  return (
    <div className="min-w-[14rem] flex-1 rounded-md border border-cursed-600/40 bg-cursed-600/5 px-3 py-2">
      <p className="text-xs text-ash-400">Effective reserves</p>
      <p className="mt-0.5 font-display text-lg text-cursed-400">{CE_RESERVES_LABELS[band]}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ash-500">
        {CE_RESERVES_LABELS[base]} raised {steps} stage{steps === 1 ? '' : 's'}: CE Efficiency
        sits {steps} grade{steps === 1 ? '' : 's'} above CE Output.
        {capped ? ' The scale stops at Endless — the grades above it still count.' : ''}
      </p>
      <p className="mt-1 text-[11px] text-ash-500">Worked out for reading, never saved.</p>
    </div>
  );
}
