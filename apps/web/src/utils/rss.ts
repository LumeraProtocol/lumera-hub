/*
 * A small reader for the Medium feed that carries Lumera's announcements.
 *
 * Medium publishes plain RSS with no key and no rate limit, which is why the
 * hub reads updates from here: X now charges per post read, and its free
 * syndication endpoint answers 429 to everyone. The shape below is fixed by
 * Medium, so matching it directly is more honest than pulling in an XML parser
 * for one known feed.
 */

export type Update = {
  id: string;
  title: string;
  url: string;
  /** ISO 8601, or '' when the feed omits a usable date. */
  publishedAt: string;
  excerpt: string;
  image?: string;
  author?: string;
};

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

const decode = (s: string): string =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    // Ampersand last, so "&amp;lt;" does not become "<".
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);

const cdata = (s: string): string => s.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');

/** Innermost text of the first `<tag>` in `xml`, unwrapped and decoded. */
const tag = (xml: string, name: string): string => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(cdata(m[1])).trim() : '';
};

/** Medium appends an `?source=rss-…` tracking parameter to every link. */
const clean = (url: string): string => url.split('?')[0];

/**
 * Medium leads most posts with a hero figure. Take the first paragraph that
 * survives tag-stripping, so the excerpt is prose rather than a caption.
 */
const excerptOf = (contentHtml: string, fallback: string): string => {
  const paragraphs = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/g) ?? [];
  for (const p of paragraphs) {
    const text = decode(p.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (text.length > 40) return text;
  }
  return fallback;
};

export function parseMediumFeed(xml: string, limit = 5): Update[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: Update[] = [];

  for (const item of items) {
    const title = tag(item, 'title');
    const link = clean(tag(item, 'link'));
    if (!title || !link) continue;

    const guid = tag(item, 'guid');
    const content = tag(item, 'content:encoded');
    const when = tag(item, 'atom:updated') || tag(item, 'pubDate');
    const parsed = Date.parse(when);
    const image = /<img[^>]+src="([^"]+)"/.exec(content)?.[1];

    out.push({
      id: guid.split('/').pop() || link,
      title,
      url: link,
      publishedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : '',
      excerpt: excerptOf(content, title),
      ...(image ? { image } : {}),
      ...(tag(item, 'dc:creator') ? { author: tag(item, 'dc:creator') } : {}),
    });
    if (out.length >= limit) break;
  }

  return out;
}
