import { useState, type ReactNode } from 'react';

import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useGenerator } from '../../hooks/useGenerator';
import { useSettings } from '../../hooks/useSettings';
import { ROLE_LABELS, assignableRoles, type Role } from '../../domain/roles';
import { canSaveToVault } from '../../generators/to-character';
import type { Draft, GeneratorSpec } from '../../generators/draft';
import type { TableSet } from '../../domain/tables';
import { LISTED_GRADE_IDS, gradeAbbrev, gradeLabel, type GradeId } from '../../domain/grades';
import { formatSimilarity } from '../../domain/similarity';
import { entityDisplayName } from '../../domain/entities';
import { ImagePicker } from '../form/ImagePicker';
import { Insignia } from '../Insignia';
import { UndoRedo } from '../form/UndoRedo';
import { useGeneratorKeys } from '../../hooks/useGeneratorKeys';
import { DiscordPreview } from '../DiscordPreview';
import { DraftFieldRow } from './DraftFieldRow';
import { LockButton } from './LockButton';
import { BountyPosting } from './BountyPosting';
import { MissionPosting } from './MissionPosting';

const BUTTON =
  'rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';

interface GeneratorPanelProps {
  readonly specs: readonly GeneratorSpec[];
  /** Rendered under the draft — used by techniques to manage their shikigami. */
  readonly renderExtra?: (context: {
    readonly draft: Draft;
    readonly tableSet: TableSet;
    readonly children: readonly Draft[];
    readonly setChildren: (drafts: readonly Draft[]) => void;
  }) => ReactNode;
}

/**
 * The shared generator surface: roll, lock, re-roll, edit. All four generators use it, so the
 * interaction is identical everywhere and there is one place to improve it.
 */
function Key({ children }: { readonly children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-void-700 bg-void-850 px-1 py-px font-mono text-[10px] text-ash-400">
      {children}
    </kbd>
  );
}

export function GeneratorPanel({ specs, renderExtra }: GeneratorPanelProps) {
  const gen = useGenerator(specs);
  const { announce } = useAnnouncer();
  const { settings } = useSettings();
  const [previewing, setPreviewing] = useState(false);
  const entryCount = Object.values(gen.tableSet.tables).reduce(
    (sum, entries) => sum + entries.length,
    0,
  );

  useGeneratorKeys({
    enabled: !gen.loading,
    roll: () => {
      gen.roll();
      announce(`Rolled a new ${gen.spec.label.toLowerCase()}.`);
    },
    rerollAll: () => {
      if (!gen.draft) return;
      gen.rerollAll();
      announce('Re-rolled every unlocked field.');
    },
    toggleLock: (index) => {
      const field = gen.draft?.fields[index];
      if (!field) return;
      gen.toggleLock(field.key, !field.locked);
      announce(`${field.label} ${field.locked ? 'unlocked' : 'locked'}.`);
    },
    lockAll: (locked) => {
      if (!gen.draft) return;
      gen.lockAll(locked);
      announce(locked ? 'Every field locked.' : 'Every field unlocked.');
    },
  });

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      {specs.length > 1 ? (
        <div className="flex gap-1 rounded-md border border-void-700 p-0.5">
          {specs.map((spec) => (
            <button
              key={spec.kind}
              type="button"
              onClick={() => gen.setKind(spec.kind)}
              className={[
                'flex-1 rounded px-3 py-1.5 text-sm transition-colors',
                spec.kind === gen.kind
                  ? 'bg-void-700 text-ash-100'
                  : 'text-ash-500 hover:text-ash-300',
              ].join(' ')}
            >
              {spec.label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-ash-500">{gen.spec.blurb}</p>

      {gen.error ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-blood-500/40 bg-blood-500/10 px-4 py-3">
          <p className="text-sm text-ash-300">{gen.error}</p>
          <button
            type="button"
            onClick={gen.dismissError}
            className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {gen.missing.length > 0 ? (
        <div className="rounded-md border border-void-700 bg-void-900 px-4 py-3">
          <p className="text-sm text-ash-300">
            {gen.missing.length} table{gen.missing.length === 1 ? ' is' : 's are'} empty. Those
            fields will come out blank until there are entries.
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {gen.missing.map((id) => (
              <li key={id} className="font-mono text-xs text-ash-500">
                {id}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {gen.pickableFields.map((group) => {
        const picked = group.entries.find((entry) => entry.id === gen.picks[group.key]);
        return (
          <div key={group.key} className="rounded-lg border border-void-800 bg-void-900 p-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">{group.label}</span>
              <select
                className="w-full rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
                value={gen.picks[group.key] ?? ''}
                onChange={(event) =>
                  gen.setPick(group.key, event.target.value === '' ? null : event.target.value)
                }
              >
                <option value="">Roll an invented one</option>
                {group.entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.value}
                  </option>
                ))}
              </select>
            </label>
            {picked?.note ? (
              <p className="mt-2 text-xs leading-relaxed text-ash-500">{picked.note}</p>
            ) : (
              <p className="mt-2 text-xs text-ash-500">
                {group.entries.length} from your module. Picking one pins its type; everything
                else still rolls.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-void-800 bg-void-900 p-4">
        {gen.variantOptions.length > 0 ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ash-400">{gen.spec.variantLabel ?? 'Type'}</span>
            <select
              className="max-w-[20rem] rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
              value={gen.pinnedVariant}
              onChange={(event) => gen.setPinnedVariant(event.target.value)}
            >
              <option value="">Roll it</option>
              {gen.variantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Grade</span>
          <select
            className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
            value={gen.pinnedGrade}
            onChange={(event) => gen.setPinnedGrade(event.target.value as GradeId | '')}
          >
            <option value="">Roll it</option>
            {LISTED_GRADE_IDS.map((id) => (
              <option key={id} value={id}>
                {gradeLabel(id)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Seed</span>
          <input
            type="text"
            className="w-44 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 font-mono text-sm text-ash-100 outline-none focus:border-cursed-500"
            value={gen.seed}
            onChange={(event) => gen.setSeed(event.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            gen.roll();
            announce(`Rolled a new ${gen.spec.label.toLowerCase()}.`);
          }}
          disabled={gen.loading}
          className={`${BUTTON} border-cursed-600 bg-cursed-600/15 text-ash-100 enabled:hover:bg-cursed-600/25`}
        >
          Roll
        </button>
        <button
          type="button"
          onClick={gen.rollCurrentSeed}
          disabled={gen.loading}
          title="Roll again using the seed in the box — reproduces an earlier result exactly"
          className={`${BUTTON} border-void-700 text-ash-400 enabled:hover:border-void-600 enabled:hover:text-ash-100`}
        >
          Use this seed
        </button>
        <button
          type="button"
          onClick={() => {
            gen.rerollAll();
            announce('Re-rolled every unlocked field.');
          }}
          disabled={!gen.draft}
          className={`${BUTTON} border-void-700 text-ash-400 enabled:hover:border-void-600 enabled:hover:text-ash-100`}
        >
          Re-roll unlocked
        </button>

        <p className="w-full text-[11px] text-ash-500">
          <Key>Space</Key> re-roll unlocked · <Key>R</Key> new roll · <Key>1</Key>–<Key>9</Key>{' '}
          lock a field · <Key>L</Key>/<Key>U</Key> lock or unlock all · <Key>Ctrl+Z</Key> undo.
          Shortcuts pause while you are typing.
        </p>

        <div className="pb-0.5">
          <UndoRedo
            onUndo={gen.undo}
            onRedo={gen.redo}
            canUndo={gen.canUndo}
            canRedo={gen.canRedo}
          />
        </div>
      </div>

      {gen.draft ? (
        <section className="rounded-lg border border-void-800 bg-void-900 p-5">
          <header className="mb-3 flex items-center justify-between gap-4 border-b border-void-800 pb-3">
            <div className="flex items-center gap-2">
              <LockButton
                locked={gen.draft.gradeLocked}
                onToggle={() => gen.toggleGradeLock(!gen.draft?.gradeLocked)}
                label="Grade"
              />
              <Insignia
                kind={gen.draft.kind}
                size={18}
                className="shrink-0 self-center text-ash-400"
              />
              <h2 className="font-display text-lg text-ash-100">
                {gradeLabel(gen.draft.grade)}
              </h2>
              <code className="font-mono text-xs text-cursed-400">
                {gradeAbbrev(gen.draft.grade)}
              </code>
            </div>
            <code className="font-mono text-[11px] text-ash-500">seed {gen.draft.seed}</code>
          </header>

          {gen.draft.variant ? (
            <div className="mb-3 flex items-center gap-2 border-b border-void-850 pb-3">
              <LockButton
                locked={gen.draft.variantLocked}
                onToggle={() => gen.toggleVariantLock(!gen.draft?.variantLocked)}
                label={gen.spec.variantLabel ?? 'Type'}
              />
              <span className="text-xs text-ash-400">{gen.spec.variantLabel ?? 'Type'}</span>
              <span className="text-sm text-ash-100">{gen.draft.variant.label}</span>
            </div>
          ) : null}

          <div className="flex flex-col">
            {gen.draft.fields.map((field, index) => (
              <DraftFieldRow
                key={field.key}
                field={field}
                {...(index < 9 ? { shortcut: String(index + 1) } : {})}
                onReroll={() => {
                  gen.rerollOne(field.key);
                  announce(`Re-rolled ${field.label}.`);
                }}
                onToggleLock={() => gen.toggleLock(field.key, !field.locked)}
                onEdit={(values) => gen.editField(field.key, values)}
              />
            ))}
          </div>

          {gen.isBounty && gen.draft ? (
            <BountyPosting
              grade={gen.draft.grade}
              target={gen.bountyTarget}
              onTargetChange={gen.setBountyTarget}
              targetGrade={gen.targetGrade}
              onTargetGradeChange={gen.setTargetGrade}
              conspicuousity={gen.conspicuousity}
              onConspicuousityChange={gen.setConspicuousity}
              state={gen.bountyState}
              onStateChange={gen.setBountyState}
              pings={gen.pings}
              onPingsChange={gen.setPings}
              rewards={gen.purse}
              onRewardsChange={gen.setPurse}
            />
          ) : null}

          {gen.isMission ? (
            <MissionPosting
              difficulties={gen.difficulties}
              difficultyId={gen.difficultyId}
              onDifficultyChange={gen.setDifficultyId}
              difficulty={gen.difficulty}
              recommendedGrade={gen.recommendedGrade}
              onRecommendedGradeChange={gen.setRecommendedGrade}
              hosts={gen.hosts}
              onHostsChange={gen.setHosts}
              faction={gen.faction}
              onFactionChange={gen.setFaction}
              slotsFilled={gen.slotsFilled}
              onSlotsFilledChange={gen.setSlotsFilled}
              slotsTotal={gen.slotsTotal}
              onSlotsTotalChange={gen.setSlotsTotal}
              rewards={gen.rewards}
              onRewardsChange={gen.setRewardLines}
              onRerollRewards={gen.rerollRewards}
              hostRewards={gen.hostRewards}
            />
          ) : null}

          {gen.similar.length > 0 ? (
            <div className="mt-4 rounded-md border border-void-700 bg-void-850 px-3 py-2">
              <p className="text-xs text-ash-400">
                Close to{' '}
                {gen.similar.length === 1 ? 'something' : `${gen.similar.length} things`} you have
                already saved:
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {gen.similar.slice(0, 3).map((match) => (
                  <li key={match.entity.id} className="text-xs text-ash-500">
                    <span className="font-mono text-ash-400">
                      {formatSimilarity(match.score)}
                    </span>{' '}
                    {entityDisplayName(match.entity)}
                    {match.entity.folder ? ` · ${match.entity.folder}` : ''}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-ash-500">
                Saving anyway is fine — re-roll the fields that overlap if you would rather not.
              </p>
            </div>
          ) : null}

          <div className="mt-4 border-t border-void-800 pt-4">
            <ImagePicker label="Image" value={gen.image} onChange={gen.setImage} />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-void-800 pt-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Folder</span>
              <input
                type="text"
                value={gen.folder}
                onChange={(event) => gen.setFolder(event.target.value)}
                placeholder="Arc 2/Shibuya"
                className="w-56 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Visible to</span>
              <select
                value={gen.minRole}
                onChange={(event) => gen.setMinRole(event.target.value as Role)}
                className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
              >
                {assignableRoles(settings.role).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]} and above
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                void gen.saveToVault().then(() => announce('Saved.'));
              }}
              className={`${BUTTON} border-void-700 text-ash-300 enabled:hover:border-cursed-600 enabled:hover:text-ash-100`}
            >
              {canSaveToVault(gen.draft)
                ? 'Save to vault as NPC'
                : `Save ${gen.spec.label.toLowerCase()}`}
            </button>

            {gen.previewEntity ? (
              <button
                type="button"
                onClick={() => setPreviewing(true)}
                title="See how this exports, in the Discord posting format or as readable markdown"
                className={`${BUTTON} border-void-700 text-ash-400 enabled:hover:border-void-600 enabled:hover:text-ash-100`}
              >
                Preview export
              </button>
            ) : null}

            {gen.savedId ? (
              <span className="pb-2 text-xs text-ash-500">
                Saved to {gen.folder ? `…/${gen.folder}` : 'the collection root'}.
              </span>
            ) : null}
          </div>

          {renderExtra
            ? renderExtra({
                draft: gen.draft,
                tableSet: gen.tableSet,
                children: gen.children,
                setChildren: gen.setChildren,
              })
            : null}
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-void-700 px-6 py-12 text-center text-sm text-ash-500">
          {gen.loading ? 'Loading tables…' : 'Roll to generate.'}
        </p>
      )}

      <footer className="flex items-center justify-between gap-4 text-xs text-ash-500">
        <span>
          {entryCount} entries across {Object.keys(gen.tableSet.tables).length} tables
          {gen.tables && gen.tables.userFileCount > 0
            ? ` · ${gen.tables.userFileCount} of your own files`
            : ''}
        </span>
        <button
          type="button"
          onClick={() => void gen.revealTables()}
          className="rounded px-2 py-1 transition-colors hover:bg-void-800 hover:text-ash-300"
          title="Add your own entries as JSON here; they merge over canon by id"
        >
          Open table folder
        </button>
      </footer>

      {previewing && gen.previewEntity ? (
        <DiscordPreview record={gen.previewEntity} onClose={() => setPreviewing(false)} />
      ) : null}
    </div>
  );
}
