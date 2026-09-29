import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TypingDots } from './TypingDots';

describe('TypingDots', () => {
  const html = renderToStaticMarkup(createElement(TypingDots));

  it('renders three animated dots, each starting a beat after the last', () => {
    expect(html.match(/animate-typing-dot/g)).toHaveLength(3);
    expect(html).toContain('animation-delay:0s');
    expect(html).toContain('animation-delay:0.16s');
    expect(html).toContain('animation-delay:0.32s');
  });

  it('is announced to screen readers rather than read as three blobs', () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Assistant is typing"');
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
  });
});
