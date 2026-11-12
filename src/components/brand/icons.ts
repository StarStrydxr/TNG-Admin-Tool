/**
 * The Jujutsu icon set, as data.
 *
 * Seventeen marks on a 24-unit grid, cut solid the way a crest or a seal is, where the Classic
 * insignia are line art. Every one is original and drawn from the setting's vocabulary rather
 * than its artwork — a torii, a talisman jar, a paper doll, a magatama — so nothing here is a
 * logo, a character or a traced panel, and nothing may become one (CLAUDE.md §9).
 *
 * ⚠️ **No colour, anywhere.** Each part is filled or stroked with `currentColor` by
 * `JujutsuIcon`, so an icon takes the colour of whatever it sits in and repaints with the
 * theme. Holes are cut with `fill-rule: evenodd` *within* a part; separate parts simply add
 * up. That is why a figure's head and body are two parts: as one, the place where they touch
 * would be cut out instead of joined.
 *
 * Each was checked at 13px, which is the smallest it is drawn (a row in the library). A mark
 * that only reads at 48px is not doing its job.
 */

import type { ShellIconId } from '../../domain/shell';

export type IconPart =
  | { readonly d: string; readonly stroke?: number; readonly transform?: string }
  | { readonly ring: number; readonly width: number; readonly dash: string; readonly transform: string };

export const JUJUTSU_ICONS: Record<ShellIconId, readonly IconPart[]> = {
  // A figure in a high-collared uniform.
  sorcerer: [
    { d: 'M12 2.8a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Z' },
    { d: 'M4.6 21.2v-2.6c0-3.4 2.7-6.1 6.1-6.1h2.6c3.4 0 6.1 2.7 6.1 6.1v2.6ZM10.6 12.5 12 15.9l1.4-3.4Z' },
  ],

  // The same figure under a hood, with nothing where the face should be.
  'curse-user': [
    { d: 'M12 2.4c3.4 2 5 4.8 5 7.9 0 .9-.2 1.7-.5 2.4 1.9 1.1 2.9 3.2 2.9 5.9v2.6H4.6v-2.6c0-2.7 1-4.8 2.9-5.9-.3-.7-.5-1.5-.5-2.4 0-3.1 1.6-5.9 5-7.9ZM12 7.2c1.5 0 2.6 1.3 2.6 3s-1.1 3-2.6 3-2.6-1.3-2.6-3 1.1-3 2.6-3Z' },
  ],

  // A spirit flame with one eye too many.
  curse: [
    { d: 'M12.6 2.2c.6 3 4.9 5.2 4.9 10.6a5.6 5.6 0 0 1-11.2 0c0-2.2 1-3.9 2.2-5.2.3 1.4.9 2.3 1.8 2.8-.4-3.2.6-6 2.3-8.2ZM9.9 12.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM14.1 12.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 15.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z' },
  ],

  // A briefing sheet, folded at the corner and stamped.
  mission: [
    { d: 'M6.2 2.5h7.9L19 7.4v13.1a1 1 0 0 1-1 1H6.2a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1ZM14 4.1v3.4h3.4ZM7.6 9.6h5v1.3h-5ZM7.6 12.4h8.4v1.3H7.6ZM14.4 14.9a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM14.4 16.1a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z' },
  ],

  // A notice pinned up, a face on it, the bottom edge torn.
  bounty: [
    { d: 'M12 1.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z' },
    { d: 'M5.2 4.6h13.6v15.2l-2.3-1.5-2.2 1.5-2.3-1.5-2.3 1.5-2.2-1.5-2.3 1.5ZM12 7.4a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2ZM8.2 16.4a3.8 3.8 0 0 1 7.6 0Z' },
  ],

  // A lidded jar with a paper seal down the front.
  object: [
    { d: 'M10.8 2.4h2.4v1.6h-2.4Z' },
    { d: 'M7 3.8h10a1 1 0 0 1 1 1v1.4H6V4.8a1 1 0 0 1 1-1Z' },
    { d: 'M6.6 7.4h10.8c1.4 1.9 2.1 3.9 2.1 6 0 3.4-1.7 6.2-3.6 8.1H8.1C6.2 19.6 4.5 16.8 4.5 13.4c0-2.1.7-4.1 2.1-6ZM10.3 7.4h3.4v8.6h-3.4ZM11.4 9h1.2v2.2h-1.2ZM11.4 12.4h1.2v2.2h-1.2Z' },
  ],

  // A blade, guard and grip.
  tool: [
    { d: 'M12 -2.8c1.1 1.6 1.5 3 1.5 4.6v12h-3v-12c0-1.6.4-3 1.5-4.6Z', transform: 'rotate(45 12 12)' },
    { d: 'M8 13.8h8v2H8Z', transform: 'rotate(45 12 12)' },
    { d: 'M10.8 15.8h2.4v9.4a1.2 1.2 0 0 1-2.4 0Z', transform: 'rotate(45 12 12)' },
  ],

  // A core, and the barrier turning round it.
  technique: [
    { d: 'M12 9.3a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z' },
    { ring: 8, width: 2.4, dash: '12.76 4', transform: 'rotate(-80 12 12)' },
  ],

  // A paper doll — the cut figure a shikigami is bound to.
  shikigami: [
    { d: 'M12 2.2a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z' },
    { d: 'M3.4 8.2h17.2l-1.5 4.4-3.9-1.3 1.9 10.3H6.9l1.9-10.3-3.9 1.3ZM11.3 11.6h1.4v5h-1.4Z' },
  ],

  // A torii: the gate between here and what is older.
  lore: [
    { d: 'M1.8 4.6c3.3 1 6.8 1.5 10.2 1.5s6.9-.5 10.2-1.5l.5 2.9c-3.5 1-7.1 1.4-10.7 1.4S4.8 8.5 1.3 7.5Z' },
    { d: 'M4.4 11.2h15.2v2H4.4Z' },
    { d: 'M6.3 8.2h2.3v13.4H6.3Z' },
    { d: 'M15.4 8.2h2.3v13.4h-2.3Z' },
    { d: 'M11 8.6h2v2.8h-2Z' },
  ],

  // A crest. Three stars in a ring, which is nobody’s in particular.
  clan: [
    { d: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM12 3.9a8.1 8.1 0 1 0 0 16.2 8.1 8.1 0 0 0 0-16.2Z' },
    { d: 'M12 6a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z' },
    { d: 'M8.5 12a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z' },
    { d: 'M15.5 12a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z' },
  ],

  // A magatama, the curved jewel.
  trait: [
    { d: 'M13.5 3a5.5 5.5 0 0 1 5.5 5.5c0 5.2-4.2 10.6-11.4 12.3 2.9-2.3 3.9-4.6 3.6-6.9A5.5 5.5 0 0 1 13.5 3ZM13.6 6.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z' },
  ],

  // The same jewel, cracked. Told apart by the fracture, not by colour.
  defect: [
    { d: 'M13.5 3a5.5 5.5 0 0 1 5.5 5.5c0 5.2-4.2 10.6-11.4 12.3 2.9-2.3 3.9-4.6 3.6-6.9A5.5 5.5 0 0 1 13.5 3ZM15.2 4.6l-3 3.9 2.4 1-2.4 4.5.9.5 3.5-5.5-2.4-1 1.9-2.8Z' },
  ],

  // A registration card: a face, a name, a grade.
  vault: [
    { d: 'M3.4 5h17.2a1.2 1.2 0 0 1 1.2 1.2v11.6a1.2 1.2 0 0 1-1.2 1.2H3.4a1.2 1.2 0 0 1-1.2-1.2V6.2A1.2 1.2 0 0 1 3.4 5ZM8 8.2a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8ZM4.8 16.2a3.2 3.2 0 0 1 6.4 0ZM13.4 8.6h5.6V10h-5.6ZM13.4 11.6h5.6V13h-5.6ZM13.4 14.6h2.6v1.6h-2.6Z' },
  ],

  // A hanging scroll, written top to bottom.
  library: [
    { d: 'M3 4.2h18a1.8 1.8 0 0 1 0 3.6H3a1.8 1.8 0 0 1 0-3.6Z' },
    { d: 'M5.4 8.6h13.2v11.6a1.2 1.2 0 0 1-1.2 1.2H6.6a1.2 1.2 0 0 1-1.2-1.2ZM8.3 10.8h1.5v7.6H8.3ZM11.25 10.8h1.5v7.6h-1.5ZM14.2 10.8h1.5v4.6h-1.5Z' },
  ],

  // Three things, tied together.
  situation: [
    { d: 'M12 5.2 5.4 17.8H18.6Z', stroke: 1.7 },
    { d: 'M12 2.5a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z' },
    { d: 'M5.4 15.1a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z' },
    { d: 'M18.6 15.1a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z' },
  ],

  // Beads on rods — an abacus, which is also what sliders are.
  settings: [
    { d: 'M3 5.8h18v1.4H3Z' },
    { d: 'M8 3.7l2.8 2.8L8 9.3 5.2 6.5Z' },
    { d: 'M3 11.3h18v1.4H3Z' },
    { d: 'M15.5 9.2l2.8 2.8-2.8 2.8-2.8-2.8Z' },
    { d: 'M3 16.8h18v1.4H3Z' },
    { d: 'M10 14.7l2.8 2.8-2.8 2.8-2.8-2.8Z' },
  ],
};
