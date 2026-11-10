import { SectionCard } from '../../../components/SectionCard';
import { ImagePicker } from '../../../components/form/ImagePicker';
import { Select, TextArea, TextInput } from '../../../components/form/fields';
import {
  CHARACTER_KINDS,
  CHARACTER_KIND_LABELS,
  type Character,
  type CharacterKind,
} from '../../../domain/character';
import { LISTED_GRADE_IDS, gradeAbbrev, gradeLabel, type GradeId } from '../../../domain/grades';
import { defaultStatBlock } from '../../../domain/stats';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

export function IdentitySection({ character, onChange }: SectionProps) {
  /**
   * Changing the character's grade re-bases any stat still sitting at its default, but leaves
   * anything already adjusted alone — re-grading a character shouldn't silently wipe hand-set
   * values.
   */
  function changeGrade(grade: GradeId) {
    const untouched =
      JSON.stringify(character.stats.graded) ===
      JSON.stringify(defaultStatBlock(character.grade).graded);

    onChange(
      untouched
        ? { grade, stats: { ...character.stats, graded: defaultStatBlock(grade).graded } }
        : { grade },
    );
  }

  return (
    <SectionCard title="Identity">
      <div className="mb-4">
        <ImagePicker
          label="Portrait"
          size="lg"
          value={character.portrait}
          onChange={(portrait) => onChange({ portrait })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="Name"
          value={character.name}
          onChange={(name) => onChange({ name })}
          placeholder="Walker Masami"
        />
        <Select<CharacterKind>
          label="Record type"
          value={character.kind}
          options={CHARACTER_KINDS.map((kind) => ({
            value: kind,
            label: CHARACTER_KIND_LABELS[kind],
          }))}
          onChange={(kind) => onChange({ kind })}
          hint="Player characters and NPCs are stored in separate folders."
        />
        <Select<GradeId>
          label="Grade"
          value={character.grade}
          options={LISTED_GRADE_IDS.map((id) => ({
            value: id,
            label: `${gradeLabel(id)} · ${gradeAbbrev(id)}`,
          }))}
          onChange={changeGrade}
          hint="Stats default to Class 3 of this grade."
        />
        <TextInput
          label="Age"
          value={character.age}
          onChange={(age) => onChange({ age })}
          placeholder="17, unknown, looks thirty…"
        />
        <TextInput
          label="Nicknames"
          value={character.nicknames}
          onChange={(nicknames) => onChange({ nicknames })}
          placeholder="What people actually call them"
        />
        <TextInput
          label="Gender"
          value={character.gender}
          onChange={(gender) => onChange({ gender })}
        />
        <TextInput
          label="Date of birth"
          value={character.dateOfBirth}
          onChange={(dateOfBirth) => onChange({ dateOfBirth })}
          placeholder="7 March, or unknown"
        />
        <TextInput
          label="Race"
          value={character.race}
          onChange={(race) => onChange({ race })}
          placeholder="Human"
        />
        <TextInput
          label="Subdivision"
          value={character.subdivision}
          onChange={(subdivision) => onChange({ subdivision })}
        />
        <TextInput
          label="Sexuality"
          value={character.sexuality}
          onChange={(sexuality) => onChange({ sexuality })}
        />
      </div>

      <div className="mt-6 border-t border-void-800 pt-5">
        <h4 className="mb-3 text-xs font-medium tracking-wide text-ash-400">Appearance</h4>
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Nationality"
            value={character.nationality}
            onChange={(nationality) => onChange({ nationality })}
          />
          <TextInput
            label="Ethnicity"
            value={character.ethnicity}
            onChange={(ethnicity) => onChange({ ethnicity })}
          />
          <TextInput
            label="Hair colour"
            value={character.hairColour}
            onChange={(hairColour) => onChange({ hairColour })}
          />
          <TextInput
            label="Eye colour"
            value={character.eyeColour}
            onChange={(eyeColour) => onChange({ eyeColour })}
          />
          <TextInput
            label="Height"
            value={character.height}
            onChange={(height) => onChange({ height })}
            placeholder="178cm"
          />
        </div>
        <div className="mt-4">
          <TextArea
            label="Appearance description"
            value={character.appearance}
            onChange={(appearance) => onChange({ appearance })}
            rows={4}
          />
        </div>
      </div>
    </SectionCard>
  );
}
