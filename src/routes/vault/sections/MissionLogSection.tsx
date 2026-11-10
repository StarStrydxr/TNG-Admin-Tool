import { useState } from 'react';

import { SectionCard } from '../../../components/SectionCard';
import { Select, TextArea, TextInput } from '../../../components/form/fields';
import { OutcomeTag } from '../../../components/OutcomeTag';
import {
  MISSION_OUTCOMES,
  MISSION_OUTCOME_LABELS,
  type Character,
  type MissionOutcome,
  type MissionRecord,
} from '../../../domain/character';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

function blank(index: number): MissionRecord {
  return {
    id: `mission-${Date.now()}-${index}`,
    title: '',
    date: '',
    outcome: 'unresolved',
    mvp: false,
    cr: '',
    notes: '',
  };
}

/**
 * What this character has actually been on.
 *
 * Deliberately a log rather than a list of form rows: the common act is reading it — glancing
 * down a sheet to see how someone has been doing — and the second most common is adding one
 * line after an event. So each entry reads as a line with its tags, and opens into fields only
 * when clicked. The newest sits at the top, because that is the one anyone is looking for.
 *
 * Nothing here is computed. CR is free text and is never totalled: Cursed Rating is tracked on
 * the Discord server, and a second total here that disagreed with it would be worse than none.
 */
export function MissionLogSection({ character, onChange }: SectionProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const log = character.missionHistory;

  function patch(id: string, change: Partial<MissionRecord>) {
    onChange({
      missionHistory: log.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)),
    });
  }

  function add() {
    const entry = blank(log.length);
    onChange({ missionHistory: [entry, ...log] });
    setOpenId(entry.id);
  }

  function remove(id: string) {
    onChange({ missionHistory: log.filter((entry) => entry.id !== id) });
    if (openId === id) setOpenId(null);
  }

  return (
    <SectionCard
      title="Mission log"
      description="Every posting this character has been on, and how it went."
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <TextInput
          label="Cursed Rating"
          value={character.cursedRating}
          onChange={(cursedRating) => onChange({ cursedRating })}
          placeholder="420"
          hint="Copied from Discord — nothing here adds it up."
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-cursed-600/25"
        >
          Add mission
        </button>
      </div>

      {log.length === 0 ? (
        <p className="text-xs text-ash-500">
          Nothing logged yet. Add a line after each event and the sheet carries its own record.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {log.map((entry) => {
            const open = openId === entry.id;
            return (
              <li
                key={entry.id}
                className="rounded-md border border-void-800 bg-void-850/50 print-border"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : entry.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ash-200">
                    {entry.title || <span className="text-ash-500">Untitled mission</span>}
                  </span>
                  {entry.cr ? (
                    <span className="shrink-0 font-mono text-[11px] text-ash-500">
                      {entry.cr} CR
                    </span>
                  ) : null}
                  {entry.date ? (
                    <span className="shrink-0 text-[11px] text-ash-500">{entry.date}</span>
                  ) : null}
                  <OutcomeTag outcome={entry.outcome} mvp={entry.mvp} />
                </button>

                {open ? (
                  <div className="border-t border-void-800 px-3 py-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <TextInput
                          label="Title"
                          value={entry.title}
                          onChange={(title) => patch(entry.id, { title })}
                          placeholder="The Nakano depot"
                        />
                      </div>
                      <TextInput
                        label="Date"
                        value={entry.date}
                        onChange={(date) => patch(entry.id, { date })}
                        placeholder="12 Nov"
                      />
                      <TextInput
                        label="CR earned"
                        value={entry.cr}
                        onChange={(cr) => patch(entry.id, { cr })}
                        placeholder="40"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-4">
                      <Select<MissionOutcome>
                        label="Outcome"
                        value={entry.outcome}
                        options={MISSION_OUTCOMES.map((outcome) => ({
                          value: outcome,
                          label: MISSION_OUTCOME_LABELS[outcome],
                        }))}
                        onChange={(outcome) => patch(entry.id, { outcome })}
                      />
                      <label className="flex items-center gap-2 pb-2 text-xs text-ash-400">
                        <input
                          type="checkbox"
                          checked={entry.mvp}
                          onChange={(event) => patch(entry.id, { mvp: event.target.checked })}
                          className="accent-cursed-500"
                        />
                        Named MVP
                      </label>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        className="ml-auto rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-blood-600 hover:text-blood-500"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3">
                      <TextArea
                        label="Notes"
                        value={entry.notes}
                        onChange={(notes) => patch(entry.id, { notes })}
                        rows={2}
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
