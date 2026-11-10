import { Insignia } from '../../components/Insignia';
import { ImagePicker } from '../../components/form/ImagePicker';
import { Select, TextArea, TextInput } from '../../components/form/fields';
import { CLAN_STATUSES, hierarchySummary } from '../../domain/clans';
import { entityDisplayName, entityGrade } from '../../domain/entities';
import { gradeAbbrev } from '../../domain/grades';
import { ROLE_LABELS, assignableRoles, type Role } from '../../domain/roles';
import { characterDisplayName, type Character } from '../../domain/character';
import { useSettings } from '../../hooks/useSettings';
import { BonusEditor, MutationsEditor } from './BuildEditor';
import { ClanCard } from './ClanCard';
import { FiguresEditor } from './FiguresEditor';
import { HierarchyEditor } from './HierarchyEditor';
import { VaultEditor } from './VaultEditor';
import { useClanBoard } from './useClanBoard';

/**
 * The clans, as a board with an editor under it.
 *
 * Same shape as the Lore board and for the same reason: a folder of JSON files does not invite
 * anybody to write a clan history, and a wall of cards does. The editor below is the whole
 * record — hierarchy, bonuses, mutations, the vault and the clan's own history — because a
 * clan is the one kind of record a GM keeps coming back to rather than rolling once.
 *
 * ⚠️ **Nothing on this page changes a stat.** The bonus and mutation blocks are records of what
 * applies, shown beside a character's stat block; the Classes stay whatever was typed (§4).
 */
export function ClansPage() {
  const board = useClanBoard();
  const { settings } = useSettings();
  const clan = board.selected;

  const holdables = board.holdables.map((entity) => {
    const grade = entityGrade(entity);
    return {
      id: entity.id,
      name: grade ? `${entityDisplayName(entity)} · ${gradeAbbrev(grade)}` : entityDisplayName(entity),
    };
  });

  const characterOptions = board.characters.map((character) => ({
    id: character.id,
    name: characterDisplayName(character),
  }));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-xl text-ash-100">Clans</h2>
          <p className="mt-0.5 text-xs text-ash-500">
            Hierarchy, bonuses, mutations and what is in the vault.
          </p>
        </div>

        <input
          type="search"
          value={board.query}
          onChange={(event) => board.setQuery(event.target.value)}
          placeholder="Search clans"
          aria-label="Search clans"
          className="w-56 rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm text-ash-100 outline-none placeholder:text-ash-500 focus:border-cursed-500"
        />

        <button
          type="button"
          onClick={() => void board.create().then((made) => made && board.select(made.id))}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors hover:bg-cursed-600/25"
        >
          New clan
        </button>
      </header>

      {board.error ? (
        <div className="flex items-start justify-between gap-4 rounded-md border border-blood-500/40 bg-blood-500/10 px-4 py-3">
          <p className="text-sm text-ash-300">{board.error}</p>
          <button
            type="button"
            onClick={board.dismissError}
            className="shrink-0 text-xs text-ash-500 hover:text-ash-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {board.loading ? (
        <p className="text-xs text-ash-500">Loading…</p>
      ) : board.clans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-void-700 px-6 py-14 text-center">
          <Insignia kind="clan" size={28} className="mx-auto mb-3 text-ash-500" />
          <p className="text-sm text-ash-300">
            {board.total === 0 ? 'No clans yet.' : 'Nothing matches that.'}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {board.clans.map((item) => (
            <li key={item.id}>
              <ClanCard
                clan={item}
                active={item.id === clan?.id}
                members={board.memberCounts.get(item.id) ?? 0}
                onSelect={() => board.select(item.id === clan?.id ? null : item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {clan ? (
        <section className="rounded-lg border border-void-700 bg-void-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Insignia kind="clan" size={18} className="shrink-0 text-ash-400" />
            <h3 className="font-display text-lg text-ash-100">{clan.name || 'Unnamed clan'}</h3>
            <span className="mr-auto text-xs text-ash-500">{hierarchySummary(clan)}</span>
            <button
              type="button"
              onClick={() => void board.remove(clan)}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-blood-600 hover:text-blood-500"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => board.select(null)}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <TextInput
              label="Name"
              value={clan.name}
              onChange={(name) => board.patch(clan, { name })}
              placeholder="Masami"
              hint="Characters point at a clan by this name."
            />
            <TextInput
              label="Inherited technique"
              value={clan.innateTechnique}
              onChange={(innateTechnique) => board.patch(clan, { innateTechnique })}
              placeholder="Through Faith’s Command"
            />
            <TextInput
              label="Status"
              value={clan.status}
              onChange={(status) => board.patch(clan, { status })}
              suggestions={CLAN_STATUSES}
            />
            <TextInput
              label="Seat"
              value={clan.seat}
              onChange={(seat) => board.patch(clan, { seat })}
              placeholder="Osaka, Japan"
            />
            <div className="col-span-2">
              <TextInput
                label="Era"
                value={clan.era}
                onChange={(era) => board.patch(clan, { era })}
                placeholder="Founded pre-Heian; prime in the Heian era"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <TextInput
              label="Motto"
              value={clan.motto}
              onChange={(motto) => board.patch(clan, { motto })}
              placeholder="Honour, Faith, Endurance."
            />
            <TextInput
              label="In short"
              value={clan.summary}
              onChange={(summary) => board.patch(clan, { summary })}
              hint="One line. This is what the card shows."
            />
            <TextArea
              label="Overview"
              value={clan.overview}
              onChange={(overview) => board.patch(clan, { overview })}
              rows={8}
              hint="The clan's history, at whatever length it deserves."
            />
          </div>

          <HierarchyEditor
            clan={clan}
            onChange={(change) => board.patch(clan, change)}
            onFill={
              board.tablesReady
                ? (seat, grade) => void board.fillSeat(clan, seat, grade)
                : null
            }
            filling={board.filling}
          />

          <Roster clan={clan} roster={board.roster} />

          <BonusEditor clan={clan} onChange={(change) => board.patch(clan, change)} />
          <MutationsEditor clan={clan} onChange={(change) => board.patch(clan, change)} />

          <VaultEditor
            clan={clan}
            onChange={(change) => board.patch(clan, change)}
            holdables={holdables}
          />

          <FiguresEditor
            clan={clan}
            onChange={(change) => board.patch(clan, change)}
            characters={characterOptions}
          />

          <div className="mt-5 border-t border-void-800 pt-4">
            <TextArea
              label="GM notes"
              value={clan.notes}
              onChange={(notes) => board.patch(clan, { notes })}
              rows={2}
              hint="Yours. Still leaves the machine on export, so rank it if it matters."
            />
          </div>

          <div className="mt-4 border-t border-void-800 pt-4">
            <ImagePicker
              label="Crest or reference"
              value={clan.image}
              onChange={(image) => board.patch(clan, { image })}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-void-800 pt-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Folder</span>
              <input
                type="text"
                value={clan.folder}
                onChange={(event) => board.patch(clan, { folder: event.target.value })}
                placeholder="Clans/Major"
                className="w-56 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
              />
            </label>

            <Select<Role>
              label="Visible to"
              value={clan.minRole}
              options={assignableRoles(settings.role).map((role) => ({
                value: role,
                label: `${ROLE_LABELS[role]} and above`,
              }))}
              onChange={(minRole) => board.patch(clan, { minRole })}
            />

            <button
              type="button"
              onClick={() => void board.reveal()}
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

/**
 * Who is actually in this clan.
 *
 * Computed from the characters whose clan field names it, never stored — the same reasoning as
 * backlinks (§9). A stored roster would be a second copy of the truth that nothing keeps in
 * step the moment somebody retypes a clan name on a sheet.
 */
function Roster({
  clan,
  roster,
}: {
  readonly clan: { readonly name: string };
  readonly roster: readonly Character[];
}) {
  return (
    <section className="mt-5 border-t border-void-800 pt-4">
      <h4 className="mb-2 text-xs font-medium tracking-wide text-ash-400">Members</h4>
      {roster.length === 0 ? (
        <p className="rounded-md border border-dashed border-void-800 px-3 py-4 text-center text-xs text-ash-500">
          {clan.name.trim()
            ? `No saved character names ${clan.name} as their clan.`
            : 'Name the clan and any character who claims it shows up here.'}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {roster.map((character) => (
            <li
              key={character.id}
              className="rounded border border-void-800 bg-void-850/50 px-2 py-1 text-xs text-ash-300"
            >
              {characterDisplayName(character)}
              <span className="ml-1.5 font-mono text-[10px] text-ash-500">
                {gradeAbbrev(character.grade)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-ash-500">
        Worked out from each sheet's own Clan field, never stored here — so renaming this clan
        leaves them pointing at the old name until their sheets are changed too.
      </p>
    </section>
  );
}
