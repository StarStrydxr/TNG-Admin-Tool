/**
 * XML escaping, in a leaf module so `card.ts` and `card-svg.ts` can both reach it
 * without importing each other.
 *
 * Pure (CLAUDE.md §3).
 */

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
