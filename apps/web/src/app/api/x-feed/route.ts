import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { fullSizeAvatar, parseSyndicatedTimeline, type XPost } from '@/utils/x-syndication';

/**
 * Recent posts from the protocol's X account.
 *
 * Two sources, in order of how much they can be trusted to answer:
 *
 *   1. The X API, when a bearer is configured. It needs an app attached to a
 *      Project and a tier that can read timelines, and it returns exactly what
 *      is asked for.
 *   2. syndication.twitter.com, the endpoint X's own embed widget calls. Free
 *      and unauthenticated, but throttled per address hard enough that a
 *      shared host can sit on 429 for long stretches — which is why it is the
 *      fallback rather than the source.
 *
 * Reads are billed per post on the API, so the two dials that set the bill are
 * here: LIMIT posts every REVALIDATE_S. At three posts every half hour that is
 * roughly $20 a month; widening the interval is the cheapest lever if that
 * matters more than freshness.
 *
 * Both paths share the same cache, the same refetch floor and the same
 * last-good fallback, so a bad minute on either shows the previous posts
 * rather than an empty card.
 */

const HANDLE = process.env.NEXT_PUBLIC_X_HANDLE || 'lumera';
/** The card shows the three most recent posts. */
const LIMIT = 3;
const REVALIDATE_S = 1800;
const FAILURE_BACKOFF_MS = 60_000;

/** Sent because syndication returns an error page to non-browser agents. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FIXTURE = process.env.NODE_ENV === 'production' ? undefined : process.env.X_FEED_FIXTURE;

let lastGood: XPost[] | null = null;
let lastAttemptAt = 0;
let attemptFailed = false;
let userIdCache: string | null = null;
let avatarCache: string | undefined;
let mintedBearer: string | null = null;

const holdOff = (): boolean => {
  const since = Date.now() - lastAttemptAt;
  return lastGood?.length
    ? since < REVALIDATE_S * 1000
    : attemptFailed && since < FAILURE_BACKOFF_MS;
};

/**
 * An app-only bearer, given directly or minted from the app's key and secret.
 *
 * A bearer copied from the developer portal is URL-encoded, so it is decoded
 * before use — sending it raw is a 401 that looks like a bad credential.
 */
const getBearer = async (): Promise<string | null> => {
  const direct = process.env.X_BEARER_TOKEN;
  if (direct) return decodeURIComponent(direct);

  const key = process.env.X_API_KEY;
  const secret = process.env.X_API_KEY_SECRET;
  if (!key || !secret) return null;
  if (mintedBearer) return mintedBearer;

  const basic = Buffer.from(
    `${encodeURIComponent(key)}:${encodeURIComponent(secret)}`,
  ).toString('base64');
  const res = await fetch('https://api.x.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  mintedBearer = (await res.json())?.access_token ?? null;
  return mintedBearer;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });

/**
 * Billed as a user read, and neither the id nor the picture changes often, so
 * both are held for a day. The picture rides on the same call; without it the
 * card fell back to a monogram whenever the API was the source.
 */
const resolveUserId = async (token: string): Promise<string | null> => {
  if (userIdCache) return userIdCache;
  const res = await fetch(
    `https://api.x.com/2/users/by/username/${HANDLE}?user.fields=profile_image_url`,
    {
      headers: auth(token),
      next: { revalidate: 86400, tags: ['x-feed-user'] },
    },
  );
  if (!res.ok) return null;
  const user = (await res.json())?.data;
  userIdCache = user?.id ?? null;
  avatarCache = fullSizeAvatar(user?.profile_image_url);
  return userIdCache;
};

type ApiTweet = {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: Record<string, number>;
};

const fromApi = async (): Promise<XPost[] | null> => {
  const token = await getBearer().catch(() => null);
  if (!token) return null;

  const userId = await resolveUserId(token);
  if (!userId) return null;

  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  url.searchParams.set('max_results', '5');
  url.searchParams.set('tweet.fields', 'created_at,public_metrics');
  url.searchParams.set('exclude', 'replies,retweets');

  const res = await fetch(url, {
    headers: auth(token),
    next: { revalidate: REVALIDATE_S, tags: ['x-feed'] },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const author = {
    name: 'Lumera Protocol',
    handle: HANDLE,
    ...(avatarCache ? { avatar: avatarCache } : {}),
    verified: true,
  };

  return (json?.data ?? [])
    .map((t: ApiTweet) => ({
      id: t.id,
      author,
      text: (t.text ?? '').replace(/\s*https:\/\/t\.co\/\w+\s*$/, '').trim(),
      createdAt: t.created_at ?? '',
      replies: t.public_metrics?.reply_count ?? 0,
      reposts: t.public_metrics?.retweet_count ?? 0,
      likes: t.public_metrics?.like_count ?? 0,
      url: `https://x.com/${HANDLE}/status/${t.id}`,
    }))
    .filter((p: XPost) => p.text)
    // The API returns newest-first; take the most recent LIMIT, then show them
    // oldest-first so a thread reads in order (matches the syndication path).
    .slice(0, LIMIT)
    .reverse();
};

const fromSyndication = async (): Promise<XPost[] | null> => {
  const res = await fetch(
    `https://syndication.twitter.com/srv/timeline-profile/screen-name/${HANDLE}`,
    {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      next: { revalidate: REVALIDATE_S, tags: ['x-feed-syndication'] },
    },
  );
  if (!res.ok) return null;
  const posts = parseSyndicatedTimeline(await res.text(), HANDLE, LIMIT);
  return posts.length ? posts : null;
};

export async function GET() {
  if (FIXTURE) {
    try {
      const posts = parseSyndicatedTimeline(await readFile(FIXTURE, 'utf8'), HANDLE, LIMIT);
      return NextResponse.json({ posts, handle: HANDLE, fixture: true });
    } catch (error) {
      return NextResponse.json(
        { error: `fixture_unreadable: ${error instanceof Error ? error.message : 'unknown'}` },
        { status: 500 },
      );
    }
  }

  if (holdOff()) {
    if (lastGood?.length) {
      return NextResponse.json({ posts: lastGood, handle: HANDLE, cached: true });
    }
    return NextResponse.json({ error: 'backing_off', handle: HANDLE }, { status: 503 });
  }

  lastAttemptAt = Date.now();
  attemptFailed = true;

  try {
    // The API first; syndication only if it is unconfigured or unavailable.
    const posts = (await fromApi().catch(() => null)) ?? (await fromSyndication().catch(() => null));

    if (!posts?.length) {
      if (lastGood?.length) {
        return NextResponse.json({ posts: lastGood, handle: HANDLE, stale: true });
      }
      return NextResponse.json({ error: 'no_posts', handle: HANDLE }, { status: 502 });
    }

    lastGood = posts;
    attemptFailed = false;
    return NextResponse.json({ posts, handle: HANDLE });
  } catch (error) {
    if (lastGood?.length) {
      return NextResponse.json({ posts: lastGood, handle: HANDLE, stale: true });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown' },
      { status: 502 },
    );
  }
}
