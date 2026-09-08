import { NextResponse } from 'next/server';
import { parseMediumFeed } from '@/utils/rss';

/**
 * Lumera's published announcements.
 *
 * The dashboard's update card wants real protocol news. X can no longer supply
 * it for free — reads are billed per post, and the unauthenticated syndication
 * endpoint answers 429 — so the posts come from the Medium feed the team
 * already publishes to. It needs no key, has no quota, and returns structured
 * items, which means the hub can render them in its own type and colour rather
 * than embedding someone else's iframe.
 *
 * Fetched server-side so an ad blocker cannot intercept it, and held in the
 * shared Data Cache for half an hour: the feed changes a few times a month, so
 * there is nothing to gain from asking more often.
 */

const FEED = process.env.UPDATES_FEED_URL || 'https://medium.com/feed/@lumeraprotocol';
const REVALIDATE_S = 1800;
const LIMIT = 5;

export async function GET() {
  try {
    const res = await fetch(FEED, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: REVALIDATE_S, tags: ['updates'] },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `upstream_${res.status}` }, { status: 502 });
    }

    const updates = parseMediumFeed(await res.text(), LIMIT);
    // An empty parse means the feed moved or changed shape. Say so rather than
    // returning [] , which the card would read as "nothing published yet".
    if (!updates.length) {
      return NextResponse.json({ error: 'no_items' }, { status: 502 });
    }

    return NextResponse.json({ updates, source: 'medium' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'unknown' },
      { status: 502 },
    );
  }
}
