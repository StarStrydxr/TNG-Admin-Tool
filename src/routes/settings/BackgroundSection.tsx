import { SectionCard } from '../../components/SectionCard';
import { ImagePicker } from '../../components/form/ImagePicker';
import { BACKGROUND_OPACITY_MAX } from '../../domain/settings';
import { useSettings } from '../../hooks/useSettings';

/**
 * A picture behind the app.
 *
 * Deliberately limited. The interface sits on top of this, and every theme is contrast-checked
 * against a flat background — a photograph at full strength behind body text would undo all of
 * that. So strength is capped (`BACKGROUND_OPACITY_MAX`) and blur defaults on, which is what
 * makes a busy image survivable behind text. The cap is enforced in the parser too, so editing
 * `config.json` by hand cannot get round it.
 */
export function BackgroundSection() {
  const { settings, setBackground } = useSettings();
  const { background } = settings;

  const percent = Math.round((background.opacity / BACKGROUND_OPACITY_MAX) * 100);

  return (
    <SectionCard
      title="Background"
      description="An image behind the whole app. Kept faint on purpose — text has to stay readable."
    >
      <div className="flex flex-wrap items-start gap-6">
        <ImagePicker
          label="Image"
          size="lg"
          value={background.image}
          onChange={(image) => setBackground({ image })}
        />

        <div className="flex min-w-[16rem] flex-1 flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between text-xs text-ash-400">
              <span>Strength</span>
              <span className="font-mono text-[11px] text-ash-500">{percent}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={BACKGROUND_OPACITY_MAX}
              step={0.01}
              value={background.opacity}
              disabled={!background.image}
              onChange={(event) => setBackground({ opacity: Number(event.target.value) })}
              className="w-full accent-cursed-500 disabled:opacity-40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between text-xs text-ash-400">
              <span>Blur</span>
              <span className="font-mono text-[11px] text-ash-500">{background.blur}px</span>
            </span>
            <input
              type="range"
              min={0}
              max={24}
              step={1}
              value={background.blur}
              disabled={!background.image}
              onChange={(event) => setBackground({ blur: Number(event.target.value) })}
              className="w-full accent-cursed-500 disabled:opacity-40"
            />
          </label>

          <p className="text-xs leading-relaxed text-ash-500">
            {background.image
              ? 'Full strength is capped well below opaque, and panels stay solid on top of it — so the picture reads as texture between them rather than behind your text.'
              : 'Choose or drop an image to turn this on. It never prints, and it is stored in the same images folder as your portraits.'}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
