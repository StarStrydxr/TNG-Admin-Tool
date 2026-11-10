/**
 * A very small Mustache subset, for the export templates.
 *
 * Dan will specify the export formats later (CLAUDE.md §11, phase 2.4), so the templates are
 * editable files rather than string literals, and the syntax deliberately matches Mustache —
 * a documented standard he can look up rather than a dialect invented here.
 *
 * What is supported:
 *
 *   {{key}}           a value. A list joins with ", ". An unknown key renders as nothing.
 *   {{#key}}…{{/key}} a section. Repeats once per item for a list, with {{.}} as the item;
 *                     renders once for a non-empty value; renders nothing when empty.
 *   {{^key}}…{{/key}} an inverted section: renders only when the key is empty or missing.
 *   {{! …}}           a comment.
 *
 * What is not: partials, lambdas, dotted paths, HTML escaping. The output is markdown, so
 * escaping would corrupt it — a template renders exactly the characters in the data.
 *
 * Pure (CLAUDE.md §3).
 */

export type TemplateValue = string | readonly string[];
export type TemplateContext = Readonly<Record<string, TemplateValue>>;

/** Mustache treats an empty string, an empty list and a missing key alike: falsy. */
function isEmpty(value: TemplateValue | undefined): boolean {
  if (value === undefined) return true;
  return typeof value === 'string' ? value.trim().length === 0 : value.length === 0;
}

function asText(value: TemplateValue | undefined): string {
  if (value === undefined) return '';
  return typeof value === 'string' ? value : value.join(', ');
}

function asList(value: TemplateValue | undefined): readonly string[] {
  if (value === undefined) return [];
  return typeof value === 'string' ? (value.trim() ? [value] : []) : value;
}

const TAG = /\{\{([#^/!]?)\s*([^{}]*?)\s*\}\}/g;

/**
 * Render `template` against `context`.
 *
 * Unbalanced tags are rendered literally rather than throwing: these are files the user edits
 * by hand, and a stray `{{/foo}}` should show up in the output as something to fix, not take
 * the export down.
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return renderScope(template, context, null);
}

function renderScope(
  template: string,
  context: TemplateContext,
  item: string | null,
): string {
  let out = '';
  let cursor = 0;

  // Sections are found by scanning for the matching close tag, so nesting works.
  TAG.lastIndex = 0;
  let match = TAG.exec(template);

  while (match) {
    const [raw, sigil, key] = match;
    out += template.slice(cursor, match.index);

    if (sigil === '!') {
      cursor = match.index + raw.length;
    } else if (sigil === '#' || sigil === '^') {
      const close = findClose(template, key as string, TAG.lastIndex);
      if (close === null) {
        // No matching {{/key}} — leave the tag visible so the mistake is findable.
        out += raw;
        cursor = match.index + raw.length;
      } else {
        const body = template.slice(TAG.lastIndex, close.start);
        out += renderSection(sigil === '^', key as string, body, context);
        cursor = close.end;
        TAG.lastIndex = close.end;
      }
    } else if (sigil === '/') {
      out += raw;
      cursor = match.index + raw.length;
    } else if (key === '.') {
      out += item ?? '';
      cursor = match.index + raw.length;
    } else {
      out += asText(context[key as string]);
      cursor = match.index + raw.length;
    }

    TAG.lastIndex = cursor;
    match = TAG.exec(template);
  }

  return out + template.slice(cursor);
}

function renderSection(
  inverted: boolean,
  key: string,
  body: string,
  context: TemplateContext,
): string {
  const value = context[key];

  if (inverted) return isEmpty(value) ? renderScope(body, context, null) : '';
  if (isEmpty(value)) return '';

  // A list repeats the body; a plain value renders it once.
  if (typeof value !== 'string') {
    return asList(value)
      .map((entry) => renderScope(body, context, entry))
      .join('');
  }

  return renderScope(body, context, value);
}

/** Find the `{{/key}}` that closes a section opened at `from`, skipping nested pairs. */
function findClose(
  template: string,
  key: string,
  from: number,
): { readonly start: number; readonly end: number } | null {
  const scanner = new RegExp(`\\{\\{([#^/])\\s*${escapeRegExp(key)}\\s*\\}\\}`, 'g');
  scanner.lastIndex = from;

  let depth = 0;
  let found = scanner.exec(template);

  while (found) {
    if (found[1] === '/') {
      if (depth === 0) return { start: found.index, end: scanner.lastIndex };
      depth -= 1;
    } else {
      depth += 1;
    }
    found = scanner.exec(template);
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every `{{key}}` a template mentions, for showing the author what is available. */
export function templateKeys(template: string): readonly string[] {
  const keys = new Set<string>();
  for (const match of template.matchAll(TAG)) {
    const [, sigil, key] = match;
    if (sigil !== '!' && key && key !== '.') keys.add(key);
  }
  return [...keys].sort();
}

/** Collapse runs of blank lines left behind by empty sections, and trim the ends. */
export function tidyMarkdown(text: string): string {
  return `${text.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
