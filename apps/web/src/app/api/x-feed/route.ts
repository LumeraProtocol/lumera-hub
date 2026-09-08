import { NextResponse } from 'next/server';

/**
 * Recent posts from the protocol's X account.
 *
 * Runs server-side for two reasons: the bearer token must not reach the
 * browser, and a server fetch is not subject to the ad blockers that stop the
 * embed widget for a good share of visitors.
 *
 * Credentials, in order of preference: `X_BEARER_TOKEN`, or `X_API_KEY` plus
 * `X_API_KEY_SECRET`, from which an app-only bearer is minted here and held
 * for the process. Either way the secret stays server-side.
 *
 * Two things have to be true on X's side before this returns posts. The app
 * must be attached to a Project — otherwise v2 answers 403 `client-not-enrolled`
 * however valid the credentials are — and the access tier must be one that can
 * read timelines, which the free tier cannot. Anything short of that returns a
 * status the client treats as "no posts", and the card falls back rather than
 * inventing any.
 *
 * X rate limits timeline reads hard, so a successful response is held for ten
 * minutes and served to everyone in that window.
 */

const HANDLE = process.env.NEXT_PUBLIC_X_HANDLE || 'lumera';
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
let mintedBearer: string | null = null;

const auth = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });

/**
 * An app-only bearer, either given directly or minted from the app's key and
 * secret. Minted tokens do not expire, so one per process is enough.
 */
const getBearer = async (): Promise<string | null> => {
  const direct = process.env.X_BEARER_TOKEN;
  if (direct) return direct;

  const key = process.env.X_API_KEY;
  const secret = process.env.X_API_KEY_SECRET;
  if (!key || !secret) return null;
  if (mintedBearer) return mintedBearer;

  // OAuth2 client credentials. Both halves are percent-encoded before being
  // joined, per X's documented scheme.
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
  });
  if (!res.ok) return null;
  const json = await res.json();
  mintedBearer = json?.access_token ?? null;
  return mintedBearer;
};

let lastLookupError: string | undefined;

const resolveUserId = async (token: string): Promise<string | null> => {
  if (userIdCache) return userIdCache;
  const res = await fetch(`https://api.x.com/2/users/by/username/${HANDLE}`, {
    headers: auth(token),
    // The account id never changes; let the platform hold it for a day.
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    lastLookupError = body?.reason || body?.detail || `http_${res.status}`;
    return null;
  }
  const json = await res.json();
  userIdCache = json?.data?.id ?? null;
  return userIdCache;
};

export async function GET() {
  const token = await getBearer().catch(() => null);
  if (!token) {
    return NextResponse.json({ error: 'not_configured', handle: HANDLE }, { status: 501 });
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ posts: cache.posts, handle: HANDLE, cached: true });
  }

  try {
    const userId = await resolveUserId(token);
    if (!userId) {
      // The usual cause is the app not being attached to a Project, or an
      // access tier that cannot read timelines. Both are portal settings, so
      // say which rather than reporting a generic failure.
      return NextResponse.json(
        { error: 'not_entitled', handle: HANDLE, detail: lastLookupError },
        { status: 502 },
      );
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
