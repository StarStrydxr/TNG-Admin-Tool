import { SectionCard } from '../../../components/SectionCard';
import { useAnnouncer } from '../../../hooks/useAnnouncer';
import {
  BLACK_FLASH_THRESHOLD,
  blackFlashView,
  newBlackFlashRecord,
} from '../../../domain/black-flash';
import { blackFlashTotal, type Character } from '../../../domain/character';
import { formatStatShort, gradeLabel } from '../../../domain/grades';
import { GRADED_STAT_LABELS } from '../../../domain/stats';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

const CELL =
  'w-full rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

/**
 * Black Flash: what the stats read as, and a log of the ones that landed.
 *
 * ⚠️ **Nothing here writes a stat, and nothing here produces a damage figure.** The buffed
 * column is a second reading of the numbers already on the sheet, by Dan's own rule — the same
 * arrangement as effective reserves. CLAUDE.md §4 bans a damage calculator and a stat
 * calculator; this is neither.
 *
 * The turn count is stated, not tracked. A five-turn timer would need the app to know a fight
 * is happening, which it does not and should not.
 */
export function BlackFlashSection({ character, onChange }: SectionProps) {
  const { announce } = useAnnouncer();
  const view = blackFlashView(character.grade, character.stats);
  const log = character.blackFlashes;

  function record() {
    const entry = newBlackFlashRecord(
      crypto.randomUUID(),
      new Date().toISOString().slice(0, 10),
    );
    onChange({ blackFlashes: [...log, entry] });
    announce(`Black Flash recorded. ${blackFlashTotal(character) + 1} in total.`);
  }

  function patch(id: string, change: Partial<(typeof log)[number]>) {
    onChange({ blackFlashes: log.map((e) => (e.id === id ? { ...e, ...change } : e)) });
  }

  return (
    <SectionCard
      title="Black Flash"
      description="What the stats read as while one lands, and a log of the ones that have. Nothing here changes the stat block."
    >
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-[18rem] flex-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-void-800 text-left text-[10px] uppercase tracking-wider text-ash-500">
                <th className="pb-1 font-medium">Stat</th>
                <th className="pb-1 font-medium">On the sheet</th>
                <th className="pb-1 font-medium">Black Flash</th>
              </tr>
            </thead>
            <tbody>
              {view.stats.map((stat) => (
                <tr key={stat.id} className="border-b border-void-800/50">
                  <td className="py-1 text-ash-400">{GRADED_STAT_LABELS[stat.id]}</td>
                  <td className="py-1 font-mono text-ash-500">{formatStatShort(stat.base)}</td>
                  <td
                    className={`py-1 font-mono ${
                      stat.moved ? 'text-cursed-400' : 'text-ash-500'
                    }`}
                  >
                    {formatStatShort(stat.buffed)}
                    {stat.id === 'strength' ? (
                      <span className="ml-1.5 text-[10px] text-ash-500">
                        +{view.strengthGrades} grade{view.strengthGrades === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    {!stat.moved ? (
                      <span className="ml-1.5 text-[10px] text-ash-500">unmoved</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="min-w-[16rem] flex-1 rounded-md border border-cursed-600/40 bg-cursed-600/5 px-3 py-2.5 text-[11px] leading-relaxed text-ash-400">
          <p>
            <span className="text-ash-300">+{view.strengthGrades} Grade
            {view.strengthGrades === 1 ? '' : 's'} to Strength</span> for the attack
            {view.halved ? (
              <>
                {' '}— halved, because {gradeLabel(character.grade)} is at or above{' '}
                {gradeLabel(BLACK_FLASH_THRESHOLD)}.
              </>
            ) : (
              <>
                {' '}— the full bonus, until {gradeLabel(BLACK_FLASH_THRESHOLD)}.
              </>
            )}
          </p>
          <p className="mt-1.5">
            <span className="text-ash-300">+1 Class to every stat for {view.turns} turns</span>,
            Strength included. CE Reserves is excluded — it is a band, not a Class.
          </p>
          <p className="mt-1.5">RCT fatigue resets. Narrative only; nothing here tracks it.</p>
          <p className="mt-1.5 text-ash-500">
            Worked out for reading. The stat block above is untouched, and no damage is
            calculated — that is the referee&rsquo;s call, not the app&rsquo;s.
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-void-800 pt-4">
        <div className="mb-2 flex items-baseline gap-3">
          <h4 className="mr-auto text-xs font-medium tracking-wide text-ash-400">
            Log — {blackFlashTotal(character)} in total
            {character.blackFlashCount > 0 ? (
              <span className="ml-1.5 font-normal text-ash-500">
                ({character.blackFlashCount} before the log, {log.length} written up)
              </span>
            ) : null}
          </h4>
          <button
            type="button"
            onClick={record}
            className="rounded-md border border-cursed-600 bg-cursed-600/15 px-2.5 py-1 text-xs text-ash-100 transition-colors hover:bg-cursed-600/25"
          >
            Record a Black Flash
          </button>
        </div>

        {log.length === 0 ? (
          <p className="rounded-md border border-dashed border-void-800 px-3 py-4 text-center text-xs text-ash-500">
            None written up yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-end gap-2 rounded-md border border-void-800 bg-void-850/50 p-2.5"
              >
                <label className="flex w-28 flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-ash-500">Date</span>
                  <input
                    type="text"
                    className={CELL}
                    value={entry.date}
                    onChange={(e) => patch(entry.id, { date: e.target.value })}
                  />
                </label>
                <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-ash-500">
                    Against
                  </span>
                  <input
                    type="text"
                    className={CELL}
                    value={entry.against}
                    placeholder="A Grade 2 curse"
                    onChange={(e) => patch(entry.id, { against: e.target.value })}
                  />
                </label>
                <label className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-ash-500">Notes</span>
                  <input
                    type="text"
                    className={CELL}
                    value={entry.notes}
                    onChange={(e) => patch(entry.id, { notes: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ blackFlashes: log.filter((other) => other.id !== entry.id) })
                  }
                  aria-label="Remove this Black Flash"
                  className="shrink-0 rounded border border-void-700 px-1.5 py-1 text-xs leading-none text-ash-500 transition-colors hover:border-blood-600 hover:text-blood-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
