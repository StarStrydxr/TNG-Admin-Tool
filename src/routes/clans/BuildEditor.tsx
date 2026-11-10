import { modifier } from '../../domain/clans';
import type { Clan, ClanModifier, Mutation } from '../../domain/entities';
import { AreaCell, Cell, Row, RowList } from './RowList';

interface EditorProps {
  readonly clan: Clan;
  readonly onChange: (patch: Partial<Clan>) => void;
}

const DIRECTION_CLASS: Record<ClanModifier['direction'], string> = {
  up: 'text-cursed-400',
  down: 'text-blood-500',
  other: 'text-ash-400',
};

/**
 * The clan bonus.
 *
 * ⚠️ **Lines, not arithmetic.** Each entry is text the way the clan document writes it. The
 * direction is read off the sign for colour alone (`directionOf`), and nothing anywhere adds
 * these to a stat — §4 is unconditional, and this is also what stops a bonus already entered by
 * hand from being counted a second time.
 */
export function BonusEditor({ clan, onChange }: EditorProps) {
  return (
    <RowList
      title="Clan bonus"
      addLabel="Add line"
      onAdd={() => onChange({ bonuses: [...clan.bonuses, modifier('')] })}
      count={clan.bonuses.length}
      empty="No bonus recorded. Write it the way the clan document does — “+2 Classes Speed”."
      hint="Recorded, never applied. Ticking “clan bonus applies” on a sheet shows these beside the stat block and changes no Class."
    >
      {clan.bonuses.map((bonus, index) => (
        <Row
          key={index}
          removeLabel={`Remove “${bonus.text || 'blank line'}”`}
          onRemove={() =>
            onChange({ bonuses: clan.bonuses.filter((_, other) => other !== index) })
          }
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`shrink-0 font-mono text-sm ${DIRECTION_CLASS[bonus.direction]}`}
            >
              {bonus.direction === 'up' ? '▲' : bonus.direction === 'down' ? '▼' : '•'}
            </span>
            <input
              type="text"
              value={bonus.text}
              aria-label={`Bonus line ${index + 1}`}
              placeholder="+2 Classes Speed"
              onChange={(event) =>
                onChange({
                  bonuses: clan.bonuses.map((other, i) =>
                    i === index ? modifier(event.target.value) : other,
                  ),
                })
              }
              className="w-full rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
            />
          </div>
        </Row>
      ))}
    </RowList>
  );
}

/**
 * Mutations the clan offers.
 *
 * Added and removed entirely, as Dan asked — and removing one does not empty a sheet that
 * carries it: a character's `mutations` holds ids, and an id matching nothing renders as itself
 * (`describeMutations`), so a deletion shows up as something to fix rather than as silence.
 */
export function MutationsEditor({ clan, onChange }: EditorProps) {
  const patch = (id: string, change: Partial<Mutation>) =>
    onChange({
      mutations: clan.mutations.map((m) => (m.id === id ? { ...m, ...change } : m)),
    });

  return (
    <RowList
      title="Mutations"
      addLabel="Add mutation"
      onAdd={() =>
        onChange({
          mutations: [
            ...clan.mutations,
            { id: crypto.randomUUID(), name: '', effects: [], tpCost: '', note: '' },
          ],
        })
      }
      count={clan.mutations.length}
      empty="No mutations. A clan may well have none."
      hint="A character may carry several. Removing one here leaves it showing as an unknown id on any sheet that had it, rather than vanishing."
    >
      {clan.mutations.map((mutation) => (
        <Row
          key={mutation.id}
          removeLabel={`Remove the ${mutation.name || 'unnamed'} mutation`}
          onRemove={() =>
            onChange({ mutations: clan.mutations.filter((other) => other.id !== mutation.id) })
          }
        >
          <div className="flex flex-wrap items-end gap-2">
            <Cell
              label="Name"
              value={mutation.name}
              onChange={(name) => patch(mutation.id, { name })}
              placeholder="God’s Chosen"
              className="min-w-[10rem] flex-1"
            />
            <Cell
              label="TP cost"
              value={mutation.tpCost}
              onChange={(tpCost) => patch(mutation.id, { tpCost })}
              placeholder="8 TP"
              className="w-24"
            />
          </div>

          <div className="mt-2">
            <AreaCell
              label="Effects — one per line"
              value={mutation.effects.map((effect) => effect.text).join('\n')}
              rows={2}
              placeholder={'+1 Grade CE Efficiency\nA direct connection to God'}
              onChange={(text) =>
                patch(mutation.id, {
                  effects: text
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map(modifier),
                })
              }
            />
          </div>

          <div className="mt-2">
            <AreaCell
              label="Note"
              value={mutation.note}
              rows={2}
              placeholder="Only available to those born with the inherited technique."
              onChange={(note) => patch(mutation.id, { note })}
            />
          </div>
        </Row>
      ))}
    </RowList>
  );
}
