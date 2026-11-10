import { useState } from 'react';

import { LISTED_GRADE_IDS, gradeLabel, type GradeId } from '../../domain/grades';
import { SEAT_STATUSES, SEAT_STATUS_LABELS } from '../../domain/entities';
import type { Clan, ClanSeat, SeatStatus } from '../../domain/entities';
import { Cell, Row, RowList } from './RowList';

interface HierarchyEditorProps {
  readonly clan: Clan;
  readonly onChange: (patch: Partial<Clan>) => void;
  /** Roll a sorcerer at this grade and put them in the seat. Null while tables are loading. */
  readonly onFill: ((seat: ClanSeat, grade: GradeId) => void) | null;
  readonly filling: string | null;
}

/** What a newly generated seat-holder is rolled at unless the user says otherwise. */
const DEFAULT_FILL_GRADE: GradeId = 'grade-2';

/**
 * The clan's seats.
 *
 * `tier` is the rung and several seats share one — one Clan Head above five Archangels — so the
 * editor groups by tier and lets a seat be moved up or down between them. A seat is a position,
 * not a person: it outlives whoever sat in it, which is why `holder` empties rather than the
 * row being deleted when somebody dies.
 */
export function HierarchyEditor({ clan, onChange, onFill, filling }: HierarchyEditorProps) {
  const seats = [...clan.hierarchy].sort((a, b) => a.tier - b.tier);

  const patchSeat = (id: string, patch: Partial<ClanSeat>) =>
    onChange({
      hierarchy: clan.hierarchy.map((seat) => (seat.id === id ? { ...seat, ...patch } : seat)),
    });

  const addSeat = () =>
    onChange({
      hierarchy: [
        ...clan.hierarchy,
        {
          id: crypto.randomUUID(),
          title: '',
          tier: clan.hierarchy.length === 0 ? 0 : Math.max(...clan.hierarchy.map((s) => s.tier)),
          holder: '',
          holderId: '',
          status: 'vacant',
          notes: '',
        },
      ],
    });

  return (
    <RowList
      title="Hierarchy"
      addLabel="Add seat"
      onAdd={addSeat}
      count={seats.length}
      empty="No seats yet. A Clan Head, a tier of generals, whatever this clan calls them."
      hint="Tier 0 is the top. Seats on the same tier are equals. Emptying a holder leaves the seat behind — a position outlives the person in it."
    >
      {seats.map((seat) => (
        <Row
          key={seat.id}
          removeLabel={`Remove the ${seat.title || 'untitled'} seat`}
          onRemove={() =>
            onChange({ hierarchy: clan.hierarchy.filter((other) => other.id !== seat.id) })
          }
        >
          <div className="flex flex-wrap items-end gap-2">
            <Cell
              label="Title"
              value={seat.title}
              onChange={(title) => patchSeat(seat.id, { title })}
              placeholder="Clan Head"
              className="min-w-[8rem] flex-1"
            />
            <Cell
              label="Holder"
              value={seat.holder}
              onChange={(holder) =>
                // Typing a name into a vacant seat is what filling it means; emptying it again
                // puts the seat back to vacant. Nobody should have to set both.
                patchSeat(seat.id, {
                  holder,
                  ...(holder.trim() && seat.status === 'vacant' ? { status: 'held' } : {}),
                  ...(!holder.trim() && seat.status === 'held'
                    ? { status: 'vacant', holderId: '' }
                    : {}),
                })
              }
              placeholder="Vacant"
              className="min-w-[9rem] flex-1"
            />

            <label className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-ash-500">Status</span>
              <select
                value={seat.status}
                onChange={(event) =>
                  patchSeat(seat.id, { status: event.target.value as SeatStatus })
                }
                className="rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 outline-none focus:border-cursed-500"
              >
                {SEAT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SEAT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-ash-500">Tier</span>
              <div className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  onClick={() => patchSeat(seat.id, { tier: Math.max(0, seat.tier - 1) })}
                  disabled={seat.tier === 0}
                  aria-label={`Move ${seat.title || 'this seat'} up a tier`}
                  className="w-6 rounded border border-void-700 text-xs text-ash-400 enabled:hover:text-ash-100 disabled:opacity-30"
                >
                  ↑
                </button>
                <span className="w-6 rounded border border-void-700 bg-void-850 py-1 text-center font-mono text-xs text-ash-300">
                  {seat.tier}
                </span>
                <button
                  type="button"
                  onClick={() => patchSeat(seat.id, { tier: seat.tier + 1 })}
                  aria-label={`Move ${seat.title || 'this seat'} down a tier`}
                  className="w-6 rounded border border-void-700 text-xs text-ash-400 hover:text-ash-100"
                >
                  ↓
                </button>
              </div>
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Cell
              label="Notes"
              value={seat.notes}
              onChange={(notes) => patchSeat(seat.id, { notes })}
              placeholder="Vacant since the last head died"
              className="min-w-[12rem] flex-1"
            />
            {!seat.holder.trim() && onFill ? (
              <FillSeat seat={seat} onFill={onFill} busy={filling === seat.id} />
            ) : null}
          </div>

          {seat.holderId ? (
            <p className="mt-1.5 text-[10px] text-ash-500">
              Linked to a saved character. Clearing the holder unlinks it.
            </p>
          ) : null}
        </Row>
      ))}
    </RowList>
  );
}

/**
 * Roll somebody into an empty seat.
 *
 * The NPC generator already produces a complete sorcerer from tables alone, so filling a seat is
 * one roll plus a save plus a link — exactly the tedium worth removing. The grade is picked
 * rather than rolled, because a Clan Head and a foot soldier are not the same roll.
 */
function FillSeat({
  seat,
  onFill,
  busy,
}: {
  readonly seat: ClanSeat;
  readonly onFill: (seat: ClanSeat, grade: GradeId) => void;
  readonly busy: boolean;
}) {
  const [grade, setGrade] = useState<GradeId>(DEFAULT_FILL_GRADE);

  return (
    <div className="flex items-end gap-1.5">
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-wider text-ash-500">Roll at</span>
        <select
          value={grade}
          onChange={(event) => setGrade(event.target.value as GradeId)}
          aria-label={`Grade to roll for the ${seat.title || 'untitled'} seat`}
          className="rounded border border-void-700 bg-void-850 px-2 py-1 text-xs text-ash-100 outline-none focus:border-cursed-500"
        >
          {LISTED_GRADE_IDS.map((id) => (
            <option key={id} value={id}>
              {gradeLabel(id)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onFill(seat, grade)}
        disabled={busy}
        className="rounded border border-cursed-600 bg-cursed-600/15 px-2.5 py-1 text-xs text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:opacity-50"
      >
        {busy ? 'Rolling…' : 'Generate holder'}
      </button>
    </div>
  );
}
