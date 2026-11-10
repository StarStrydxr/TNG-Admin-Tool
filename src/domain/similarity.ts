/**
 * "You have rolled this before."
 *
 * At a thousand canon entries a generator will still occasionally produce two records that are
 * substantially the same, and the only person who notices is the one who already saved both.
 * This finds the near-matches so the UI can mention it.
 *
 * A **note, never a block**. Two similar missions can be perfectly deliberate — the same site
 * revisited, a deliberate variation — so this never prevents a save and never auto-merges.
 *
 * The measure is Jaccard overlap of significant words, not edit distance: records differ in
 * length and field order, and what matters is whether they are *about* the same things.
 *
 * Pure (CLAUDE.md §3).
 */

import { searchableText } from './entity-search';
import type { SavedEntity } from './entities';

/**
 * Words too common to carry meaning. Deliberately short — an over-eager stop list throws away
 * the vocabulary that makes these tables distinctive.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from', 'has', 'have',
  'in', 'into', 'is', 'it', 'its', 'not', 'of', 'on', 'one', 'or', 'that', 'the', 'their',
  'them', 'there', 'they', 'this', 'to', 'was', 'were', 'what', 'which', 'who', 'will', 'with',
]);

/** At or above this, two records are worth mentioning to each other. */
export const SIMILARITY_THRESHOLD = 0.5;

export function significantWords(text: string): ReadonlySet<string> {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return new Set(words);
}

/** Jaccard overlap, 0 to 1. Two empty records count as identical, which they are. */
export function similarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const word of small) if (large.has(word)) shared += 1;

  return shared / (a.size + b.size - shared);
}

export interface SimilarRecord {
  readonly entity: SavedEntity;
  /** 0 to 1. */
  readonly score: number;
}

/**
 * Records in `existing` that resemble `candidate`, most alike first.
 *
 * Only compares within the same kind — a mission and a cursed tool sharing words is a
 * coincidence of vocabulary, not a duplicate. The candidate itself is excluded by id, so this
 * is safe to call when re-saving an existing record.
 */
export function findSimilar(
  candidate: SavedEntity,
  existing: readonly SavedEntity[],
  threshold = SIMILARITY_THRESHOLD,
): readonly SimilarRecord[] {
  const words = significantWords(searchableText(candidate));

  return existing
    .filter((other) => other.id !== candidate.id && other.kind === candidate.kind)
    .map((other) => ({
      entity: other,
      score: similarity(words, significantWords(searchableText(other))),
    }))
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

/** "84% the same as" — for the one-line note. */
export function formatSimilarity(score: number): string {
  return `${Math.round(score * 100)}%`;
}
