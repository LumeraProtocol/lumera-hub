/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/sprint/route.ts

import { NextResponse, type NextRequest } from 'next/server';

import client from '@/lib/snag';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { buildSprint, type SnagRule, type SnagRuleGroup, type SprintGroup } from '@/utils/snag-sprint';

/*
 * The live SNAG season for /snag, read straight from SNAG rather than from the
 * locally synced tables, so the page always matches what is configured there.
 *
 * The season (rules + sections) changes rarely and is shared by every reader,
 * so it is cached in memory for a few minutes and fetched once however many
 * requests arrive at the same moment. A reader's own progress is looked up per
 * request: a MetaMask (0x) wallet is a SNAG account directly, while a Keplr
 * (lumera1) wallet is found through the link /api/snag/save-user recorded when
 * the reader connected it from their SNAG profile.
 *
 * The API key never leaves the server.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEASON_TTL_MS = 5 * 60 * 1000;
const MAX_RULE_PAGES = 20;

let cached: { at: number; groups: SprintGroup[] } | null = null;
let inFlight: Promise<SprintGroup[]> | null = null;

const orgId = () => process.env.SNAG_ORGANIZATION_ID || undefined;
const websiteId = () => process.env.SNAG_WEBSITE_ID || undefined;

/** Where SNAG-native quests are completed: the configured site, else the website's hosted page. */
const snagSiteUrl = () =>
  (process.env.SNAG_SITE_URL || (websiteId() ? `https://${websiteId()}-preview.snag-render.com` : '')).replace(/\/+$/, '');

async function loadSeason(): Promise<SprintGroup[]> {
  const rules: SnagRule[] = [];
  let startingAfter = '';
  for (let page = 0; page < MAX_RULE_PAGES; page += 1) {
    const res: any = await client.get(`api/loyalty/rules?limit=50${startingAfter}`);
    const data: SnagRule[] = res?.data ?? [];
    rules.push(...data);
    if (!res?.hasNextPage || !data.length) break;
    startingAfter = `&startingAfter=${data[data.length - 1].id}`;
  }
  const groupsRes: any = await client.loyalty.ruleGroups.getRuleGroups();
  return buildSprint(rules, (groupsRes?.data ?? []) as SnagRuleGroup[]);
}

async function season(): Promise<SprintGroup[]> {
  if (cached && Date.now() - cached.at < SEASON_TTL_MS) return cached.groups;
  inFlight ??= loadSeason()
    .then((groups) => {
      cached = { at: Date.now(), groups };
      return groups;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

type Progress = { linked: boolean; completed: string[]; pending: string[] };

async function progressFor(wallet: string): Promise<Progress> {
  let who: { walletAddress?: string; userId?: string } | null = null;

  if (/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    who = { walletAddress: wallet };
  } else if (/^lumera1[0-9a-z]{38,}$/.test(wallet)) {
    const dataSource = await getDataSource();
    const link = await dataSource.getRepository(SnagUser).findOne({ where: { lumeraAddress: wallet } });
    if (link?.userId) who = { userId: link.userId };
    else if (link?.snagAddress) who = { walletAddress: link.snagAddress };
  }
  if (!who) return { linked: false, completed: [], pending: [] };

  const res: any = await client.loyalty.rules.getStatus({
    ...who,
    organizationId: orgId(),
    websiteId: websiteId(),
    limit: 1000,
  });
  const completed = new Set<string>();
  const pending = new Set<string>();
  for (const s of res?.data ?? []) {
    if (!s?.loyaltyRuleId) continue;
    if (s.status === 'completed' || s.fulfilledAt) completed.add(s.loyaltyRuleId);
    else if (s.status === 'pending' || s.status === 'processing') pending.add(s.loyaltyRuleId);
  }
  for (const id of completed) pending.delete(id);
  return { linked: true, completed: [...completed], pending: [...pending] };
}

export async function GET(req: NextRequest) {
  if (!process.env.SNAG_API_KEY) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  let groups: SprintGroup[];
  try {
    groups = await season();
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
