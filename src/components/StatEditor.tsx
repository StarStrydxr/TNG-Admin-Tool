import {
  CIVILIAN_GRADE,
  CIVILIAN_STAT,
  CLASS_DESCRIPTIONS,
  CLASS_RANKS,
  GRADE_IDS,
  formatStatShort,
  gradeLabel,
  isGradeId,
  isListedGrade,
  statValue,
  type ClassRank,
  type StatValue,
} from '../domain/grades';

interface StatEditorProps {
  readonly label: string;
  readonly value: StatValue;
  readonly onChange: (value: StatValue) => void;
}

const SELECT_CLASS =
  'rounded-md border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 outline-none ' +
  'transition-colors focus:border-cursed-500';

/**
 * One graded stat: a grade, a class, and the `G1[C3]` form rendered alongside.
 *
 * The grade list includes the implied Semi-/Demi- rungs, marked, because a stat really can land
 * on one. Those are shown in parentheses so they read as unofficial.
 *
 * Nothing here computes. Dan sets the final value by hand — see CLAUDE.md §4.
 */
export function StatEditor({ label, value, onChange }: StatEditorProps) {
  const isCivilian = value.kind === 'civilian';
  const currentGrade = isCivilian ? CIVILIAN_GRADE : value.grade;
  const currentClass: ClassRank = isCivilian ? 3 : value.classRank;

  function changeGrade(next: string) {
    if (next === CIVILIAN_GRADE) {
      onChange(CIVILIAN_STAT);
      return;
    }
    if (isGradeId(next)) onChange(statValue(next, currentClass));
  }

  return (
    <div className="flex items-center gap-2 border-b border-void-850 py-1.5 last:border-b-0">
      <span className="w-32 shrink-0 text-sm text-ash-300">{label}</span>

      <select
        className={`${SELECT_CLASS} flex-1`}
        value={currentGrade}
        onChange={(event) => changeGrade(event.target.value)}
        aria-label={`${label} grade`}
      >
        <option value={CIVILIAN_GRADE}>Civilian Grade</option>
        {GRADE_IDS.map((id) => (
          <option key={id} value={id}>
            {isListedGrade(id) ? gradeLabel(id) : `(${gradeLabel(id)})`}
          </option>
        ))}
      </select>

      <select
        className={`${SELECT_CLASS} w-36`}
        value={currentClass}
        disabled={isCivilian}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10) as ClassRank;
          if (!isCivilian) onChange(statValue(value.grade, next));
        }}
        aria-label={`${label} class`}
        title={isCivilian ? 'Civilian Grade has no class' : CLASS_DESCRIPTIONS[currentClass]}
      >
        {CLASS_RANKS.map((rank) => (
          <option key={rank} value={rank}>
            {`Class ${rank}`}
          </option>
        ))}
      </select>

      <code className="w-24 shrink-0 text-right font-mono text-xs text-cursed-400">
        {formatStatShort(value)}
      </code>
    </div>
  );
}
