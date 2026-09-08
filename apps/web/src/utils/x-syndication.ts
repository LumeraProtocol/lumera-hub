/*
 * Reads a public X timeline without a key.
 *
 * X's paid API bills per post returned, and its embed widget no longer renders
 * for logged-out visitors — it builds an iframe that stays zero-height. What
 * still works is the endpoint the widget itself calls: syndication.twitter.com
 * serves a server-rendered page whose __NEXT_DATA__ carries the timeline as
 * JSON, unauthenticated. That is the source here.
 *
 * It is an undocumented endpoint, so it is treated as one: every field is
 * optional, anything malformed is skipped rather than thrown, and the caller
 * is expected to cache hard and keep the last good response. It answers 429
 * when hit too often from one address.
 */

export type XPost = {
  id: string;
  text: string;
  createdAt: string;
  replies: number;
  reposts: number;
  likes: number;
  url: string;
};

type Entity = { url?: string; display_url?: string; expanded_url?: string };
type RawTweet = {
  id_str?: string;
  full_text?: string;
  created_at?: string;
  reply_count?: number;
  retweet_count?: number;
  favorite_count?: number;
  permalink?: string;
  in_reply_to_screen_name?: string | null;
  retweeted_status?: unknown;
  entities?: { urls?: Entity[]; media?: Entity[] };
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decode = (s: string): string =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * X ships every link as a t.co shortener. Swap each one for the human-readable
 * form it carries, and drop the trailing t.co that merely points at the post's
 * own attached photo — it renders as noise on a text-only card.
 */
const readable = (tweet: RawTweet): string => {
  let text = tweet.full_text ?? '';

  for (const u of tweet.entities?.urls ?? []) {
    if (u.url && u.display_url) text = text.split(u.url).join(u.display_url);
  }
  for (const m of tweet.entities?.media ?? []) {
    if (m.url) text = text.split(m.url).join('');
  }

  return decode(text).replace(/[ \t]+\n/g, '\n').trim();
};

/** Extracts the timeline JSON the syndication page embeds. */
const nextData = (html: string): unknown => {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
};

export function parseSyndicatedTimeline(html: string, handle: string, limit = 5): XPost[] {
  const data = nextData(html) as
    | { props?: { pageProps?: { timeline?: { entries?: { content?: { tweet?: RawTweet } }[] } } } }
    | null;
  const entries = data?.props?.pageProps?.timeline?.entries;
  if (!Array.isArray(entries)) return [];

  const posts: XPost[] = [];

  for (const entry of entries) {
    const tweet = entry?.content?.tweet;
    if (!tweet?.id_str) continue;
    // The card shows what the account said, not what it answered or relayed.
    if (tweet.in_reply_to_screen_name) continue;
    if (tweet.retweeted_status) continue;

    const text = readable(tweet);
    if (!text) continue;

    const parsed = Date.parse(tweet.created_at ?? '');
    posts.push({
      id: tweet.id_str,
      text,
      createdAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : '',
      replies: num(tweet.reply_count),
      reposts: num(tweet.retweet_count),
      likes: num(tweet.favorite_count),
      url: tweet.permalink
        ? `https://x.com${tweet.permalink}`
        : `https://x.com/${handle}/status/${tweet.id_str}`,
    });
  }

  // The feed does not arrive in order, so impose one.
  posts.sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));
  return posts.slice(0, limit);
}
