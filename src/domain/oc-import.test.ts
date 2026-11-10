import { describe, expect, it } from 'vitest';

import { createCharacter } from './character';
import { parseCharacter as parseFromRaw } from './character-parse';
import { gradeFromText, importCharacterSheet, statFromText } from './oc-import';
import { formatStatShort } from './grades';

/**
 * A submission in the server's own format, mathematical alphanumerics and all.
 *
 * Deliberately imperfect in the ways real ones are: an N/A, a bonus written in brackets next to
 * a stat, a label the map does not know, and the backstory running over several lines.
 */
const SHEET = `⋙《 Walker Masami (Wally) 》

«𝐆𝐞𝐧𝐞𝐫𝐚𝐥»
Name: Walker Masami
Nicknames: Wally
Gender: Female
Race: Human
Age: 17
DoB: 7 March
Sexuality: Bisexual

«𝐀𝐩𝐩𝐞𝐚𝐫𝐚𝐧𝐜𝐞»
Nationality: Japanese-American
Ethnicity: Mixed
Hair Colour: Ash
Eye Colour: Grey
Height: 171cm
Appearance Description: Tall, always in the wrong coat for the weather.
She keeps her hands in her pockets.

«𝐏𝐞𝐫𝐬𝐨𝐧𝐚𝐥»
Affiliation: Jujutsu High (Tokyo)
Occupation: Student, Jujutsu Academy, second year
Hobbies: Cycling
Likes: Cold weather
Dislikes: Crowds
Personality Description: Terse until she is not.
Backstory: Found in a collapsed veil at nine.

Nobody has ever explained who raised her before that.

«𝐒𝐨𝐫𝐜𝐞𝐫𝐞𝐫 𝐏𝐫𝐨𝐟𝐢𝐥𝐞»
Grade: Grade 1
Affiliation: Sorcerers
Clan: Masami
Innate Technique: Borrowed Stride
She moves as though the next step has already happened.
Extensions:
- Carried Step
- Second Arrival
Maximum Technique: Arrival Without Travel
Domain Expansion: The Hall of Not Yet
Arts:
- Simple Domain: a two-metre circle she can hold for nine seconds
CE Applications: Reinforcement, RCT
Arsenal: A sealed finger, boxed
Traits:
- Masami Bonus: +2 Classes Speed, −2 Classes Strength
Defects:
- Glass Jaw: −2 Classes Fortitude
Art Slots: 0/3
Trait Slots: 1/3
Potential: N/A
Feats:
- Cleared a Grade 2 solo
Mastery: Intermediate
Favourite Colour: Grey

«𝐒𝐭𝐚𝐭𝐬»
CE Output: G1[C3]
CE Control: G1[C2]
CE Reserves: Deep
CE Efficiency: G1[C3]
Perception: G1[C3]
Strength: G1[C5](−2 from [Masami Bonus](https://discord.com/x))
Speed: G1[C1]
Fortitude: G1[C3]

«𝐁𝐨𝐧𝐮𝐬»
Theme Song: Something loud
Face Claim: N/A
`;

const RESULT = importCharacterSheet(SHEET);

/** The patch merged onto a fresh character, the way the UI does it. */
function imported() {
  const seed = {
    id: 'c1',
    kind: 'pc' as const,
    name: 'placeholder',
    grade: RESULT.grade ?? ('grade-4' as const),
    now: '2026-11-09T00:00:00Z',
  };
  return parseFromRaw({ ...createCharacter(seed), ...RESULT.patch }, seed);
}

describe('reading a submitted sheet', () => {
  it('reads the headings even though they are not ASCII', () => {
    // If the NFKC fold were missing, every section would be unknown and nothing would match.
    expect(RESULT.matched.length).toBeGreaterThan(25);
  });

  it('fills the General block', () => {
    const character = imported();
    expect(character.name).toBe('Walker Masami');
    expect(character.nicknames).toBe('Wally');
    expect(character.age).toBe('17');
    expect(character.dateOfBirth).toBe('7 March');
  });

  /**
   * The trap this importer exists to avoid: the template says Affiliation twice, and the two
   * mean different things. A flat label map puts the school in the faction field.
   */
  it('keeps the two Affiliation lines apart by the section they sit under', () => {
    const character = imported();
    expect(character.affiliation).toBe('Jujutsu High (Tokyo)');
    expect(character.faction).toBe('Sorcerers');
  });

  it('keeps prose that runs past the label line', () => {
    const character = imported();
    expect(character.appearance).toContain('hands in her pockets');
    expect(character.background).toContain('Found in a collapsed veil');
    expect(character.background).toContain('Nobody has ever explained');
  });

  it('reads the stats, including one with a bonus written beside it', () => {
    const character = imported();
    expect(formatStatShort(character.stats.graded['speed'])).toBe('G1[C1]');
    expect(formatStatShort(character.stats.graded['strength'])).toBe('G1[C5]');
    expect(character.stats.ceReserves).toBe('deep');
  });

  it('reads the bulleted lists as lists', () => {
    const character = imported();
    expect(character.traits).toHaveLength(1);
    expect(character.traits[0]?.name).toBe('Masami Bonus');
    expect(character.traits[0]?.effect).toContain('+2 Classes Speed');
    expect(character.defects[0]?.name).toBe('Glass Jaw');
    expect(character.feats).toEqual(['Cleared a Grade 2 solo']);
    expect(character.innateTechnique.extensions).toEqual(['Carried Step', 'Second Arrival']);
  });

  it('takes the total out of a used/total slot count', () => {
    const character = imported();
    expect(character.artSlots).toBe(3);
    expect(character.traitSlots).toBe(3);
  });

  it('treats N/A as nothing rather than as the text "N/A"', () => {
    const character = imported();
    expect(character.potential).toBe('N/A');
    // A list of N/A is empty; a single text field keeps what was written, as it is a real answer.
    expect(importCharacterSheet('«𝐒𝐨𝐫𝐜𝐞𝐫𝐞𝐫 𝐏𝐫𝐨𝐟𝐢𝐥𝐞»\nFeats:\n- N/A').patch.feats).toEqual([]);
  });

  it('reports a label it does not know instead of filing it somewhere plausible', () => {
    expect(RESULT.unmatched.map((field) => field.label)).toContain('Favourite Colour');
    expect(RESULT.unmatched).toHaveLength(1);
  });

  it('gives back the grade so every stat defaults from the right rung', () => {
    expect(RESULT.grade).toBe('grade-1');
    expect(imported().grade).toBe('grade-1');
  });

  it('does not invent a character out of an empty paste', () => {
    const empty = importCharacterSheet('');
    expect(empty.matched).toEqual([]);
    expect(empty.grade).toBeNull();
    expect(empty.patch).toEqual({});
  });
});

describe('gradeFromText', () => {
  it('reads an abbreviation and a full label', () => {
    expect(gradeFromText('G1[C3]')).toBe('grade-1');
    expect(gradeFromText('Grade 2')).toBe('grade-2');
    expect(gradeFromText('Special Grade')).toBe('special-grade');
  });

  it('prefers the longest match, so Special Grade is not read as a Grade', () => {
    expect(gradeFromText('SG[C2]')).toBe('special-grade');
    expect(gradeFromText('Disaster Grade')).toBe('disaster-grade');
  });

  it('is null when nothing names a grade', () => {
    expect(gradeFromText('Deep')).toBeNull();
    expect(gradeFromText('')).toBeNull();
  });
});

describe('statFromText', () => {
  it('reads both notations', () => {
    expect(formatStatShort(statFromText('G1[C2]', 'grade-4'))).toBe('G1[C2]');
    expect(formatStatShort(statFromText('Grade 1 [Class 2]', 'grade-4'))).toBe('G1[C2]');
  });

  it('ignores the bonus the template tells players to write beside it', () => {
    expect(
      formatStatShort(statFromText('C3(+2 from [Inhuman Physicality](link))', 'grade-2')),
    ).toBe('G2[C3]');
  });

  it('falls back to Class 3 of the character’s own grade for "Default"', () => {
    expect(formatStatShort(statFromText('Default', 'grade-2'))).toBe('G2[C3]');
  });

  it('reads Civilian Grade', () => {
    expect(formatStatShort(statFromText('Civilian', 'grade-4'))).toBe('CIV');
  });
});
