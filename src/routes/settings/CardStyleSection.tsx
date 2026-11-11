import { useMemo, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { ColorField } from '../../components/settings/ColorField';
import { ContrastReadout } from '../../components/settings/ContrastReadout';
import { useSettings } from '../../hooks/useSettings';
import {
  CARD_KINDS,
  CARD_KIND_LABELS,
  cardSeed,
  type CardKind,
} from '../../domain/card-style';
import { FONT_CHOICES, FONT_LABELS, isFontChoice } from '../../domain/fonts';
import { checkThemeContrast, type ThemeSeed } from '../../domain/theme';

const SEED_FIELDS: readonly { key: keyof ThemeSeed; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'Behind the card' },
  { key: 'surface', label: 'Panel', hint: 'The card itself' },
  { key: 'border', label: 'Borders', hint: 'The frame and the heading rules' },
  { key: 'text', label: 'Text', hint: 'Brightest text; the dimmer tiers derive from it' },
  { key: 'accent', label: 'Accent', hint: 'Grade chip, technique name, derived readings' },
  { key: 'danger', label: 'Danger', hint: 'Rarely used on a card, but derived from here' },
];

const FIELD =
  'w-full rounded border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

/**
 * Fonts and colours for the generated graphics, one style per kind.
 *
 * The palette is the same six seeds a theme is built from, so the readability readout is the
 * theme editor's own — a card palette can be judged before it is used rather than after a
 * posting has gone out unreadable.
 */
export function CardStyleSection() {
  const { settings, setCardStyle } = useSettings();
  const [kind, setKind] = useState<CardKind>('character');

  const style = settings.cardStyles[kind];
  const seed = cardSeed(style, settings.theme.seed);
  const checks = useMemo(() => checkThemeContrast(seed), [seed]);

  function setFont(slot: 'display' | 'body', value: string) {
    setCardStyle(kind, { fonts: { ...style.fonts, [slot]: value } });
  }

  return (
    <SectionCard
      title="Card fonts and colours"
      description="How the generated graphics are painted and lettered. Each kind keeps its own."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {CARD_KINDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === kind}
            onClick={() => setKind(id)}
            className={[
              'rounded-md border px-3 py-1.5 text-xs transition-colors',
              id === kind
                ? 'border-cursed-500 text-ash-100'
                : 'border-void-700 text-ash-400 hover:border-void-600 hover:text-ash-200',
            ].join(' ')}
          >
            {CARD_KIND_LABELS[id]}
          </button>
        ))}
      </div>

      <label className="mb-5 flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={style.followTheme}
          onChange={(event) => setCardStyle(kind, { followTheme: event.target.checked })}
        />
        <span>
          <span className="text-sm text-ash-200">Follow the app theme</span>
          <span className="mt-0.5 block text-xs text-ash-500">
            On by default. Repainting the theme in Settings repaints these graphics too. Turn it
            off to give {CARD_KIND_LABELS[kind].toLowerCase()} a palette of their own.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Display face</span>
          <input
            type="text"
            className={FIELD}
            list="card-fonts"
            value={style.fonts.display}
            onChange={(event) => setFont('display', event.target.value)}
          />
          <span className="text-[11px] text-ash-500">Names, headings and the grade chip.</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Body face</span>
          <input
            type="text"
            className={FIELD}
            list="card-fonts"
            value={style.fonts.body}
            onChange={(event) => setFont('body', event.target.value)}
          />
          <span className="text-[11px] text-ash-500">Values, labels and prose.</span>
        </label>

        <datalist id="card-fonts">
          {FONT_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {FONT_LABELS[choice]}
            </option>
          ))}
        </datalist>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ash-500">
        Pick one of the five, or type the name of any font installed on this PC — it is matched
        locally, never fetched.{' '}
        {isFontChoice(style.fonts.display) && isFontChoice(style.fonts.body) ? null : (
          <span className="text-ash-400">
            ⚠️ A locally-installed font bakes into a PNG or JPEG, but a shared .svg will fall
            back to the default on a machine that does not have it.
          </span>
        )}
      </p>

      {style.followTheme ? null : (
        <>
          <div className="mt-6 flex flex-col gap-4 border-t border-void-800 pt-5">
            {SEED_FIELDS.map((field) => (
              <ColorField
                key={field.key}
                label={field.label}
                hint={field.hint}
                value={seed[field.key]}
                onChange={(value) => setCardStyle(kind, { seed: { ...seed, [field.key]: value } })}
              />
            ))}
          </div>

          <div className="mt-6 border-t border-void-800 pt-4">
            <h3 className="mb-2 text-xs font-medium tracking-wide text-ash-400">
              Readability (WCAG contrast)
            </h3>
            <ContrastReadout checks={checks} />
          </div>
        </>
      )}
    </SectionCard>
  );
}
