import { useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { NumberInput, Select, TextInput } from '../../components/form/fields';
import {
  CUSTOM_DIFFICULTY_ID,
  HOST_BASIS_LABELS,
  REWARD_BUCKET_IDS,
  type Band,
  type DifficultyPreset,
  type HostRewards,
} from '../../domain/difficulty';
import { LISTED_GRADE_IDS, gradeLabel, type GradeId } from '../../domain/grades';
import { useSettings } from '../../hooks/useSettings';
import { RewardBucketEditor } from './RewardBucketEditor';

const NO_GRADE_UP = '—';

function CountRow({
  label,
  hint,
  band,
  onChange,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly band: Band;
  readonly onChange: (band: Band) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_5rem_5rem] items-end gap-3">
      <span className="pb-2 text-xs text-ash-400">
        {label}
        {hint ? <span className="ml-1 text-ash-500">{hint}</span> : null}
      </span>
      <NumberInput label="Min" value={band.min} onChange={(min) => onChange({ ...band, min })} />
      <NumberInput label="Max" value={band.max} onChange={(max) => onChange({ ...band, max })} />
    </div>
  );
}

/**
 * Editing the mission difficulty presets.
 *
 * Easy, Medium and Hard ship with the server's own amounts; Custom is there so a posting harder
 * than anything shipped can be set up without disturbing the other three. A band of 0–0 means
 * the reward is simply not granted, which is how Easy pays only a base and Hard puts almost
 * everything behind the objectives.
 */
export function DifficultySection() {
  const {
    settings,
    setDifficulty,
    setDefaultDifficulty,
    setDefaultHosts,
    setHostRewards,
    resetDifficulties,
  } = useSettings();

  const [editingId, setEditingId] = useState(CUSTOM_DIFFICULTY_ID);
  const preset =
    settings.difficulties.find((candidate) => candidate.id === editingId) ??
    (settings.difficulties[0] as DifficultyPreset);

  function patch(change: Partial<DifficultyPreset>) {
    setDifficulty({ ...preset, ...change });
  }

  function patchHosts(change: Partial<HostRewards>) {
    setHostRewards({ ...settings.hostRewards, ...change });
  }

  return (
    <SectionCard
      title="Mission difficulty"
      description="How much a posting asks of a team, and what it pays."
    >
      <p className="mb-4 text-xs leading-relaxed text-ash-500">
        A difficulty decides how many objectives and complications a mission rolls, how far above
        the posting the real threat may sit, and the three reward buckets. Everything it produces
        is editable on the mission itself — this only sets the starting point.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Select<string>
          label="Default for new missions"
          value={settings.defaultDifficulty}
          options={settings.difficulties.map((candidate) => ({
            value: candidate.id,
            label: candidate.label,
          }))}
          onChange={setDefaultDifficulty}
        />
        <TextInput
          label="Default hosts"
          value={settings.defaultHosts}
          onChange={setDefaultHosts}
          placeholder="@you | @someone-else"
          hint="Prefilled on a new posting. Separate with |."
        />
      </div>

      {/* Host multipliers are server-wide, not per difficulty, so they sit above the editor. */}
      <div className="mt-6 border-t border-void-800 pt-5">
        <h4 className="text-xs font-medium tracking-wide text-ash-400">Host payout</h4>
        <p className="mb-3 mt-0.5 text-[11px] leading-relaxed text-ash-500">
          Primary hosts make and run the event; secondary hosts help run it.{' '}
          <strong className="font-medium text-ash-400">Chests are never multiplied</strong>, and
          neither is a Grade Up.
        </p>

        <div className="grid grid-cols-[6rem_6rem_1fr] items-end gap-3">
          <NumberInput
            label="Primary ×"
            value={settings.hostRewards.primary}
            onChange={(primary) => patchHosts({ primary })}
          />
          <NumberInput
            label="Secondary ×"
            value={settings.hostRewards.secondary}
            onChange={(secondary) => patchHosts({ secondary })}
          />
          <Select<HostRewards['basis']>
            label="Applied to"
            value={settings.hostRewards.basis}
            options={(['base', 'base-and-objective'] as const).map((basis) => ({
              value: basis,
              label: HOST_BASIS_LABELS[basis],
            }))}
            onChange={(basis) => patchHosts({ basis })}
            hint="“3× rewards” could mean either; base only is the conservative reading."
          />
        </div>
      </div>

      <div className="mt-6 border-t border-void-800 pt-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[14rem] flex-1">
            <Select<string>
              label="Editing"
              value={preset.id}
              options={settings.difficulties.map((candidate) => ({
                value: candidate.id,
                label: candidate.label,
              }))}
              onChange={setEditingId}
              hint={preset.description}
            />
          </div>
          <button
            type="button"
            onClick={resetDifficulties}
            title="Puts the shipped amounts back on every preset"
            className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
          >
            Restore shipped amounts
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Name" value={preset.label} onChange={(label) => patch({ label })} />
          <NumberInput
            label="Default player slots"
            value={preset.slots}
            onChange={(slots) => patch({ slots })}
          />
        </div>

        <div className="mt-4">
          <TextInput
            label="Description"
            value={preset.description}
            onChange={(description) => patch({ description })}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <h4 className="text-xs font-medium tracking-wide text-ash-400">How much to do</h4>
          <CountRow
            label="Objectives rolled"
            band={preset.objectives}
            onChange={(objectives) => patch({ objectives })}
          />
          <CountRow
            label="Complications rolled"
            band={preset.complications}
            onChange={(complications) => patch({ complications })}
          />
          <div className="grid grid-cols-[1fr_5rem_5rem] items-end gap-3">
            <span className="pb-2 text-xs text-ash-400">
              Grade drift
              <span className="ml-1 text-ash-500">— rungs the briefing may be wrong by</span>
            </span>
            <NumberInput
              label="Rungs"
              value={preset.gradeDrift}
              onChange={(gradeDrift) => patch({ gradeDrift })}
            />
            <span />
          </div>
          <div className="grid grid-cols-[1fr_10rem] items-end gap-3">
            <span className="pb-2 text-xs text-ash-400">
              Grade Up offered up to
              <span className="ml-1 text-ash-500">— and below</span>
            </span>
            <Select<string>
              label="Highest grade"
              value={preset.gradeUpMaxGrade ?? NO_GRADE_UP}
              options={[
                { value: NO_GRADE_UP, label: 'No Grade Up' },
                ...LISTED_GRADE_IDS.map((id) => ({ value: id, label: gradeLabel(id) })),
              ]}
              onChange={(value) =>
                patch({ gradeUpMaxGrade: value === NO_GRADE_UP ? null : (value as GradeId) })
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {REWARD_BUCKET_IDS.map((id) => (
            <RewardBucketEditor
              key={id}
              id={id}
              bucket={preset[id]}
              onChange={(bucket) => patch({ [id]: bucket })}
              gradeUpAvailable={preset.gradeUpMaxGrade !== null}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
