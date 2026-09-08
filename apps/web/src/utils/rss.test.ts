import { describe, expect, it } from 'vitest';
import { parseMediumFeed } from './rss';

/** Shaped exactly like Medium's output, including its CDATA and tracking. */
const feed = `<rss><channel>
<item>
  <title><![CDATA[Lumera Is the Intelligence Layer for AI]]></title>
  <link>https://lumeraprotocol.medium.com/lumera-is-the-intelligence-layer-6b16b517d8f3?source=rss-db114fcfc5a0------2</link>
  <guid isPermaLink="false">https://medium.com/p/6b16b517d8f3</guid>
  <dc:creator><![CDATA[Lumera Protocol]]></dc:creator>
  <pubDate>Fri, 21 Aug 2026 18:57:52 GMT</pubDate>
  <atom:updated>2026-08-21T18:57:52.063Z</atom:updated>
  <content:encoded><![CDATA[<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*4Sme.png" /></figure><p>Short.</p><p>Inference prices have fallen at a median of roughly fifty times per year since 2020 &amp; the gap keeps closing.</p>]]></content:encoded>
</item>
<item>
  <title><![CDATA[Q2 2026 Update: What&#8217;s Ahead]]></title>
  <link>https://lumeraprotocol.medium.com/q2-2026-update-abc123</link>
  <guid isPermaLink="false">https://medium.com/p/abc123</guid>
  <pubDate>Thu, 02 Jul 2026 00:59:26 GMT</pubDate>
  <content:encoded><![CDATA[<p>A paragraph that is comfortably longer than the forty character floor.</p>]]></content:encoded>
</item>
</channel></rss>`;

describe('parseMediumFeed', () => {
  it('reads each post', () => {
    expect(parseMediumFeed(feed)).toHaveLength(2);
  });

  it('unwraps CDATA and decodes entities in titles', () => {
    expect(parseMediumFeed(feed)[1].title).toBe('Q2 2026 Update: What’s Ahead');
  });

  it("drops Medium's rss tracking parameter from the link", () => {
    expect(parseMediumFeed(feed)[0].url).toBe(
      'https://lumeraprotocol.medium.com/lumera-is-the-intelligence-layer-6b16b517d8f3',
    );
  });

  it('takes the id from the guid', () => {
    expect(parseMediumFeed(feed)[0].id).toBe('6b16b517d8f3');
  });

  it('normalises the date to ISO', () => {
    expect(parseMediumFeed(feed)[1].publishedAt).toBe('2026-07-02T00:59:26.000Z');
  });

  it('skips the hero caption and short lines to reach real prose', () => {
    const { excerpt } = parseMediumFeed(feed)[0];
    expect(excerpt).toMatch(/^Inference prices have fallen/);
    expect(excerpt).toContain('2020 & the gap');
  });

  it('keeps the lead image when there is one', () => {
    expect(parseMediumFeed(feed)[0].image).toBe(
      'https://cdn-images-1.medium.com/max/1024/1*4Sme.png',
    );
    expect(parseMediumFeed(feed)[1].image).toBeUndefined();
  });

  it('honours the limit', () => {
    expect(parseMediumFeed(feed, 1)).toHaveLength(1);
  });

  it('returns nothing for junk rather than throwing', () => {
    expect(parseMediumFeed('<html>down for maintenance</html>')).toEqual([]);
    expect(parseMediumFeed('')).toEqual([]);
  });

  it('ignores an item with no title or link', () => {
    expect(parseMediumFeed('<item><pubDate>x</pubDate></item>')).toEqual([]);
  });
});
