/**
 * The traits Dan supplied, 11 Nov 2026, seeded into an empty vault on first run.
 *
 * ⚠️ **This is Dan's own content, not proposed canon.** It is transcribed from his screenshots
 * of the server's trait channel and is reproduced word for word, misspellings included
 * ("untill", "schitzophrenia") — the vault should say what the server says, and silently
 * correcting it would make the two disagree in a way nobody would ever notice. These are
 * records in his vault, not entries in `data/canon/`, for the same reason the Masami clan is
 * (CLAUDE.md §9): every file in `data/canon/` is parsed as a roll table, and nothing rolls a
 * trait.
 *
 * Seeded the same way `masamiSeed` is — only into an empty collection, and only when every file
 * in it parsed, because seeding over a vault whose one trait file has a typo in it would look
 * exactly like losing it. Once written they are ordinary records: edit, rename or delete them.
 *
 * Pure (CLAUDE.md §3).
 */

import { ENTITY_SCHEMA_VERSION, type TraitRarity, type TraitRecord } from './entities';
import { DEFAULT_MIN_ROLE } from './roles';
import { traitEntry } from './traits';

interface SeedEntry {
  readonly name: string;
  readonly text: string;
  readonly kind?: 'bonus' | 'drawback';
  readonly note?: string;
  readonly condition?: string;
}

interface SeedTrait {
  readonly name: string;
  readonly rarity: TraitRarity;
  readonly description: string;
  readonly entries: readonly SeedEntry[];
  readonly requirements?: readonly string[];
}

const SEED: readonly SeedTrait[] = [
  {
    name: 'Eccentric Genius',
    rarity: 'extraordinary',
    description:
      "With your 530,000 IQ, you're by far one of the quickest thinkers in battle. This comes " +
      'with a downside though, as it tends to make you a bit quirky.',
    entries: [
      {
        name: 'Genius',
        text:
          '+2 Grades to Perception, you can observe small details like muscle twitches in ' +
          'opponents to read attacks without intent',
        note: 'Must maintain your 2 Grade advantage over their speed to predict.',
      },
      { name: 'Prodigious', text: '+1 Grade to Cursed Energy Control and Efficiency' },
      {
        name: 'Quirky',
        text: 'You must have one quirk of some kind.',
        kind: 'drawback',
        note: "Todo's schitzophrenia is a good example.",
      },
    ],
  },
  {
    name: 'Shikigami Master',
    rarity: 'legendary',
    description:
      'Through subjugation, creation or other means, you acquired control over a shikigami ' +
      'with the ability to interface with your technique.',
    entries: [
      {
        name: 'Soulbound',
        text:
          'At any point in time, you can pinpoint the exact location of your shikigami and ' +
          'vice versa. You are also able to re-summon the shikigami if it dies.',
      },
      {
        name: 'Compatible',
        text:
          'The shikigami possesses a copy of your technique, or a unique interaction with ' +
          'your technique.',
      },
      {
        name: 'Partners For Life',
        text:
          "The shikigami's grade scales to your own untill Special Grade, at which point it " +
          'will perpetually linger one grade behind.',
      },
      {
        name: 'Severable Bond',
        text:
          'If the shikigami is destroyed in combat, you will not be able to re-manifest it ' +
          'for the rest of that fight.',
        kind: 'drawback',
      },
    ],
  },
  {
    name: 'Corrective Authority',
    rarity: 'rare',
    description:
      "You've taken a position in your group to command others, and they trust you with your " +
      'life; They will act with exactness to your orders without a question, and in some cases ' +
      'may sacrifice themselves for you. These skills naturally improve the effectiveness and ' +
      'consistency of your team, allowing you to act with perfect synergy. Alone? Worry not, ' +
      'your adept skillset allows you to plan and coordinate your own actions as well.',
    entries: [
      {
        name: 'Supervision',
        text:
          'Every member of your team (Excluding Yourself) can receive one re-roll per ' +
          'roleplay, with a max of three total',
      },
      { name: 'Discipline', text: 'You and your team members receive +2 Cursed Energy Control' },
      {
        name: 'Command and Action',
        text:
          'You are permitted to take turns for your teammates, controlling their character ' +
          '(with their permission)',
      },
      {
        name: 'Team Strike',
        text:
          'When you and your team attack an opponent together, receive +1 Strength for every ' +
          'member working together',
      },
      {
        name: 'Sink Together',
        text:
          'This trait is disabled for the rest of the roleplay after a team member becomes ' +
          'incapacitated or unable to fight',
        kind: 'drawback',
      },
      {
        name: 'Heavy Shoulders',
        text:
          'You carry the burden of guilt, so when a team member dies, receive -2 on all stats ' +
          '(Excluding Reserves) per death',
        kind: 'drawback',
      },
      {
        name: 'Last Stand',
        text: 'Your Supervision buff is limited to one (Non-Black Flash) roll, usable on yourself.',
        condition: 'Whenever Alone (Team of One)',
      },
      {
        name: 'Sacrifice',
        text: 'Your Team Strike buff instead applies +3 Strength and -5 Fortitude to yourself.',
        kind: 'drawback',
        condition: 'Whenever Alone (Team of One)',
      },
    ],
  },
  {
    name: 'Hard Worker',
    rarity: 'uncommon',
    description: "Through training and hard work, you've refined your Cursed Energy Control.",
    entries: [{ name: 'Effort', text: '+2 to Cursed Energy Control' }],
  },
  {
    name: 'Biological Blueprint',
    rarity: 'basic',
    description:
      'Your body deviates from the human standard in a significant way. Whether through ' +
      'mutation, experimentation, or other factors, your altered anatomy grants an advantage ' +
      'over your peers, allowing you to utilize a combat style others cannot. This does not ' +
      'cover extra pre-existing limbs like arms, legs, mouth, or eyes. See: Mutated Body',
    entries: [
      {
        name: 'Altered Physiology',
        text:
          'Create one passive effect of your body, this must have a clear and meaningful ' +
          'counter. If it provides a stat buff it is limited to 3 classes.',
      },
      {
        name: 'Unconventional Structure',
        text:
          'Without Soul Perception, your Reverse Cursed Technique suffers a 2 Grade Penalty.',
        kind: 'drawback',
      },
      {
        name: 'Individuality',
        text:
          'Your presence is a very unique one which is hard to confused for others, making it ' +
          'easier to identify you by Cursed Energy.',
        kind: 'drawback',
      },
    ],
    requirements: [
      'Must either be non-human or possess unique physiology.',
      'If Developed: Must have a heavily scrutinized reason.',
    ],
  },
  {
    name: 'Waste Not',
    rarity: 'basic',
    description:
      "Through just a little bit of practice, you've slightly reduced the amount of Cursed " +
      'Energy you waste while utilizing your Jujutsu.',
    entries: [{ name: 'Want Not', text: '+2 Cursed Energy Efficiency' }],
  },
  {
    name: 'Perfect Vessel',
    rarity: 'extraordinary',
    description:
      'You have the innate ability to supress the will of any cursed objects you consume. ' +
      'Unless fed a highly powerful cursed object or multiple all at once, there is no limit ' +
      'to the amount you can ingest.',
    entries: [
      {
        name: 'Vessel',
        text: 'You can ingest any and all cursed objects without the risk of rejection.',
      },
      {
        name: 'Unbroken Will',
        text:
          'Pain alone is not able to stop you. You can supress the will of incarnated ' +
          'sorcerers housed in your body.',
      },
      {
        name: 'Plot Armour',
        text:
          'Once per roleplay, you can endure a lethal attack with injuries mild enough to ' +
          'continue fighting.',
      },
      { name: 'Soul Chamber', text: 'You have the Soul Perception trait.' },
      { name: 'Built Different', text: '+2 to all Physicals' },
      {
        name: 'Stolen Reserves',
        text:
          'Acquire the reserves of the sorcerers which incarnate into you (2 of the same ' +
          'reserve becomes the reserve above it).',
      },
      {
        name: 'Ordinary Guy',
        text: 'You must start as either Grade 4 or a Civilian.',
        kind: 'drawback',
      },
      {
        name: 'Overcrowding',
        text:
          'You cannot act as a vessel for more than 5 incarnations UNLESS given permission to ' +
          'exceed this limit by staf.',
        kind: 'drawback',
      },
    ],
  },
  {
    name: 'Jujutsu Prodigy',
    rarity: 'extraordinary',
    description:
      'A being that has an innate aptitude for Jujutsu Sorcery that outclasses any other, ' +
      'capable of gaining power at an extremely quick rate, so quick that they could very well ' +
      "match the Strongest of Today in a short amount of time so long as they're under the " +
      'correct conditions.',
    entries: [
      {
        name: 'Domain Expert',
        text: 'You can bypass the grade requirement for Incomplete Domain Expansion.',
      },
      { name: 'Prodigious Growth', text: 'You gain +30% more CR.' },
      {
        name: 'Generational Talent',
        text: '+2 Art Slots and +1 Grade to CE Efficiency. You also acquire LV 3 Mastery.',
      },
      {
        name: 'A True Awakening',
        text: 'You only need Grade 1 to learn RCT and no coinflip is required.',
      },
      {
        name: 'Sleeping Genius',
        text:
          'Once awakened (After reaching Grade 3), you can add +1 Grade to any stat, and +2 ' +
          'Classes to another.',
      },
      {
        name: 'Innate Knowledge',
        text:
          'You may start off with ONE Art (Non-Ancient) bypassing its requirements, excluding ' +
          'domain expansion and quite obviously along with it Domain Amplification.',
      },
      {
        name: 'Hidden',
        text:
          'You start out at Citizen level and must awaken (Cursed Technique) through some ' +
          'means to gain any of your buffs/perks.',
        kind: 'drawback',
      },
    ],
  },
  {
    name: 'Infamous',
    rarity: 'extraordinary',
    description:
      "As far as curse users go, you're the most famous of them all with the strength to back " +
      'it up.',
    entries: [
      { name: 'Long-Lived', text: 'Can start at Special Grade' },
      { name: 'Advanced Jujutsu', text: '+1 Maximum Technique and +2 Art Slots' },
      {
        name: 'Leader',
        text:
          'Up to 3 other roleplayers can make OCs to be your direct subordinates. They are ' +
          'permitted to start at Grade 1.',
      },
      {
        name: 'Wanted',
        text: 'You automatically have a 1m bounty assigned to you and must be a Curse User.',
        kind: 'drawback',
      },
      {
        name: 'Domain Denial',
        text:
          'You are yet to acquire a domain, and are not able to manifest one without a Domain ' +
          'Awakening.',
        kind: 'drawback',
        note: 'In exchange, you may pick up to 2 anti-domain techniques to start with.',
      },
    ],
  },
  {
    name: 'Medic',
    rarity: 'extraordinary',
    description:
      'You were born with the ability to utilise and output reverse cursed technique.',
    entries: [
      { name: 'Innate Talent', text: 'You start with RCT and the ability to output it.' },
      {
        name: 'Specialist',
        text:
          'Your RCT Output is boosted by 3 Grades, and your RCT can heal damage from poisons.',
        // ⚠️ The screenshot has a "see #unknown" line here — Discord failing to resolve a
        // channel link, not content. Left out rather than transcribed as if it were text.
      },
      {
        name: 'Fragile',
        text:
          'Your ability to heal does a lot of the work in your battles, so you\u2019ve never ' +
          'had to work on reinforcement. -2 to Fortitude',
        kind: 'drawback',
      },
      {
        name: 'Good-Natured',
        text: 'You must either side with Sorcerers or be one.',
        kind: 'drawback',
      },
    ],
  },
];

/**
 * The seed as records.
 *
 * ⚠️ Ids are **derived from the name**, not minted, so running the seed twice can only ever
 * write the same four files — the same idempotence `harvest.ts` buys by hashing its text.
 * `acquisition` is left at `either` throughout: none of the four is listed as Inherent or
 * Developed on the server, and the rules say a trait listed as neither is exactly that.
 */
export function traitSeed(now: string): readonly TraitRecord[] {
  return SEED.map((trait) => ({
    schemaVersion: ENTITY_SCHEMA_VERSION,
    id: `seed-${trait.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    kind: 'trait' as const,
    name: trait.name,
    createdAt: now,
    updatedAt: now,
    folder: '',
    minRole: DEFAULT_MIN_ROLE,
    generated: null,
    image: '',
    links: [],
    notes: '',

    description: trait.description,
    entries: trait.entries.map((entry, index) =>
      traitEntry({
        id: `${trait.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
        name: entry.name,
        text: entry.text,
        kind: entry.kind ?? 'bonus',
        ...(entry.note ? { note: entry.note } : {}),
        ...(entry.condition ? { condition: entry.condition } : {}),
      }),
    ),
    usesTraitSlot: true,
    rarity: trait.rarity,
    acquisition: 'either' as const,
    source: '',
    requirements: trait.requirements ?? [],
  }));
}

/**
 * Which seeds still need writing.
 *
 * ⚠️ **Pure and tested on purpose.** The first version of this decision lived inside the hook
 * as `found.length === 0` — copied from `masamiSeed`, right for a clan and wrong here — and
 * nothing could catch it because hooks are not unit-tested (CLAUDE.md §9). It skipped the
 * whole seed the moment the folder held anything, so a second batch of traits never arrived.
 *
 * Three conditions, each load-bearing:
 *
 * - **not on disk** — never overwrite a record Dan has edited;
 * - **not already offered** — one he deleted on purpose stays deleted, which is precisely what
 *   a plain "write whatever is missing" would silently undo;
 * - **nothing in the collection failed to parse** — writing into a folder whose one bad file is
 *   being skipped would look exactly like losing it. That is the one guard worth keeping from
 *   the clan version.
 */
export function missingSeeds(
  seeds: readonly TraitRecord[],
  onDiskIds: readonly string[],
  offeredIds: readonly string[],
  skippedFiles: number,
): readonly TraitRecord[] {
  if (skippedFiles > 0) return [];
  const disk = new Set(onDiskIds);
  const offered = new Set(offeredIds);
  return seeds.filter((seed) => !disk.has(seed.id) && !offered.has(seed.id));
}
