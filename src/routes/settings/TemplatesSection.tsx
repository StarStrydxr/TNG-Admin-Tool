import { useCallback, useEffect, useMemo, useState } from 'react';

import { SectionCard } from '../../components/SectionCard';
import { availableKeys } from '../../domain/export-context';
import { templateKeys } from '../../domain/template';
import { createCharacter } from '../../domain/character';
import { parseEntity } from '../../domain/entities-parse';
import { ENTITY_KINDS, ENTITY_LABELS, type EntityKind } from '../../domain/entities';
import {
  loadTemplates,
  renderRecord,
  resetTemplate,
  revealTemplatesFolder,
  saveTemplate,
  type Exportable,
  type TemplateSet,
} from '../../services/exports';
import { listAllRecords } from '../../services/storage';
import { useAnnouncer } from '../../hooks/useAnnouncer';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Template names, which are the entity kinds plus `character`. */
const TEMPLATE_NAMES: readonly string[] = [...ENTITY_KINDS, 'character'];

function labelFor(name: string): string {
  return name === 'character'
    ? 'Character'
    : (ENTITY_LABELS[name as EntityKind] ?? name);
}

/**
 * A stand-in to preview against when the vault has nothing of that kind yet.
 *
 * A preview of an empty template teaches nothing, and the whole point of this editor is seeing
 * what a change does. Sample values are obviously samples.
 */
function sampleFor(name: string): Exportable | null {
  if (name === 'character') {
    return createCharacter({
      id: 'sample',
      kind: 'pc',
      name: 'A sample character',
      grade: 'grade-1',
      now: new Date().toISOString(),
    });
  }

  return parseEntity(
    {
      kind: name,
      id: 'sample',
      name: `A sample ${labelFor(name).toLowerCase()}`,
      grade: 'grade-2',
      notes: 'Sample record — the vault has none of these yet.',
    },
    'sample',
  );
}

/**
 * Edit an export template, with the result beside it.
 *
 * The override mechanism already existed; without this it was Notepad-only, which meant nobody
 * iterated on the formats. Saving writes the same file Notepad would (CLAUDE.md §9), so the
 * two ways of editing stay interchangeable.
 */
export function TemplatesSection() {
  const { announce } = useAnnouncer();

  const [name, setName] = useState<string>('mission');
  const [set, setSet] = useState<TemplateSet | null>(null);
  const [text, setText] = useState('');
  const [records, setRecords] = useState<readonly Exportable[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const loaded = await loadTemplates();
      setSet(loaded);
      setText(loaded.templates[name] ?? '');
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [name]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    listAllRecords()
      .then((all) => {
        if (!cancelled) setRecords(all);
      })
      .catch(() => {
        // Previewing against a sample is a perfectly good fallback.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** A real record of this kind if there is one, otherwise a sample. */
  const subject = useMemo(() => {
    const real = records.find((record) =>
      name === 'character'
        ? record.kind === 'pc' || record.kind === 'npc'
        : record.kind === name,
    );
    return real ?? sampleFor(name);
  }, [records, name]);

  const preview = useMemo(() => {
    if (!subject) return '';
    try {
      return renderRecord(subject, text);
    } catch (cause) {
      return `Could not render: ${errorText(cause)}`;
    }
  }, [subject, text]);

  /** Keys this record offers that the template does not yet mention. */
  const unused = useMemo(() => {
    if (!subject) return [];
    const used = new Set(templateKeys(text));
    return availableKeys(subject).filter((key) => !used.has(key));
  }, [subject, text]);

  const overridden = set?.overridden.includes(name) ?? false;
  const dirty = set ? text !== (set.templates[name] ?? '') : false;

  const onSave = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await saveTemplate(name, text);
      await load();
      setSaved(true);
      announce(`${labelFor(name)} template saved.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [name, text, load, announce]);

  const onReset = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await resetTemplate(name);
      await load();
      setSaved(false);
      announce(`${labelFor(name)} template reset to the shipped default.`);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }, [name, load, announce]);

  return (
    <SectionCard
      title="Export templates"
      description="What a markdown export looks like. Edit here or in Notepad — same files."
    >
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Template</span>
          <select
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            className="rounded-md border border-void-700 bg-void-850 px-2 py-1.5 text-sm text-ash-100 outline-none focus:border-cursed-500"
          >
            {TEMPLATE_NAMES.map((id) => (
              <option key={id} value={id}>
                {labelFor(id)}
                {set?.overridden.includes(id) ? ' (yours)' : ''}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void onSave()}
          className="rounded-md border border-cursed-600 bg-cursed-600/15 px-3 py-1.5 text-sm text-ash-100 transition-colors enabled:hover:bg-cursed-600/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save as mine'}
        </button>

        {overridden ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onReset()}
            className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-500 transition-colors enabled:hover:border-void-600 enabled:hover:text-ash-300 disabled:opacity-40"
          >
            Back to the shipped one
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void revealTemplatesFolder()}
          className="rounded-md border border-void-700 px-3 py-1.5 text-sm text-ash-500 transition-colors hover:border-void-600 hover:text-ash-300"
        >
          Open the folder
        </button>

        {dirty ? <span className="pb-2 text-xs text-ash-500">Unsaved</span> : null}
        {saved && !dirty ? <span className="pb-2 text-xs text-ash-500">Saved</span> : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">Template</span>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSaved(false);
            }}
            spellCheck={false}
            rows={22}
            className="w-full resize-y rounded-md border border-void-700 bg-void-850 px-2.5 py-2 font-mono text-xs leading-relaxed text-ash-100 outline-none focus:border-cursed-500"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ash-400">
            Preview{' '}
            <span className="text-ash-500">
              {subject && records.includes(subject) ? '— a real record' : '— a sample record'}
            </span>
          </span>
          <pre className="h-full min-h-[20rem] overflow-auto whitespace-pre-wrap rounded-md border border-void-800 bg-void-950 px-2.5 py-2 font-mono text-xs leading-relaxed text-ash-300">
            {preview}
          </pre>
        </div>
      </div>

      {unused.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-ash-400">
            {unused.length} more {'{{keys}}'} available on this record
          </summary>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ash-500">
            {unused.map((key) => `{{${key}}}`).join('  ')}
          </p>
        </details>
      ) : null}

      <p className="mt-3 text-xs leading-relaxed text-ash-500">
        Mustache syntax: <code className="text-ash-400">{'{{key}}'}</code> for a value,{' '}
        <code className="text-ash-400">{'{{#key}}…{{/key}}'}</code> to show a block only when
        there is one (and to repeat it for a list, with{' '}
        <code className="text-ash-400">{'{{.}}'}</code> as the item),{' '}
        <code className="text-ash-400">{'{{^key}}…{{/key}}'}</code> for when there is none. For
        a heading above a list use the{' '}
        <code className="text-ash-400">{'{{#anyThing}}'}</code> flag, or it prints once per row.
      </p>

      {error ? <p className="mt-3 text-xs text-blood-500">{error}</p> : null}
    </SectionCard>
  );
}
