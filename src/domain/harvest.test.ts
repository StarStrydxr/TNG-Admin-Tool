import { describe, expect, it } from 'vitest';

import {
  entryId,
  harvest,
  harvestTargets,
  normaliseLabel,
  summarise,
  toUserTables,
  type Fragment,
} from './harvest';
import { EMPTY_TABLE_SET, buildTableSet } from './tables';
import { parseTableFile } from './tables-parse';
import { ALL_SPECS, MISSION_SPEC } from '../generators/specs';

const targets = harvestTargets(ALL_SPECS);

function fragmentsOf(text: string, existing = EMPTY_TABLE_SET) {
  return harvest(text, targets, existing);
}

function find(fragments: readonly Fragment[], needle: string): Fragment | undefined {
  return fragments.find((fragment) => fragment.text.includes(needle));
}

describe('normaliseLabel', () => {
  it('strips markdown and punctuation so labels match however they were typed', () => {
    expect(normaliseLabel('**Location**')).toBe('location');
    expect(normaliseLabel('Briefing  says')).toBe('briefing says');
    expect(normaliseLabel('## True Situation')).toBe('true situation');
  });

  /**
   * The server's headers are typed in mathematical alphanumerics, not ASCII. Without the NFKC
   * fold these reduce to the empty string and no label from a real posting ever matches — which
   * is exactly the bug this guards.
   */
  it('folds the Discord headers back to plain letters', () => {
    expect(normaliseLabel('𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍')).toBe('description');
    expect(normaliseLabel('«𝐒𝐨𝐫𝐜𝐞𝐫𝐞𝐫 𝐏𝐫𝐨𝐟𝐢𝐥𝐞»')).toBe('sorcerer profile');
    expect(normaliseLabel('𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲')).toBe('objectives');
    expect(normaliseLabel('➤ 『𝐃𝐄𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍』')).toBe('description');
  });
});

describe('reading the server’s own formats', () => {
  it('takes a corner-bracket heading as context', () => {
    const fragments = fragmentsOf(
      '## 𝖮𝖡𝖩𝖤𝖢𝖳𝖨𝖵𝖤𝖲 (Can be many different types of objectives, typically 1-3)\n- Exorcise every cursed spirit on site',
    );
    expect(fragments).toHaveLength(1);
    expect(fragments[0]?.source).toBe('heading');
    expect(fragments[0]?.tableId).toBe('mission.objective');
  });

  it('takes a backticked bracket label as a heading', () => {
    const fragments = fragmentsOf('`[ Extensions ]`\n- A stride borrowed from the next step');
    expect(fragments[0]?.source).toBe('heading');
    expect(fragments[0]?.tableId).toBeTruthy();
  });

  it('reads an inline label inside a code fence', () => {
    const fragments = fragmentsOf(
      '```\nMission Type: Extermination at a flooded depot\nLocation: A parcel depot that runs all night\n```',
    );
    expect(fragments.map((f) => f.source)).toEqual(['label', 'label']);
    expect(fragments.map((f) => f.text)).toEqual([
      'Extermination at a flooded depot',
      'A parcel depot that runs all night',
    ]);
  });

  it('ignores a decorated heading it does not recognise, rather than guessing', () => {
    const fragments = fragmentsOf('«𝐁𝐨𝐧𝐮𝐬»\n- A line under a heading we do not know');
    expect(fragments[0]?.tableId).toBeNull();
  });

  it('does not mistake a quoted sentence for a heading', () => {
    const [fragment] = fragmentsOf('She said 『nobody goes in alone』 and then went in alone.');
    expect(fragment?.tableId).toBeNull();
    expect(fragment?.text).toContain('nobody goes in alone');
  });
});

describe('harvestTargets', () => {
  it('maps every field of every generator, by label and by key', () => {
    expect(targets.get('location')?.tableId).toBe(
      MISSION_SPEC.fields.find((f) => f.key === 'location')?.tableId,
    );
    // "Briefing says" is the label; "briefing" is the key. Notes are likelier to use the key.
    expect(targets.get('briefing says')).toBeDefined();
    expect(targets.get('briefing')).toBeDefined();
  });

  it('does not invent targets for fields that do not exist', () => {
    expect(targets.get('favourite colour')).toBeUndefined();
  });
});

describe('finding a fragment’s table', () => {
  it('reads an inline label', () => {
    const [fragment] = fragmentsOf('Location: A parcel depot that runs all night');
    expect(fragment?.text).toBe('A parcel depot that runs all night');
    expect(fragment?.source).toBe('label');
    expect(fragment?.tableId).toBeTruthy();
  });

  it('reads a label written with markdown emphasis', () => {
    const [fragment] = fragmentsOf('**Client:** A shift supervisor who filed it himself');
    expect(fragment?.source).toBe('label');
  });

  it('uses a heading as context for the lines under it', () => {
    const fragments = fragmentsOf(
      '## Complications\n\n- Standing water across the floor\n- A hard deadline nobody will move',
    );
    expect(fragments).toHaveLength(2);
    for (const fragment of fragments) {
      expect(fragment.source).toBe('heading');
      expect(fragment.tableId).toBeTruthy();
    }
  });

  it('strips bullets and numbering from the entry text', () => {
    const fragments = fragmentsOf('## Complications\n- Standing water across the floor\n2. A hard deadline nobody will move');
    expect(fragments.map((f) => f.text)).toEqual([
      'Standing water across the floor',
      'A hard deadline nobody will move',
    ]);
  });

  it('leaves a line with no structure unassigned rather than guessing', () => {
    const [fragment] = fragmentsOf('The whole thing went wrong almost immediately.');
    expect(fragment?.tableId).toBeNull();
    expect(fragment?.source).toBe('none');
  });

  it('does not treat an ordinary sentence with a colon as a label', () => {
    const [fragment] = fragmentsOf('She said one thing: nobody goes in alone tonight.');
    expect(fragment?.tableId).toBeNull();
    expect(fragment?.text).toContain('nobody goes in alone');
  });

  it('forgets the heading when a new one starts', () => {
    const fragments = fragmentsOf(
      '## Complications\n- Standing water across the floor\n## Something Unknown\n- A line under a heading we do not know',
    );
    expect(find(fragments, 'Standing water')?.tableId).toBeTruthy();
    expect(find(fragments, 'do not know')?.tableId).toBeNull();
  });
});

describe('what gets skipped', () => {
  it('drops a fragment too short to be worth rolling', () => {
    expect(fragmentsOf('## Complications\n- Rain')).toEqual([]);
  });

  it('drops a passage too long to be a table entry', () => {
    const essay = `## Complications\n- ${'word '.repeat(100)}`;
    expect(fragmentsOf(essay)).toEqual([]);
  });

  it('keeps one copy when the same line appears twice', () => {
    const fragments = fragmentsOf(
      '## Complications\n- Standing water across the floor\n- Standing water across the floor',
    );
    expect(fragments).toHaveLength(1);
  });

  it('marks a fragment already in the tables rather than silently dropping it', () => {
    const tableId = MISSION_SPEC.fields.find((f) => f.key === 'location')?.tableId as string;
    const existing = buildTableSet([
      parseTableFile({ [tableId]: [{ id: 'x', value: 'A parcel depot that runs all night' }] }, 'user')
        .file,
    ]);

    const [fragment] = harvest('Location: A parcel depot that runs all night', targets, existing);
    expect(fragment?.duplicate).toBe(true);
  });
});

describe('entryId', () => {
  it('is stable for the same text, so re-importing does not duplicate', () => {
    expect(entryId('A parcel depot')).toBe(entryId('A parcel depot'));
  });

  it('is readable, and marked as the user’s own', () => {
    expect(entryId('A parcel depot that runs all night')).toMatch(/^mine-a-parcel-depot-that-runs-/);
  });

  it('separates two fragments that start the same way', () => {
    expect(entryId('A parcel depot at night')).not.toBe(entryId('A parcel depot at dawn'));
  });

  it('copes with text that slugs to nothing', () => {
    expect(entryId('!!! ???')).toMatch(/^mine-entry-/);
  });
});

describe('writing the user tables', () => {
  const tableId = MISSION_SPEC.fields.find((f) => f.key === 'location')?.tableId as string;
  const fragments = fragmentsOf(
    'Location: A parcel depot that runs all night\nLocation: A reservoir walkway half underwater',
  );

  it('groups approved fragments by table', () => {
    const tables = toUserTables(fragments);
    expect(tables[tableId]).toHaveLength(2);
    expect(tables[tableId]?.[0]?.value).toBe('A parcel depot that runs all night');
  });

  it('never writes a source field — the loader stamps that', () => {
    const entry = toUserTables(fragments)[tableId]?.[0] as unknown as Record<string, unknown>;
    expect(entry['source']).toBeUndefined();
  });

  it('leaves out unassigned and duplicate fragments', () => {
    const mixed: Fragment[] = [
      { text: 'Kept', tableId, label: 'Location', source: 'label', duplicate: false },
      { text: 'Dropped, no table', tableId: null, label: '', source: 'none', duplicate: false },
      { text: 'Dropped, already there', tableId, label: 'Location', source: 'label', duplicate: true },
    ];
    expect(toUserTables(mixed)[tableId]).toHaveLength(1);
  });

  it('merges over what the user file already holds instead of replacing it', () => {
    const current = { [tableId]: [{ id: 'kept-by-hand', value: 'Written directly in the file' }] };
    const tables = toUserTables(fragments, current as never);

    expect(tables[tableId]).toHaveLength(3);
    expect(tables[tableId]?.[0]?.id).toBe('kept-by-hand');
  });

  it('is idempotent — importing the same material twice changes nothing', () => {
    const once = toUserTables(fragments);
    const twice = toUserTables(fragments, once);
    expect(twice).toEqual(once);
  });
});

describe('the summary the user approves against', () => {
  it('adds up to the total', () => {
    const fragments = fragmentsOf(
      [
        // Before any heading, so there is genuinely nothing to place it by.
        'Just some prose with no structure at all.',
        'Location: A parcel depot that runs all night',
        '## Complications',
        '- Standing water across the floor',
      ].join('\n'),
    );

    const summary = summarise(fragments);
    expect(summary.assigned + summary.unassigned + summary.duplicates).toBe(summary.total);
    expect(summary.assigned).toBe(2);
    expect(summary.unassigned).toBe(1);
  });

  it('counts what each table would gain', () => {
    const tableId = MISSION_SPEC.fields.find((f) => f.key === 'location')?.tableId as string;
    const summary = summarise(
      fragmentsOf('Location: A parcel depot at night\nLocation: A reservoir walkway, flooded'),
    );
    expect(summary.perTable.get(tableId)).toBe(2);
  });
});
