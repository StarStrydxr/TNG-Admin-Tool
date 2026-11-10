import { useCallback, useEffect, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { PROBLEM_LABELS, findProblems, groupProblems, type Problem } from '../../domain/problems';
import { listImageNames } from '../../services/images';
import { listAllRecords } from '../../services/storage';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Everything quietly wrong, in one place.
 *
 * Reports and stops there — none of these block anything, and several are legitimate on
 * purpose (see `domain/problems.ts`). A checker that nagged about deliberate choices would be
 * ignored, and then it would not be there for the one that mattered.
 */
export function ProblemsSection() {
  const [problems, setProblems] = useState<readonly Problem[] | null>(null);
  const [checkedImages, setCheckedImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [records, imageNames] = await Promise.all([listAllRecords(), listImageNames()]);
      setCheckedImages(imageNames !== null);
      setProblems(findProblems({ records, imageNames }));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const groups = problems ? groupProblems(problems) : [];

  return (
    <SectionCard
      title="Problems"
      description="Things that are not errors but will bite you later."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void check()}
          className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-40"
        >
          {busy ? 'Checking…' : 'Check again'}
        </button>

        {problems ? (
          <span className="text-xs text-ash-500">
            {problems.length === 0
              ? 'Nothing to report.'
              : `${problems.length} thing${problems.length === 1 ? '' : 's'} worth a look.`}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-xs text-blood-500">{error}</p> : null}

      {!checkedImages ? (
        <p className="mb-3 rounded-md border border-void-800 px-3 py-2 text-xs text-ash-500">
          Could not read the images folder, so missing pictures were not checked. Everything
          else was.
        </p>
      ) : null}

      {problems && problems.length === 0 ? (
        <p className="text-xs text-ash-500">
          No dangling links, no missing pictures, no duplicate names, nothing over its slot
          limit.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {groups.map(([kind, found]) => (
          <section key={kind}>
            <h4 className="text-xs font-medium tracking-wide text-ash-400">
              {PROBLEM_LABELS[kind]}{' '}
              <span className="text-ash-500">· {found.length}</span>
            </h4>
            <ul className="mt-1.5 flex flex-col gap-1">
              {found.map((problem, index) => (
                <li
                  key={`${problem.recordId}-${index}`}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded border border-void-800 bg-void-850/50 px-2.5 py-1.5 text-xs"
                >
                  <span className="text-ash-200">{problem.recordName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-ash-500">
                    {problem.recordKind}
                  </span>
                  <span className="w-full text-ash-500">{problem.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ash-500">
        None of these stop anything. A record over its slot limit is a soft warning by design,
        and a picture someone deleted on purpose is not a fault — this is a list to glance at,
        not a queue to clear.
      </p>
    </SectionCard>
  );
}
