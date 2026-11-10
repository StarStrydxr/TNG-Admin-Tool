/**
 * Cross-links between records.
 *
 * A mission that names the curse you rolled for it; a cursed tool that belongs to a character.
 * The vault stops being six separate lists the moment these exist.
 *
 * Three decisions worth stating, because each has an obvious-looking alternative:
 *
 *   * **A link stores the target's name as well as its id.** Ids are not readable and targets
 *     get deleted. Keeping the name means a broken link still says *what* it pointed at, which
 *     is the only thing that makes a dangling link fixable rather than mysterious.
 *   * **The stored name is a snapshot, and the live one wins when the target is found.** So
 *     renaming a record updates every link to it, and deleting one leaves its last known name
 *     behind.
 *   * **Links are one-directional and unenforced.** Nothing keeps a pair in step, and deleting
 *     a target does not hunt down its referrers. A vault of files on disk that someone
 *     reorganises in Explorer cannot promise referential integrity, so it does not pretend to.
 *
 * Pure (CLAUDE.md §3).
 */

import { CHARACTER_KINDS, characterDisplayName, type Character } from './character';
import {
  ENTITY_KINDS,
  ENTITY_LABELS,
  entityDisplayName,
  type EntityKind,
  type SavedEntity,
} from './entities';
import { CHARACTER_KIND_LABELS, type CharacterKind } from './character';

/** Anything a link may point at. Characters can be targets; only entities carry links. */
export type LinkKind = EntityKind | CharacterKind;

export const LINK_KINDS: readonly LinkKind[] = [...ENTITY_KINDS, ...CHARACTER_KINDS];

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  ...ENTITY_LABELS,
  ...CHARACTER_KIND_LABELS,
};

export interface EntityLink {
  /** Id of the target record. */
  readonly id: string;
  /** Which collection to look in. */
  readonly kind: LinkKind;
  /** The target's name when the link was made. A fallback, not the truth. */
  readonly label: string;
  /** Why these two are connected — "the curse from the briefing". */
  readonly note: string;
}

export function isLinkKind(value: string): value is LinkKind {
  return (LINK_KINDS as readonly string[]).includes(value);
}

/** Anything that can be a link target, reduced to what a link needs. */
export interface LinkTarget {
  readonly id: string;
  readonly kind: LinkKind;
  readonly name: string;
}

export function targetOf(record: SavedEntity | Character): LinkTarget {
  const isCharacter = record.kind === 'pc' || record.kind === 'npc';
  return {
    id: record.id,
    kind: record.kind,
    name: isCharacter
      ? characterDisplayName(record as Character)
      : entityDisplayName(record as SavedEntity),
  };
}

export function linkTo(record: SavedEntity | Character, note = ''): EntityLink {
  const target = targetOf(record);
  return { id: target.id, kind: target.kind, label: target.name, note };
}

/** Id -> target, across every collection. Built once by the caller, reused for every link. */
export type LinkIndex = ReadonlyMap<string, LinkTarget>;

export function buildLinkIndex(records: readonly (SavedEntity | Character)[]): LinkIndex {
  const index = new Map<string, LinkTarget>();
  for (const record of records) {
    const target = targetOf(record);
    index.set(target.id, target);
  }
  return index;
}

export interface ResolvedLink {
  readonly link: EntityLink;
  /** The live name when the target was found, otherwise the name stored on the link. */
  readonly name: string;
  /** False when the target is gone, or simply not loaded. */
  readonly found: boolean;
}

export function resolveLink(link: EntityLink, index: LinkIndex): ResolvedLink {
  const target = index.get(link.id);
  return {
    link,
    name: target?.name || link.label || 'Unnamed record',
    found: target !== undefined,
  };
}

export function resolveLinks(
  links: readonly EntityLink[],
  index: LinkIndex,
): readonly ResolvedLink[] {
  return links.map((link) => resolveLink(link, index));
}

/** Add a link, refusing a self-reference and a duplicate. Returns the list unchanged if either. */
export function addLink(
  links: readonly EntityLink[],
  link: EntityLink,
  selfId: string,
): readonly EntityLink[] {
  if (link.id === selfId) return links;
  if (links.some((existing) => existing.id === link.id)) return links;
  return [...links, link];
}

export function removeLink(links: readonly EntityLink[], id: string): readonly EntityLink[] {
  return links.filter((link) => link.id !== id);
}

export function updateLinkNote(
  links: readonly EntityLink[],
  id: string,
  note: string,
): readonly EntityLink[] {
  return links.map((link) => (link.id === id ? { ...link, note } : link));
}

/**
 * Records pointing *at* this one.
 *
 * Computed on the fly rather than stored, because a stored back-reference is a second copy of
 * the truth that nothing keeps in step.
 */
export function backlinksTo(
  id: string,
  entities: readonly SavedEntity[],
): readonly SavedEntity[] {
  return entities.filter((entity) => entity.links.some((link) => link.id === id));
}
