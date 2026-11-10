import { SectionCard } from '../../components/SectionCard';
import { prefersReducedMotion } from '../../appearance';
import { useAnnouncer } from '../../hooks/useAnnouncer';
import { useSettings } from '../../hooks/useSettings';
import {
  FONT_CHOICES,
  FONT_LABELS,
  TEXT_SCALES,
  TEXT_SCALE_LABELS,
  type FontChoice,
  type TextScale,
} from '../../domain/settings';

interface ToggleProps {
  readonly label: string;
  readonly hint: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly note?: string;
}

function Toggle({ label, hint, checked, onChange, note }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-b border-void-850 py-3 last:border-b-0">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-cursed-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm text-ash-300">{label}</span>
        <span className="block text-xs text-ash-500">{hint}</span>
        {note ? <span className="mt-1 block text-xs text-cursed-400">{note}</span> : null}
      </span>
    </label>
  );
}

export function AccessibilitySection() {
  const { settings, setAppearance, reset } = useSettings();
  const { announce, speechSupported } = useAnnouncer();
  const { appearance } = settings;
  const systemReduced = prefersReducedMotion();

  return (
    <SectionCard title="Accessibility">
      <div className="flex flex-col gap-5">
        <div>
          <span className="mb-2 block text-xs font-medium tracking-wide text-ash-400">
            Text size
          </span>
          <div className="flex gap-1 rounded-md border border-void-700 p-0.5">
            {TEXT_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setAppearance({ textScale: scale as TextScale })}
                aria-pressed={appearance.textScale === scale}
                className={[
                  'flex-1 rounded px-2 py-1.5 text-sm transition-colors',
                  appearance.textScale === scale
                    ? 'bg-void-700 text-ash-100'
                    : 'text-ash-500 hover:text-ash-300',
                ].join(' ')}
              >
                {TEXT_SCALE_LABELS[String(scale)] ?? `${scale}×`}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ash-500">
            Scales the whole interface, not just body copy.
          </p>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium tracking-wide text-ash-400">
            Typeface
          </span>
          <div className="flex flex-col gap-1">
            {FONT_CHOICES.map((font: FontChoice) => (
              <label key={font} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="font-family"
                  className="h-3.5 w-3.5 accent-cursed-500"
                  checked={appearance.fontFamily === font}
                  onChange={() => setAppearance({ fontFamily: font })}
                />
                <span className="text-sm text-ash-300">{FONT_LABELS[font]}</span>
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ash-500">
            System faces only — the app never fetches a font, so it keeps working offline.
          </p>
        </div>

        <div>
          <Toggle
            label="High contrast"
            hint="Pushes text and borders further from the background. Works with any theme, preset or custom."
            checked={appearance.highContrast}
            onChange={(highContrast) => setAppearance({ highContrast })}
          />
          <Toggle
            label="Reduce motion"
            hint="Removes transitions and animations."
            checked={appearance.reducedMotion}
            onChange={(reducedMotion) => setAppearance({ reducedMotion })}
            {...(systemReduced
              ? { note: 'Windows is already asking for reduced motion, so this is on regardless.' }
              : {})}
          />
          <Toggle
            label="Strong focus ring"
            hint="A thicker, higher-contrast outline on whatever the keyboard is focused on."
            checked={appearance.strongFocus}
            onChange={(strongFocus) => setAppearance({ strongFocus })}
          />
          <Toggle
            label="Speak status messages"
            hint="Reads out rolls, saves and errors using a Windows voice. Status messages are always exposed to Narrator and other screen readers whether this is on or not."
            checked={appearance.speakAnnouncements}
            onChange={(speakAnnouncements) => {
              setAppearance({ speakAnnouncements });
              if (speakAnnouncements) announce('Spoken announcements on.');
            }}
            {...(speechSupported
              ? {}
              : { note: 'No speech voice is available here, so this will stay silent.' })}
          />
        </div>

        <div className="border-t border-void-800 pt-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
          >
            Reset all appearance settings
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
