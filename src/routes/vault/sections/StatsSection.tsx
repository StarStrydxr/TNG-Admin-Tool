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

      <div className="mt-5 max-w-xs">
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
    </SectionCard>
  );
}
