import type { Sheet } from '../../domain/sheet';

/**
 * One record, laid out for paper.
 *
 * Classes here are print-only (`print-*`), defined in `styles/index.css` inside `@media print`.
 * They deliberately do **not** use the theme tokens: a sheet must come out as ink on paper
 * whatever palette the app is wearing. That is the one sanctioned exception to the
 * never-hardcode-a-colour rule, and it lives entirely in the print stylesheet.
 */
export function PrintSheet({ sheet }: { readonly sheet: Sheet }) {
  return (
    <article className="print-sheet">
      <header className="print-head">
        <div className="print-head-text">
          <h1 className="print-title">{sheet.title}</h1>
          <p className="print-subtitle">{sheet.subtitle}</p>
        </div>
        {/* Decorative: the title beside it already names the record. */}
        {sheet.imageUrl ? <img className="print-portrait" src={sheet.imageUrl} alt="" /> : null}
      </header>

      {sheet.sections.map((section) => (
        <section key={section.title} className="print-section">
          <h2 className="print-section-title">{section.title}</h2>
          <dl className="print-fields">
            {section.fields.map((field, index) => (
              <div className="print-field" key={`${field.label}-${index}`}>
                {field.label ? <dt className="print-label">{field.label}</dt> : null}
                <dd className={field.label ? 'print-value' : 'print-value print-value-full'}>
                  {field.values.length === 1 ? (
                    field.values[0]
                  ) : (
                    <ul className="print-list">
                      {field.values.map((value) => (
                        <li key={value}>{value}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {sheet.footer ? <footer className="print-foot">{sheet.footer}</footer> : null}
    </article>
  );
}
