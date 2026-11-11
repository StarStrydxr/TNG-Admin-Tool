import { Insignia } from '../../components/Insignia';
import { Checkbox, LinesField, Select, TextArea, TextInput } from '../../components/form/fields';
import {
  ACQUISITIONS,
  ACQUISITION_LABELS,
  ACQUISITION_NOTES,
  RARITIES,
  TRAIT_SOURCES,
  rarityCost,
  rarityLabel,
  rarityPermissionNote,
  type TraitEntity,
  type TraitKind,
} from '../../domain/traits';
import type { TraitAcquisition, TraitRarity } from '../../domain/entities';
import { ROLE_LABELS, assignableRoles, type Role } from '../../domain/roles';
import { TraitEntries } from './TraitEntries';

export interface EditorCopy {
  readonly namePlaceholder: string;
  readonly descriptionPlaceholder: string;
  readonly slotHint: string;
}

interface EditorProps {
  readonly entry: TraitEntity;
  readonly kind: TraitKind;
  readonly copy: EditorCopy;
  readonly viewer: Role;
  readonly onChange: (entry: TraitEntity) => void;
  readonly onDuplicate: () => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
  readonly onReveal: () => void;
}

/**
 * One record, open for editing.
 *
 * Split out of the board purely for length (§9 keeps files under ~300 lines); it is still the
 * one editor for both kinds, and the fields that differ branch on `entry.kind` rather than
 * being written twice.
 */
export function TraitEditor({
  entry,
  kind,
  copy,
  viewer,
  onChange,
  onDuplicate,
  onRemove,
  onClose,
  onReveal,
}: EditorProps) {
  const lower = kind === 'trait' ? 'trait' : 'defect';

  return (
        <section className="rounded-lg border border-void-700 bg-void-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Insignia kind={kind} size={18} className="shrink-0 text-ash-400" />
            <h3 className="mr-auto font-display text-lg text-ash-100">
              {entry.name || `Unnamed ${lower}`}
            </h3>
            <button
              type="button"
              onClick={() => onDuplicate()}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onRemove()}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-blood-600 hover:text-blood-500"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => onClose()}
              className="rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-400 transition-colors hover:border-void-600 hover:text-ash-100"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <TextInput
              label="Name"
              value={entry.name}
              onChange={(name) => onChange({ ...entry, name })}
              placeholder={copy.namePlaceholder}
            />

            {entry.kind === 'trait' ? (
              <>
                <Select<TraitRarity>
                  label="Rarity"
                  value={entry.rarity}
                  options={RARITIES.map((id) => ({
                    value: id,
                    label: `${rarityLabel(id)} — ${rarityCost(id)}`,
                  }))}
                  onChange={(rarity) => onChange({ ...entry, rarity })}
                  hint="The rarity sets the cost. The server's own table, not a setting."
                />
                <Select<TraitAcquisition>
                  label="How it is taken"
                  value={entry.acquisition}
                  options={ACQUISITIONS.map((id) => ({
                    value: id,
                    label: ACQUISITION_LABELS[id],
                  }))}
                  onChange={(acquisition) => onChange({ ...entry, acquisition })}
                  hint={ACQUISITION_NOTES[entry.acquisition]}
                />
              </>
            ) : (
              <TextInput
                label="Cost"
                value={entry.tpCost}
                onChange={(tpCost) => onChange({ ...entry, tpCost })}
                placeholder="Returns 4 TP"
                hint="Free text — the defect rules have not been supplied yet."
              />
            )}
          </div>

          {entry.kind === 'trait' && rarityPermissionNote(entry.rarity) ? (
            <p className="mt-3 rounded-md border border-cursed-600/40 bg-cursed-600/5 px-3 py-2 text-xs leading-relaxed text-ash-400">
              {rarityPermissionNote(entry.rarity)} Submit it and a staff member will ping whoever
              needs to be asked.
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-4">
            <TextArea
              label="Description"
              value={entry.description}
              onChange={(description) => onChange({ ...entry, description })}
              rows={3}
              placeholder={copy.descriptionPlaceholder}
            />

            <TraitEntries
              entry={entry}
              onChange={(entries) => onChange({ ...entry, entries })}
            />

            <div className="grid grid-cols-2 gap-4">
              <LinesField
                label="Requirements"
                lines={entry.requirements}
                rows={3}
                placeholder={
                  'Must either be non-human or possess unique physiology.\n' +
                  'If Developed: Must have a heavily scrutinized reason.'
                }
                hint="One per line. A soft note for whoever reads the sheet; nothing is enforced."
                onChange={(requirements) => onChange({ ...entry, requirements })}
              />
              <TextInput
                label="Source"
                value={entry.source}
                onChange={(source) => onChange({ ...entry, source })}
                suggestions={TRAIT_SOURCES}
              />
            </div>

            <Checkbox
              label="Takes a trait slot"
              checked={entry.usesTraitSlot}
              onChange={(usesTraitSlot) => onChange({ ...entry, usesTraitSlot })}
            />
            <p className="-mt-2 text-xs leading-relaxed text-ash-500">{copy.slotHint}</p>

            <TextArea
              label="GM notes"
              value={entry.notes}
              onChange={(notes) => onChange({ ...entry, notes })}
              rows={2}
              hint="Yours. Still leaves the machine on export, so rank it if it matters."
            />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-void-800 pt-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ash-400">Folder</span>
              <input
                type="text"
                value={entry.folder}
                onChange={(event) => onChange({ ...entry, folder: event.target.value })}
                placeholder="Clan"
                className="w-56 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
              />
            </label>

            <Select<Role>
              label="Visible to"
              value={entry.minRole}
              options={assignableRoles(viewer).map((role) => ({
                value: role,
                label: `${ROLE_LABELS[role]} and above`,
              }))}
              onChange={(minRole) => onChange({ ...entry, minRole })}
            />

            <button
              type="button"
              onClick={() => onReveal()}
              className="rounded-md border border-void-700 px-3 py-1.5 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
            >
              Open data folder
            </button>
          </div>
        </section>
  );
}
