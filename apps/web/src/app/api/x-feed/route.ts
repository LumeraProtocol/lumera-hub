import { NextResponse } from 'next/server';

/**
 * Recent posts from the protocol's X account.
 *
 * Runs server-side for two reasons: the bearer token must not reach the
 * browser, and a server fetch is not subject to the ad blockers that stop the
 * embed widget for a good share of visitors.
 *
 * Requires `X_BEARER_TOKEN`. X's free tier cannot read timelines — only Basic
 * and above — so without a token this returns 501 and the client falls back to
 * the embed widget. It never invents posts.
 *
 * X rate limits timeline reads hard, so a successful response is held for ten
 * minutes and served to everyone in that window.
 */

const HANDLE = process.env.NEXT_PUBLIC_X_HANDLE || 'LumeraProtocol';
const CACHE_MS = 10 * 60 * 1000;

export type XPost = {
  id: string;
  text: string;
  createdAt: string;
  replies: number;
  reposts: number;
  likes: number;
  url: string;
};

type Cached = { at: number; posts: XPost[] };
let cache: Cached | null = null;
let userIdCache: string | null = null;

const auth = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });

const resolveUserId = async (token: string): Promise<string | null> => {
  if (userIdCache) return userIdCache;
  const res = await fetch(`https://api.x.com/2/users/by/username/${HANDLE}`, {
    headers: auth(token),
    // The account id never changes; let the platform hold it for a day.
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  userIdCache = json?.data?.id ?? null;
  return userIdCache;
};

export async function GET() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'not_configured', handle: HANDLE },
      { status: 501 },
    );
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ posts: cache.posts, handle: HANDLE, cached: true });
  }

  try {
    const userId = await resolveUserId(token);
    if (!userId) {
      return NextResponse.json({ error: 'user_not_found', handle: HANDLE }, { status: 502 });
    }

    const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);
    url.searchParams.set('max_results', '10');
    url.searchParams.set('tweet.fields', 'created_at,public_metrics');
    url.searchParams.set('exclude', 'replies,retweets');

    const res = await fetch(url, { headers: auth(token) });
    if (!res.ok) {
      // 429 is the common one. Serve a stale cache rather than an empty card.
      if (cache) {
        return NextResponse.json({ posts: cache.posts, handle: HANDLE, stale: true });
      }
      return NextResponse.json({ error: `upstream_${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const posts: XPost[] = (json?.data ?? []).map(
      (t: {
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: Record<string, number>;
      }) => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at ?? '',
        replies: t.public_metrics?.reply_count ?? 0,
        reposts: t.public_metrics?.retweet_count ?? 0,
        likes: t.public_metrics?.like_count ?? 0,
        url: `https://x.com/${HANDLE}/status/${t.id}`,
      }),
    );

    cache = { at: Date.now(), posts };
    return NextResponse.json({ posts, handle: HANDLE });
  } catch (error) {
    if (cache) {
      return NextResponse.json({ posts: cache.posts, handle: HANDLE, stale: true });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown' },
      { status: 502 },
    );
  }
}
