import { BOUNTY_PINGS, BOUNTY_STATES, CONSPICUOUSITIES, examplePurse, threatNote } from '../../domain/bounty';
import { LISTED_GRADE_IDS, gradeLabel, type GradeId } from '../../domain/grades';

interface BountyPostingProps {
  /** The threat grade, which the roll decides. Shown for context, not edited here. */
  readonly grade: GradeId;
  readonly target: string;
  readonly onTargetChange: (value: string) => void;
  readonly targetGrade: GradeId;
  readonly onTargetGradeChange: (value: GradeId) => void;
  readonly conspicuousity: string;
  readonly onConspicuousityChange: (value: string) => void;
  readonly state: string;
  readonly onStateChange: (value: string) => void;
  readonly pings: string;
  readonly onPingsChange: (value: string) => void;
  readonly rewards: string;
  readonly onRewardsChange: (value: string) => void;
}

const FIELD =
  'w-full rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

/**
 * The parts of a bounty the roll does not decide.
 *
 * The **target** is a plain field rather than a rolled one here even though the spec rolls a
 * name: typing into it overrides the roll, and locking the two name fields on the board holds
 * it steady while everything else re-rolls. That is the "both, as a toggle" Dan asked for, and
 * it needed no new mechanism — the existing field locks already are the toggle.
 *
 * Conspicuousity, State and Pings are free text with suggestions, because the server's real
 * options are not written down anywhere and an invented enum would quietly become canon.
 */
export function BountyPosting({
  grade,
  target,
  onTargetChange,
  targetGrade,
  onTargetGradeChange,
  conspicuousity,
  onConspicuousityChange,
  state,
  onStateChange,
  pings,
  onPingsChange,
  rewards,
  onRewardsChange,
}: BountyPostingProps) {
  const note = threatNote(grade, targetGrade);

  return (
    <section className="mt-5 border-t border-void-800 pt-4">
      <h4 className="mb-3 text-xs font-medium tracking-wide text-ash-400">The posting</h4>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Target</span>
          <input
            type="text"
            className={FIELD}
            value={target}
            placeholder="Rolled with the board unless you type here"
            onChange={(event) => onTargetChange(event.target.value)}
          />
          <span className="text-[11px] text-ash-500">
            Lock the two name fields above to hold a target while the posting re-rolls.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Target ranked</span>
          <select
            className={FIELD}
            value={targetGrade}
            onChange={(event) => onTargetGradeChange(event.target.value as GradeId)}
          >
            {LISTED_GRADE_IDS.map((id) => (
              <option key={id} value={id}>
                {gradeLabel(id)}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-ash-500">
            Posted as a {gradeLabel(grade)} threat.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Conspicuousity</span>
          <input
            type="text"
            className={FIELD}
            list="bounty-conspicuousity"
            value={conspicuousity}
            placeholder="Public"
            onChange={(event) => onConspicuousityChange(event.target.value)}
          />
          <datalist id="bounty-conspicuousity">
            {CONSPICUOUSITIES.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">State</span>
          <input
            type="text"
            className={FIELD}
            list="bounty-state"
            value={state}
            placeholder="Dead"
            onChange={(event) => onStateChange(event.target.value)}
          />
          <datalist id="bounty-state">
            {BOUNTY_STATES.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
      </div>

      {note ? (
        <p className="mt-3 rounded-md border border-cursed-600/40 bg-cursed-600/5 px-3 py-2 text-[11px] leading-relaxed text-ash-400">
          {note} The Discord export writes this line for you.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Pings — one per line</span>
          <textarea
            className={`${FIELD} resize-y leading-relaxed`}
            rows={3}
            value={pings}
            placeholder={BOUNTY_PINGS.slice(0, 3).join('\n')}
            onChange={(event) => onPingsChange(event.target.value)}
          />
          <span className="text-[11px] text-ash-500">
            Written <code className="text-ash-400">@{'{ Curse User }'}</code> in the posting.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Rewards — one per line</span>
          <textarea
            className={`${FIELD} resize-y leading-relaxed`}
            rows={3}
            value={rewards}
            placeholder={examplePurse(grade)}
            onChange={(event) => onRewardsChange(event.target.value)}
          />
          <span className="text-[11px] text-ash-500">
            Bounties pay on their own scale, not the mission economy.
          </span>
        </label>
      </div>
    </section>
  );
}
