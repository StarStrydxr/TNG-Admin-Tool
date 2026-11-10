import { SectionCard } from '../../../components/SectionCard';
import { TextArea, TextInput } from '../../../components/form/fields';
import { clanNames, describeClanBonus, findClan, mutationsFor } from '../../../domain/clans';
import { useClans } from '../../../hooks/useClans';
import type { Character } from '../../../domain/character';

/** Suggestions only, from the template's own wording. The field takes any text. */
const FACTIONS = ['Sorcerers', 'Curse Users', 'Curses', 'Neutral'];

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

/**
 * The template's «𝐒𝐨𝐫𝐜𝐞𝐫𝐞𝐫 𝐏𝐫𝐨𝐟𝐢𝐥𝐞» block, minus the parts that already have homes of their
 * own: Grade is on Identity, Innate Technique on the technique section, and Traits, Arts,
 * Defects and slots on the build section.
 */
export function ProfileSection({ character, onChange }: SectionProps) {
  const { clans } = useClans();

  return (
    <SectionCard title="Sorcerer profile">
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="Faction"
          value={character.faction}
          onChange={(faction) => onChange({ faction })}
          suggestions={FACTIONS}
          hint="The sheet's second Affiliation line — which side they are on."
        />
        <TextInput
          label="Clan"
          value={character.clan}
          onChange={(clan) => onChange({ clan })}
          suggestions={clanNames(clans)}
          placeholder="Masami"
        />
        <TextInput
          label="CE applications"
          value={character.ceApplications}
          onChange={(ceApplications) => onChange({ ceApplications })}
          placeholder="Reinforcement, RCT…"
        />
        <TextInput
          label="Potential"
          value={character.potential}
          onChange={(potential) => onChange({ potential })}
          placeholder="Ancient Art, Open Domain… or N/A"
        />
        <TextInput
          label="Mastery"
          value={character.mastery}
          onChange={(mastery) => onChange({ mastery })}
        />
      </div>

      <ClanBlock character={character} onChange={onChange} />

      <div className="mt-4 flex flex-col gap-4">
        <TextArea
          label="Arsenal"
          value={character.arsenal}
          onChange={(arsenal) => onChange({ arsenal })}
          rows={3}
          hint="Cursed objects carried. Cursed tools have their own list further down."
        />
        <TextArea
          label="Feats"
          value={character.feats.join('\n')}
          onChange={(text) =>
            onChange({
              feats: text
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0),
            })
          }
          rows={3}
          hint="One per line."
        />
      </div>
    </SectionCard>
  );
}

/**
 * The clan's bonus and mutations.
 *
 * ⚠️ **Nothing here changes a stat.** The tick box records that the bonus is in effect and
 * shows what it is; the Classes stay exactly as they were typed. That is the rule in §4, and
 * it is also what stops a bonus already entered by hand from being counted twice.
 *
 * Shown only for a clan that has a record in the vault. A hand-typed clan is perfectly valid
 * and simply has nothing to offer yet — see `domain/clans.ts`.
 */
function ClanBlock({ character, onChange }: SectionProps) {
  const { clans } = useClans();
  const clan = findClan(clans, character.clan);
  const mutations = mutationsFor(clans, character.clan);
  const bonus = describeClanBonus(clans, character.clan);

  if (!clan) return null;

  const toggleMutation = (id: string) => {
    const has = character.mutations.includes(id);
    onChange({
      mutations: has
        ? character.mutations.filter((current) => current !== id)
        : [...character.mutations, id],
    });
  };

  return (
    <div className="mt-6 border-t border-void-800 pt-5">
      <h4 className="text-xs font-medium tracking-wide text-ash-400">{clan.name} Clan</h4>
      <p className="mb-3 mt-0.5 text-[11px] italic text-ash-500">{clan.motto}</p>

      <label className="flex items-start gap-2 text-xs text-ash-300">
        <input
          type="checkbox"
          checked={character.clanBonus}
          onChange={(event) => onChange({ clanBonus: event.target.checked })}
          className="mt-0.5 accent-cursed-500"
        />
        <span>
          Clan bonus applies
          {bonus.length > 0 ? (
            <span className="ml-1 text-ash-500">— {bonus.join(', ')}</span>
          ) : null}
        </span>
      </label>

      <p className="mt-1.5 pl-6 text-[11px] leading-relaxed text-ash-500">
        A record, not a calculation — ticking this changes no Class. If those numbers are
        already in the stat block, they stay exactly as they are.
      </p>

      {mutations.length > 0 ? (
        <div className="mt-4">
          <span className="text-xs text-ash-400">Mutations</span>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {mutations.map((mutation) => (
              <li key={mutation.id}>
                <label className="flex items-start gap-2 rounded border border-void-800 bg-void-850/50 px-2.5 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={character.mutations.includes(mutation.id)}
                    onChange={() => toggleMutation(mutation.id)}
                    className="mt-0.5 shrink-0 accent-cursed-500"
                  />
                  <span className="min-w-0">
                    <span className="text-ash-200">{mutation.name}</span>
                    <span className="ml-1.5 font-mono text-[10px] text-ash-500">
                      {mutation.tpCost}
                    </span>
                    <span className="mt-0.5 block text-ash-500">
                      {mutation.effects.map((effect) => effect.text).join(' · ')}
                    </span>
                    {mutation.note ? (
                      <span className="mt-1 block leading-relaxed text-ash-500">
                        {mutation.note}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-ash-500">
            More than one may be carried. These are recorded, never applied.
          </p>
        </div>
      ) : null}
    </div>
  );
}
