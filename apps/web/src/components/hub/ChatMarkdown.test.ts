import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChatMarkdown } from './ChatMarkdown';

const render = (md: string, streaming = false) =>
  // children goes as createElement's third argument (react/no-children-prop);
  // the cast only satisfies the component's required-children prop type.
  renderToStaticMarkup(
    createElement(ChatMarkdown, { streaming } as { streaming: boolean; children: string }, md),
  );

describe('ChatMarkdown', () => {
  it('renders bold, lists and inline code instead of the raw markers', () => {
    const html = render('**Bold** and `code`\n\n- one\n- two');
    expect(html).toContain('>Bold</strong>');
    expect(html).toContain('<code');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).not.toContain('**');
  });

  it('renders a GFM table inside a horizontally scrollable wrapper', () => {
    const html = render('| Model | Free |\n| --- | :-: |\n| a | yes |');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('<table');
    expect(html).toContain('>Model</th>');
    expect(html).toContain('>yes</td>');
    expect(html).not.toContain('| --- |');
  });

  it('renders fenced code as a block', () => {
    const html = render('```ts\nconst x = 1\n```');
    expect(html).toContain('<pre');
    expect(html).toContain('const x = 1');
  });

  it('opens links in a new tab without handing over the opener', () => {
    const html = render('[docs](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('does not render raw HTML from a reply', () => {
    expect(render('<img src=x onerror=alert(1)> hi')).not.toContain('<img');
  });

  it("keeps react-markdown's node object off the DOM", () => {
    expect(render('**x** [a](https://a.b)\n\n| h |\n| - |\n| c |')).not.toMatch(/\snode=/);
  });

  it('marks the reply while it is still streaming', () => {
    expect(render('typing', true)).toContain('data-streaming="true"');
    expect(render('done')).not.toContain('data-streaming');
  });

  it('turns a raw <br> into a line break, e.g. inside a table cell', () => {
    const html = render('| Place | Why |\n| - | - |\n| Seoul | palaces<br>• K-pop<br/>• food |');
    expect(html).toMatch(/palaces<br\/?>\s*• K-pop<br\/?>\s*• food/);
    expect(html).not.toContain('&lt;br');
  });

  it('still drops every other raw HTML tag', () => {
    const html = render('keep <b>bold</b> text <script>x</script>');
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<script');
  });
});
