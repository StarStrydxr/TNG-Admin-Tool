import { useEffect, useState } from 'react';

import {
  ENTITY_LABELS,
  entityDisplayName,
  entityGrade,
  type SavedEntity,
} from '../../domain/entities';
import { describeEntity } from '../../domain/entities-display';
import { ROLE_LABELS, assignableRoles, capabilitiesFor, type Role } from '../../domain/roles';
import { useExport } from '../../hooks/useExport';
import { usePrint } from '../../hooks/usePrint';
import { Insignia } from '../Insignia';
import { ImagePicker } from '../form/ImagePicker';
import { CardSection } from '../../routes/vault/sections/CardSection';
import { DiscordPreview } from '../DiscordPreview';
import { LinksEditor } from './LinksEditor';
import type { EntityLink, LinkKind } from '../../domain/links';
import { GradeSeal } from '../GradeSeal';

const BUTTON =
  'rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';

interface EntityDetailProps {
  readonly entity: SavedEntity;
  readonly viewer: Role;
  readonly onSave: (entity: SavedEntity) => void;
  readonly onDelete: (entity: SavedEntity) => void;
  /** Jump to a linked record in another collection. */
  readonly onOpen: (kind: LinkKind, id: string) => void;
}

export function EntityDetail({ entity, viewer, onSave, onDelete, onOpen }: EntityDetailProps) {
  const caps = capabilitiesFor(viewer);
  const { printRecords } = usePrint();
  const exporter = useExport();
  const [folder, setFolder] = useState(entity.folder);
  const [previewing, setPreviewing] = useState(false);
  const grade = entityGrade(entity);
  const [minRole, setMinRole] = useState<Role>(entity.minRole);
  const [notes, setNotes] = useState(entity.notes);
  const [image, setImage] = useState(entity.image);
  const [links, setLinks] = useState<readonly EntityLink[]>(entity.links);
  const [confirming, setConfirming] = useState(false);

  // Reset the form when a different record is selected.
  useEffect(() => {
    setFolder(entity.folder);
    setMinRole(entity.minRole);
    setNotes(entity.notes);
    setImage(entity.image);
    setLinks(entity.links);
    setConfirming(false);
  }, [entity]);

  const dirty =
    folder !== entity.folder ||
    minRole !== entity.minRole ||
    notes !== entity.notes ||
    image !== entity.image ||
    links !== entity.links;
  const fields = describeEntity(entity);

  return (
    <article className="min-w-0 flex-1">
      <header className="border-b border-void-800 pb-4">
        <div className="flex items-baseline gap-2">
          <Insignia kind={entity.kind} size={20} className="shrink-0 self-center text-ash-400" />
          <h2 className="truncate font-display text-xl text-ash-100">
            {entityDisplayName(entity)}
          </h2>
          {grade ? (
            <GradeSeal grade={grade} className="self-center" />
          ) : null}
          <button
            type="button"
            disabled={exporter.busy}
            onClick={() => void exporter.exportRecords([entity])}
            title="Writes a markdown file into the exports folder"
            className="ml-auto shrink-0 rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:opacity-40"
          >
            {exporter.busy ? 'Exporting…' : 'Export markdown'}
          </button>
          <button
            type="button"
            disabled={exporter.busy}
            onClick={() => void exporter.exportRecords([entity], 'discord')}
            title="Writes the server's posting format, ready to paste into Discord"
            className="shrink-0 rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:opacity-40"
          >
            Discord format
          </button>
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            title="See how this exports before writing a file"
            className="shrink-0 rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => printRecords([entity])}
            title="Opens the print dialog — choose Microsoft Print to PDF to save a file"
            className="shrink-0 rounded-md border border-void-700 px-2.5 py-1 text-xs text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
          >
            Print sheet
          </button>
        </div>
        <p className="mt-1 text-xs text-ash-500">
          {ENTITY_LABELS[entity.kind]}
          {entity.folder ? ` · ${entity.folder}` : ' · collection root'}
          {entity.generated ? ` · seed ${entity.generated.seed}` : ''}
        </p>
      </header>

      <dl className="mt-4 flex flex-col" data-selectable>
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex gap-4 border-b border-void-850 py-2 last:border-b-0"
          >
            <dt className="w-40 shrink-0 text-xs text-ash-400">{field.label}</dt>
            <dd className="min-w-0 flex-1 text-sm leading-relaxed text-ash-200">
              {field.values.length === 1 ? (
                field.values[0]
              ) : (
                <ul className="flex flex-col gap-1">
                  {field.values.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-6 rounded-lg border border-void-800 bg-void-900 p-4">
        <h3 className="mb-3 text-xs font-medium tracking-wide text-ash-400">Filing</h3>

        <div className="mb-4">
          <ImagePicker label="Image" value={image} onChange={setImage} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ash-400">Folder</span>
            <input
              type="text"
              value={folder}
              disabled={!caps.canEdit}
              onChange={(event) => setFolder(event.target.value)}
              placeholder="Arc 2/Shibuya"
              className="w-56 rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500 disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-ash-400">Visible to</span>
            <select
              value={minRole}
              disabled={!caps.canEdit}
              onChange={(event) => setMinRole(event.target.value as Role)}
              className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500 disabled:opacity-50"
            >
              {assignableRoles(viewer).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]} and above
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={!dirty || !caps.canEdit}
            onClick={() => onSave({ ...entity, folder, minRole, notes, image, links })}
            className={`${BUTTON} border-cursed-600 bg-cursed-600/15 text-ash-100 enabled:hover:bg-cursed-600/25`}
          >
            Save changes
          </button>

          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => onDelete(entity)}
                className={`${BUTTON} border-blood-500 bg-blood-500/15 text-ash-100 hover:bg-blood-500/25`}
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-2 py-1.5 text-sm text-ash-500 hover:text-ash-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!caps.canDelete}
              onClick={() => setConfirming(true)}
              title={caps.canDelete ? undefined : 'Admin and above can delete'}
              className={`${BUTTON} border-void-700 text-ash-500 enabled:hover:border-blood-500 enabled:hover:text-blood-500`}
            >
              Delete
            </button>
          )}
        </div>

        <label className="mt-4 flex flex-col gap-1">
          <span className="text-xs text-ash-400">Notes</span>
          <textarea
            rows={3}
            value={notes}
            disabled={!caps.canEdit}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full resize-y rounded-md border border-void-700 bg-void-850 px-2.5 py-1.5 text-sm leading-relaxed text-ash-100 outline-none focus:border-cursed-500 disabled:opacity-50"
          />
        </label>

        <p className="mt-3 text-xs text-ash-500">
          Changing the folder moves the file on disk. Moving it yourself in Explorer works too —
          the folder it sits in wins.
        </p>
      </section>

      {/* Only the two kinds that have a layout. The rest fall back to print and markdown,
          the same way `templateFor` falls back rather than writing an empty file. */}
      {entity.kind === 'clan' || entity.kind === 'mission' ? (
        <CardSection subject={entity} />
      ) : null}

      <LinksEditor
        selfId={entity.id}
        links={links}
        onChange={setLinks}
        viewer={viewer}
        onOpen={onOpen}
      />

      {previewing ? (
        <DiscordPreview record={entity} onClose={() => setPreviewing(false)} />
      ) : null}
    </article>
  );
}
