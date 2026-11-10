import type { ComponentType } from 'react';

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
import { VaultPage } from './vault/VaultPage';

export type ModuleId =
  | 'vault'
  | 'library'
  | 'lore'
  | 'clans'
  | 'npc-generator'
  | 'technique-generator'
  | 'mission-generator'
  | 'situation'
  | 'cursed-object-generator'
  | 'cursed-tool-generator'
  | 'settings';

export interface ModuleDefinition {
  readonly id: ModuleId;
  readonly label: string;
  readonly blurb: string;
  readonly Page: ComponentType;
  /** Footer modules sit apart at the bottom of the sidebar. */
  readonly placement?: 'footer';
}

export const MODULES: readonly ModuleDefinition[] = [
  {
    id: 'vault',
    label: 'Character Vault',
    blurb: 'Player characters and recurring NPCs.',
    Page: VaultPage,
  },
  {
    id: 'library',
    label: 'Library',
    blurb: 'Everything you have saved, in folders that are folders on disk.',
    Page: LibraryPage,
  },
  {
    id: 'lore',
    label: 'Lore',
    blurb: 'Places, clans, incidents — the parts of the world no generator can roll.',
    Page: LorePage,
  },
  {
    id: 'clans',
    label: 'Clans',
    blurb: 'Hierarchy, bonuses, mutations and the clan vault.',
    Page: ClansPage,
  },
  {
    id: 'npc-generator',
    label: 'NPC Generator',
    blurb: 'Sorcerers, curse users and curses.',
    Page: NpcGeneratorPage,
  },
  {
    id: 'technique-generator',
    label: 'Techniques',
    blurb: 'Cursed techniques and the shikigami some of them bind.',
    Page: TechniqueGeneratorPage,
  },
  {
    id: 'mission-generator',
    label: 'Mission Generator',
    blurb: 'Graded missions, and what the briefing gets wrong.',
    Page: MissionGeneratorPage,
  },
  {
    id: 'situation',
    label: 'Situation',
    blurb: 'A mission, the curse really there, and what is left behind — rolled together.',
    Page: SituationPage,
  },
  {
    id: 'cursed-object-generator',
    label: 'Cursed Objects',
    blurb: 'Sealed, dormant and active cursed objects.',
    Page: CursedObjectGeneratorPage,
  },
  {
    id: 'cursed-tool-generator',
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
export const FOOTER_MODULES = MODULES.filter((module) => module.placement === 'footer');
