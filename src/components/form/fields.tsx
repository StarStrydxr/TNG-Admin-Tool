import { useId, type ReactNode } from 'react';

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
