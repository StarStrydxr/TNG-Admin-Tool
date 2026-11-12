import type { ComponentType } from 'react';

import { MODULE_MARKS, type ModuleMark } from '../domain/shell';

import { BountyGeneratorPage } from './bounty-generator/BountyGeneratorPage';
import { ClansPage } from './clans/ClansPage';
import { CursedObjectGeneratorPage } from './cursed-object-generator/CursedObjectGeneratorPage';
import { CursedToolGeneratorPage } from './cursed-tool-generator/CursedToolGeneratorPage';
import { MissionGeneratorPage } from './mission-generator/MissionGeneratorPage';
import { NpcGeneratorPage } from './npc-generator/NpcGeneratorPage';
import { LibraryPage } from './library/LibraryPage';
import { LorePage } from './lore/LorePage';
import { SettingsPage } from './settings/SettingsPage';
import { SituationPage } from './situation/SituationPage';
import { TechniqueGeneratorPage } from './technique-generator/TechniqueGeneratorPage';
import { DefectsPage, TraitsPage } from './traits/TraitVaultPage';
import { VaultPage } from './vault/VaultPage';

export type ModuleId =
  | 'vault'
  | 'library'
  | 'lore'
  | 'clans'
  | 'traits'
  | 'defects'
  | 'bounty-generator'
  | 'npc-generator'
  | 'technique-generator'
  | 'mission-generator'
  | 'situation'
  | 'cursed-object-generator'
  | 'cursed-tool-generator'
  | 'settings';

/**
 * The two halves of the sidebar. A record is something kept; a generator is something rolled.
 * The split was already there in the order of the list — this only says so out loud, now that
 * the list is thirteen long.
 */
export type ModuleGroupId = 'records' | 'generators';

export const MODULE_GROUPS: readonly { readonly id: ModuleGroupId; readonly label: string }[] = [
  { id: 'records', label: 'Records' },
  { id: 'generators', label: 'Generators' },
];

interface ModuleBase {
  readonly id: ModuleId;
  readonly label: string;
  readonly blurb: string;
  readonly Page: ComponentType;
}

/**
 * A module sits in one half of the sidebar, or apart in its footer — one or the other.
 *
 * ⚠️ A union rather than two optional fields, on purpose. The sidebar is drawn group by group,
 * so a module with neither would simply not be drawn: no error, no warning, just a page nobody
 * can reach. Written this way the compiler refuses it.
 */
export type ModuleDefinition = ModuleBase &
  (
    | { readonly group: ModuleGroupId; readonly placement?: undefined }
    | { readonly placement: 'footer'; readonly group?: undefined }
  );

export const MODULES: readonly ModuleDefinition[] = [
  {
    id: 'vault',
    group: 'records',
    label: 'Character Vault',
    blurb: 'Player characters and recurring NPCs.',
    Page: VaultPage,
  },
  {
    id: 'library',
    group: 'records',
    label: 'Library',
    blurb: 'Everything you have saved, in folders that are folders on disk.',
    Page: LibraryPage,
  },
  {
    id: 'lore',
    group: 'records',
    label: 'Lore',
    blurb: 'Places, clans, incidents — the parts of the world no generator can roll.',
    Page: LorePage,
  },
  {
    id: 'clans',
    group: 'records',
    label: 'Clans',
    blurb: 'Hierarchy, bonuses, mutations and the clan vault.',
    Page: ClansPage,
  },
  {
    id: 'traits',
    group: 'records',
    label: 'Traits',
    blurb: 'Perks, what they cost and what they move. Recorded, never applied.',
    Page: TraitsPage,
  },
  {
    id: 'defects',
    group: 'records',
    label: 'Defects',
    blurb: 'Drawbacks, and what taking one gives back.',
    Page: DefectsPage,
  },
  {
    id: 'npc-generator',
    group: 'generators',
    label: 'NPC Generator',
    blurb: 'Sorcerers, curse users and curses.',
    Page: NpcGeneratorPage,
  },
  {
    id: 'technique-generator',
    group: 'generators',
    label: 'Techniques',
    blurb: 'Cursed techniques and the shikigami some of them bind.',
    Page: TechniqueGeneratorPage,
  },
  {
    id: 'mission-generator',
    group: 'generators',
    label: 'Mission Generator',
    blurb: 'Graded missions, and what the briefing gets wrong.',
    Page: MissionGeneratorPage,
  },
  {
    id: 'bounty-generator',
    group: 'generators',
    label: 'Bounties',
    blurb: 'A posting on somebody the Academy wants dealt with.',
    Page: BountyGeneratorPage,
  },
  {
    id: 'situation',
    group: 'generators',
    label: 'Situation',
    blurb: 'A mission, the curse really there, and what is left behind — rolled together.',
    Page: SituationPage,
  },
  {
    id: 'cursed-object-generator',
    group: 'generators',
    label: 'Cursed Objects',
    blurb: 'Sealed, dormant and active cursed objects.',
    Page: CursedObjectGeneratorPage,
  },
  {
    id: 'cursed-tool-generator',
    group: 'generators',
    label: 'Cursed Tools',
    blurb: 'Graded tools, their properties and their costs.',
    Page: CursedToolGeneratorPage,
  },
  {
    id: 'settings',
    label: 'Settings',
    blurb: 'Theme, readability and accessibility.',
    Page: SettingsPage,
    placement: 'footer',
  },
];

export const MAIN_MODULES = MODULES.filter((module) => module.placement !== 'footer');

/**
 * The icon and kanji a page wears in the Jujutsu interface.
 *
 * Indexing by `ModuleId` is the check: add a page without adding its mark to
 * `domain/shell.ts` and this line stops compiling, rather than the page turning up with a
 * blank where its icon should be.
 */
export function markFor(id: ModuleId): ModuleMark {
  return MODULE_MARKS[id];
}

export function modulesIn(group: ModuleGroupId): readonly ModuleDefinition[] {
  return MAIN_MODULES.filter((module) => module.group === group);
}
export const FOOTER_MODULES = MODULES.filter((module) => module.placement === 'footer');
