import { Insignia } from '../../components/Insignia';
import { ImagePicker } from '../../components/form/ImagePicker';
import { Select, TextArea, TextInput } from '../../components/form/fields';
import { LORE_STATUSES, LORE_TYPES } from '../../domain/lore';
import { ROLE_LABELS, assignableRoles, type Role } from '../../domain/roles';
import { useLore } from './useLore';
import { LoreCard } from './LoreCard';

/**
 * The lore collection, as a board rather than a list.
 *
 * The point of the layout is that it makes an empty collection look like something worth
 * filling in. A folder of JSON files does not invite anyone to write a clan history; a wall of
 * cards with pictures on them does, and lore is the one part of this tool whose value depends
 * entirely on somebody bothering. Everything else here is ordinary entity machinery.
 */
export function LorePage() {
  const lore = useLore();
  const entry = lore.selected;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-xl text-ash-100">Lore</h2>
          <p className="mt-0.5 text-xs text-ash-500">
            Places, clans, organisations, incidents and the rules that came out of them.
          </p>
        </div>

        <input
          type="search"
          value={lore.query}
          onChange={(event) => lore.setQuery(event.target.value)}
          placeholder="Search lore"
          aria-label="Search lore"
          className="w-56 rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />

        <select
          value={lore.type}
          onChange={(event) => lore.setType(event.target.value)}
          aria-label="Filter by type"
          className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-300 outline-none focus:border-cursed-500"
        >
          <option value="">Any type</option>
          {lore.types.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void lore.create()}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-cursed-600/25"
        >
          New entry
        </button>
      </header>

      {lore.error ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-blood-500/40 bg-blood-500/10 px-4 py-3">
          <p className="text-sm text-ash-300">{lore.error}</p>
          <button
            type="button"
            onClick={lore.dismissError}
            className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {lore.loading ? (
        <p className="text-xs text-ash-500">Loading…</p>
      ) : lore.entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-void-700 px-6 py-14 text-center">
          <Insignia kind="lore" size={28} className="mx-auto mb-3 text-ash-500" />
          <p className="text-sm text-ash-300">
            {lore.total === 0 ? 'No lore yet.' : 'Nothing matches that.'}
          </p>
          {lore.total === 0 ? (
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ash-500">
              A place, a clan, an incident the server still argues about. One paragraph is worth
              more than none — a generator can roll a curse, but it cannot know whose fault the
              Shibuya veil was.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {lore.entries.map((item) => (
            <li key={item.id}>
              <LoreCard
                entry={item}
                active={item.id === entry?.id}
                onSelect={() => lore.select(item.id === entry?.id ? null : item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {entry ? (
        <section className="rounded-lg border border-void-700 bg-void-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Insignia kind="lore" size={18} className="shrink-0 text-ash-400" />
            <h3 className="mr-auto font-display text-lg text-ash-100">
              {entry.name || 'Untitled entry'}
            </h3>
            <button
              type="button"
              onClick={() => void lore.remove(entry)}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-blood-600 hover:text-blood-500"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => lore.select(null)}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <TextInput
                label="Name"
                value={entry.name}
                onChange={(name) => void lore.update({ ...entry, name })}
                placeholder="The Shibuya veil"
              />
            </div>
            <TextInput
              label="Type"
              value={entry.loreType}
              onChange={(loreType) => void lore.update({ ...entry, loreType })}
              suggestions={LORE_TYPES}
            />
            <TextInput
              label="Status"
              value={entry.status}
              onChange={(status) => void lore.update({ ...entry, status })}
              suggestions={LORE_STATUSES}
            />
            <TextInput
              label="When"
              value={entry.era}
              onChange={(era) => void lore.update({ ...entry, era })}
              placeholder="October 2018"
            />
            <TextInput
              label="Where"
              value={entry.location}
              onChange={(location) => void lore.update({ ...entry, location })}
            />
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <TextInput
              label="In short"
              value={entry.summary}
              onChange={(summary) => void lore.update({ ...entry, summary })}
              hint="One line. This is what the card shows."
            />
            <TextArea
              label="Detail"
              value={entry.body}
              onChange={(body) => void lore.update({ ...entry, body })}
              rows={10}
            />
            <TextArea
              label="GM notes"
              value={entry.notes}
              onChange={(notes) => void lore.update({ ...entry, notes })}
              rows={2}
              hint="Yours. Still leaves the machine on export, so rank it if it matters."
            />
          </div>

          <div className="mt-4 border-t border-void-800 pt-4">
            <ImagePicker
              label="Picture"
              value={entry.image}
              onChange={(image) => void lore.update({ ...entry, image })}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-void-800 pt-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Folder</span>
              <input
                type="text"
                value={entry.folder}
                onChange={(event) => void lore.update({ ...entry, folder: event.target.value })}
                placeholder="Places/Tokyo"
                className="w-56 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
              />
            </label>

            <Select<Role>
              label="Visible to"
              value={entry.minRole}
              options={assignableRoles(lore.viewer).map((role) => ({
                value: role,
                label: `${ROLE_LABELS[role]} and above`,
              }))}
              onChange={(minRole) => void lore.update({ ...entry, minRole })}
            />

            <button
              type="button"
              onClick={() => void lore.reveal()}
              className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
            >
              Open data folder
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
