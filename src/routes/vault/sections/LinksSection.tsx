import { SectionCard } from '../../../components/SectionCard';
import { ListEditor } from '../../../components/form/ListEditor';
import { TextInput } from '../../../components/form/fields';
import type {
  Character,
  CharacterCursedTool,
  Relationship,
} from '../../../domain/character';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

export function LinksSection({ character, onChange }: SectionProps) {
  return (
    <SectionCard title="Tools and ties">
      <div className="flex flex-col gap-6">
        <ListEditor<CharacterCursedTool>
          label="Cursed tools"
          items={character.cursedTools}
          onChange={(next) => onChange({ cursedTools: next })}
          createItem={(index) => ({
            id: `tool-${Date.now()}-${index}`,
            name: '',
            grade: '',
            notes: '',
          })}
          addLabel="Add tool"
          emptyLabel="No cursed tools carried."
          renderItem={(tool, update) => (
            <div className="grid grid-cols-3 gap-3">
              <TextInput label="Name" value={tool.name} onChange={(name) => update({ name })} />
              <TextInput
                label="Grade"
                value={tool.grade}
                onChange={(grade) => update({ grade })}
              />
              <TextInput
                label="Notes"
                value={tool.notes}
                onChange={(notes) => update({ notes })}
              />
            </div>
          )}
        />

        <ListEditor<Relationship>
          label="Relationships"
          items={character.relationships}
          onChange={(next) => onChange({ relationships: next })}
          createItem={(index) => ({
            id: `rel-${Date.now()}-${index}`,
            name: '',
            relation: '',
            notes: '',
          })}
          addLabel="Add relationship"
          emptyLabel="No relationships recorded."
          renderItem={(relationship, update) => (
            <div className="grid grid-cols-3 gap-3">
              <TextInput
                label="Name"
                value={relationship.name}
                onChange={(name) => update({ name })}
              />
              <TextInput
                label="Relation"
                value={relationship.relation}
                onChange={(relation) => update({ relation })}
                placeholder="Mentor, rival, clan elder…"
              />
              <TextInput
                label="Notes"
                value={relationship.notes}
                onChange={(notes) => update({ notes })}
              />
            </div>
          )}
        />

      </div>
    </SectionCard>
  );
}
