import { useMemo } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { ColorField } from '../../components/settings/ColorField';
import { ContrastReadout } from '../../components/settings/ContrastReadout';
import { useSettings } from '../../hooks/useSettings';
import { THEME_PRESETS, checkThemeContrast, type ThemeSeed } from '../../domain/theme';

const SEED_FIELDS: readonly { key: keyof ThemeSeed; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'The page behind everything' },
  { key: 'surface', label: 'Panels', hint: 'Cards and sidebars' },
  { key: 'border', label: 'Borders', hint: 'Hairlines and input outlines' },
  { key: 'text', label: 'Text', hint: 'Brightest body text; dimmer tiers derive from it' },
  { key: 'accent', label: 'Accent', hint: 'Buttons, locks, highlights' },
  { key: 'danger', label: 'Danger', hint: 'Delete, warnings, failed contrast' },
];

export function ThemeSection() {
  const { settings, setPreset, setSeed } = useSettings();
  const { presetId, seed } = settings.theme;

  const checks = useMemo(() => checkThemeContrast(seed), [seed]);

  return (
    <>
      <SectionCard
        title="Theme"
        description="Six colours; everything else in the interface is derived from them."
      >
        <div className="grid grid-cols-3 gap-3">
          {THEME_PRESETS.map((preset) => {
            const active = preset.id === presetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPreset(preset.id)}
                aria-pressed={active}
                className={[
                  'rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-cursed-500 bg-void-800'
                    : 'border-void-700 hover:border-void-600',
                ].join(' ')}
              >
                <span className="flex gap-1" aria-hidden>
                  {[
                    preset.seed.background,
                    preset.seed.surface,
                    preset.seed.text,
                    preset.seed.accent,
                    preset.seed.danger,
                  ].map((color, index) => (
                    <span
                      key={index}
                      className="h-5 flex-1 rounded-sm border border-black/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="mt-2 block text-sm text-ash-100">{preset.name}</span>
                <span className="mt-0.5 block text-xs text-ash-500">{preset.description}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-ash-500">
          {presetId === null
            ? 'Using a custom palette. Picking a preset above replaces it.'
            : 'Changing any colour below switches to a custom palette; the preset is left untouched.'}
        </p>
      </SectionCard>

      <SectionCard title="Custom colours">
        <div className="flex flex-col gap-4">
          {SEED_FIELDS.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={seed[field.key]}
              onChange={(value) => setSeed({ ...seed, [field.key]: value })}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-void-800 pt-4">
          <h3 className="mb-2 text-xs font-medium tracking-wide text-ash-400">
            Readability (WCAG contrast)
          </h3>
          <ContrastReadout checks={checks} />
        </div>
      </SectionCard>
    </>
  );
}
