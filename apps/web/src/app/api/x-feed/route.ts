import { NextResponse } from 'next/server';
import { parseSyndicatedTimeline } from '@/utils/x-syndication';

/**
 * Recent posts from the protocol's X account.
 *
 * Free, and without a developer app: this reads the same syndication endpoint
 * X's own embed widget calls, which serves the timeline as JSON inside a
 * server-rendered page. The paid API bills per post returned, and the embed
 * itself no longer renders for logged-out visitors, so this is what is left.
 *
 * It runs server-side because the endpoint sets no CORS headers and expects a
 * browser's User-Agent, and because one cached fetch should serve everyone.
 * The endpoint answers 429 when called too often from one address, so results
 * go through Next's Data Cache — shared across instances on Vercel, unlike a
 * module variable — and the last good response is kept to cover a throttle.
 */

const HANDLE = process.env.NEXT_PUBLIC_X_HANDLE || 'lumera';
const LIMIT = 5;
const REVALIDATE_S = 900;

/** Sent because the endpoint returns an error page to non-browser agents. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Survives a 429; never used to decide when to refetch. */
let lastGood: ReturnType<typeof parseSyndicatedTimeline> | null = null;

export async function GET() {
  try {
    const res = await fetch(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${HANDLE}`,
      {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
        next: { revalidate: REVALIDATE_S, tags: ['x-feed'] },
      },
    );

    if (!res.ok) {
      if (lastGood?.length) {
        return NextResponse.json({ posts: lastGood, handle: HANDLE, stale: true });
      }
      return NextResponse.json({ error: `upstream_${res.status}` }, { status: 502 });
    }

    const posts = parseSyndicatedTimeline(await res.text(), HANDLE, LIMIT);
    // An empty parse means the page shape moved. Serving [] would read as
    // "this account has posted nothing", which is a different claim.
    if (!posts.length) {
      if (lastGood?.length) {
        return NextResponse.json({ posts: lastGood, handle: HANDLE, stale: true });
      }
      return NextResponse.json({ error: 'no_posts', handle: HANDLE }, { status: 502 });
    }

    lastGood = posts;
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
