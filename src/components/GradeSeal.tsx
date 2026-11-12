import { gradeAbbrev, gradeLabel, type StatGrade } from '../domain/grades';
import { useInterfaceStyle } from '../hooks/useSettings';

interface GradeSealProps {
  readonly grade: StatGrade;
  /** `sm` for a row in a list, `md` beside a heading. */
  readonly size?: 'sm' | 'md';
  /** Extra classes for the stamp. ⚠️ Jujutsu only — Classic's bare code never had any. */
  readonly className?: string;
}

/**
 * A grade beside a name.
 *
 * In the Jujutsu interface it is the stamp it would be on the paperwork: a frame inside a
 * frame, which is what a registration seal is, around the same abbreviation and in the same
 * accent the bare `G1` always had — so it still reads as "the grade" at a glance, and still
 * repaints with the theme. Kept square to the line on purpose: turning eleven-point type a
 * couple of degrees makes it soft, and a grade has to be legible first. The long name is its
 * tooltip, because `S-SG` is not obvious to someone new to the ladder.
 *
 * In Classic it is that bare code, exactly as it was — same classes, same sizes, no frame.
 */
export function GradeSeal({ grade, size = 'md', className = '' }: GradeSealProps) {
  const style = useInterfaceStyle();

  if (style === 'classic') {
    return (
      <code
        className={[
          'shrink-0 font-mono text-cursed-400',
          size === 'sm' ? 'text-[11px]' : 'text-xs',
        ].join(' ')}
      >
        {gradeAbbrev(grade)}
      </code>
    );
  }

  return (
    <span
      title={gradeLabel(grade)}
      className={`inline-flex shrink-0 rounded-sm border border-cursed-400/70 p-px text-cursed-400 ${className}`}
    >
      <code
        className={[
          'rounded-[1px] border border-cursed-400/35 font-mono leading-none',
          size === 'sm' ? 'px-1 py-0.5 text-[0.6875rem]' : 'px-1.5 py-1 text-xs',
        ].join(' ')}
      >
        {gradeAbbrev(grade)}
      </code>
    </span>
  );
}
