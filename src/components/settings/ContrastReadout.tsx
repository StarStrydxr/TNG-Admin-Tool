import type { ContrastRating } from '../../domain/color';
import type { ContrastCheck } from '../../domain/theme';

const RATING_LABELS: Record<ContrastRating, string> = {
  aaa: 'AAA',
  aa: 'AA',
  'aa-large': 'Large text only',
  fail: 'Too low',
};

function ratingClass(rating: ContrastRating): string {
  if (rating === 'fail') return 'bg-blood-500/15 text-blood-500';
  if (rating === 'aa-large') return 'bg-void-700 text-ash-300';
  return 'bg-cursed-600/20 text-cursed-400';
}

/**
 * Live WCAG readout for the current palette. The point is that a custom theme can be judged
 * before it is lived with, rather than after it has made something unreadable.
 */
export function ContrastReadout({ checks }: { readonly checks: readonly ContrastCheck[] }) {
  const worst = checks.reduce<ContrastCheck | null>(
    (lowest, check) => (lowest === null || check.ratio < lowest.ratio ? check : lowest),
    null,
  );

  return (
    <div>
      <ul className="flex flex-col gap-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center justify-between gap-3 border-b border-void-850 py-1.5 last:border-b-0"
          >
            <span className="text-sm text-ash-400">{check.label}</span>
            <span className="flex shrink-0 items-center gap-2">
              <code className="font-mono text-xs text-ash-500">
                {check.ratio.toFixed(1)}:1
              </code>
              <span className={`rounded-sm px-1.5 py-0.5 text-[11px] ${ratingClass(check.rating)}`}>
                {RATING_LABELS[check.rating]}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {worst && worst.rating === 'fail' ? (
        <p className="mt-3 rounded-md border border-blood-500/30 bg-blood-500/10 px-3 py-2 text-xs text-ash-300">
          “{worst.label}” is below the 3:1 floor. Nothing is blocked, but that combination will
          be hard to read.
        </p>
      ) : null}
    </div>
  );
}
