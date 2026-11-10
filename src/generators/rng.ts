/**
 * Deterministic randomness.
 *
 * Generators must be reproducible: the same seed and tables always produce the same result
 * (CLAUDE.md §5). `Math.random()` is therefore banned everywhere under `generators/`.
 *
 * Pure — no clock, no I/O, no globals.
 */

/** FNV-1a, 32-bit. Turns a seed string into a usable integer state. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, bound). Returns 0 when bound < 1. */
  nextInt(bound: number): number;
}

/**
 * mulberry32 — small, fast, and good enough for picking table entries. Not cryptographic, and
 * it does not need to be.
 */
export function createRng(seed: string | number): Rng {
  let state = (typeof seed === 'number' ? seed : hashString(seed)) >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    nextInt(bound: number): number {
      if (!Number.isFinite(bound) || bound < 1) return 0;
      return Math.floor(next() * bound);
    },
  };
}

/**
 * Derive a stable child seed. Field rolls use this so that re-rolling one field leaves every
 * other field byte-identical, and the whole draft stays reproducible from its root seed plus
 * each field's nonce.
 */
export function deriveSeed(root: string, ...parts: readonly (string | number)[]): string {
  return [root, ...parts].join('\u0000');
}

export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[rng.nextInt(items.length)];
}

export interface Weighted {
  readonly weight?: number;
}

/** Weight defaults to 1. Non-positive weights are treated as 0 and can never be drawn. */
export function weightOf(item: Weighted): number {
  const weight = item.weight ?? 1;
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

export function weightedPick<T extends Weighted>(rng: Rng, items: readonly T[]): T | undefined {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  if (total <= 0) return undefined;

  let roll = rng.next() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  // Floating-point drift only; fall back to the last drawable entry.
  return [...items].reverse().find((item) => weightOf(item) > 0);
}

/** Draw up to `count` distinct entries. Returns fewer when the pool is smaller. */
export function weightedPickMany<T extends Weighted>(
  rng: Rng,
  items: readonly T[],
  count: number,
): readonly T[] {
  const pool = items.filter((item) => weightOf(item) > 0);
  const drawn: T[] = [];

  while (drawn.length < count && pool.length > 0) {
    const chosen = weightedPick(rng, pool);
    if (!chosen) break;
    drawn.push(chosen);
    pool.splice(pool.indexOf(chosen), 1);
  }

  return drawn;
}
