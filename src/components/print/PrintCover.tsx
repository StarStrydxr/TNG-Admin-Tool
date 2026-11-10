import type { BookletCover } from '../../domain/sheet';

/**
 * The first page of a printed booklet.
 *
 * Makes a printout an artefact rather than a stack: what this is, how much of it there is, and
 * what order it comes in. Print-only classes, like the sheets beside it — the ink comes from
 * the `@media print` palette, never from a component (CLAUDE.md §9).
 */
export function PrintCover({ cover }: { readonly cover: BookletCover }) {
  return (
    <article className="print-sheet print-cover">
      <header className="print-cover-head">
        <h1 className="print-cover-title">{cover.title}</h1>
        <p className="print-subtitle">{cover.subtitle}</p>
      </header>

      <h2 className="print-section-title">Contents</h2>
      <ol className="print-contents">
        {cover.contents.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </article>
  );
}
