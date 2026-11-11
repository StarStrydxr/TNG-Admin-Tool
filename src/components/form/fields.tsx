import { useEffect, useId, useState, type ReactNode } from 'react';

const INPUT_CLASS =
  'w-full rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly htmlFor: string;
  readonly children: ReactNode;
}

export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium tracking-wide text-ash-400">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ash-500">{hint}</p> : null}
    </div>
  );
}

interface TextInputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly hint?: string;
  /** Suggestions the user may ignore — used where values are setting content, not an enum. */
  readonly suggestions?: readonly string[];
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  suggestions,
}: TextInputProps) {
  const id = useId();
  const listId = `${id}-options`;

  return (
    <Field label={label} htmlFor={id} {...(hint ? { hint } : {})}>
      <input
        id={id}
        type="text"
        className={INPUT_CLASS}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
        {...(suggestions ? { list: listId } : {})}
      />
      {suggestions ? (
        <datalist id={listId}>
          {suggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ) : null}
    </Field>
  );
}

interface TextAreaProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
  readonly placeholder?: string;
  readonly hint?: string;
}

export function TextArea({ label, value, onChange, rows, placeholder, hint }: TextAreaProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} {...(hint ? { hint } : {})}>
      <textarea
        id={id}
        className={`${INPUT_CLASS} resize-y leading-relaxed`}
        rows={rows ?? 3}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** One entry per non-empty line. Trailing and blank lines are for typing, not for storing. */
export function parseLines(text: string): readonly string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * The raw text behind a textarea whose model is a parsed list.
 *
 * ⚠️ **This is load-bearing and the obvious version is broken.** Derive the value from the
 * list, re-parse on every keystroke and drop blank lines, and a newline becomes impossible:
 * Enter gives `"…\n"`, the blank line is filtered out, the value re-renders without it, and the
 * keystroke is undone as fast as it is typed. A second line is unreachable. That shipped once,
 * on the clan mutation editor, and Dan hit it.
 *
 * So the text is held here and only the parsed list goes upward. The model is taken back only
 * when it says something this text does not already say — switching record, or an undo — so
 * whitespace mid-typing survives a re-render.
 *
 * Exported as a hook rather than a component because the two callers sit in differently styled
 * contexts (`LinesField` here, `LinesArea` in the clan row list) and the mechanism, not the
 * markup, is the part that must not be reimplemented.
 */
export function useLineBuffer(
  lines: readonly string[],
  onChange: (lines: readonly string[]) => void,
): { readonly text: string; readonly setText: (next: string) => void } {
  const canonical = lines.join('\n');
  const [text, setLocal] = useState(canonical);

  useEffect(() => {
    setLocal((current) => (parseLines(current).join('\n') === canonical ? current : canonical));
  }, [canonical]);

  return {
    text,
    setText: (next: string) => {
      setLocal(next);
      onChange(parseLines(next));
    },
  };
}

interface LinesFieldProps {
  readonly label: string;
  readonly lines: readonly string[];
  readonly onChange: (lines: readonly string[]) => void;
  readonly rows?: number;
  readonly placeholder?: string;
  readonly hint?: string;
}

/** A list edited as text, one entry per line. See `useLineBuffer` for why it holds its own. */
export function LinesField({ label, lines, onChange, rows, placeholder, hint }: LinesFieldProps) {
  const buffer = useLineBuffer(lines, onChange);
  return (
    <TextArea
      label={label}
      value={buffer.text}
      onChange={buffer.setText}
      {...(rows === undefined ? {} : { rows })}
      {...(placeholder === undefined ? {} : { placeholder })}
      {...(hint === undefined ? {} : { hint })}
    />
  );
}

interface SelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
  readonly hint?: string;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectProps<T>) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} {...(hint ? { hint } : {})}>
      <select
        id={id}
        className={INPUT_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface NumberInputProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly hint?: string;
}

export function NumberInput({ label, value, onChange, min, hint }: NumberInputProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} {...(hint ? { hint } : {})}>
      <input
        id={id}
        type="number"
        className={INPUT_CLASS}
        value={value}
        min={min ?? 0}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(parsed) ? Math.max(min ?? 0, parsed) : (min ?? 0));
        }}
      />
    </Field>
  );
}

interface StepperProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly hint?: string;
}

/**
 * A number you nudge rather than retype.
 *
 * Slot counts move by one, almost always, and reaching for the keyboard to change 4 to 5 is
 * more work than the change deserves. The field itself stays typable for the jump from 4 to 12.
 */
export function Stepper({ label, value, onChange, min = 0, max = 99, hint }: StepperProps) {
  const id = useId();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <Field label={label} htmlFor={id} {...(hint ? { hint } : {})}>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`${label}: one fewer`}
          className="w-8 shrink-0 rounded-md border border-void-700 text-sm text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-30"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          className={`${INPUT_CLASS} text-center`}
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            onChange(Number.isFinite(parsed) ? clamp(parsed) : min);
          }}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={`${label}: one more`}
          className="w-8 shrink-0 rounded-md border border-void-700 text-sm text-ash-400 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-100 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </Field>
  );
}

interface CheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 pt-5">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 accent-cursed-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id} className="text-sm text-ash-300">
        {label}
      </label>
    </div>
  );
}
