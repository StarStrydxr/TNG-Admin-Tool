import { SectionCard } from '../../../components/SectionCard';
import { Checkbox, NumberInput, Select, TextArea, TextInput } from '../../../components/form/fields';
import {
  RCT_LABELS,
  RCT_LEVELS,
  type Character,
  type InnateTechnique,
  type RctLevel,
} from '../../../domain/character';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

export function TechniqueSection({ character, onChange }: SectionProps) {
  const technique = character.innateTechnique;

  function patchTechnique(patch: Partial<InnateTechnique>) {
    onChange({ innateTechnique: { ...technique, ...patch } });
  }

  return (
    <SectionCard title="Cursed technique">
      <div className="flex flex-col gap-4">
        <TextInput
          label="Innate technique"
          value={technique.name}
          onChange={(name) => patchTechnique({ name })}
          placeholder="Ten Shadows Technique"
        />
        <TextArea
          label="Description"
          value={technique.description}
          onChange={(description) => patchTechnique({ description })}
          rows={4}
        />
        <TextArea
          label="Extensions"
          value={technique.extensions.join('\n')}
          onChange={(text) =>
            patchTechnique({
              extensions: text
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0),
            })
          }
          rows={3}
          hint="One per line."
        />
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            label="Maximum technique"
            value={technique.maximum}
            onChange={(maximum) => patchTechnique({ maximum })}
          />
          <TextInput
            label="Domain expansion"
            value={technique.domainExpansion}
            onChange={(domainExpansion) => patchTechnique({ domainExpansion })}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-void-800 pt-5">
        <Select<RctLevel>
          label="Reverse Cursed Technique"
          value={character.reverseCursedTechnique}
          options={RCT_LEVELS.map((level) => ({ value: level, label: RCT_LABELS[level] }))}
          onChange={(reverseCursedTechnique) => onChange({ reverseCursedTechnique })}
        />
        <NumberInput
          label="Black Flash count"
          value={character.blackFlashCount}
          onChange={(blackFlashCount) => onChange({ blackFlashCount })}
        />
        <TextInput
          label="Heavenly Restriction"
          value={character.heavenlyRestriction}
          onChange={(heavenlyRestriction) => onChange({ heavenlyRestriction })}
          placeholder="Leave blank if none"
        />
        <Checkbox
          label="Simple Domain"
          checked={character.simpleDomain}
          onChange={(simpleDomain) => onChange({ simpleDomain })}
        />
      </div>
    </SectionCard>
  );
}
