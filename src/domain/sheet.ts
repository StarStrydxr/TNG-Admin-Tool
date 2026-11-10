/**
 * The printable form of a record.
 *
 * One shape — titled sections of labelled fields — so the print component never needs to know
 * what kind of thing it is rendering. Both saved entities and vault characters flatten into it.
 *
 * Pure. No DOM, no formatting decisions beyond ordering and labelling.
 */

import {
  CHARACTER_KIND_LABELS,
  RCT_LABELS,
  characterDisplayName,
  type Character,
} from './character';
import { ENTITY_LABELS, entityDisplayName, type Clan, type SavedEntity } from './entities';
import { describeEntity } from './entities-display';
import { formatStatLong, gradeLabel } from './grades';
import {
  CE_RESERVES_LABELS,
  GRADED_STAT_IDS,
  GRADED_STAT_LABELS,
  describeEffectiveReserves,
  effectiveReserves,
} from './stats';
import { missionLogLine } from './character';
import { describeClanBonus, describeMutations } from './clans';
import { ROLE_LABELS } from './roles';

export interface SheetField {
  readonly label: string;
  readonly values: readonly string[];
}

export interface SheetSection {
  readonly title: string;
  readonly fields: readonly SheetField[];
}

export interface Sheet {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly sections: readonly SheetSection[];
  /**
   * A resolved `data:` URL for the record's picture, or null. Resolved by the caller rather
   * than looked up here — reading a file is I/O, and this module is pure.
   */
  readonly imageUrl: string | null;
  /** Provenance line printed small at the foot of the sheet. */
  readonly footer: string;
}

function field(label: string, value: string): SheetField {
  return { label, values: value.trim() ? [value] : [] };
}

function listField(label: string, values: readonly string[]): SheetField {
  return { label, values: values.filter((value) => value.trim().length > 0) };
}

function section(title: string, fields: readonly SheetField[]): SheetSection {
  return { title, fields: fields.filter((f) => f.values.length > 0) };
}

function prune(sections: readonly SheetSection[]): readonly SheetSection[] {
  return sections.filter((s) => s.fields.length > 0);
}

function provenance(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

export function entitySheet(entity: SavedEntity, imageUrl: string | null = null): Sheet {
  const details = describeEntity(entity).map((f) => listField(f.label, f.values));

  return {
    id: entity.id,
    title: entityDisplayName(entity),
    subtitle: ENTITY_LABELS[entity.kind],
    imageUrl,
    sections: prune([
      section('Details', details),
      section('Notes', [field('', entity.notes)]),
    ]),
    footer: provenance([
      entity.folder || 'collection root',
      `visible to ${ROLE_LABELS[entity.minRole]} and above`,
      entity.generated ? `seed ${entity.generated.seed}` : null,
    ]),
  };
}

/**
 * @param clans The vault's clans, for resolving the bonus and mutation lines. Defaults to none,
 *   in which case those lines simply do not print — exactly what already happens for a clan
 *   typed by hand that has no record. A pure module cannot read the vault, so the caller that
 *   has the clans loaded passes them in.
 */
export function characterSheet(
  character: Character,
  imageUrl: string | null = null,
  clans: readonly Clan[] = [],
): Sheet {
  const stats = GRADED_STAT_IDS.map((id) =>
    field(GRADED_STAT_LABELS[id], formatStatLong(character.stats.graded[id])),
  );

  return {
    id: character.id,
    title: characterDisplayName(character),
    subtitle: `${CHARACTER_KIND_LABELS[character.kind]} · ${gradeLabel(character.grade)}`,
    imageUrl,
    // Sections follow the server's OC template, and an empty one is dropped entirely — so a
    // sparse NPC still prints as a short sheet rather than a page of blank headings.
    sections: prune([
      section('General', [
        field('Nicknames', character.nicknames),
        field('Gender', character.gender),
        field('Race', character.race),
        field('Subdivision', character.subdivision),
        field('Age', character.age),
        field('Date of birth', character.dateOfBirth),
        field('Sexuality', character.sexuality),
      ]),
      section('Appearance', [
        field('Nationality', character.nationality),
        field('Ethnicity', character.ethnicity),
        field('Hair colour', character.hairColour),
        field('Eye colour', character.eyeColour),
        field('Height', character.height),
        field('Description', character.appearance),
      ]),
      section('Personal', [
        field('Affiliation', character.affiliation),
        field('Occupation', character.occupation),
        field('Hobbies', character.hobbies),
        field('Likes', character.likes),
        field('Dislikes', character.dislikes),
        field('Personality', character.personality),
        field('Backstory', character.background),
      ]),
      section('Sorcerer profile', [
        field('Faction', character.faction),
        field('Clan', character.clan),
        field('CE applications', character.ceApplications),
        field('Arsenal', character.arsenal),
        field('Potential', character.potential),
        listField(
          'Clan bonus',
          character.clanBonus ? describeClanBonus(clans, character.clan) : [],
        ),
        listField('Mutations', describeMutations(clans, character.clan, character.mutations)),
        listField('Feats', character.feats),
        field('Mastery', character.mastery),
      ]),
      section('Stats', [
        ...stats,
        field('CE Reserves', CE_RESERVES_LABELS[character.stats.ceReserves]),
        // Beside the written band, never instead of it, and only when there is a shift to
        // report — an ordinary sheet prints exactly as it always did.
        field(
          'Effective reserves',
          effectiveReserves(character.stats).steps > 0
            ? describeEffectiveReserves(character.stats)
            : '',
        ),
      ]),
      section('Traits and defects', [
        listField(
          'Traits',
          character.traits.map((t) =>
            [t.name, t.effect].filter(Boolean).join(' — '),
          ),
        ),
        listField(
          'Defects',
          character.defects.map((d) => [d.name, d.effect].filter(Boolean).join(' — ')),
        ),
        listField('Arts', character.arts.map((a) => [a.name, a.description].filter(Boolean).join(' — '))),
        listField('Awakenings', character.awakenings.map((a) => a.name)),
      ]),
      section('Cursed technique', [
        field('Innate technique', character.innateTechnique.name),
        field('Description', character.innateTechnique.description),
        listField('Extensions', character.innateTechnique.extensions),
        field('Maximum technique', character.innateTechnique.maximum),
        field('Domain expansion', character.innateTechnique.domainExpansion),
        // Absences stay off the paper: RCT, Simple Domain and Black Flash print only once the
        // character actually has them, the same way an empty section is dropped entirely.
        field(
          'Reverse Cursed Technique',
          character.reverseCursedTechnique === 'none'
            ? ''
            : RCT_LABELS[character.reverseCursedTechnique],
        ),
        field('Simple Domain', character.simpleDomain ? 'Yes' : ''),
        field('Black Flash', character.blackFlashCount > 0 ? String(character.blackFlashCount) : ''),
        field('Heavenly Restriction', character.heavenlyRestriction),
      ]),
      section('Tools, ties and history', [
        listField(
          'Cursed tools',
          character.cursedTools.map((t) => [t.name, t.grade].filter(Boolean).join(' — ')),
        ),
        listField(
          'Relationships',
          character.relationships.map((r) => [r.name, r.relation].filter(Boolean).join(' — ')),
        ),
      ]),
      section('Mission log', [
        field('Cursed Rating', character.cursedRating),
        listField('Missions', character.missionHistory.map(missionLogLine)),
      ]),
      section('Bonus', [
        field('Theme song', character.themeSong),
        field('Face claim', character.faceClaim),
      ]),
      section('Notes', [field('', character.notes)]),
    ]),
    footer: provenance([
      `${character.traits.length}/${character.traitSlots} traits`,
      `${character.arts.length}/${character.artSlots} arts`,
      character.origin ? `seed ${character.origin.seed}` : null,
    ]),
  };
}

export interface BookletCover {
  readonly title: string;
  readonly subtitle: string;
  /** One line per record, in printing order. */
  readonly contents: readonly string[];
}

/**
 * The first page of a booklet.
 *
 * Only for more than one record: a single sheet is its own cover, and a title page in front of
 * one mission is just a wasted sheet of paper. `printedOn` is passed in rather than read from
 * a clock, so this module stays pure (CLAUDE.md §3).
 */
export function bookletCover(
  records: readonly (SavedEntity | Character)[],
  folder: string,
  printedOn: string,
): BookletCover | null {
  if (records.length < 2) return null;

  const counts = new Map<string, number>();
  for (const record of records) {
    const label = isCharacter(record)
      ? CHARACTER_KIND_LABELS[record.kind]
      : ENTITY_LABELS[record.kind];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  // Lowercase ordinary labels mid-sentence, but leave an initialism like "NPC" alone.
  const readable = (label: string) =>
    label.slice(1) === label.slice(1).toLowerCase() ? label.toLowerCase() : label;

  const breakdown = [...counts.entries()]
    .map(([label, count]) => `${count} ${readable(label)}${count === 1 ? '' : 's'}`)
    .join(' · ');

  return {
    title: folder || 'The vault',
    subtitle: `${breakdown} — printed ${printedOn}`,
    contents: records.map((record) =>
      isCharacter(record) ? characterDisplayName(record) : entityDisplayName(record),
    ),
  };
}

export function isCharacter(record: SavedEntity | Character): record is Character {
  return record.kind === 'pc' || record.kind === 'npc';
}

/** The picture file a record points at, whichever field it calls it. */
export function imageNameOf(record: SavedEntity | Character): string {
  return isCharacter(record) ? record.portrait : record.image;
}

export function buildSheet(
  record: SavedEntity | Character,
  imageUrl: string | null = null,
  clans: readonly Clan[] = [],
): Sheet {
  return isCharacter(record)
    ? characterSheet(record, imageUrl, clans)
    : entitySheet(record, imageUrl);
}
