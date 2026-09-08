import { readFile } from 'node:fs/promises';
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
 *
 * The endpoint throttles per address, and a tripped limit takes minutes to
 * clear, so upstream calls are rationed twice over. Next's Data Cache holds
 * the response across instances and regions on Vercel; in front of it a
 * per-process floor refuses to refetch sooner than the same interval no matter
 * what. The second guard is not redundant — dev bypasses the Data Cache
 * entirely, so without it every page reload would hit X directly — and neither
 * is load-bearing on its own, since the last good response is also kept and
 * served rather than surfacing an error for a temporary limit.
 */

const HANDLE = process.env.NEXT_PUBLIC_X_HANDLE || 'lumera';
const LIMIT = 5;
/*
 * Half an hour. Measured, the endpoint's budget is roughly one request per
 * window per address, and a tripped limit takes minutes to clear — so the
 * refresh rate is set by what X tolerates, not by what the card could use. An
 * announcement feed loses nothing by being thirty minutes behind.
 */
const REVALIDATE_S = 1800;

/*
 * A captured response to read instead of calling X, for local work only.
 *
 * The endpoint's budget is roughly one request per window per address, so
 * iterating on this card against the live feed throttles it within minutes and
 * then blocks for several more. Pointing this at a saved response makes the
 * card workable offline. It is ignored outside development, so a deployment
 * cannot serve anything but live data.
 */
const FIXTURE = process.env.NODE_ENV === 'production' ? undefined : process.env.X_FEED_FIXTURE;

/** Sent because the endpoint returns an error page to non-browser agents. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Survives a 429, and backs the refetch floor below. */
let lastGood: ReturnType<typeof parseSyndicatedTimeline> | null = null;
let lastFetchedAt = 0;

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

  // A floor on how often this process will call X at all.
  if (lastGood?.length && Date.now() - lastFetchedAt < REVALIDATE_S * 1000) {
    return NextResponse.json({ posts: lastGood, handle: HANDLE, cached: true });
  }

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
    lastFetchedAt = Date.now();
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
