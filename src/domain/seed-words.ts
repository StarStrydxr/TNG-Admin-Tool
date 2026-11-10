/**
 * Readable seeds.
 *
 * A seed is a label as much as a number: it goes on the sheet, in the export footer, and gets
 * read aloud when one GM wants another to roll the same thing. `a3f91c2e08` fails all three
 * tests. `ash-gantry-nine` does not.
 *
 * Nothing about determinism changes. The seed is still just a string fed to `hashString`, so
 * every hex seed already saved keeps reproducing exactly what it always did — the words are a
 * nicer way to *mint* one, not a new format to migrate to.
 *
 * Pure. The caller supplies the randomness (CLAUDE.md §3).
 */

/** Texture and quality. */
const FIRST = [
  'ash', 'amber', 'bitter', 'black', 'bleak', 'blue', 'bone', 'brass',
  'brine', 'broken', 'burnt', 'cold', 'copper', 'cracked', 'crooked', 'damp',
  'dark', 'dead', 'deep', 'dim', 'dry', 'dull', 'dusk', 'faint',
  'false', 'fine', 'first', 'flat', 'frayed', 'glass', 'gold', 'grey',
  'grim', 'half', 'hollow', 'hot', 'idle', 'iron', 'jade', 'keen',
  'last', 'late', 'lean', 'lesser', 'long', 'loose', 'lost', 'low',
  'mild', 'mute', 'narrow', 'near', 'night', 'old', 'open', 'pale',
  'paper', 'patient', 'plain', 'quick', 'quiet', 'raw', 'red', 'rough',
  'rust', 'salt', 'sharp', 'short', 'sick', 'silent', 'silver', 'slack',
  'slow', 'small', 'smoke', 'soft', 'sour', 'spare', 'split', 'steep',
  'still', 'stone', 'sudden', 'sunk', 'sweet', 'tall', 'thin', 'tired',
  'true', 'under', 'vast', 'warm', 'wet', 'white', 'wide', 'worn',
] as const;

/** Something you could point at. */
const SECOND = [
  'alley', 'anchor', 'archive', 'bell', 'bridge', 'cable', 'candle', 'carriage',
  'ceiling', 'chapel', 'cistern', 'clock', 'corridor', 'crossing', 'culvert', 'curtain',
  'depot', 'ditch', 'doorway', 'drain', 'elevator', 'fence', 'ferry', 'forge',
  'foyer', 'gantry', 'garden', 'gate', 'girder', 'grate', 'hallway', 'harbour',
  'hearth', 'hinge', 'junction', 'kettle', 'ladder', 'landing', 'lantern', 'lattice',
  'ledger', 'lintel', 'lobby', 'locker', 'mantle', 'market', 'mirror', 'needle',
  'orchard', 'overpass', 'paper', 'parlour', 'pillar', 'platform', 'pond', 'pylon',
  'quarry', 'railing', 'rooftop', 'saltbox', 'scaffold', 'shrine', 'shutter', 'siding',
  'signal', 'spindle', 'staircase', 'station', 'storeroom', 'stovepipe', 'subway', 'tanner',
  'teahouse', 'terminal', 'theatre', 'threshold', 'tollgate', 'tower', 'tramline', 'trellis',
  'tunnel', 'turnstile', 'underpass', 'vault', 'veranda', 'vestibule', 'wardrobe', 'warehouse',
  'watchtower', 'waterway', 'well', 'wharf', 'window', 'winter', 'wireway', 'workshop',
] as const;

/** A short tail that is easy to say. */
const THIRD = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'dawn', 'dusk', 'noon', 'night',
  'north', 'south', 'east', 'west', 'spring', 'summer', 'autumn', 'winter',
  'ember', 'echo', 'thread', 'knot', 'hush', 'drift', 'rill', 'span',
  'tide', 'vigil', 'wake', 'ward', 'crow', 'hare', 'heron', 'hound',
  'koi', 'moth', 'owl', 'pike', 'shrike', 'toad', 'viper', 'wren',
  'ink', 'iron', 'jade', 'lime', 'moss', 'ochre', 'pearl', 'rust',
  'sable', 'slate', 'soot', 'straw', 'umber', 'verdigris', 'wax', 'zinc',
] as const;

export const SEED_WORD_LISTS = { FIRST, SECOND, THIRD } as const;

/** How many distinct seeds the words can express. Worth knowing before trusting uniqueness. */
export const SEED_SPACE = FIRST.length * SECOND.length * THIRD.length;

/**
 * Turn an arbitrary non-negative integer into a word triple.
 *
 * Deterministic: the same number always gives the same words, which keeps this testable and
 * means a caller can mint a seed from any source of randomness it likes.
 */
export function seedFromNumber(value: number): string {
  const n = Math.abs(Math.trunc(value)) % SEED_SPACE;

  const third = n % THIRD.length;
  const rest = Math.floor(n / THIRD.length);
  const second = rest % SECOND.length;
  const first = Math.floor(rest / SECOND.length) % FIRST.length;

  return `${FIRST[first]}-${SECOND[second]}-${THIRD[third]}`;
}

/** Shape check only. Any string is a valid seed — this is for labelling, not validation. */
export function isWordSeed(seed: string): boolean {
  const parts = seed.split('-');
  if (parts.length !== 3) return false;

  const [a, b, c] = parts as [string, string, string];
  return (
    (FIRST as readonly string[]).includes(a) &&
    (SECOND as readonly string[]).includes(b) &&
    (THIRD as readonly string[]).includes(c)
  );
}
