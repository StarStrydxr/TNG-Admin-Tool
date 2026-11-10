import { SectionCard } from '../../../components/SectionCard';
import { ListEditor } from '../../../components/form/ListEditor';
import { NumberInput, TextInput } from '../../../components/form/fields';
import {
  artSlotUsage,
  traitSlotUsage,
  type Art,
  type Awakening,
  type Character,
  type SlotUsage,
  type Trait,
} from '../../../domain/character';

interface SectionProps {
  readonly character: Character;
  readonly onChange: (patch: Partial<Character>) => void;
}

function SlotBadge({ usage }: { readonly usage: SlotUsage }) {
  const over = usage.overBy > 0;
  return (
    <span
      className={[
        'rounded-sm px-1.5 py-0.5 font-mono text-[11px]',
        over ? 'bg-blood-500/15 text-blood-500' : 'bg-void-700 text-ash-500',
      ].join(' ')}
      title={over ? `${usage.overBy} over the slot count` : 'Slots used'}
    >
      {usage.used}/{usage.total}
    </span>
  );
}

export function BuildSection({ character, onChange }: SectionProps) {
  const traits = traitSlotUsage(character);
  const arts = artSlotUsage(character);
  const over = traits.overBy > 0 || arts.overBy > 0;

  return (
    <SectionCard
      title="Traits, arts and awakenings"
      description="Trait effects are recorded as text, not applied automatically — set the resulting stat yourself in the Stats section."
    >
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          label="Trait slots"
          value={character.traitSlots}
          onChange={(traitSlots) => onChange({ traitSlots })}
          hint="Grade One is 3 by default. The formula across grades is still to come."
        />
        <NumberInput
          label="Art slots"
          value={character.artSlots}
          onChange={(artSlots) => onChange({ artSlots })}
        />
      </div>

      {over ? (
        <p className="mt-3 rounded-md border border-blood-500/30 bg-blood-500/10 px-3 py-2 text-xs text-ash-300">
          Over the slot count. Nothing is blocked — adjust the slots or remove an entry when
          you're ready.
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-6">
        <ListEditor<Trait>
          label="Traits"
          badge={<SlotBadge usage={traits} />}
          items={character.traits}
          onChange={(next) => onChange({ traits: next })}
          createItem={(index) => ({
            id: `trait-${Date.now()}-${index}`,
            name: '',
            effect: '',
            notes: '',
          })}
          addLabel="Add trait"
          emptyLabel="No traits yet."
          renderItem={(trait, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Name"
                value={trait.name}
                onChange={(name) => update({ name })}
                placeholder="Eccentric Genius"
              />
              <TextInput
                label="Effect"
                value={trait.effect}
                onChange={(effect) => update({ effect })}
                placeholder="+2 Classes Speed, −2 Classes Strength"
              />
            </div>
          )}
        />

        <ListEditor<Trait>
          label="Defects"
          items={character.defects}
          onChange={(next) => onChange({ defects: next })}
          createItem={(index) => ({
            id: `defect-${Date.now()}-${index}`,
            name: '',
            effect: '',
            notes: '',
          })}
          addLabel="Add defect"
          emptyLabel="No defects yet."
          renderItem={(defect, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Name"
                value={defect.name}
                onChange={(name) => update({ name })}
                placeholder="Glass Jaw"
              />
              <TextInput
                label="Effect"
                value={defect.effect}
                onChange={(effect) => update({ effect })}
                placeholder="−2 Classes Fortitude"
              />
            </div>
          )}
        />

        <ListEditor<Art>
          label="Arts"
          badge={<SlotBadge usage={arts} />}
          items={character.arts}
          onChange={(next) => onChange({ arts: next })}
          createItem={(index) => ({ id: `art-${Date.now()}-${index}`, name: '', description: '' })}
          addLabel="Add art"
          emptyLabel="No arts yet."
          renderItem={(art, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Name" value={art.name} onChange={(name) => update({ name })} />
              <TextInput
                label="Description"
                value={art.description}
                onChange={(description) => update({ description })}
              />
            </div>
          )}
        />

        <ListEditor<Awakening>
          label="Awakenings"
          items={character.awakenings}
          onChange={(next) => onChange({ awakenings: next })}
          createItem={(index) => ({
            id: `awakening-${Date.now()}-${index}`,
            name: '',
            notes: '',
          })}
          addLabel="Add awakening"
          emptyLabel="No awakenings yet."
          renderItem={(awakening, update) => (
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Name"
                value={awakening.name}
                onChange={(name) => update({ name })}
              />
              <TextInput
                label="Notes"
                value={awakening.notes}
                onChange={(notes) => update({ notes })}
              />
            </div>
          )}
        />
      </div>
    </SectionCard>
  );
}
