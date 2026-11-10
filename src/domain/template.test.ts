import { describe, expect, it } from 'vitest';

import { renderTemplate, templateKeys, tidyMarkdown } from './template';

describe('values', () => {
  it('substitutes a plain key', () => {
    expect(renderTemplate('# {{name}}', { name: 'Hollow Pace' })).toBe('# Hollow Pace');
  });

  it('renders an unknown key as nothing rather than leaving the tag', () => {
    expect(renderTemplate('[{{nope}}]', {})).toBe('[]');
  });

  it('joins a list with commas when used as a value', () => {
    expect(renderTemplate('{{tags}}', { tags: ['one', 'two'] })).toBe('one, two');
  });

  it('tolerates whitespace inside the braces', () => {
    expect(renderTemplate('{{  name  }}', { name: 'x' })).toBe('x');
  });

  it('leaves text with no tags completely alone', () => {
    expect(renderTemplate('no tags here', { a: 'b' })).toBe('no tags here');
  });
});

describe('sections', () => {
  it('repeats once per list item, with {{.}} as the item', () => {
    const out = renderTemplate('{{#items}}- {{.}}\n{{/items}}', { items: ['a', 'b'] });
    expect(out).toBe('- a\n- b\n');
  });

  it('renders a non-empty value once', () => {
    expect(renderTemplate('{{#note}}Note: {{note}}{{/note}}', { note: 'careful' })).toBe(
      'Note: careful',
    );
  });

  it('renders nothing for an empty value, an empty list or a missing key', () => {
    const template = '[{{#x}}body{{/x}}]';
    expect(renderTemplate(template, { x: '' })).toBe('[]');
    expect(renderTemplate(template, { x: '   ' })).toBe('[]');
    expect(renderTemplate(template, { x: [] })).toBe('[]');
    expect(renderTemplate(template, {})).toBe('[]');
  });

  it('inverts with ^, for "say so when there is none"', () => {
    const template = '{{^tools}}No cursed tools.{{/tools}}';
    expect(renderTemplate(template, { tools: [] })).toBe('No cursed tools.');
    expect(renderTemplate(template, { tools: ['A tanto'] })).toBe('');
  });

  it('nests a section inside a section', () => {
    const out = renderTemplate('{{#a}}A{{#b}} and B{{/b}}{{/a}}', { a: 'yes', b: 'yes' });
    expect(out).toBe('A and B');
  });

  it('keeps the outer section when the inner one is empty', () => {
    const out = renderTemplate('{{#a}}A{{#b}} and B{{/b}}{{/a}}', { a: 'yes', b: '' });
    expect(out).toBe('A');
  });

  it('still reads context keys inside a list body', () => {
    const out = renderTemplate('{{#items}}{{name}}: {{.}}\n{{/items}}', {
      name: 'Mission',
      items: ['one', 'two'],
    });
    expect(out).toBe('Mission: one\nMission: two\n');
  });

  it('drops comments', () => {
    expect(renderTemplate('a{{! a note }}b', {})).toBe('ab');
  });
});

describe('a hand-edited template cannot take the export down', () => {
  it('shows an unclosed section rather than throwing', () => {
    expect(renderTemplate('{{#items}}no close', { items: ['a'] })).toBe('{{#items}}no close');
  });

  it('shows a stray closing tag rather than throwing', () => {
    expect(renderTemplate('text {{/items}}', {})).toBe('text {{/items}}');
  });

  it('survives a key with regex characters in it', () => {
    expect(renderTemplate('{{#a.b}}x{{/a.b}}', { 'a.b': 'yes' })).toBe('x');
  });
});

describe('authoring helpers', () => {
  it('lists the keys a template uses, sorted and deduplicated', () => {
    const keys = templateKeys('{{b}} {{#a}}{{.}}{{/a}} {{b}} {{! c }}');
    expect(keys).toEqual(['a', 'b']);
  });

  it('collapses the blank lines an empty section leaves behind', () => {
    expect(tidyMarkdown('# Title\n\n\n\nBody   \n\n\n')).toBe('# Title\n\nBody\n');
  });
});
