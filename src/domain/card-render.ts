/**
 * One door into the three card layouts.
 *
 * The dispatch lives here rather than in the hook so that a fourth kind is a case in one
 * switch rather than a change in `useCard`, the panel and whatever else has learned the list.
 *
 * Pure (CLAUDE.md §3).
 */

import { presetById, type CardOptions, type Measurer } from './card';
import type { CardKind, ResolvedCardFonts } from './card-style';
import { characterCardSvg } from './card-character';
import { clanCardSvg } from './card-clan';
import { missionCardSvg } from './card-mission';
import { characterDisplayName, type Character } from './character';
import { entityDisplayName, type Clan, type Mission } from './entities';
import { isCharacter } from './sheet';

/** Anything a graphic can be made of. */
export type CardSubject = Character | Clan | Mission;

export function cardKindOf(subject: CardSubject): CardKind {
  if (isCharacter(subject)) return 'character';
  return subject.kind === 'clan' ? 'clan' : 'mission';
}

export function cardSubjectName(subject: CardSubject): string {
  return isCharacter(subject) ? characterDisplayName(subject) : entityDisplayName(subject);
}

/** The folder a card is filed under, mirroring the record's own. Characters have none. */
export function cardSubjectFolder(subject: CardSubject): string {
  return isCharacter(subject) ? '' : subject.folder;
}

export interface RenderCardInput {
  readonly subject: CardSubject;
  readonly options: CardOptions;
  readonly tokens: Readonly<Record<string, string>>;
  readonly measure: Measurer;
  readonly portrait: string;
  readonly fonts: ResolvedCardFonts;
  readonly fontFaceCss: string;
}

export function renderCard(input: RenderCardInput): string {
  const { subject, ...rest } = input;

  if (isCharacter(subject)) return characterCardSvg({ character: subject, ...rest });
  if (subject.kind === 'clan') return clanCardSvg({ clan: subject, ...rest });
  return missionCardSvg({ mission: subject, ...rest });
}

/**
 * The file a card is written as: `walker-masami-card`, `masami-clan-backdrop`.
 *
 * The preset is in the name because the same record exports as several shapes, and three files
 * called `walker-masami.png` would overwrite each other one at a time.
 */
export function cardFileStem(subject: CardSubject, options: CardOptions): string {
  const slug = cardSubjectName(subject)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || cardKindOf(subject)}-${presetById(options.presetId).id}`;
}
