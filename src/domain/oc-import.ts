/**
 * Reading a submitted OC sheet back into a character.
 *
 * The inverse of `data/templates/character.discord.md`. Players submit in the server's own
 * format and somebody has to get that into the vault; retyping twenty-five fields per
 * submission is the kind of work a tool exists to remove.
 *
 * Three things make this reliable rather than a guess:
 *
 *  - **Section-aware.** The template says *Affiliation* twice — the school under «Personal»,
 *    and the side (Sorcerers / Curse Users / Curses / Neutral) under «Sorcerer Profile». A flat
 *    label map would silently put one in the other's field, so every label is looked up under
 *    the heading it appeared beneath.
 *  - **NFKC first**, via `normaliseLabel` — Discord headings are mathematical alphanumerics, not
 *    ASCII, and without the fold nothing matches at all (CLAUDE.md §9).
 *  - **Nothing is guessed.** A label the map does not know is *reported*, not filed somewhere
 *    plausible, for the same reason the harvester refuses a keyword guesser: a hundred
 *    near-misses nobody audits is worse than a short list of things to place by hand.
 *
 * Pure (CLAUDE.md §3). The result is a patch; whoever called it decides whether to create.
 */

import {
  CIVILIAN_STAT,
  CLASSES_PER_GRADE,
  DEFAULT_CLASS_RANK,
  GRADE_IDS,
  gradeAbbrev,
  gradeLabel,
  isClassRank,
  statValue,
  type ClassRank,
  type GradeId,
  type StatValue,
} from './grades';
import { CE_RESERVES_BANDS, GRADED_STAT_IDS, type CeReservesBand, type GradedStatId } from './stats';
import { normaliseLabel } from './harvest';
import type { Art, Character, Trait } from './character';

/** Where a label appeared. The same word means different things under different headings. */
type SectionId = 'general' | 'appearance' | 'personal' | 'profile' | 'stats' | 'bonus' | 'none';

const SECTION_BY_HEADING: Readonly<Record<string, SectionId>> = {
  general: 'general',
  appearance: 'appearance',
  personal: 'personal',
  'sorcerer profile': 'profile',
  profile: 'profile',
  stats: 'stats',
  statistics: 'stats',
  bonus: 'bonus',
};

/** Character keys this importer can fill with plain text. */
type TextKey = Extract<
  keyof Character,
  | 'name'
  | 'nicknames'
  | 'gender'
  | 'race'
  | 'subdivision'
  | 'age'
  | 'dateOfBirth'
  | 'sexuality'
  | 'nationality'
  | 'ethnicity'
  | 'hairColour'
  | 'eyeColour'
  | 'height'
  | 'appearance'
  | 'affiliation'
  | 'occupation'
  | 'hobbies'
  | 'likes'
  | 'dislikes'
  | 'personality'
  | 'background'
  | 'faction'
  | 'clan'
  | 'ceApplications'
  | 'arsenal'
  | 'potential'
  | 'mastery'
  | 'cursedRating'
  | 'themeSong'
  | 'faceClaim'
  | 'notes'
>;

interface Target {
  readonly key: TextKey | 'grade' | 'stat' | 'traits' | 'defects' | 'arts' | 'feats' | 'extensions'
    | 'awakenings' | 'techniqueName' | 'maximum' | 'domain' | 'artSlots' | 'traitSlots'
    | 'ceReserves';
  /** Which stat, when `key` is `stat`. */
  readonly stat?: GradedStatId;
}

/**
 * Label → field, per section.
 *
 * `'*'` holds labels that mean the same thing wherever they appear; a section's own entry wins
 * over it, which is exactly how the two Affiliations are kept apart.
 */
const FIELDS: Readonly<Record<SectionId | '*', Readonly<Record<string, Target>>>> = {
  general: {
    name: { key: 'name' },
    nicknames: { key: 'nicknames' },
    nickname: { key: 'nicknames' },
    gender: { key: 'gender' },
    race: { key: 'race' },
    subdivision: { key: 'subdivision' },
    age: { key: 'age' },
    dob: { key: 'dateOfBirth' },
    'date of birth': { key: 'dateOfBirth' },
    sexuality: { key: 'sexuality' },
  },
  appearance: {
    nationality: { key: 'nationality' },
    ethnicity: { key: 'ethnicity' },
    'hair colour': { key: 'hairColour' },
    'hair color': { key: 'hairColour' },
    hair: { key: 'hairColour' },
    'eye colour': { key: 'eyeColour' },
    'eye color': { key: 'eyeColour' },
    eyes: { key: 'eyeColour' },
    height: { key: 'height' },
    'appearance description': { key: 'appearance' },
    description: { key: 'appearance' },
    appearance: { key: 'appearance' },
  },
  personal: {
    // The school or organisation — NOT the side. See the note at the top of the file.
    affiliation: { key: 'affiliation' },
    occupation: { key: 'occupation' },
    hobbies: { key: 'hobbies' },
    preferences: { key: 'likes' },
    'preferences likes dislikes': { key: 'likes' },
    likes: { key: 'likes' },
    dislikes: { key: 'dislikes' },
    'personality description': { key: 'personality' },
    personality: { key: 'personality' },
    backstory: { key: 'background' },
    background: { key: 'background' },
  },
  profile: {
    grade: { key: 'grade' },
    // The side: Curses, Curse Users, Sorcerers or Neutral.
    affiliation: { key: 'faction' },
    faction: { key: 'faction' },
    clan: { key: 'clan' },
    'innate technique': { key: 'techniqueName' },
    'innate techniques': { key: 'techniqueName' },
    'innate technique s': { key: 'techniqueName' },
    extensions: { key: 'extensions' },
    'maximum technique': { key: 'maximum' },
    'maximum techniques': { key: 'maximum' },
    'domain expansion': { key: 'domain' },
    arts: { key: 'arts' },
    'ce applications': { key: 'ceApplications' },
    arsenal: { key: 'arsenal' },
    traits: { key: 'traits' },
    defects: { key: 'defects' },
    'art slots': { key: 'artSlots' },
    'trait slots': { key: 'traitSlots' },
    potential: { key: 'potential' },
    awakenings: { key: 'awakenings' },
    feats: { key: 'feats' },
    mastery: { key: 'mastery' },
    'cursed rating': { key: 'cursedRating' },
  },
  stats: Object.fromEntries([
    ...GRADED_STAT_IDS.map((id) => [
      normaliseLabel(STAT_LABEL_FOR(id)),
      { key: 'stat', stat: id } as Target,
    ]),
    ['ce reserves', { key: 'ceReserves' } as Target],
  ]),
  bonus: {
    'theme song': { key: 'themeSong' },
    'face claim': { key: 'faceClaim' },
  },
  none: {},
  '*': {
    notes: { key: 'notes' },
    'gm notes': { key: 'notes' },
  },
};

/** The server writes "CE Output", the app stores `ce-output`. */
function STAT_LABEL_FOR(id: GradedStatId): string {
  return id.replace(/-/g, ' ');
}

export interface MatchedField {
  readonly label: string;
  readonly section: SectionId;
  readonly value: string;
}

export interface OcImport {
  /** Everything recognised, ready to merge over a fresh character. */
  readonly patch: Partial<Character>;
  readonly matched: readonly MatchedField[];
  /** Labels the map does not know. Reported, never guessed at. */
  readonly unmatched: readonly MatchedField[];
  /** The grade the sheet asked for, if it named one the ladder knows. */
  readonly grade: GradeId | null;
}

/* ---------------------------------------------------------------- */
/* Reading the text                                                  */
/* ---------------------------------------------------------------- */

const HEADING_WRAPPERS: readonly (readonly [string, string])[] = [
  ['『', '』'],
  ['«', '»'],
  ['《', '》'],
  ['【', '】'],
  ['[', ']'],
];

function headingOf(line: string): string | null {
  const hashes = /^#{1,6}\s+(.*)$/.exec(line);
  if (hashes) return hashes[1] as string;

  const bare = line.replace(/^[\s➤⋙⋘▸▹▪►»>•\-*_`]+/u, '').replace(/[\s*_`]+$/u, '');
  for (const [open, close] of HEADING_WRAPPERS) {
    if (bare.length > open.length + close.length && bare.startsWith(open) && bare.endsWith(close)) {
      return bare.slice(open.length, -close.length);
    }
  }
  return null;
}

/** `- thing` / `* thing` / `1. thing` → `thing`. */
function unbullet(line: string): string {
  return line.replace(/^\s*(?:[-*•▪]|\d+[.)])\s+/u, '').trim();
}

function isBullet(line: string): boolean {
  return /^\s*(?:[-*•▪]|\d+[.)])\s+/u.test(line);
}

interface RawField {
  readonly label: string;
  readonly section: SectionId;
  readonly value: string;
}

/**
 * Split a sheet into `section + label → value`.
 *
 * A value is the text after the colon plus any following lines that are not themselves a label
 * or a heading — which is what makes a multi-paragraph backstory survive the trip.
 */
function readFields(text: string): readonly RawField[] {
  const out: RawField[] = [];
  let section: SectionId = 'none';
  let current: { label: string; section: SectionId; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const value = current.lines.join('\n').trim();
    if (value) out.push({ label: current.label, section: current.section, value });
    current = null;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (/^(```|~~~)/.test(line)) continue;

    if (!line) {
      // A blank line inside prose is part of it; a blank line after a one-liner ends it.
      if (current && current.lines.length > 0) current.lines.push('');
      continue;
    }

    const heading = headingOf(line);
    if (heading !== null) {
      flush();
      const found = SECTION_BY_HEADING[normaliseLabel(heading)];
      // An unknown heading does not silently keep the previous section's meaning.
      section = found ?? 'none';
      continue;
    }

    const labelled = /^([^:]{2,40}):\s*(.*)$/.exec(line.replace(/^[*_`\s]+|[*_`\s]+$/gu, ''));
    if (labelled && !isBullet(line)) {
      flush();
      current = {
        label: (labelled[1] as string).trim(),
        section,
        lines: (labelled[2] as string).trim() ? [(labelled[2] as string).trim()] : [],
      };
      continue;
    }

    if (current) current.lines.push(unbullet(line));
  }

  flush();
  return out;
}

/* ---------------------------------------------------------------- */
/* Reading a stat                                                    */
/* ---------------------------------------------------------------- */

const GRADE_BY_TOKEN: ReadonlyMap<string, GradeId> = new Map(
  GRADE_IDS.flatMap((id) => [
    [normaliseLabel(gradeAbbrev(id)), id] as const,
    [normaliseLabel(gradeLabel(id)), id] as const,
  ]),
);

/**
 * The grade a line names, or null.
 *
 * Longest token first, so "Special Grade" is not read as "Grade" and "S-G1" beats "G1".
 */
export function gradeFromText(text: string): GradeId | null {
  const folded = normaliseLabel(text);
  if (!folded) return null;

  let best: { id: GradeId; length: number } | null = null;
  for (const [token, id] of GRADE_BY_TOKEN) {
    if (!token) continue;
    const bounded = new RegExp(`(?:^|[^a-z0-9])${token}(?:[^a-z0-9]|$)`);
    if (bounded.test(folded) && (!best || token.length > best.length)) {
      best = { id, length: token.length };
    }
  }
  return best?.id ?? null;
}

/**
 * `G1[C3]`, `Grade 1 [Class 3]`, `Default`, or `C3(+2 from …)`.
 *
 * Tolerant on purpose: the template tells players to write the bonus in brackets next to the
 * stat, so the trailing explanation is normal and is ignored rather than treated as a failure.
 */
export function statFromText(text: string, fallback: GradeId): StatValue {
  const folded = normaliseLabel(text);
  if (!folded) return statValue(fallback, DEFAULT_CLASS_RANK);
  if (folded.includes('civilian')) return CIVILIAN_STAT;

  const grade = gradeFromText(text) ?? fallback;

  const classMatch = /(?:^|[^a-z0-9])(?:c|class)\s*([1-5])(?:[^0-9]|$)/.exec(folded);
  const rank = classMatch ? Number(classMatch[1]) : DEFAULT_CLASS_RANK;

  return statValue(grade, isClassRank(rank) ? (rank as ClassRank) : DEFAULT_CLASS_RANK);
}

function reservesFromText(text: string): CeReservesBand | null {
  const folded = normaliseLabel(text);
  return CE_RESERVES_BANDS.find((band) => folded.includes(band)) ?? null;
}

/* ---------------------------------------------------------------- */
/* Lists                                                             */
/* ---------------------------------------------------------------- */

function listFrom(value: string): readonly string[] {
  return value
    .split('\n')
    .map((line) => unbullet(line))
    .filter((line) => line.length > 0 && normaliseLabel(line) !== 'n a');
}

/** `Masami Bonus: +2 Classes Speed` → name and effect. A line with no separator is all name. */
function namedPair(line: string): { name: string; effect: string } {
  const split = /^(.{1,60}?)\s*(?:[:—–-]\s+|:\s*)(.+)$/.exec(line);
  return split
    ? { name: (split[1] as string).trim(), effect: (split[2] as string).trim() }
    : { name: line, effect: '' };
}

function traitsFrom(value: string, prefix: string): readonly Trait[] {
  return listFrom(value).map((line, index) => {
    const { name, effect } = namedPair(line);
    return { id: `${prefix}-import-${index}`, name, effect, notes: '' };
  });
}

function artsFrom(value: string): readonly Art[] {
  return listFrom(value).map((line, index) => {
    const { name, effect } = namedPair(line);
    return { id: `art-import-${index}`, name, description: effect, notes: '' };
  });
}

function countFrom(value: string, fallback: number): number {
  const digits = /\d+/.exec(value);
  if (!digits) return fallback;
  // "0/3" means three slots, not none — the sheet writes used over total.
  const slash = /(\d+)\s*\/\s*(\d+)/.exec(value);
  return Number(slash ? slash[2] : digits[0]);
}

/* ---------------------------------------------------------------- */
/* The import                                                        */
/* ---------------------------------------------------------------- */

/**
 * Read a submitted sheet.
 *
 * Returns a patch to merge over a fresh character, plus what matched and what did not so the
 * person approving can see exactly what the app understood before anything is saved.
 */
export function importCharacterSheet(text: string): OcImport {
  const fields = readFields(text);
  const matched: MatchedField[] = [];
  const unmatched: MatchedField[] = [];

  // The grade decides every stat's default, so it is read before the stats are.
  const gradeField = fields.find(
    (field) => field.section === 'profile' && normaliseLabel(field.label) === 'grade',
  );
  const grade = gradeField ? gradeFromText(gradeField.value) : null;
  const fallback: GradeId = grade ?? 'grade-4';

  const patch: Record<string, unknown> = {};
  const graded: Record<string, StatValue> = {};
  // CE Reserves is a band, not a Grade[Class] pair (CLAUDE.md §4), and lives beside the graded
  // seven rather than among them — so it is collected separately and nested on the way out.
  let reserves: CeReservesBand | null = null;
  const technique: Record<string, unknown> = {};

  for (const field of fields) {
    const label = normaliseLabel(field.label);
    const target = FIELDS[field.section][label] ?? FIELDS['*'][label];

    if (!target) {
      unmatched.push(field);
      continue;
    }

    switch (target.key) {
      case 'grade':
        if (grade) patch['grade'] = grade;
        break;
      case 'stat':
        if (target.stat) graded[target.stat] = statFromText(field.value, fallback);
        break;
      case 'ceReserves': {
        const band = reservesFromText(field.value);
        if (band) reserves = band;
        break;
      }
      case 'traits':
        patch['traits'] = traitsFrom(field.value, 'trait');
        break;
      case 'defects':
        patch['defects'] = traitsFrom(field.value, 'defect');
        break;
      case 'arts':
        patch['arts'] = artsFrom(field.value);
        break;
      case 'feats':
        patch['feats'] = listFrom(field.value);
        break;
      case 'awakenings':
        patch['awakenings'] = listFrom(field.value).map((name, index) => ({
          id: `awakening-import-${index}`,
          name,
          notes: '',
        }));
        break;
      case 'extensions':
        technique['extensions'] = listFrom(field.value);
        break;
      case 'techniqueName':
        technique['name'] = field.value.split('\n')[0]?.trim() ?? '';
        technique['description'] = field.value.split('\n').slice(1).join('\n').trim();
        break;
      case 'maximum':
        technique['maximum'] = field.value;
        break;
      case 'domain':
        technique['domainExpansion'] = field.value;
        break;
      case 'artSlots':
        patch['artSlots'] = countFrom(field.value, 3);
        break;
      case 'traitSlots':
        patch['traitSlots'] = countFrom(field.value, 3);
        break;
      default:
        // Every remaining target is plain text on the character.
        patch[target.key] = field.value;
    }

    matched.push(field);
  }

  if (Object.keys(graded).length > 0 || reserves) {
    patch['stats'] = {
      ...(Object.keys(graded).length > 0 ? { graded } : {}),
      ...(reserves ? { ceReserves: reserves } : {}),
    };
  }
  if (Object.keys(technique).length > 0) patch['innateTechnique'] = technique;

  return { patch, matched, unmatched, grade };
}

/** The slot span, exported so the importer's `countFrom` stays honest about what a class is. */
export const CLASSES_IN_A_GRADE = CLASSES_PER_GRADE;
