/**
 * The values an export template can address.
 *
 * Template authoring is the point of this file: the key names here are what Dan types between
 * braces, so they are plain and stable rather than mirroring the internal shapes. Anything a
 * template cannot reach may as well not exist, so the rule is that nothing on a record is
 * silently unavailable.
 *
 * Pure (CLAUDE.md §3).
 */

import {
  CHARACTER_KIND_LABELS,
  RCT_LABELS,
  characterDisplayName,
  type Character,
} from './character';
import { ENTITY_LABELS, entityDisplayName, type Clan, type SavedEntity } from './entities';
import { assetLine, figureLine, mutationLine, seatLine } from './entities-display';
import { threatNote } from './bounty';
import { gradeAbbrev, gradeLabel, formatStatLong, formatStatShort } from './grades';
import {
  CE_RESERVES_LABELS,
  GRADED_STAT_IDS,
  describeEffectiveReserves,
  effectiveReserves,
} from './stats';
import { blackFlashTotal, missionLogLine } from './character';
import { blackFlashLogLine } from './black-flash';
import { entityGrade } from './entities';
import { describeClanBonus, describeMutations } from './clans';
import { ROLE_LABELS } from './roles';
import { isCharacter } from './sheet';
import type { TemplateContext, TemplateValue } from './template';

/**
 * The picture, in the three forms a template might want it.
 *
 * - `image` — the bare file name, which is all the record stores.
 * - `imagePath` — a relative path that resolves from where the markdown is written. Exports
 *   land at `exports/<collection>/<folder>/<name>.md` and pictures at `images/<file>`, so the
 *   climb is two levels plus one per folder segment. ⚠️ This only resolves for the **default**
 *   export folder; pointed at `Settings.exportDirectory` somewhere else, the picture is not
 *   beside it and the link will dangle. That is a property of exporting to an arbitrary
 *   directory, not something a cleverer path would fix.
 * - `imageEmbed` — an Obsidian embed, `![[file]]`. Obsidian resolves those by searching the
 *   vault, so it works wherever the note ends up, which is why the Obsidian-facing template
 *   prefers it.
 *
 * All three are empty when there is no picture, so `{{#imagePath}}` renders nothing.
 */
function imageKeys(file: string, folder: string): Record<string, TemplateValue> {
  if (!file) return { imagePath: '', imageEmbed: '' };

  const depth = 2 + folder.split('/').filter(Boolean).length;
  return {
    imagePath: `${'../'.repeat(depth)}images/${file}`,
    imageEmbed: `![[${file}]]`,
  };
}

/** `ceOutput` and friends, matching the stat ids so a template reads like the sheet. */
function statKeys(character: Character): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of GRADED_STAT_IDS) {
    out[id] = formatStatShort(character.stats.graded[id]);
    out[`${id}Long`] = formatStatLong(character.stats.graded[id]);
  }
  return out;
}

/** `Name — detail`, dropping either half when it is missing. */
function pair(a: string, b: string): string {
  return [a, b].map((part) => part.trim()).filter(Boolean).join(' — ');
}

function common(
  record: SavedEntity | Character,
  name: string,
  kindLabel: string,
): Record<string, TemplateValue> {
  const isChar = isCharacter(record);
  const origin = isChar ? record.origin : record.generated;
  // Lore is the one record with no grade, so the keys resolve to empty rather than to a
  // misleading "Grade 4" — a `{{#grade}}` section in a template simply does not render.
  const grade = isChar ? record.grade : entityGrade(record);

  return {
    name,
    kind: record.kind,
    kindLabel,
    grade: grade ? gradeLabel(grade) : '',
    gradeAbbrev: grade ? gradeAbbrev(grade) : '',
    folder: isChar ? '' : record.folder,
    visibility: isChar ? '' : ROLE_LABELS[record.minRole],
    image: isChar ? record.portrait : record.image,
    ...imageKeys(isChar ? record.portrait : record.image, isChar ? '' : record.folder),
    notes: record.notes,
    createdAt: record.createdAt.slice(0, 10),
    updatedAt: record.updatedAt.slice(0, 10),
    seed: origin?.seed ?? '',
    tableVersion: origin?.tableVersion ?? '',
    expandedByClaude: origin?.expandedByClaude ? 'Yes' : '',
  };
}

/**
 * Every own string or string-list property of the record, under its own key.
 *
 * This is what makes a new entity field addressable from a template with no change here —
 * the same bargain `describeEntity()` makes for the reading view.
 */
function ownFields(entity: SavedEntity): Record<string, TemplateValue> {
  const out: Record<string, TemplateValue> = {};

  for (const [key, value] of Object.entries(entity)) {
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      out[key] = value as readonly string[];
    }
  }

  return out;
}

export function entityExportContext(entity: SavedEntity): TemplateContext {
  const context: Record<string, TemplateValue> = {
    ...ownFields(entity),
    ...common(entity, entityDisplayName(entity), ENTITY_LABELS[entity.kind]),
  };

  // Links are objects; flatten to "name — why".
  context['links'] = entity.links.map((link) =>
    [link.label || 'Unnamed record', link.note].filter(Boolean).join(' — '),
  );

  // The posting writes its hosts on one line, pipe-separated, the way the server does. The
  // list itself stays available as `hosts` for anyone who wants it as bullets.
  if (entity.kind === 'mission') {
    context['hostLine'] = entity.hosts.join(' | ');
  }

  // A technique's household is objects, so it needs flattening by hand.
  if (entity.kind === 'technique') {
    context['shikigami'] = entity.shikigami.map((s) => pair(s.name || 'Unnamed', s.form));
  }

  // ⚠️ `targetGrade` is a GradeId, and `ownFields` exposes it raw — so without this the
  // posting reads "special-grade" where it should read "Special Grade". Any grade-valued
  // field needs the same treatment; only `grade` itself is handled by `common()`.
  if (entity.kind === 'bounty') {
    context['targetGrade'] = gradeLabel(entity.targetGrade);
    context['targetGradeAbbrev'] = gradeAbbrev(entity.targetGrade);
    // The sentence about the gap, written once here rather than assembled in two templates.
    context['threatNote'] = threatNote(entity.grade, entity.targetGrade);
  }

  // A clan's structure is objects all the way down, so `ownFields` reaches none of it. The
  // lines come from the same helpers the reading view and the printed sheet use, so a template
  // and a sheet cannot drift apart.
  if (entity.kind === 'clan') {
    context['bonuses'] = entity.bonuses.map((bonus) => bonus.text);
    context['mutations'] = entity.mutations.map(mutationLine);
    context['hierarchy'] = entity.hierarchy.map(seatLine);
    context['figures'] = entity.figures.map(figureLine);
    context['holdings'] = entity.treasury.assets.map(assetLine);
    context['funds'] = entity.treasury.yen;
    context['vaultNotes'] = entity.treasury.notes;
  }

  return context;
}

export function characterExportContext(
  character: Character,
  clans: readonly Clan[] = [],
): TemplateContext {
  const technique = character.innateTechnique;

  return {
    ...common(character, characterDisplayName(character), CHARACTER_KIND_LABELS[character.kind]),
    ...statKeys(character),

    nicknames: character.nicknames,
    gender: character.gender,
    race: character.race,
    subdivision: character.subdivision,
    age: character.age,
    dateOfBirth: character.dateOfBirth,
    sexuality: character.sexuality,

    nationality: character.nationality,
    ethnicity: character.ethnicity,
    hairColour: character.hairColour,
    eyeColour: character.eyeColour,
    height: character.height,
    appearance: character.appearance,

    affiliation: character.affiliation,
    occupation: character.occupation,
    hobbies: character.hobbies,
    likes: character.likes,
    dislikes: character.dislikes,
    personality: character.personality,
    background: character.background,

    faction: character.faction,
    clan: character.clan,
    ceApplications: character.ceApplications,
    arsenal: character.arsenal,
    potential: character.potential,
    clanBonus: character.clanBonus ? describeClanBonus(clans, character.clan) : [],
    mutations: describeMutations(clans, character.clan, character.mutations),
    feats: character.feats,
    mastery: character.mastery,

    themeSong: character.themeSong,
    faceClaim: character.faceClaim,

    ceReserves: CE_RESERVES_LABELS[character.stats.ceReserves],
    // Empty unless CE Efficiency outranks CE Output, so `{{#effectiveReserves}}` in a template
    // renders nothing for an ordinary sheet. Derived for display; the record is unchanged.
    effectiveReserves:
      effectiveReserves(character.stats).steps > 0
        ? describeEffectiveReserves(character.stats)
        : '',

    traits: character.traits.map((t) => pair(t.name, t.effect)),
    defects: character.defects.map((d) => pair(d.name, d.effect)),
    arts: character.arts.map((a) => pair(a.name, a.description)),
    awakenings: character.awakenings.map((a) => a.name),
    traitSlots: `${character.traits.length}/${character.traitSlots}`,
    artSlots: `${character.arts.length}/${character.artSlots}`,

    techniqueName: technique.name,
    techniqueDescription: technique.description,
    extensions: technique.extensions,
    maximum: technique.maximum,
    domain: technique.domainExpansion,

    reverseCursedTechnique:
      character.reverseCursedTechnique === 'none'
        ? ''
        : RCT_LABELS[character.reverseCursedTechnique],
    simpleDomain: character.simpleDomain ? 'Yes' : '',
    blackFlash: blackFlashTotal(character) > 0 ? String(blackFlashTotal(character)) : '',
    blackFlashes: character.blackFlashes.map(blackFlashLogLine),
    heavenlyRestriction: character.heavenlyRestriction,

    cursedTools: character.cursedTools.map((t) => pair(t.name, t.grade)),
    relationships: character.relationships.map((r) => pair(r.name, r.relation)),
    cursedRating: character.cursedRating,
    missions: character.missionHistory.map(missionLogLine),
  };
}

/**
 * For every list key, an `anyThing` flag.
 *
 * Mustache repeats a section once per item, which is right for the items and wrong for the
 * heading above them — `{{#complications}}## Complications{{/complications}}` would print the
 * heading once per complication. The flag is the standard way out, and it is derived here so
 * no template author has to remember to ask for one.
 */
function withAnyFlags(context: TemplateContext): TemplateContext {
  const out: Record<string, TemplateValue> = { ...context };

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') continue;
    const flag = `any${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    out[flag] = value.length > 0 ? 'yes' : '';
  }

  return out;
}

/**
 * @param clans The vault's clans, for a character's bonus and mutation lines. Given none, those
 *   lines render empty — the same as a hand-typed clan with no record. See `characterSheet`.
 */
export function exportContext(
  record: SavedEntity | Character,
  clans: readonly Clan[] = [],
): TemplateContext {
  return withAnyFlags(
    isCharacter(record) ? characterExportContext(record, clans) : entityExportContext(record),
  );
}

/** Keys a template may use, for the editor to list. Derived, never hand-maintained. */
export function availableKeys(record: SavedEntity | Character): readonly string[] {
  return Object.keys(exportContext(record)).sort();
}
