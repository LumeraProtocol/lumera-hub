import { describe, expect, it } from 'vitest';
import { parseSyndicatedTimeline } from './x-syndication';

const page = (entries: unknown[]) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { timeline: { entries } } },
  })}</script></html>`;

const tweet = (over: Record<string, unknown> = {}) => ({
  content: {
    tweet: {
      id_str: '1',
      full_text: 'Introducing the Intelligence Layer.',
      created_at: 'Thu Aug 20 18:13:01 +0000 2026',
      reply_count: 10,
      retweet_count: 7,
      favorite_count: 31,
      permalink: '/lumera/status/1',
      entities: {},
      ...over,
    },
  },
});

describe('parseSyndicatedTimeline', () => {
  it('reads a post with its engagement counts', () => {
    const [p] = parseSyndicatedTimeline(page([tweet()]), 'lumera');
    expect(p).toMatchObject({ id: '1', replies: 10, reposts: 7, likes: 31 });
    expect(p.text).toBe('Introducing the Intelligence Layer.');
    expect(p.url).toBe('https://x.com/lumera/status/1');
    expect(p.createdAt).toBe('2026-08-20T18:13:01.000Z');
  });

  it('swaps t.co links for the readable form', () => {
    const [p] = parseSyndicatedTimeline(
      page([
        tweet({
          full_text: 'Live now https://t.co/abc',
          entities: {
            urls: [{ url: 'https://t.co/abc', display_url: 'x.com/i/spaces/1yJAP…' }],
          },
        }),
      ]),
      'lumera',
    );
    expect(p.text).toBe('Live now x.com/i/spaces/1yJAP…');
  });

  it("drops the trailing t.co pointing at the post's own media", () => {
    const [p] = parseSyndicatedTimeline(
      page([
        tweet({
          full_text: 'A thing worth seeing https://t.co/pic',
          entities: { media: [{ url: 'https://t.co/pic' }] },
        }),
      ]),
      'lumera',
    );
    expect(p.text).toBe('A thing worth seeing');
  });

  it('skips a post that is nothing but a link once expanded', () => {
    const out = parseSyndicatedTimeline(
      page([
        tweet({
          id_str: 'link',
          full_text: 'https://t.co/abc',
          entities: { urls: [{ url: 'https://t.co/abc', display_url: 'x.com/i/spaces/1yJAP…' }] },
        }),
        tweet({ id_str: 'real' }),
      ]),
      'lumera',
    );
    expect(out.map((p) => p.id)).toEqual(['real']);
  });

  it('keeps a genuinely short post', () => {
    const [p] = parseSyndicatedTimeline(page([tweet({ full_text: 'GM' })]), 'lumera');
    expect(p.text).toBe('GM');
  });

  it('collapses the blank lines between paragraphs', () => {
    const [p] = parseSyndicatedTimeline(
      page([tweet({ full_text: 'First line.\n\n\nSecond line.\n \nThird.' })]),
      'lumera',
    );
    expect(p.text).toBe('First line.\nSecond line.\nThird.');
  });

  it('decodes HTML entities', () => {
    const [p] = parseSyndicatedTimeline(
      page([tweet({ full_text: 'proofs &amp; storage &lt;3' })]),
      'lumera',
    );
    expect(p.text).toBe('proofs & storage <3');
  });

  it('skips replies and retweets', () => {
    const out = parseSyndicatedTimeline(
      page([
        tweet({ id_str: 'a', in_reply_to_screen_name: 'someone' }),
        tweet({ id_str: 'b', retweeted_status: {} }),
        tweet({ id_str: 'c' }),
      ]),
      'lumera',
    );
    expect(out.map((p) => p.id)).toEqual(['c']);
  });

  it('shows the most recent posts oldest-first, so a thread reads in order', () => {
    const out = parseSyndicatedTimeline(
      page([
        tweet({ id_str: 'old', created_at: 'Thu Aug 20 18:13:01 +0000 2026' }),
        tweet({ id_str: 'new', created_at: 'Thu Sep 03 17:57:15 +0000 2026' }),
        tweet({ id_str: 'mid', created_at: 'Wed Sep 02 13:57:07 +0000 2026' }),
      ]),
      'lumera',
    );
    expect(out.map((p) => p.id)).toEqual(['old', 'mid', 'new']);
  });

  it('keeps the most recent when there are more than the limit, oldest-first', () => {
    const out = parseSyndicatedTimeline(
      page([
        tweet({ id_str: 'oldest', created_at: 'Thu Aug 20 18:13:01 +0000 2026' }),
        tweet({ id_str: 'newest', created_at: 'Fri Sep 05 10:00:00 +0000 2026' }),
        tweet({ id_str: 'middle', created_at: 'Wed Sep 03 13:57:07 +0000 2026' }),
      ]),
      'lumera',
      2,
    );
    // The two most recent (newest, middle), shown oldest-first.
    expect(out.map((p) => p.id)).toEqual(['middle', 'newest']);
  });

  it('honours the limit', () => {
    const many = Array.from({ length: 9 }, (_, i) => tweet({ id_str: String(i) }));
    expect(parseSyndicatedTimeline(page(many), 'lumera', 3)).toHaveLength(3);
  });

  it('falls back to a built permalink when none is given', () => {
    const [p] = parseSyndicatedTimeline(page([tweet({ permalink: undefined })]), 'lumera');
    expect(p.url).toBe('https://x.com/lumera/status/1');
  });

  it('returns nothing for junk rather than throwing', () => {
    expect(parseSyndicatedTimeline('<html>rate limited</html>', 'lumera')).toEqual([]);
    expect(parseSyndicatedTimeline(page([]), 'lumera')).toEqual([]);
    expect(
      parseSyndicatedTimeline(
        '<script id="__NEXT_DATA__" type="application/json">{oops</script>',
        'lumera',
      ),
    ).toEqual([]);
  });

  it('skips entries with no id or no text', () => {
    const out = parseSyndicatedTimeline(
      page([tweet({ id_str: undefined }), tweet({ id_str: 'x', full_text: '   ' }), {}]),
      'lumera',
    );
    expect(out).toEqual([]);
  });
});
