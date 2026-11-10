import { useId } from 'react';

import { isHexColor } from '../../domain/color';

interface ColorFieldProps {
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * Swatch plus hex box. Both edit the same value; the hex box only commits when it parses, so
 * typing a partial colour doesn't repaint the app mid-keystroke.
 */
export function ColorField({ label, hint, value, onChange }: ColorFieldProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-void-700 bg-void-850 p-0.5"
        aria-label={`${label} colour picker`}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm text-ash-300">
          {label}
        </label>
        <span className="block text-xs text-ash-500">{hint}</span>
      </div>
      <input
        type="text"
        value={value}
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value;
          if (isHexColor(next)) onChange(next.startsWith('#') ? next : `#${next}`);
        }}
        aria-label={`${label} hex value`}
        className="w-24 shrink-0 rounded-md border border-void-700 bg-void-850 px-2 py-1 font-mono text-xs text-ash-100 outline-none focus:border-cursed-500"
      />
    </div>
  );
}
