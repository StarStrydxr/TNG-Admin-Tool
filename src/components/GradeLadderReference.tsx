import {
  GRADE_IDS,
  gradeAbbrev,
  gradeLabel,
  gradeRank,
  isListedGrade,
  powerRatio,
} from '../domain/grades';

const WEAKEST = GRADE_IDS[0];

/**
 * Read-only reference for the grade ladder, rendered straight from the domain model so it
 * can never drift from the rules the rest of the app enforces.
 *
 * Power multiples are shown because the rules define a grade gap as a doubling. They are
 * reference figures, not a comparison tool — see CLAUDE.md §4.
 */
export function GradeLadderReference() {
  if (!WEAKEST) return null;

  return (
    <section className="max-w-2xl" data-selectable>
      <h2 className="font-display text-lg text-ash-100">Grade ladder</h2>
      <p className="mt-1 text-sm text-ash-500">
        Each rung is one grade gap, and one gap doubles. Rungs in muted type are implied — the
        server does not name them, but gap counting depends on them.
      </p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-void-700 text-left text-xs uppercase tracking-wider text-ash-500">
            <th className="py-2 pr-4 font-medium">Rank</th>
            <th className="py-2 pr-4 font-medium">Grade</th>
            <th className="py-2 pr-4 font-medium">Short</th>
            <th className="py-2 font-medium text-right">vs Grade 4</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-void-850 text-ash-500">
            <td className="py-1.5 pr-4 font-mono text-xs">—</td>
            <td className="py-1.5 pr-4">Civilian Grade</td>
            <td className="py-1.5 pr-4 font-mono text-xs">CIV</td>
            <td className="py-1.5 text-right font-mono text-xs">floor</td>
          </tr>
          {GRADE_IDS.map((id) => {
            const listed = isListedGrade(id);
            return (
              <tr key={id} className="border-b border-void-850">
                <td className="py-1.5 pr-4 font-mono text-xs text-ash-500">{gradeRank(id)}</td>
                <td className={`py-1.5 pr-4 ${listed ? 'text-ash-300' : 'italic text-ash-500'}`}>
                  {gradeLabel(id)}
                </td>
                <td className="py-1.5 pr-4 font-mono text-xs text-cursed-400">
                  {gradeAbbrev(id)}
                </td>
                <td className="py-1.5 text-right font-mono text-xs text-ash-500">
                  {`${powerRatio(id, WEAKEST).toLocaleString()}×`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
