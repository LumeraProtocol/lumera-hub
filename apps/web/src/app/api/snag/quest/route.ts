/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/quest/route.ts

import { NextResponse, type NextRequest } from 'next/server';

import client from '@/lib/snag';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { findQuest, snagOrgId, snagSiteUrl, snagWebsiteId } from '@/lib/snag-season';
import { snagIdentity } from '@/lib/snag-identity';
import { freshProofMessage, verifyCosmosSignature, verifyEvmSignature } from '@/lib/wallet-proof';
import { LUMERA_ADDRESS, SNAG_ADDRESS } from '@/schemas/snagUserSchema';
import { SNAG_VERIFIED_TYPES, questFlow } from '@/utils/snag-sprint';

/*
 * The steps of a quest done natively on /snag, for the reader's hub wallet:
 *
 *   connect  a SNAG sign-in link for X / Discord; SNAG returns the reader to
 *            /snag/connected afterwards.
 *   verify   asks SNAG to check a quest it verifies itself (a connection, a
 *            follow) and credit it. Hub-verified quests never go through here.
 *   link     "Connect wallet to Lumera Hub": the reader signs a message with
 *            their wallet, this checks the signature, connects the wallet to
 *            SNAG and completes the quest.
 *
 * Completion is asynchronous on SNAG's side; the page re-reads progress from
 * /api/snag/sprint until the quest shows as done.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  action?: string;
  questId?: string;
  wallet?: string;
  message?: string;
  signature?: string;
  pubkey?: string;
  /** The sign-in runs in a popup, which the return page should close. */
  popup?: boolean;
};

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** This site's public origin, for SNAG to send the reader back to. */
function publicOrigin(req: NextRequest): string {
  const locked = process.env.NEXT_PUBLIC_SITE_URL;
  if (locked) return new URL(locked).origin;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

/** The SNAG user id for a verified wallet, connecting the wallet to SNAG if it is new there. */
async function connectWallet(wallet: string): Promise<string> {
  const who = await snagIdentity(wallet);
  if (who && 'userId' in who) return who.userId;

  try {
    const user: any = await client.users.connect({
      organizationId: snagOrgId() ?? '',
      websiteId: snagWebsiteId() ?? '',
      walletAddress: wallet,
      walletType: SNAG_ADDRESS.test(wallet) ? 'evm' : 'cosmos',
      // The signature was checked above, before this is called.
      verificationData: { verifiedLocally: true },
    });
    if (user?.id) return user.id;
  } catch (error) {
    // Already connected: fall through to looking the account up.
    console.error('Snag wallet connect failed:', error);
  }
  const found: any = await client.get(`api/users?address=${encodeURIComponent(wallet)}`);
  const id = found?.data?.[0]?.id;
  if (!id) throw new Error('Snag did not accept this wallet.');
  return id;
}

export async function POST(req: NextRequest) {
  if (!process.env.SNAG_API_KEY) return fail(503, 'Snag is not configured on this deployment.');

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Invalid request.');
  }
  const wallet = body.wallet?.trim() || '';
  const questId = body.questId?.trim() || '';
  if (!SNAG_ADDRESS.test(wallet) && !LUMERA_ADDRESS.test(wallet)) return fail(400, 'Connect a wallet first.');
  if (!/^[0-9a-f-]{36}$/i.test(questId)) return fail(400, 'Unknown quest.');

  try {
    const quest = await findQuest(questId);
    if (!quest) return fail(404, 'This quest is not running.');
    const flow = questFlow(quest, snagSiteUrl());

    if (body.action === 'connect') {
      if (flow.kind !== 'connect') return fail(400, 'This quest has no sign-in step.');
      const who = await snagIdentity(wallet);
      const res: any = await client.auth.connectAuth(flow.provider, {
        ...(who ?? {}),
        websiteId: snagWebsiteId(),
        redirect: `${publicOrigin(req)}/snag/connected?quest=${questId}${body.popup ? '&popup=1' : ''}`,
        responseType: 'json',
      });
      if (!res?.url) return fail(502, 'Snag did not return a sign-in link.');
      return NextResponse.json({ url: res.url });
    }

    if (body.action === 'verify') {
      if (!SNAG_VERIFIED_TYPES.has(quest.type)) return fail(400, 'This quest is not verified by Snag.');
      const who = await snagIdentity(wallet);
      const res: any = await client.loyalty.rules.complete(questId, { ...(who ?? {}) });
      return NextResponse.json({ queued: true, message: res?.message });
    }

    if (body.action === 'link') {
      if (flow.kind !== 'wallet-link') return fail(400, 'This quest does not link a wallet.');
      const message = body.message || '';
      const signature = body.signature || '';
      const proven =
        freshProofMessage(message, wallet) &&
        (SNAG_ADDRESS.test(wallet)
          ? verifyEvmSignature(wallet, message, signature)
          : verifyCosmosSignature(wallet, message, body.pubkey || '', signature));
      if (!proven) return fail(401, 'The signature does not match this wallet. Sign again.');

      const userId = await connectWallet(wallet);
      // Remember a Keplr wallet's account where there is a database to do it.
      if (LUMERA_ADDRESS.test(wallet)) {
        try {
          const dataSource = await getDataSource();
          const repo = dataSource.getRepository(SnagUser);
          if (!(await repo.findOne({ where: { lumeraAddress: wallet } }))) {
            await repo.save({ snagAddress: wallet, lumeraAddress: wallet, userId });
          }
        } catch (error) {
          console.error('Snag link record failed:', error);
        }
      }
      await client.loyalty.rules.complete(questId, { userId });
      return NextResponse.json({ linked: true, queued: true });
    }

    return fail(400, 'Unknown action.');
  } catch (error: any) {
    console.error('Snag quest action failed:', error);
    const detail = error?.error?.message || error?.message;
    return fail(502, detail ? `Snag: ${String(detail).slice(0, 200)}` : 'Snag could not be reached just now.');
  }
}
