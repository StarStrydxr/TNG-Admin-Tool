import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { SectionCard } from '../../../components/SectionCard';
import { useCard } from '../../../hooks/useCard';
import {
  CARD_BLOCK_LABELS,
  CARD_FOCUS_IDS,
  CARD_FOCUS_LABELS,
  CARD_SCALES,
  type CardFocus,
  type CardPresetId,
  type CardScale,
} from '../../../domain/card';
import { CARD_FORMATS, CARD_FORMAT_LABELS, type CardFormat } from '../../../services/cards';
import type { CardSubject } from '../../../domain/card-render';

interface SectionProps {
  /** Any record a graphic can be made of — a character, a clan or a mission. */
  readonly subject: CardSubject;
}

const FIELD =
  'w-full rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 ' +
  'outline-none transition-colors placeholder:text-ash-500 focus:border-cursed-500';

const BUTTON =
  'rounded border border-void-700 bg-void-850 px-3 py-1.5 text-xs text-ash-200 ' +
  'transition-colors hover:border-cursed-500 hover:text-ash-100 disabled:opacity-50';

/**
 * The card, and the knobs for it.
 *
 * The preview is the document itself, dropped into the page as markup rather than as a
 * picture of one — so it is exact, it costs no rasterization, and it stays sharp at any size.
 * What you see is byte-for-byte what the SVG export writes and what the PNG is drawn from.
 */
export function CardSection(props: SectionProps) {
  return (
    <ErrorBoundary what="The card panel">
      <CardPanel {...props} />
    </ErrorBoundary>
  );
}

function CardPanel({ subject }: SectionProps) {
  const card = useCard(subject);
  const { options } = card;

  return (
    <SectionCard
      title="Card"
      description="A graphic of this character for posting. Exports as PNG, JPEG or SVG; for a PDF, print it."
    >
      <div className="flex flex-wrap items-start gap-6">
        <div
          className="shrink-0 overflow-hidden rounded border border-void-800"
          style={{ width: 260 }}
          /* The SVG is ours, built in `domain/card-character.ts` from escaped values — no
             user markup reaches it, which is what `esc()` is for. */
          dangerouslySetInnerHTML={{
            __html: card.svg.replace(
              /^<svg /,
              '<svg style="display:block;width:100%;height:auto" ',
            ),
          }}
        />

        <div className="min-w-[18rem] flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Shape</span>
              <select
                className={FIELD}
                value={options.presetId}
                onChange={(event) =>
                  card.setOptions({ presetId: event.target.value as CardPresetId })
                }
              >
                {card.presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} — {preset.width}×{preset.height}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-ash-500">
                {card.presets.find((preset) => preset.id === options.presetId)?.note}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Picture focus</span>
              <select
                className={FIELD}
                value={options.focus}
                onChange={(event) => card.setOptions({ focus: event.target.value as CardFocus })}
              >
                {CARD_FOCUS_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CARD_FOCUS_LABELS[id]}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-ash-500">
                The picture is cropped to fill, so something is always lost.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Title</span>
              <input
                type="text"
                className={FIELD}
                value={options.title}
                placeholder="The character's own name"
                onChange={(event) => card.setOptions({ title: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Subtitle</span>
              <input
                type="text"
                className={FIELD}
                value={options.subtitle}
                placeholder="A line under the title"
                onChange={(event) => card.setOptions({ subtitle: event.target.value })}
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs text-ash-400">Show</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {card.allowedBlocks.map((block) => (
                <label key={block} className="flex items-center gap-1.5 text-xs text-ash-300">
                  <input
                    type="checkbox"
                    checked={options.blocks.includes(block)}
                    onChange={() => card.toggleBlock(block)}
                  />
                  {CARD_BLOCK_LABELS[card.kind][block]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Size</span>
              <select
                className={`${FIELD} w-auto`}
                value={options.scale}
                onChange={(event) =>
                  card.setOptions({ scale: Number(event.target.value) as CardScale })
                }
              >
                {CARD_SCALES.map((scale) => (
                  <option key={scale} value={scale}>
                    {scale}× — {card.width * scale}×{card.height * scale}
                  </option>
                ))}
              </select>
            </label>

            {CARD_FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                className={BUTTON}
                disabled={card.busy}
                title={CARD_FORMAT_LABELS[format]}
                onClick={() => void card.exportCard(format as CardFormat)}
              >
                Export {format.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-ash-500">
            Size applies to PNG and JPEG. SVG is vector and has no resolution — it opens in
            Inkscape or Illustrator if you want to change the design itself. Cards are written
            to a <code className="text-ash-400">cards</code> folder beside your exports.
          </p>

          {card.lastPath ? (
            <div className="rounded border border-cursed-600/40 bg-cursed-600/5 px-3 py-2">
              <p className="text-xs text-ash-300">Written to</p>
              {/* Selectable, because copying the path is half of what this is for. */}
              <p className="mt-0.5 select-all break-all font-mono text-[11px] text-ash-400">
                {card.lastPath}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md border border-void-700 px-3 py-1 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
                onClick={() => void card.revealFolder()}
              >
                Open exports folder
              </button>
            </div>
          ) : null}

          {card.error ? (
            <p className="rounded border border-blood-500/40 bg-blood-500/5 px-3 py-2 text-xs text-ash-300">
              {card.error}
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
