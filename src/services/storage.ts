/**
 * Vault persistence.
 *
 * Rust owns the filesystem (CLAUDE.md §3): this module names collections, never paths. Records
 * cross the boundary as plain JSON and are parsed into domain types here, so the schema stays
 * owned by `domain/`.
 */

import { parseCharacter } from '../domain/character-parse';
import { parseEntity } from '../domain/entities-parse';
import {
  ENTITY_COLLECTIONS,
  ENTITY_KINDS,
  type EntityKind,
  type SavedEntity,
} from '../domain/entities';
import { CHARACTER_KINDS } from '../domain/character';
import type { Character, CharacterKind, NewCharacterInput } from '../domain/character';
import type { GradeId } from '../domain/grades';
import { call } from './transport';

/** Folder names on disk. Mirrors the Rust side's whitelist. */
const COLLECTION: Record<CharacterKind, string> = {
  pc: 'characters',
  npc: 'npcs',
};

/** A record that could not be read. Reported, never fatal. */
export interface SkippedFile {
  readonly file: string;
  readonly reason: string;
}

interface RawRecord {
  /** Folder on disk, which is authoritative — dragging a file in Explorer moves the record. */
  readonly folder: string;
  readonly file: string;
  readonly content: unknown;
}

interface RawListing {
  readonly records: readonly RawRecord[];
  readonly skipped: readonly SkippedFile[];
  readonly directory: string;
}

export interface CharacterListing {
  readonly characters: readonly Character[];
  readonly skipped: readonly SkippedFile[];
  /** Absolute path, for showing the user where their data lives. */
  readonly directory: string;
}

const FALLBACK_GRADE: GradeId = 'grade-4';

function fallbackFor(kind: CharacterKind, index: number): NewCharacterInput {
  return {
    id: `recovered-${index}`,
    now: new Date(0).toISOString(),
    kind,
    grade: FALLBACK_GRADE,
  };
}

export async function listCharacters(kind: CharacterKind): Promise<CharacterListing> {
  const listing = await call<RawListing>('vault_list', { kind: COLLECTION[kind] });

  const characters = listing.records.map((record, index) =>
    parseCharacter(record.content, fallbackFor(kind, index)),
  );

  // Most recently touched first — the vault is browsed, not paged.
  const sorted = [...characters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return { characters: sorted, skipped: listing.skipped, directory: listing.directory };
}

export async function saveCharacter(character: Character): Promise<void> {
  await call<void>('vault_save', {
    kind: COLLECTION[character.kind],
    id: character.id,
    folder: '',
    data: character,
  });
}

export async function deleteCharacter(character: Character): Promise<void> {
  await call<void>('vault_delete', {
    kind: COLLECTION[character.kind],
    id: character.id,
    folder: '',
  });
}

/* ------------------------------------------------------------------ */
/* Saved generator output                                              */
/* ------------------------------------------------------------------ */

export interface EntityListing {
  readonly entities: readonly SavedEntity[];
  readonly skipped: readonly SkippedFile[];
  readonly directory: string;
}

export async function listEntities(kind: EntityKind): Promise<EntityListing> {
  const listing = await call<RawListing>('vault_list', { kind: ENTITY_COLLECTIONS[kind] });

  const entities: SavedEntity[] = [];
  const skipped = [...listing.skipped];

  listing.records.forEach((record, index) => {
    const parsed = parseEntity(record.content, `recovered-${index}`);
    if (!parsed) {
      skipped.push({ file: record.file, reason: 'Unrecognised record kind' });
      return;
    }
    // Disk wins: moving the file in Explorer is a legitimate way to reorganise.
    entities.push({ ...parsed, folder: record.folder });
  });

  const sorted = [...entities].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { entities: sorted, skipped, directory: listing.directory };
}

export async function saveEntity(entity: SavedEntity): Promise<void> {
  await call<void>('vault_save', {
    kind: ENTITY_COLLECTIONS[entity.kind],
    id: entity.id,
    folder: entity.folder,
    data: entity,
  });
}

export async function deleteEntity(entity: SavedEntity): Promise<void> {
  await call<void>('vault_delete', {
    kind: ENTITY_COLLECTIONS[entity.kind],
    id: entity.id,
    folder: entity.folder,
  });
}

/**
 * Every record in the vault, entities and characters alike.
 *
 * For the link picker and the link index, which need to look across collections. Reads all
 * nine folders, so call it when a picker opens rather than on every render.
 */
export async function listAllRecords(): Promise<readonly (SavedEntity | Character)[]> {
  const [entities, characters] = await Promise.all([
    Promise.all(ENTITY_KINDS.map((kind) => listEntities(kind))),
    Promise.all(CHARACTER_KINDS.map((kind) => listCharacters(kind))),
  ]);

  return [
    ...entities.flatMap((listing) => listing.entities),
    ...characters.flatMap((listing) => listing.characters),
  ];
}

export async function revealEntityFolder(kind: EntityKind): Promise<void> {
  await call<void>('vault_reveal', { kind: ENTITY_COLLECTIONS[kind] });
}

/** Open the collection's folder in Explorer. */
export async function revealVaultFolder(kind: CharacterKind): Promise<void> {
  await call<void>('vault_reveal', { kind: COLLECTION[kind] });
}
