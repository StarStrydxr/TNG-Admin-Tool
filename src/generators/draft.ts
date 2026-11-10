/**
 * The draft engine.
 *
 * Every generator is a declaration (see `specs.ts`) run through this one engine, so rolling,
 * locking and re-rolling behave identically everywhere and there is a single place where
 * determinism can break.
 *
 * Reproducibility: each field rolls against a seed derived from the draft seed, the field key
 * and that field's nonce. Re-rolling one field bumps only its nonce, so every other field comes
 * out byte-identical, and the whole draft can be rebuilt from `seed` plus the nonces.
 *
 * Three features exist for the technique generator and are general:
 *
 *   - **Variants.** A spec may roll a *kind* first (a technique's type, say) and route fields
 *     to per-kind tables via `{variant}` in the table id, falling back to a shared `common`
 *     table when no specific one exists.
 *   - **Grade gating.** A field may declare `minGrade` and is simply absent below it — which is
 *     how a Maximum Technique only appears from Grade 1 up.
 *   - **Tag coherence.** Entries carry `tags`, and a field will not draw a *tagged* entry that
 *     shares no tag with what the draft has already drawn — so an arctic habitat stops turning
 *     up in a Tokyo subway. See `coherentPool` for exactly how gentle this is.
 *
 * Pure. No clock, no I/O, no Claude (CLAUDE.md §5).
 */

import { gradeRank, isGradeId, type GradeId } from '../domain/grades';
import { entriesForGrade, tableEntries, type TableId, type TableSet } from '../domain/tables';
import { createRng, deriveSeed, weightedPick, weightedPickMany } from './rng';

export type DraftKind =
  | 'sorcerer'
  | 'curse-user'
  | 'curse'
  | 'mission'
  | 'cursed-object'
  | 'cursed-tool'
  | 'technique'
  | 'shikigami';

/** Substituted into a table id wherever `{variant}` appears. */
export const VARIANT_TOKEN = '{variant}';

/** Used when a spec names a `{variant}` table that this variant has no entries for. */
export const COMMON_VARIANT = 'common';

export interface FieldSpec {
  readonly key: string;
  readonly label: string;
  readonly tableId: TableId;
  /** Fixed count, or an inclusive `[min, max]` rolled per draft. Default 1. */
  readonly count?: number | readonly [number, number];
  /** Set false to ignore the entries' grade filter for this field. Default true. */
  readonly gradeScaled?: boolean;
  /** Omit the field entirely below this grade. */
  readonly minGrade?: GradeId;
  /** Shown under the field in the UI. */
  readonly hint?: string;
  /**
   * A table the user may pick a fixed value from instead of rolling — the canonical technique
   * list, for instance. A picked entry overrides the roll, and its first tag, if it names a
   * variant, pins that variant too.
   */
  readonly pickTableId?: TableId;
  readonly pickLabel?: string;
  /**
   * Set false to draw from the whole pool regardless of what the draft has drawn so far, and to
   * keep this field's own tags out of the coherence context. For fields where matching makes no
   * sense — a name, a number — not for fields that merely have no tags yet.
   */
  readonly coherent?: boolean;
}

export interface GeneratorSpec {
  readonly kind: DraftKind;
  readonly label: string;
  readonly blurb: string;
  /** Table the grade is drawn from; its entries' values are grade ids. */
  readonly gradeTable: TableId;
  /** Optional kind rolled before the fields; its entry ids feed `{variant}`. */
  readonly variantTable?: TableId;
  readonly variantLabel?: string;
  readonly fields: readonly FieldSpec[];
}

export interface DraftVariant {
  readonly id: string;
  readonly label: string;
}

export interface DraftField {
  readonly key: string;
  readonly label: string;
  readonly tableId: TableId;
  readonly values: readonly string[];
  readonly locked: boolean;
  readonly nonce: number;
  readonly hint?: string;
  /**
   * Tags of the entries this field drew, kept so coherence can be recomputed when a single
   * field is re-rolled. Not persisted — a saved entity keeps values, not the draw.
   */
  readonly tags: readonly string[];
}

export interface Draft {
  readonly kind: DraftKind;
  readonly seed: string;
  readonly grade: GradeId;
  readonly gradeLocked: boolean;
  readonly gradeNonce: number;
  readonly variant: DraftVariant | null;
  readonly variantLocked: boolean;
  readonly variantNonce: number;
  readonly fields: readonly DraftField[];
  readonly tableVersion: string;
  /** Count overrides this draft was rolled with, kept so a re-roll honours them too. */
  readonly counts: Readonly<Record<string, number | readonly [number, number]>>;
}

export interface RollConstraints {
  /** Pin the grade instead of rolling it. */
  readonly grade?: GradeId;
  /** Pin the variant instead of rolling it. */
  readonly variantId?: string;
  /**
   * Override a field's `count` for this draft, by field key.
   *
   * The spec says how many of a thing a generator *usually* rolls; this is for when something
   * outside the spec decides — mission difficulty asking for three objectives rather than one.
   * A spec's own count stays the default, so nothing changes for generators that never pass it.
   */
  readonly counts?: Readonly<Record<string, number | readonly [number, number]>>;
}

/** Used when a grade table is missing or holds nothing usable. */
const FALLBACK_GRADE: GradeId = 'grade-4';

/** Table ids a spec always needs, regardless of which variant comes up. */
export function specTableIds(spec: GeneratorSpec): readonly TableId[] {
  const ids = [spec.gradeTable, ...spec.fields.map((f) => f.tableId)].filter(
    (id) => !id.includes(VARIANT_TOKEN),
  );
  return spec.variantTable ? [spec.variantTable, ...ids] : ids;
}

export function resolveTableId(tableId: TableId, variantId: string | null): TableId {
  if (!tableId.includes(VARIANT_TOKEN)) return tableId;
  return tableId.replace(VARIANT_TOKEN, variantId ?? COMMON_VARIANT);
}

/** True when the field exists at this grade. */
export function fieldApplies(field: FieldSpec, grade: GradeId): boolean {
  return field.minGrade === undefined || gradeRank(grade) >= gradeRank(field.minGrade);
}

function rollCount(count: FieldSpec['count'], rng: ReturnType<typeof createRng>): number {
  if (count === undefined) return 1;
  if (typeof count === 'number') return Math.max(0, count);
  const [min, max] = count;
  const low = Math.max(0, Math.min(min, max));
  const high = Math.max(low, Math.max(min, max));
  return low + rng.nextInt(high - low + 1);
}

function rollGrade(spec: GeneratorSpec, tables: TableSet, seed: string, nonce: number): GradeId {
  const rng = createRng(deriveSeed(seed, '@grade', nonce));
  const chosen = weightedPick(rng, tableEntries(tables, spec.gradeTable));
  return chosen && isGradeId(chosen.value) ? chosen.value : FALLBACK_GRADE;
}

function rollVariant(
  spec: GeneratorSpec,
  tables: TableSet,
  seed: string,
  nonce: number,
): DraftVariant | null {
  if (!spec.variantTable) return null;
  const rng = createRng(deriveSeed(seed, '@variant', nonce));
  const chosen = weightedPick(rng, tableEntries(tables, spec.variantTable));
  return chosen ? { id: chosen.id, label: chosen.value } : null;
}

function variantById(
  spec: GeneratorSpec,
  tables: TableSet,
  variantId: string,
): DraftVariant | null {
  const entry = tableEntries(tables, spec.variantTable ?? '').find((e) => e.id === variantId);
  return entry ? { id: entry.id, label: entry.value } : null;
}

/**
 * Narrow a pool to what fits what has already been drawn.
 *
 * The rule is deliberately one-sided: an **untagged** entry is always allowed, and a tagged one
 * is dropped only when it shares no tag with the context. So tags *exclude*, never require, and
 * a table with no tags in it behaves exactly as it did before coherence existed. That matters —
 * most of canon is untagged, and the alternative (preferring tagged matches) would quietly
 * narrow every roll to whichever handful of entries an author had got round to tagging.
 *
 * An empty result falls back to the whole pool. A blank field is always worse than an
 * incongruous one, and a thin table plus a specific context can easily exclude everything.
 */
export function coherentPool<T extends { readonly tags?: readonly string[] }>(
  pool: readonly T[],
  context: ReadonlySet<string>,
): readonly T[] {
  if (context.size === 0) return pool;

  const fitting = pool.filter((entry) => {
    if (!entry.tags || entry.tags.length === 0) return true;
    return entry.tags.some((tag) => context.has(tag));
  });

  return fitting.length > 0 ? fitting : pool;
}

/** Tags drawn so far, for coherence. `exceptKey` leaves one field out — the one being re-rolled. */
export function contextTags(
  fields: readonly DraftField[],
  exceptKey?: string,
): ReadonlySet<string> {
  const tags = new Set<string>();
  for (const field of fields) {
    if (field.key === exceptKey) continue;
    for (const tag of field.tags) tags.add(tag);
  }
  return tags;
}

function rollField(
  field: FieldSpec,
  tables: TableSet,
  seed: string,
  grade: GradeId,
  variantId: string | null,
  nonce: number,
  context: ReadonlySet<string>,
  countOverride?: number | readonly [number, number],
): DraftField {
  const rng = createRng(deriveSeed(seed, field.key, nonce));

  // A variant-scoped table falls back to the shared pool rather than leaving a blank field,
  // so adding a new technique type does not require writing every table for it up front.
  const specific = resolveTableId(field.tableId, variantId);
  let entries = tableEntries(tables, specific);
  if (entries.length === 0 && specific !== field.tableId) {
    entries = tableEntries(tables, resolveTableId(field.tableId, COMMON_VARIANT));
  }

  const graded = entriesForGrade(entries, field.gradeScaled === false ? null : grade);
  const pool = field.coherent === false ? graded : coherentPool(graded, context);

  const wanted = rollCount(countOverride ?? field.count, rng);
  const drawn = wanted <= 1 ? [weightedPick(rng, pool)] : weightedPickMany(rng, pool, wanted);
  const picked = drawn.filter((entry) => entry !== undefined);

  return {
    key: field.key,
    label: field.label,
    tableId: specific,
    values: picked.map((entry) => entry.value),
    locked: false,
    nonce,
    ...(field.hint !== undefined ? { hint: field.hint } : {}),
    tags: field.coherent === false ? [] : [...new Set(picked.flatMap((e) => e.tags ?? []))],
  };
}

export function rollDraft(
  spec: GeneratorSpec,
  tables: TableSet,
  seed: string,
  constraints: RollConstraints = {},
): Draft {
  const pinnedGrade = constraints.grade !== undefined;
  const grade = constraints.grade ?? rollGrade(spec, tables, seed, 0);

  const pinnedVariant = constraints.variantId !== undefined;
  const variant = pinnedVariant
    ? variantById(spec, tables, constraints.variantId as string)
    : rollVariant(spec, tables, seed, 0);

  return {
    kind: spec.kind,
    seed,
    grade,
    gradeLocked: pinnedGrade,
    gradeNonce: 0,
    variant,
    variantLocked: pinnedVariant,
    variantNonce: 0,
    // Rolled in spec order, each field seeing the tags of the ones before it. Order therefore
    // matters for coherence: put the field that should set the tone — a location, a habitat —
    // before the ones that should agree with it.
    fields: rollFields(
      spec,
      tables,
      seed,
      grade,
      variant?.id ?? null,
      new Map(),
      new Set(),
      new Map(),
      constraints.counts ?? {},
    ),
    tableVersion: tables.version,
    counts: constraints.counts ?? {},
  };
}

/**
 * Roll every applicable field, accumulating coherence context as it goes.
 *
 * `keep` holds fields that survive unchanged (locked ones), and `nonces` the nonce each field
 * should roll with. Shared by `rollDraft` and `rerollUnlocked` so the two cannot drift: with
 * nothing locked and fresh nonces they produce identical output.
 */
function rollFields(
  spec: GeneratorSpec,
  tables: TableSet,
  seed: string,
  grade: GradeId,
  variantId: string | null,
  keep: ReadonlyMap<string, DraftField>,
  seen: ReadonlySet<string>,
  nonces: ReadonlyMap<string, number> = new Map(),
  counts: Readonly<Record<string, number | readonly [number, number]>> = {},
): readonly DraftField[] {
  const context = new Set(seen);
  const out: DraftField[] = [];

  for (const field of spec.fields) {
    if (!fieldApplies(field, grade)) continue;

    const locked = keep.get(field.key);
    if (locked) {
      out.push(locked);
      for (const tag of locked.tags) context.add(tag);
      continue;
    }

    const rolled = rollField(
      field,
      tables,
      seed,
      grade,
      variantId,
      nonces.get(field.key) ?? 0,
      context,
      counts[field.key],
    );
    out.push(rolled);
    for (const tag of rolled.tags) context.add(tag);
  }

  return out;
}

/** Re-roll a single field. Everything else, locked or not, is untouched. */
export function rerollField(
  draft: Draft,
  spec: GeneratorSpec,
  tables: TableSet,
  key: string,
): Draft {
  const fields = draft.fields.map((current) => {
    if (current.key !== key || current.locked) return current;
    const field = spec.fields.find((candidate) => candidate.key === key);
    if (!field) return current;
    const next = rollField(
      field,
      tables,
      draft.seed,
      draft.grade,
      draft.variant?.id ?? null,
      current.nonce + 1,
      // Every other field's tags, including ones below this one: a single re-roll should fit
      // the draft as it stands, not as it stood when this field first rolled.
      contextTags(draft.fields, key),
      draft.counts[key],
    );
    return { ...next, locked: current.locked };
  });

  return { ...draft, fields };
}

/**
 * Re-roll everything unlocked. Grade and variant move too unless locked, and the field list is
 * rebuilt from the spec — so a grade change can add a Maximum Technique that was not there a
 * moment ago, or drop one that no longer applies.
 */
export function rerollUnlocked(draft: Draft, spec: GeneratorSpec, tables: TableSet): Draft {
  const gradeNonce = draft.gradeLocked ? draft.gradeNonce : draft.gradeNonce + 1;
  const grade = draft.gradeLocked ? draft.grade : rollGrade(spec, tables, draft.seed, gradeNonce);

  const variantNonce = draft.variantLocked ? draft.variantNonce : draft.variantNonce + 1;
  const variant = draft.variantLocked
    ? draft.variant
    : rollVariant(spec, tables, draft.seed, variantNonce);

  const keep = new Map<string, DraftField>();
  const nonces = new Map<string, number>();
  for (const existing of draft.fields) {
    if (existing.locked) keep.set(existing.key, existing);
    else nonces.set(existing.key, existing.nonce + 1);
  }

  const fields = rollFields(
    spec,
    tables,
    draft.seed,
    grade,
    variant?.id ?? null,
    keep,
    new Set(),
    nonces,
    draft.counts,
  );

  return { ...draft, grade, gradeNonce, variant, variantNonce, fields, tableVersion: tables.version };
}

export function setFieldLocked(draft: Draft, key: string, locked: boolean): Draft {
  return {
    ...draft,
    fields: draft.fields.map((field) => (field.key === key ? { ...field, locked } : field)),
  };
}

export function setGradeLocked(draft: Draft, locked: boolean): Draft {
  return { ...draft, gradeLocked: locked };
}

export function setVariantLocked(draft: Draft, locked: boolean): Draft {
  return { ...draft, variantLocked: locked };
}

/**
 * Hand-edit a field's values. Generated output is never immutable (CLAUDE.md §6).
 *
 * Tags are cleared: the text no longer came from the entry that was drawn, so keeping its tags
 * would let a replaced value go on steering what the rest of the draft may roll.
 */
export function setFieldValues(draft: Draft, key: string, values: readonly string[]): Draft {
  return {
    ...draft,
    fields: draft.fields.map((field) =>
      field.key === key ? { ...field, values, tags: [] } : field,
    ),
  };
}

export function draftValue(draft: Draft, key: string): string {
  return draft.fields.find((field) => field.key === key)?.values.join(', ') ?? '';
}

/** All values of a multi-value field; empty when the field is absent (grade-gated away). */
export function draftValues(draft: Draft, key: string): readonly string[] {
  return draft.fields.find((field) => field.key === key)?.values ?? [];
}
