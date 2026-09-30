/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/leaderboard/route.ts

import { NextResponse, type NextRequest } from 'next/server';

import client from '@/lib/snag';
import { seasonCurrencyId, snagOrgId, snagWebsiteId } from '@/lib/snag-season';
import { snagIdentity } from '@/lib/snag-identity';
import { accountPoints, buildLeaderboard, leaderName, type LeaderEntry, type SnagAccount } from '@/utils/snag-leaderboard';

/*
 * The Sprint leaderboard for /snag: the top players by the currency the
 * season's quests pay in (EXP), and — for ?wallet= — the reader's own points
 * and place, found through the SNAG account behind their wallet.
 *
 * The top of the board is the same for everyone, so it is cached briefly; the
 * reader's own row is looked up per request (their rank is a separate, slower
 * SNAG call, and only made when they have an account).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOP = 25;
const BOARD_TTL_MS = 60 * 1000;

type Board = { currency: string; top: LeaderEntry[]; accounts: SnagAccount[] };
let cached: { at: number; board: Board } | null = null;
let inFlight: Promise<Board> | null = null;

const scope = (currencyId: string) => ({
  loyaltyCurrencyId: currencyId,
  organizationId: snagOrgId(),
  websiteId: snagWebsiteId(),
});

async function loadBoard(currencyId: string): Promise<Board> {
  const [accountsRes, currenciesRes]: any[] = await Promise.all([
    client.loyalty.accounts.list({ ...scope(currencyId), sortDir: 'desc', limit: TOP + 5 }),
    client.loyalty.currencies.list({ organizationId: snagOrgId() ?? '', websiteId: snagWebsiteId() ?? '' }),
  ]);
  const accounts: SnagAccount[] = (accountsRes?.data ?? []).filter((a: SnagAccount) => a.userId).slice(0, TOP);
  const currency = (currenciesRes?.data ?? []).find((c: any) => c.id === currencyId);
  return {
    currency: currency?.symbol?.toUpperCase() || currency?.name || 'points',
    top: buildLeaderboard(accounts),
    accounts,
  };
}

async function board(currencyId: string): Promise<Board> {
  if (cached && Date.now() - cached.at < BOARD_TTL_MS) return cached.board;
  inFlight ??= loadBoard(currencyId)
    .then((b) => {
      cached = { at: Date.now(), board: b };
      return b;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

type You = { name: string; points: number; rank: number | null; rankText: string | null } | null;

async function yourRow(wallet: string, currencyId: string): Promise<You> {
  const who = await snagIdentity(wallet);
  if (!who) return null;
  const res: any = await client.loyalty.accounts.list({ ...scope(currencyId), ...who, limit: 1 });
  const account: SnagAccount | undefined = res?.data?.[0];
  if (!account?.userId) return { name: '', points: 0, rank: null, rankText: null };

  let rank: number | null = null;
  let rankText: string | null = null;
  try {
    const r: any = await client.loyalty.accounts.retrieveRank(account.userId, {
      loyaltyCurrencyId: currencyId,
      organizationId: snagOrgId() ?? '',
      websiteId: snagWebsiteId() ?? '',
    });
    rank = typeof r?.rank === 'number' ? r.rank : null;
    rankText = r?.rankText ?? (rank ? String(rank) : null);
  } catch (error) {
    // No rank yet (e.g. no points): the row still shows the points.
    console.error('Snag rank read failed:', error);
  }
  return { name: leaderName(account), points: accountPoints(account), rank, rankText };
}

export async function GET(req: NextRequest) {
  if (!process.env.SNAG_API_KEY) return NextResponse.json({ configured: false }, { status: 503 });

  try {
    const currencyId = await seasonCurrencyId();
    if (!currencyId) return NextResponse.json({ configured: true, currency: 'points', top: [], you: null });

    const b = await board(currencyId);
    const wallet = req.nextUrl.searchParams.get('wallet')?.trim() || '';
    let you: You = null;
    if (wallet) {
      try {
        you = await yourRow(wallet, currencyId);
      } catch (error) {
        console.error('Snag score read failed:', error);
      }
    }

    // Mark the reader's row on the board when they are on it.
    const who = wallet ? await snagIdentity(wallet) : null;
    const youUserId =
      who && 'userId' in who
        ? who.userId
        : b.accounts.find((a) => who && 'walletAddress' in who && a.user?.walletAddress?.toLowerCase() === who.walletAddress.toLowerCase())?.userId;
    const top = youUserId ? buildLeaderboard(b.accounts, youUserId) : b.top;

    return NextResponse.json({ configured: true, currency: b.currency, top, you });
  } catch (error) {
    console.error('Snag leaderboard read failed:', error);
    return NextResponse.json({ configured: true, error: 'Snag could not be reached.' }, { status: 502 });
  }
}
