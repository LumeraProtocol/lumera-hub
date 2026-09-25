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

export type XAuthor = {
  name: string;
  handle: string;
  /** Full-size avatar; the feed ships a 48px one. */
  avatar?: string;
  verified: boolean;
};

export type XPost = {
  id: string;
  author?: XAuthor;
  text: string;
  createdAt: string;
  replies: number;
  reposts: number;
  likes: number;
  url: string;
};

type Entity = { url?: string; display_url?: string; expanded_url?: string };
type RawUser = {
  name?: string;
  screen_name?: string;
  profile_image_url_https?: string;
  verified?: boolean;
  is_blue_verified?: boolean;
};
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
  user?: RawUser;
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

  /*
   * Posts are written with blank lines between paragraphs. The card clamps to
   * a few lines, and a blank line costs one of them while saying nothing, so
   * runs of newlines collapse to a single break — the structure survives, the
   * clamp is spent on words.
   */
  return decode(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

/*
 * Some posts are nothing but a link — a Space, a quoted article — and once the
 * t.co is made readable, all that is left to render is a bare truncated URL.
 * It is a real post, but it reads as noise on a card sized for prose, so it is
 * skipped rather than shown as one. A genuinely short post ("GM") still counts.
 */
const isBareLink = (text: string): boolean =>
  !/\s/.test(text) && /[a-z0-9-]+\.[a-z]{2,}/i.test(text);

/*
 * The feed hands out a 48px avatar via the `_normal` suffix, which is soft on
 * a retina display. The same file is served at 400px under `_400x400`.
 */
export const fullSizeAvatar = (url?: string): string | undefined =>
  url?.replace(/_normal(\.[a-z]+)$/i, '_400x400$1');

const authorOf = (user: RawUser | undefined, handle: string): XAuthor | undefined =>
  user?.screen_name
    ? {
        name: user.name || user.screen_name,
        handle: user.screen_name,
        ...(fullSizeAvatar(user.profile_image_url_https)
          ? { avatar: fullSizeAvatar(user.profile_image_url_https) }
          : {}),
        // X reports legacy and paid verification separately; the badge is the
        // same mark either way.
        verified: Boolean(user.verified || user.is_blue_verified),
      }
    : handle
      ? { name: handle, handle, verified: false }
      : undefined;

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
    if (!text || isBareLink(text)) continue;

    const parsed = Date.parse(tweet.created_at ?? '');
    const author = authorOf(tweet.user, handle);
    posts.push({
      id: tweet.id_str,
      ...(author ? { author } : {}),
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

  // Newest-first: the most recent post leads the card, so a timely post (a
  // live event, an announcement) sits at the top rather than being buried
  // below older ones.
  posts.sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));
  return posts.slice(0, limit);
}
