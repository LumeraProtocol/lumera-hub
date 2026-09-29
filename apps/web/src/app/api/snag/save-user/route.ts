/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-user/route.ts

import { NextResponse, NextRequest } from 'next/server';
import type { Repository } from 'typeorm';

import client from '@/lib/snag';
import { getDataSource } from '@/lib/data-source';
import { SNAG_ADDRESS, snagUserSchema } from '@/schemas/snagUserSchema';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

/*
 * SNAG's "Connect wallet to Lumera Hub" quest sends the reader here from their
 * SNAG profile (an EVM account) with ?walletAddress=0x…; the hub page posts that
 * address with the reader's Lumera wallet. This records the link — which is how
 * the hub's on-chain quest checks credit the right SNAG account — and completes
 * that quest on SNAG.
 *
 * GET tells that page, before anything is posted, whether the SNAG profile is
 * already linked and where the SNAG site is, so it can say so up front.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const snagSiteUrl = () => {
  const websiteId = process.env.SNAG_WEBSITE_ID;
  return (process.env.SNAG_SITE_URL || (websiteId ? `https://${websiteId}-preview.snag-render.com` : '')).replace(/\/+$/, '');
};

/** The wallet-link quest: from the synced table if present, else asked of SNAG live. */
async function walletLinkRuleId(repo: Repository<SnagLoyalty>): Promise<string | null> {
  const row = await repo
    .createQueryBuilder()
    .select('id')
    .where('metadata LIKE :metadata', { metadata: `%/wallet/connect%` })
    .andWhere("type = 'external_rule'")
    .getRawOne();
  if (row?.id) return row.id;

  // Not synced locally (a fresh deployment): find it in SNAG directly.
  let startingAfter = '';
  for (let page = 0; page < 10; page += 1) {
    const res: any = await client.get(`api/loyalty/rules?limit=50${startingAfter}`);
    const rules: any[] = res?.data ?? [];
    const hit = rules.find(
      (r) => r?.type === 'external_rule' && /\/wallet\/connect\b/.test(String(r?.metadata?.cta?.href ?? '')),
    );
    if (hit?.id) return hit.id;
    if (!res?.hasNextPage || !rules.length) break;
    startingAfter = `&startingAfter=${rules[rules.length - 1].id}`;
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!process.env.SNAG_API_KEY) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  const snagAddress = req.nextUrl.searchParams.get('snagAddress')?.trim() || '';
  if (!SNAG_ADDRESS.test(snagAddress)) {
    return NextResponse.json({ configured: true, siteUrl: snagSiteUrl(), error: 'Invalid Snag address' }, { status: 400 });
  }
  try {
    const dataSource = await getDataSource();
    const link = await dataSource.getRepository(SnagUser).findOne({ where: { snagAddress } });
    return NextResponse.json({
      configured: true,
      siteUrl: snagSiteUrl(),
      lumeraAddress: link?.lumeraAddress ?? null,
    });
  } catch (error) {
    console.error('Snag link lookup failed:', error);
    return NextResponse.json({ configured: true, siteUrl: snagSiteUrl(), error: 'Lookup failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.SNAG_API_KEY) {
    return NextResponse.json({ error: 'Snag is not configured on this deployment.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const validation = snagUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Validation failed',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);

    const user: any = await client.get(`api/users?address=${data.snagAddress}`);
    const userId: string = user?.data?.[0]?.id || '';

    // Record the link once; an existing one is left as it is.
    const existing = await snagUserRepo.findOne({ where: { snagAddress: data.snagAddress } });
    const link =
      existing ??
      (await snagUserRepo.save({
        lumeraAddress: data.lumeraAddress,
        snagAddress: data.snagAddress,
        userId,
      }));
    if (existing && !existing.userId && userId) {
      await snagUserRepo.update({ snagAddress: data.snagAddress }, { userId });
    }

    // Completing the quest is best-effort: the link above is what matters, and a
    // SNAG hiccup must not report a successful link as a failure.
    let completed = false;
    if (userId) {
      try {
        const ruleId = await walletLinkRuleId(dataSource.getRepository(SnagLoyalty));
        if (ruleId) {
          await client.post(`/api/loyalty/rules/${ruleId}/complete`, { body: { userId } });
          completed = true;
        }
      } catch (error) {
        console.error('Snag wallet-link quest completion failed:', error);
      }
    }

    return NextResponse.json({
      status: true,
      linked: true,
      lumeraAddress: link.lumeraAddress,
      completed,
      // No SNAG account behind that address yet: it only exists once the reader
      // has signed in on the SNAG site with that wallet.
      snagAccountFound: Boolean(userId),
    });
  } catch (error) {
    console.error('error', error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}
