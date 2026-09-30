/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/sprint/route.ts

import { NextResponse, type NextRequest } from 'next/server';

import client from '@/lib/snag';
import { season, snagOrgId, snagSiteUrl, snagWebsiteId } from '@/lib/snag-season';
import { snagIdentity } from '@/lib/snag-identity';
import { firstQuests, type SprintGroup } from '@/utils/snag-sprint';

/*
 * The live SNAG season for /snag, read straight from SNAG rather than from the
 * locally synced tables, so the page always matches what is configured there.
 *
 * The season (rules + sections) is cached in @/lib/snag-season. A reader's own
 * progress is looked up per request, for the SNAG account behind their wallet
 * (see @/lib/snag-identity).
 *
 * SNAG_QUEST_LIMIT, when set, shows only the first N quests in SNAG's order
 * (e.g. to trial the board on a test deployment).
 *
 * The API key never leaves the server.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Progress = {
  linked: boolean;
  completed: string[];
  pending: string[];
  /** Quests SNAG checked and turned down, with its reason when it gave one. */
  failed: Record<string, string>;
};

async function progressFor(wallet: string): Promise<Progress> {
  const who = await snagIdentity(wallet);
  if (!who) return { linked: false, completed: [], pending: [], failed: {} };

  const res: any = await client.loyalty.rules.getStatus({
    ...who,
    organizationId: snagOrgId(),
    websiteId: snagWebsiteId(),
    limit: 1000,
  });
  const completed = new Set<string>();
  const pending = new Set<string>();
  const failed: Record<string, string> = {};
  // Newest first, so a quest's latest attempt decides its state.
  const rows = [...(res?.data ?? [])].sort((a: any, b: any) => Date.parse(b?.updatedAt ?? 0) - Date.parse(a?.updatedAt ?? 0));
  const seen = new Set<string>();
  for (const s of rows) {
    const id = s?.loyaltyRuleId;
    if (!id) continue;
    if (s.status === 'completed' || s.fulfilledAt) completed.add(id);
    if (seen.has(id)) continue;
    seen.add(id);
    if (s.status === 'pending' || s.status === 'processing') pending.add(id);
    else if (s.status === 'failed') failed[id] = s.message || '';
  }
  for (const id of completed) {
    pending.delete(id);
    delete failed[id];
  }
  return { linked: true, completed: [...completed], pending: [...pending], failed };
}

export async function GET(req: NextRequest) {
  if (!process.env.SNAG_API_KEY) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  let groups: SprintGroup[];
  try {
    groups = firstQuests(await season(), Number(process.env.SNAG_QUEST_LIMIT));
  } catch (error) {
    console.error('Snag season read failed:', error);
    return NextResponse.json({ configured: true, error: 'Snag could not be reached.' }, { status: 502 });
  }

  // Progress is best-effort: the season still renders if the lookup fails.
  const wallet = req.nextUrl.searchParams.get('wallet')?.trim() || '';
  let progress: Progress | undefined;
  if (wallet) {
    try {
      progress = await progressFor(wallet);
    } catch (error) {
      console.error('Snag progress read failed:', error);
    }
  }

  return NextResponse.json({ configured: true, siteUrl: snagSiteUrl(), groups, progress });
}
