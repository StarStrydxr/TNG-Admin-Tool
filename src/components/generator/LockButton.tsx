interface LockButtonProps {
  readonly locked: boolean;
  readonly onToggle: () => void;
  readonly label: string;
}

/**
 * Monochrome rather than the 🔒/🔓 emoji: at this size both emoji render as the same yellow
 * padlock on Windows, so lock state was unreadable at a glance. The shackle position carries
 * the state, and colour reinforces it.
 */
export function LockButton({ locked, onToggle, label }: LockButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={locked}
      aria-label={locked ? `${label} — locked` : `${label} — unlocked`}
      title={locked ? 'Locked. Re-rolls skip this.' : 'Lock so re-rolls skip this.'}
      className={[
        'rounded p-1 transition-colors',
        locked
          ? 'bg-cursed-600/25 text-cursed-400'
          : 'text-ash-500 hover:bg-void-800 hover:text-ash-300',
      ].join(' ')}
    >
      <svg
        width="12"
        height="14"
        viewBox="0 0 12 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        aria-hidden
      >
        <rect x="1" y="6.5" width="10" height="6.5" rx="1.5" />
        {locked ? (
          <path d="M3.4 6.5V4.2a2.6 2.6 0 0 1 5.2 0v2.3" />
        ) : (
          <path d="M3.4 6.5V4.2a2.6 2.6 0 0 1 5.2 0" />
        )}
      </svg>
    </button>
  );
}
