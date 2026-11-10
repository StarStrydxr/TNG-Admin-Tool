import { NumberInput, Select } from '../../components/form/fields';
import {
  CHEST_LABELS,
  CHEST_TIERS,
  REWARD_BUCKET_LABELS,
  REWARD_BUCKET_NOTES,
  type Band,
  type ChestTier,
  type RewardBucket,
  type RewardBucketId,
} from '../../domain/difficulty';

function BandRow({
  label,
  band,
  onChange,
}: {
  readonly label: string;
  readonly band: Band;
  readonly onChange: (band: Band) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_5rem_5rem] items-end gap-3">
      <span className="pb-2 text-xs text-ash-400">{label}</span>
      <NumberInput label="Min" value={band.min} onChange={(min) => onChange({ ...band, min })} />
      <NumberInput label="Max" value={band.max} onChange={(max) => onChange({ ...band, max })} />
    </div>
  );
}

interface RewardBucketEditorProps {
  readonly id: RewardBucketId;
  readonly bucket: RewardBucket;
  readonly onChange: (bucket: RewardBucket) => void;
  /** Whether this preset offers a Grade Up at all — hides the toggle when it does not apply. */
  readonly gradeUpAvailable: boolean;
}

/**
 * One of the three ways a posting pays.
 *
 * A band of 0–0 means the bucket simply does not grant that reward, and nothing is printed for
 * it — which is how Easy ends up with only a base payout and Hard with almost none.
 */
export function RewardBucketEditor({
  id,
  bucket,
  onChange,
  gradeUpAvailable,
}: RewardBucketEditorProps) {
  return (
    <section className="border-t border-void-850 pt-4">
      <h4 className="text-xs font-medium tracking-wide text-ash-400">
        {REWARD_BUCKET_LABELS[id]}
      </h4>
      <p className="mb-3 mt-0.5 text-[11px] text-ash-500">{REWARD_BUCKET_NOTES[id]}</p>

      <div className="flex flex-col gap-3">
        <BandRow
          label="Cursed Rating"
          band={bucket.cr}
          onChange={(cr) => onChange({ ...bucket, cr })}
        />
        <BandRow
          label="Trait Points"
          band={bucket.traitPoints}
          onChange={(traitPoints) => onChange({ ...bucket, traitPoints })}
        />
        <BandRow
          label="Yen"
          band={bucket.yen}
          onChange={(yen) => onChange({ ...bucket, yen })}
        />

        <div className="grid grid-cols-[1fr_10rem] items-end gap-3">
          <span className="pb-2 text-xs text-ash-400">Chest</span>
          <Select<ChestTier>
            label="Tier"
            value={bucket.chest}
            options={CHEST_TIERS.map((tier) => ({ value: tier, label: CHEST_LABELS[tier] }))}
            onChange={(chest) => onChange({ ...bucket, chest })}
          />
        </div>

        {gradeUpAvailable ? (
          <label className="flex items-center gap-2 text-xs text-ash-400">
            <input
              type="checkbox"
              checked={bucket.gradeUp}
              onChange={(event) => onChange({ ...bucket, gradeUp: event.target.checked })}
              className="accent-cursed-500"
            />
            Grant a Grade Up
          </label>
        ) : null}
      </div>
    </section>
  );
}
