import type { Clan, ClanFigure } from '../../domain/entities';
import { AreaCell, Cell, Row, RowList } from './RowList';

interface FiguresEditorProps {
  readonly clan: Clan;
  readonly onChange: (patch: Partial<Clan>) => void;
  /** Saved characters, so a figure who has a sheet can point at it. */
  readonly characters: readonly { readonly id: string; readonly name: string }[];
}

/**
 * The clan's named figures.
 *
 * Separate from the hierarchy on purpose: Akira Masami held the Clan Head seat a thousand years
 * ago and the seat outlived her, so a seat and the people who have sat in it are different
 * things. Most of a clan's history has no character sheet behind it, which is why the prose
 * lives here rather than being a link to a record that does not exist.
 */
export function FiguresEditor({ clan, onChange, characters }: FiguresEditorProps) {
  const patch = (id: string, change: Partial<ClanFigure>) =>
    onChange({
      figures: clan.figures.map((figure) => (figure.id === id ? { ...figure, ...change } : figure)),
    });

  return (
    <RowList
      title="Prevalent members"
      addLabel="Add figure"
      onAdd={() =>
        onChange({
          figures: [
            ...clan.figures,
            { id: crypto.randomUUID(), name: '', epithet: '', era: '', characterId: '', body: '' },
          ],
        })
      }
      count={clan.figures.length}
      empty="Nobody recorded. The founder, the traitor, the one everyone still argues about."
      hint="A figure needs no character sheet — most of a clan's history has none. Link one where it exists."
    >
      {clan.figures.map((figure) => (
        <Row
          key={figure.id}
          removeLabel={`Remove ${figure.name || 'this figure'}`}
          onRemove={() =>
            onChange({ figures: clan.figures.filter((other) => other.id !== figure.id) })
          }
        >
          <div className="flex flex-wrap items-end gap-2">
            <Cell
              label="Name"
              value={figure.name}
              onChange={(name) => patch(figure.id, { name })}
              placeholder="Akira Masami"
              className="min-w-[9rem] flex-1"
            />
            <Cell
              label="Known as"
              value={figure.epithet}
              onChange={(epithet) => patch(figure.id, { epithet })}
              placeholder="Goddess of the Masami"
              className="min-w-[10rem] flex-1"
            />
            <Cell
              label="Era"
              value={figure.era}
              onChange={(era) => patch(figure.id, { era })}
              placeholder="Heian era"
              className="w-28"
            />
            <label className="flex min-w-[10rem] flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-ash-500">Sheet</span>
              <select
                value={figure.characterId}
                onChange={(event) => patch(figure.id, { characterId: event.target.value })}
                aria-label={`Character sheet for ${figure.name || 'this figure'}`}
                className="rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 outline-none focus:border-cursed-500"
              >
                <option value="">No sheet</option>
                {characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2">
            <AreaCell
              label="History"
              value={figure.body}
              rows={4}
              placeholder="What they did, and what the clan says about it now."
              onChange={(body) => patch(figure.id, { body })}
            />
          </div>
        </Row>
      ))}
    </RowList>
  );
}
