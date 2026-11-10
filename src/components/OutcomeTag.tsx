import { MISSION_OUTCOME_LABELS, type MissionOutcome } from '../domain/character';

interface OutcomeTagProps {
  readonly outcome: MissionOutcome;
  readonly mvp: boolean;
}

/**
 * SUCCESS / FAILURE / MVP, as the server writes them.
 *
 * Colour comes from the theme tokens, never a hex, so a repaint carries the tags with it — and
 * because colour alone cannot be the signal (a colour-blind reader, a monochrome print), the
 * word itself is always there. Shape over colour, the same bargain the insignia make.
 */
export function OutcomeTag({ outcome, mvp }: OutcomeTagProps) {
  const tone =
    outcome === 'success'
      ? 'border-cursed-600 text-cursed-400'
      : outcome === 'failure'
        ? 'border-blood-600 text-blood-500'
        : 'border-void-700 text-ash-500';

  return (
    <span className="flex shrink-0 items-center gap-1">
      {mvp ? (
        <span className="rounded border border-cursed-600 bg-cursed-600/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ash-100 print-border print-ink">
          MVP
        </span>
      ) : null}
      <span
        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider print-border print-muted ${tone}`}
      >
        {MISSION_OUTCOME_LABELS[outcome]}
      </span>
    </span>
  );
}
