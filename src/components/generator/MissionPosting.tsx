import { Select, Stepper, TextArea, TextInput } from '../form/fields';
import {
  REWARD_BUCKET_LABELS,
  REWARD_BUCKET_NOTES,
  type DifficultyPreset,
  type HostRewards,
} from '../../domain/difficulty';
import {
  LISTED_GRADE_IDS,
  gradeLabel,
  gradeRank,
  type GradeId,
} from '../../domain/grades';
import { exampleRewardLines, type RolledRewards } from '../../generators/rewards';

/**
 * What a posting may ask for.
 *
 * Capped at Calamity Grade: above that is Apocalypse, and a posting is not how anyone finds out
 * about one of those. The implied `Semi-` and `Demi-` rungs are left out because they are
 * counting machinery (CLAUDE.md §4), not words the server writes on a mission.
 */
const RECOMMENDED_GRADES: readonly GradeId[] = LISTED_GRADE_IDS.filter(
  (id) => gradeRank(id) <= gradeRank('calamity-grade'),
);

/** Who a posting is open to. Empty means anyone. */
const FACTIONS = ['Sorcerers', 'Curse Users', 'Curses'];

interface MissionPostingProps {
  readonly difficulties: readonly DifficultyPreset[];
  readonly difficultyId: string;
  readonly onDifficultyChange: (id: string) => void;
  readonly difficulty: DifficultyPreset;
  readonly recommendedGrade: GradeId;
  readonly onRecommendedGradeChange: (grade: GradeId) => void;
  readonly faction: string;
  readonly onFactionChange: (faction: string) => void;
  readonly hosts: string;
  readonly onHostsChange: (value: string) => void;
  readonly slotsFilled: number;
  readonly onSlotsFilledChange: (value: number) => void;
  readonly slotsTotal: number;
  readonly onSlotsTotalChange: (value: number) => void;
  readonly rewards: RolledRewards;
  readonly onRewardsChange: (bucket: keyof RolledRewards, lines: readonly string[]) => void;
  readonly onRerollRewards: () => void;
  readonly hostRewards: HostRewards;
}

const ANY_FACTION = '';

function lines(text: string): readonly string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * The posting header and rewards — the parts of a mission that are not table rolls.
 *
 * Difficulty sets how many objectives and complications get rolled, how far the briefing is
 * allowed to be wrong, and the three reward buckets. Everything it produces is editable
 * afterwards: the preset is a starting point, not a verdict. Edit the presets in Settings.
 */
export function MissionPosting({
  difficulties,
  difficultyId,
  onDifficultyChange,
  difficulty,
  recommendedGrade,
  onRecommendedGradeChange,
  faction,
  onFactionChange,
  hosts,
  onHostsChange,
  slotsFilled,
  onSlotsFilledChange,
  slotsTotal,
  onSlotsTotalChange,
  rewards,
  onRewardsChange,
  onRerollRewards,
  hostRewards,
}: MissionPostingProps) {
  return (
    <div className="mt-4 border-t border-void-800 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-medium tracking-wide text-ash-400">The posting</h4>
        <button
          type="button"
          onClick={onRerollRewards}
          title="Rolls every reward bucket again against the same seed"
          className="rounded-md border border-void-700 px-2 py-1 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
        >
          Re-roll rewards
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select<string>
          label="Difficulty"
          value={difficultyId}
          options={difficulties.map((preset) => ({ value: preset.id, label: preset.label }))}
          onChange={onDifficultyChange}
          hint={difficulty.description}
        />
        <Select<GradeId>
          label="Recommended grade"
          value={recommendedGrade}
          options={RECOMMENDED_GRADES.map((id) => ({
            value: id,
            label: `${gradeLabel(id)} and Below`,
          }))}
          onChange={onRecommendedGradeChange}
        />
        <Select<string>
          label="For"
          value={faction}
          options={[
            { value: ANY_FACTION, label: 'Anyone' },
            ...FACTIONS.map((name) => ({ value: name, label: name })),
          ]}
          onChange={onFactionChange}
          hint="Which side the posting is open to."
        />
        <TextInput
          label="Hosts"
          value={hosts}
          onChange={onHostsChange}
          placeholder="@you | @someone-else"
          hint="Separate with | — set a default in Settings."
        />
      </div>

      <div className="mt-4 grid grid-cols-[8rem_8rem_1fr] items-end gap-3">
        <Stepper label="Slots taken" value={slotsFilled} onChange={onSlotsFilledChange} />
        <Stepper label="Slots total" value={slotsTotal} onChange={onSlotsTotalChange} min={1} />
        <p className="pb-2 text-xs text-ash-500">
          Posted as{' '}
          <code className="text-ash-400">
            Mission Slots: [{slotsFilled}/{slotsTotal}]
          </code>
        </p>
      </div>

      {/*
        One box per bucket. An empty one is normal — Easy pays only a base, Hard almost nothing
        up front — so the placeholder shows what this difficulty would typically grant rather
        than leaving an admin writing a posting by hand to remember the house rules.
      */}
      <div className="mt-4 flex flex-col gap-4">
        {(['base', 'objective', 'mvp'] as const).map((bucket) => (
          <TextArea
            key={bucket}
            label={REWARD_BUCKET_LABELS[bucket]}
            value={rewards[bucket].join('\n')}
            onChange={(text) => onRewardsChange(bucket, lines(text))}
            rows={3}
            placeholder={exampleRewardLines(
              difficulty[bucket],
              difficulty.gradeUpMaxGrade,
            ).join('\n')}
            hint={`${REWARD_BUCKET_NOTES[bucket]} One per line.`}
          />
        ))}

        <TextArea
          label="Host payout"
          value={rewards.hosts.join('\n')}
          onChange={(text) => onRewardsChange('hosts', lines(text))}
          rows={3}
          hint={`×${hostRewards.primary} primary, ×${hostRewards.secondary} secondary, over ${
            hostRewards.basis === 'base-and-objective'
              ? 'the base and objective-exclusive rewards'
              : 'the base rewards'
          }. Chests are never multiplied.`}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ash-500">
        Changing the difficulty rewrites the rewards and the slot count straight away. The{' '}
        {difficulty.objectives.min}–{difficulty.objectives.max} objectives and{' '}
        {difficulty.complications.min}–{difficulty.complications.max} complications it asks for
        apply on the next roll, so nothing you have locked or edited is thrown away. Editing a
        reward by hand does not recalculate the host payout — re-roll, or adjust it yourself.
      </p>
    </div>
  );
}
