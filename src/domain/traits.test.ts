/**
 * The trait and defect vaults, against the server's own rules (Dan's screenshots, 11 Nov 2026).
 *
 * Two things are worth testing hardest, and neither is about traits: that the bonus/drawback
 * colour is never inferred from the text, and that putting one on a sheet copies words and
 * touches nothing else. A picker is exactly where §4 would get broken by accident.
 */

import { describe, expect, it } from 'vitest';

import { alreadyCarries, traitFromRecord } from './attach';
import { createCharacter } from './character';
import { parseEntity } from './entities-parse';
import { describeEntity } from './entities-display';
import { missingSeeds, traitSeed } from './trait-seed';
import {
  ACQUISITIONS,
  RARITIES,
  RARITY,
  TRAIT_SOURCES,
  createTrait,
  drawbacks,
  entryGroups,
  entryLine,
  entryLines,
  isBlankTrait,
  rarityCost,
  rarityPermissionNote,
  traitCost,
  type TraitEntity,
} from './traits';

const NOW = '2026-11-11T12:00:00.000Z';

function record(raw: Record<string, unknown>): TraitEntity {
  const parsed = parseEntity(raw, 'fallback');
  if (!parsed) throw new Error('fixture did not parse');
  if (parsed.kind !== 'trait' && parsed.kind !== 'defect') throw new Error('wrong kind');
  return parsed;
}

const GENIUS = record({
  kind: 'trait',
  id: 'tr1',
  name: 'Eccentric Genius',
  rarity: 'extraordinary',
  description: "With your 530,000 IQ, you're by far one of the quickest thinkers in battle.",
  entries: [
    { id: 'a', name: 'Genius', text: '+2 Grades to Perception', kind: 'bonus', note: 'Must maintain your 2 Grade advantage.' },
    { id: 'b', name: 'Prodigious', text: '+1 Grade to Cursed Energy Control and Efficiency', kind: 'bonus' },
    { id: 'c', name: 'Quirky', text: 'You must have one quirk of some kind.', kind: 'drawback' },
  ],
  source: 'Background',
  requirements: ['Must be insufferable about it.'],
});

describe('the rarity table', () => {
  // The prices Dan supplied. Fixed in code, not a setting — if one of these ever changes it
  // should be a deliberate edit here, not something that drifts.
  it('prices every rung as the server does', () => {
    expect(RARITIES.map((id) => [RARITY[id].label, RARITY[id].tp])).toEqual([
      ['Basic', 5],
      ['Uncommon', 6],
      ['Rare', 7],
      ['Exotic', 8],
      ['Legendary', 10],
      ['Extraordinary', 12],
    ]);
  });

  it('names who has to say yes, and only for the top two', () => {
    expect(rarityPermissionNote('basic')).toBe('');
    expect(rarityPermissionNote('exotic')).toBe('');
    expect(rarityPermissionNote('legendary')).toContain('Admin');
    expect(rarityPermissionNote('legendary')).toContain('roleplay sample');
    expect(rarityPermissionNote('extraordinary')).toContain('Owner');
  });

  // ⚠️ The cost is read off the rarity, never stored, so a record cannot disagree with the table.
  it('reads a cost off the rarity and nowhere else', () => {
    expect(traitCost(GENIUS)).toBe('12 TP');
    expect(rarityCost('rare')).toBe('7 TP');
    expect('tpCost' in GENIUS).toBe(false);
  });
});

describe('creating one', () => {
  it('starts empty, and knows it', () => {
    const trait = createTrait({ kind: 'trait', id: 'x', now: NOW });
    expect(isBlankTrait(trait)).toBe(true);
    expect(trait.generated).toBeNull();
  });

  it('is no longer blank once it says anything', () => {
    const trait = createTrait({ kind: 'trait', id: 'x', now: NOW });
    expect(isBlankTrait({ ...trait, name: 'Glass Jaw' })).toBe(false);
  });

  // ⚠️ The two defaults differ, and the parser's must agree with the constructor's.
  it('defaults the slot by kind, and the parser agrees', () => {
    expect(createTrait({ kind: 'trait', id: 'x', now: NOW }).usesTraitSlot).toBe(true);
    expect(createTrait({ kind: 'defect', id: 'x', now: NOW }).usesTraitSlot).toBe(false);

    expect(record({ kind: 'trait', id: 'a', name: 'A' }).usesTraitSlot).toBe(true);
    expect(record({ kind: 'defect', id: 'b', name: 'B' }).usesTraitSlot).toBe(false);
  });

  it('starts a trait at the cheapest rung and at "either"', () => {
    const trait = createTrait({ kind: 'trait', id: 'x', now: NOW });
    if (trait.kind !== 'trait') throw new Error('wrong kind');
    expect(trait.rarity).toBe('basic');
    expect(ACQUISITIONS).toContain(trait.acquisition);
  });

  // ⚠️ Defects are a separate system whose rules have not been supplied (Dan, 11 Nov 2026).
  // Giving one a rarity so the two types line up would invent half a system.
  it('gives a defect no rarity at all, and a free-text cost instead', () => {
    const defect = createTrait({ kind: 'defect', id: 'x', now: NOW });
    expect('rarity' in defect).toBe(false);
    expect(traitCost({ ...defect, tpCost: 'Returns 4 TP' } as TraitEntity)).toBe('Returns 4 TP');
  });

  it('carries no grade — a trait is not Grade 2', () => {
    expect('grade' in createTrait({ kind: 'trait', id: 'x', now: NOW })).toBe(false);
  });

  it('offers sources without making them an enum', () => {
    expect(TRAIT_SOURCES).not.toContain('A dare');
    expect(record({ kind: 'trait', id: 'a', source: 'A dare' }).source).toBe('A dare');
  });
});

describe('bonuses and drawbacks', () => {
  it('keeps the name beside the effect', () => {
    expect(entryLines(GENIUS)[0]).toBe('Genius: +2 Grades to Perception');
  });

  // ⚠️ The whole reason a ClanModifier could not be reused. Half the server's own bonuses carry
  // no plus and half its drawbacks carry no minus, so the colour is stored, never read off a sign.
  it('never infers the colour from the text', () => {
    const marked = drawbacks(GENIUS).map((item) => item.name);
    expect(marked).toEqual(['Quirky']);

    const noSign = record({
      kind: 'trait',
      id: 'x',
      entries: [
        { name: 'Supervision', text: 'Every member of your team can receive one re-roll', kind: 'bonus' },
        { name: 'Sink Together', text: 'This trait is disabled for the rest of the roleplay', kind: 'drawback' },
      ],
    });
    expect(drawbacks(noSign).map((item) => item.name)).toEqual(['Sink Together']);
  });

  it('reads a hand-written file whose entries are bare strings, as bonuses', () => {
    const hand = record({ kind: 'defect', id: 'd', entries: ['−1 Class Speed'] });
    expect(entryLines(hand)).toEqual(['−1 Class Speed']);
    expect(drawbacks(hand)).toEqual([]);
  });

  it('still reads a file written before entries existed', () => {
    const old = record({ kind: 'trait', id: 'o', effects: ['+2 Classes Speed'] });
    expect(entryLines(old)).toEqual(['+2 Classes Speed']);
  });

  // "➡ Whenever Alone (Team of One):" — Corrective Authority's own conditional block.
  it('groups a conditional block under its own heading, main block first', () => {
    const groups = entryGroups(
      record({
        kind: 'trait',
        id: 'c',
        entries: [
          { name: 'Last Stand', text: 'Limited to one roll', kind: 'bonus', condition: 'Whenever Alone (Team of One)' },
          { name: 'Supervision', text: 'One re-roll each', kind: 'bonus' },
        ],
      }),
    );
    expect(groups.map((group) => group.condition)).toEqual(['', 'Whenever Alone (Team of One)']);
    expect(groups[1]?.entries.map((item) => item.name)).toEqual(['Last Stand']);
  });

  it('shows bonuses and drawbacks as separate fields, so paper keeps the distinction', () => {
    const labels = describeEntity(GENIUS).map((field) => field.label);
    expect(labels).toContain('Bonuses');
    expect(labels).toContain('Drawbacks');
    expect(labels).toContain('Rarity');
  });
});

describe('the seeded traits', () => {
  const seeded = traitSeed(NOW);

  it('writes Dan’s ten, at the rarities he gave them', () => {
    expect(seeded.map((trait) => [trait.name, trait.rarity])).toEqual([
      ['Eccentric Genius', 'extraordinary'],
      ['Shikigami Master', 'legendary'],
      ['Corrective Authority', 'rare'],
      ['Hard Worker', 'uncommon'],
      ['Biological Blueprint', 'basic'],
      ['Waste Not', 'basic'],
      ['Perfect Vessel', 'extraordinary'],
      ['Jujutsu Prodigy', 'extraordinary'],
      ['Infamous', 'extraordinary'],
      ['Medic', 'extraordinary'],
    ]);
  });

  // The ➤『REQUIREMENTS』 block, which only Biological Blueprint has so far. A list
  // rather than a line, because one of its two bullets is conditional on how it was acquired.
  it('keeps a requirements block as separate bullets', () => {
    const blueprint = seeded.find((trait) => trait.name === 'Biological Blueprint');
    expect(blueprint?.requirements).toEqual([
      'Must either be non-human or possess unique physiology.',
      'If Developed: Must have a heavily scrutinized reason.',
    ]);
    expect(seeded.find((trait) => trait.name === 'Waste Not')?.requirements).toEqual([]);
  });

  it('reads an older file that wrote one prerequisite line', () => {
    const old = record({ kind: 'trait', id: 'o', prerequisite: 'Grade 2 or above' });
    expect(old.requirements).toEqual(['Grade 2 or above']);
  });

  it('derives its ids, so seeding twice writes the same four files', () => {
    expect(traitSeed('2027-01-01T00:00:00.000Z').map((t) => t.id)).toEqual(
      seeded.map((trait) => trait.id),
    );
  });

  // Every drawback across the ten, so a mis-transcribed marker shows up as a failure rather
  // than as a green line nobody notices.
  it('marks the right lines red throughout', () => {
    const red = Object.fromEntries(
      seeded.map((trait) => [trait.name, drawbacks(trait).map((item) => item.name)]),
    );
    expect(red['Biological Blueprint']).toEqual(['Unconventional Structure', 'Individuality']);
    expect(red['Waste Not']).toEqual([]);
    expect(red['Perfect Vessel']).toEqual(['Ordinary Guy', 'Overcrowding']);
    expect(red['Jujutsu Prodigy']).toEqual(['Hidden']);
    expect(red['Infamous']).toEqual(['Wanted', 'Domain Denial']);
    expect(red['Medic']).toEqual(['Fragile', 'Good-Natured']);
  });

  it('marks the right lines red', () => {
    const authority = seeded.find((trait) => trait.name === 'Corrective Authority');
    if (!authority) throw new Error('missing');
    expect(drawbacks(authority).map((item) => item.name)).toEqual([
      'Sink Together',
      'Heavy Shoulders',
      'Sacrifice',
    ]);
  });

  it('keeps the conditional block Corrective Authority actually has', () => {
    const authority = seeded.find((trait) => trait.name === 'Corrective Authority');
    if (!authority) throw new Error('missing');
    const groups = entryGroups(authority);
    expect(groups).toHaveLength(2);
    expect(groups[1]?.condition).toBe('Whenever Alone (Team of One)');
    expect(groups[1]?.entries.map((item) => item.name)).toEqual(['Last Stand', 'Sacrifice']);
  });

  it('round-trips through the parser unchanged', () => {
    for (const trait of seeded) {
      expect(record(trait as unknown as Record<string, unknown>)).toEqual(trait);
    }
  });

  // ⚠️ Transcribed, not corrected. The vault should say what the server says.
  it('keeps the server’s own spelling', () => {
    const master = seeded.find((trait) => trait.name === 'Shikigami Master');
    expect(entryLines(master as TraitEntity).join(' ')).toContain('untill');
    const vessel = seeded.find((trait) => trait.name === 'Perfect Vessel');
    expect(entryLines(vessel as TraitEntity).join(' ')).toContain('supress');
    expect(entryLines(vessel as TraitEntity).join(' ')).toContain('by staf.');
  });
});

describe('deciding what to seed', () => {
  const seeds = traitSeed(NOW);
  const ids = (records: readonly { readonly id: string }[]) => records.map((r) => r.id);

  it('writes everything into an untouched vault', () => {
    expect(missingSeeds(seeds, [], [], 0)).toHaveLength(seeds.length);
  });

  // ⚠️ The exact bug Dan hit. Four were written by an earlier batch; six were added to the
  // code afterwards. The old guard was "only when the collection is empty", so none of the six
  // ever arrived. This is the regression test for that.
  it('writes a later batch into a vault that already holds the earlier one', () => {
    const firstBatch = seeds.slice(0, 4);
    const landed = missingSeeds(seeds, ids(firstBatch), [], 0);

    expect(landed).toHaveLength(seeds.length - 4);
    expect(landed.map((trait) => trait.name)).not.toContain('Eccentric Genius');
    expect(landed.map((trait) => trait.name)).toContain('Perfect Vessel');
  });

  it('never writes one that is already on disk, so an edit survives', () => {
    expect(missingSeeds(seeds, ids(seeds), [], 0)).toEqual([]);
  });

  // ⚠️ The other half. "Write whatever is missing" would resurrect a trait he deleted on
  // purpose, every time he opened the board.
  it('never writes one that was offered before, so a delete sticks', () => {
    const deleted = seeds[3];
    if (!deleted) throw new Error('fixture');
    const stillThere = seeds.filter((trait) => trait.id !== deleted.id);
    expect(missingSeeds(seeds, ids(stillThere), ids(seeds), 0)).toEqual([]);
  });

  // The one guard worth keeping from the clan version.
  it('writes nothing at all when a file in the collection could not be read', () => {
    expect(missingSeeds(seeds, [], [], 1)).toEqual([]);
  });
});

describe('putting one on a sheet', () => {
  const line = traitFromRecord(GENIUS, 'line-1');

  it('copies the named lines, names and all', () => {
    expect(line.name).toBe('Eccentric Genius');
    expect(line.effect).toContain('Genius: +2 Grades to Perception');
    expect(line.effect).toContain('Quirky: You must have one quirk of some kind.');
  });

  it('keeps the rarity and cost where a sheet line can show them', () => {
    expect(line.notes).toContain('Extraordinary');
    expect(line.notes).toContain('12 TP');
    expect(line.notes).toContain('Source: Background');
    expect(line.notes).toContain('Must be insufferable about it.');
  });

  // ⚠️ The sheet shows notes in a single-line input, so a newline here is invisible and the
  // parts run together on screen. That shipped for one build.
  it('keeps the notes on one line, because the sheet shows them on one', () => {
    expect(line.notes).not.toContain('\n');
    expect(line.notes).toContain(' · ');
  });

  // ⚠️ The rule this whole feature has to keep: §4, the app does not calculate stats.
  it('changes no stat and leaves the record behind', () => {
    const walker = createCharacter({ id: 'c1', kind: 'pc', name: 'Walker', grade: 'grade-1', now: NOW });
    const after = { ...walker, traits: [...walker.traits, line] };

    expect(after.stats).toEqual(walker.stats);
    expect(after.traitSlots).toBe(walker.traitSlots);
    // A copy: nothing points back at the vault entry, so editing or deleting it later cannot
    // reach this sheet.
    expect(JSON.stringify(after.traits)).not.toContain(GENIUS.id);
  });

  it('mints its own id, so picking the same one twice gives two lines', () => {
    expect(traitFromRecord(GENIUS, 'a').id).not.toBe(traitFromRecord(GENIUS, 'b').id);
  });

  it('notices a duplicate by name, case and padding aside', () => {
    expect(alreadyCarries([line], '  eccentric genius ')).toBe(true);
    expect(alreadyCarries([line], 'Glass Jaw')).toBe(false);
    expect(alreadyCarries([line], '   ')).toBe(false);
  });

  it('is unbothered by an entry with a name and no text', () => {
    const sparse = record({ kind: 'trait', id: 's', name: 'Effort', entries: [{ name: 'Effort' }] });
    expect(entryLine(sparse.entries[0]!)).toBe('Effort');
  });
});
