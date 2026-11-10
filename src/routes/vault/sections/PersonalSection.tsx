import { SectionCard } from '../../../components/SectionCard';
import { TextArea, TextInput } from '../../../components/form/fields';
import type { Character } from '../../../domain/character';

/**
 * Suggestions only — the field takes any text. Factions are Dan's setting content and this list
 * is not meant to be authoritative.
 */
const AFFILIATIONS = [
  'Jujutsu High (Tokyo)',
  'Jujutsu High (Kyoto)',
  'Jujutsu Association',
  'Clan',
  'Curse user',
  'Independent',
];

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

/**
 * The template's «𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥» and «𝐁𝐨𝐧𝐮𝐬» blocks.
 *
 * `affiliation` here is the Personal one — the school or organisation. The Sorcerer Profile's
 * "Affiliation" (Curses, Curse Users, Sorcerers, Neutral) is `faction`, in the profile section;
 * the export templates write both back out under the headings the server expects.
 */
export function PersonalSection({ character, onChange }: SectionProps) {
  return (
    <SectionCard title="Personal">
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="Affiliation"
          value={character.affiliation}
          onChange={(affiliation) => onChange({ affiliation })}
          suggestions={AFFILIATIONS}
          placeholder="Anything — the list is only a suggestion"
        />
        <TextInput
          label="Occupation"
          value={character.occupation}
          onChange={(occupation) => onChange({ occupation })}
          placeholder="Student, Jujutsu Academy, second year"
          hint="Name the school for a student or teacher, and the year if a student."
        />
        <TextInput
          label="Hobbies"
          value={character.hobbies}
          onChange={(hobbies) => onChange({ hobbies })}
        />
        <TextInput
          label="Likes"
          value={character.likes}
          onChange={(likes) => onChange({ likes })}
        />
        <TextInput
          label="Dislikes"
          value={character.dislikes}
          onChange={(dislikes) => onChange({ dislikes })}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <TextArea
          label="Personality"
          value={character.personality}
          onChange={(personality) => onChange({ personality })}
          rows={4}
        />
        <TextArea
          label="Backstory"
          value={character.background}
          onChange={(background) => onChange({ background })}
          rows={5}
        />
      </div>

      <div className="mt-6 border-t border-void-800 pt-5">
        <h4 className="mb-3 text-xs font-medium tracking-wide text-ash-400">Bonus</h4>
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Theme song"
            value={character.themeSong}
            onChange={(themeSong) => onChange({ themeSong })}
          />
          <TextInput
            label="Face claim"
            value={character.faceClaim}
            onChange={(faceClaim) => onChange({ faceClaim })}
          />
        </div>
        <div className="mt-4">
          <TextArea
            label="GM notes"
            value={character.notes}
            onChange={(notes) => onChange({ notes })}
            rows={3}
            hint="Yours, not part of the submitted sheet."
          />
        </div>
      </div>
    </SectionCard>
  );
}
