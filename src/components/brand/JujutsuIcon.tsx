import type { ShellIconId } from '../../domain/shell';
import { JUJUTSU_ICONS } from './icons';

interface JujutsuIconProps {
  readonly id: ShellIconId;
  /** A size in px, for a caller that has one. Otherwise size it with a class. */
  readonly size?: number | undefined;
  readonly className?: string | undefined;
  /** Read out in place of the picture. Leave it off where a name sits beside the icon. */
  readonly label?: string | undefined;
}

/**
 * One mark from the Jujutsu set.
 *
 * Decorative unless given a `label`, for the same reason `Insignia` is: these sit beside a
 * name that already says what the thing is, and a screen reader announcing "Mission"
 * immediately before the word "Mission" is noise.
 */
export function JujutsuIcon({ id, size, className, label }: JujutsuIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {JUJUTSU_ICONS[id].map((part, index) =>
        'ring' in part ? (
          <circle
            key={index}
            cx="12"
            cy="12"
            r={part.ring}
            fill="none"
            stroke="currentColor"
            strokeWidth={part.width}
            strokeDasharray={part.dash}
            transform={part.transform}
          />
        ) : part.stroke ? (
          <path
            key={index}
            d={part.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={part.stroke}
            strokeLinejoin="round"
            transform={part.transform}
          />
        ) : (
          <path
            key={index}
            d={part.d}
            fill="currentColor"
            fillRule="evenodd"
            transform={part.transform}
          />
        ),
      )}
    </svg>
  );
}
