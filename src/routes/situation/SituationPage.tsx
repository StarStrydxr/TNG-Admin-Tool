import { SectionCard } from '../../components/SectionCard';
import { ROLES, ROLE_LABELS, assignableRoles, type Role } from '../../domain/roles';
import { gradeAbbrev } from '../../domain/grades';
import { describeEntity } from '../../domain/entities-display';
import { entityFromDraft } from '../../generators/to-entity';
import { driftSummary } from '../../generators/situation';
import type { Draft } from '../../generators/draft';
import { Insignia } from '../../components/Insignia';
import { useSituation } from '../../hooks/useSituation';
import { GradeSeal } from '../../components/GradeSeal';

/**
 * Roll a mission, the curse actually in it, and the tool recovered from the site — together,
 * from one seed, and saved already linked to each other.
 *
 * Reading uses `describeEntity()` on a throwaway conversion rather than a second layout, so a
 * field added to an entity shows up here with no change (CLAUDE.md §4a).
 */
export function SituationPage() {
  const sit = useSituation();
  const assignable = assignableRoles(sit.viewer);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Situation"
        description="One mission, the curse that is really there, and what can be carried away from it."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ash-400">Seed</span>
            <input
              type="text"
              value={sit.seed}
              onChange={(event) => sit.setSeed(event.target.value)}
              spellCheck={false}
              className="w-56 rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 font-mono text-sm text-ash-100 outline-none focus:border-cursed-500"
            />
          </label>

          <button
            type="button"
            onClick={() => sit.roll()}
            className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-cursed-600/25"
          >
            Roll a situation
          </button>

          {sit.situation ? (
            <button
              type="button"
              onClick={() => sit.roll(sit.seed)}
              title="Roll this exact seed again — useful after changing the honest-posting setting"
              className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
            >
              Re-roll this seed
            </button>
          ) : null}

          <label className="flex items-center gap-2 pb-1.5 text-xs text-ash-400">
            <input
              type="checkbox"
              checked={sit.honest}
              onChange={(event) => sit.setHonest(event.target.checked)}
              className="accent-cursed-500"
            />
            Honest posting
          </label>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ash-500">
          By default the curse is rolled at or <em>above</em> the posted grade — misgraded
          missions are the engine of these plots. Tick <em>honest posting</em> for a brief that
          is actually right. Every grade stays editable once saved.
        </p>

        {sit.error ? (
          <p className="mt-3 rounded-md border border-blood-500/40 bg-blood-500/10 px-3 py-2 text-sm text-ash-300">
            {sit.error}
          </p>
        ) : null}
      </SectionCard>

      {sit.situation ? (
        <>
          <div
            className={[
              'rounded-lg border px-4 py-3 text-sm',
              sit.situation.drift === 0
                ? 'border-void-800 bg-void-900 text-ash-400'
                : 'border-blood-500/40 bg-blood-500/10 text-ash-200',
            ].join(' ')}
          >
            <strong className="font-medium">
              {gradeAbbrev(sit.situation.mission.grade)} posted,{' '}
              {gradeAbbrev(sit.situation.curse.grade)} present.
            </strong>{' '}
            {driftSummary(sit.situation)}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Part
              title="The mission"
              draft={sit.situation.mission}
              onReroll={() => sit.reroll('mission')}
            />
            <Part
              title="What is actually there"
              draft={sit.situation.curse}
              onReroll={() => sit.reroll('curse')}
            />
            <Part
              title="Recovered from the site"
              draft={sit.situation.tool}
              onReroll={() => sit.reroll('tool')}
            />
          </div>

          <SectionCard title="Keep it">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ash-400">Folder</span>
                <input
                  type="text"
                  value={sit.folder}
                  onChange={(event) => sit.setFolder(event.target.value)}
                  placeholder="Arc 2/Shibuya"
                  className="w-56 rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-ash-400">Visible to</span>
                <select
                  value={sit.minRole}
                  onChange={(event) => sit.setMinRole(event.target.value as Role)}
                  className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
                >
                  {ROLES.filter((role) => assignable.includes(role)).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]} and above
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={sit.saving}
                onClick={() => void sit.save()}
                className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-40"
              >
                {sit.saving ? 'Saving…' : 'Save all three, linked'}
              </button>

              {sit.saved ? (
                <span className="pb-2 text-xs text-ash-500">
                  Saved. The mission points at both; both point back.
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ash-500">
              All three land in the same folder at the same visibility, as three records you can
              edit, refile or re-rank separately afterwards.
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

function Part({
  title,
  draft,
  onReroll,
}: {
  readonly title: string;
  readonly draft: Draft;
  readonly onReroll: () => void;
}) {
  // A throwaway conversion purely to borrow the reading layout; nothing is saved from it.
  const preview = entityFromDraft(draft, { id: 'preview', now: '' }, []);
  const fields = preview ? describeEntity(preview) : [];

  return (
    <article className="rounded-lg border border-void-800 bg-void-900 p-4">
      <header className="mb-3 flex items-baseline gap-2 border-b border-void-800 pb-2">
        <Insignia kind={draft.kind} size={15} className="shrink-0 self-center text-ash-400" />
        <h3 className="font-display text-sm text-ash-200">{title}</h3>
        <GradeSeal grade={draft.grade} className="self-center" />
        <button
          type="button"
          onClick={onReroll}
          className="ml-auto rounded border border-void-700 px-2 py-0.5 text-[11px] text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
        >
          Re-roll
        </button>
      </header>

      {/* No grade line here: describeEntity already opens with one. */}
      <dl className="flex flex-col gap-2">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="text-[11px] uppercase tracking-wide text-ash-500">{field.label}</dt>
            <dd className="text-sm leading-snug text-ash-200">
              {field.values.length === 1 ? (
                field.values[0]
              ) : (
                <ul className="list-disc pl-4">
                  {field.values.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
