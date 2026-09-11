// apps/web/src/app/api/faucet/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';

import { CHAIN_ID, DENOM, IS_MAINNET, RPC_ENDPOINTS } from '@/contants/network';
import { getClientIP } from '@/lib/rate-limit';

/*
 * The hub's own testnet faucet.
 *
 * The form on /faucet posts an address here; this signs a bank send of a fixed
 * amount from a funded account and broadcasts it. That account is a server
 * secret (FAUCET_MNEMONIC) — never a NEXT_PUBLIC value — so the key never
 * reaches the browser and the send happens entirely server-side.
 *
 * Two things make it safe to expose: the faucet only exists on a testnet build
 * (mainnet refuses outright, since free mainnet LUME would be a scam-shaped
 * hole), and one address may draw once per COOLDOWN. The limit is best-effort,
 * in memory: it resets when the function cold-starts, which for a testnet
 * faucet is an acceptable ceiling rather than a guarantee.
 */

// Node APIs (the signer needs crypto); never the edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MNEMONIC = process.env.FAUCET_MNEMONIC?.trim() || '';
const CONFIGURED = !IS_MAINNET && !!MNEMONIC;

/** Bech32 prefix for a Lumera account. */
const PREFIX = 'lumera';
/** What one request sends, in micro-denom. 1 LUME by default. */
const DRIP_MICRO = Number(process.env.FAUCET_AMOUNT_ULUME) || 1_000_000;
/** One draw per address (and per IP) inside this window. */
const COOLDOWN_MS = Number(process.env.FAUCET_COOLDOWN_MS) || 24 * 60 * 60 * 1000;

const LUMERA_ADDRESS = /^lumera1[a-z0-9]{38,}$/;

/*
 * Best-effort per-address and per-IP cooldown, held in memory. A peek/commit
 * pair rather than the shared counter util, so a send that fails to broadcast
 * does not burn the caller's daily allowance.
 */
const lastDraw = new Map<string, number>();
const onCooldown = (key: string): number => {
  const until = lastDraw.get(key);
  if (until == null) return 0;
  const left = until - Date.now();
  return left > 0 ? left : 0;
};
const commit = (key: string) => lastDraw.set(key, Date.now() + COOLDOWN_MS);

const humanLeft = (ms: number): string => {
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const mins = Math.max(1, Math.ceil(ms / (60 * 1000)));
  return `${mins} minute${mins === 1 ? '' : 's'}`;
};

// Derived once and reused: the mnemonic never changes within a running instance.
let signerPromise: Promise<{ wallet: DirectSecp256k1HdWallet; address: string }> | null = null;
const getSigner = () => {
  if (!signerPromise) {
    signerPromise = (async () => {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: PREFIX });
      const [account] = await wallet.getAccounts();
      return { wallet, address: account.address };
    })().catch((error) => {
      // Do not cache a failed derivation — a corrected env should recover
      // without a redeploy.
      signerPromise = null;
      throw error;
    });
  }
  return signerPromise;
};

/** Connect a signing client to the first RPC host that answers. */
const connect = async (wallet: DirectSecp256k1HdWallet): Promise<SigningStargateClient> => {
  const hosts = process.env.FAUCET_RPC ? [process.env.FAUCET_RPC] : RPC_ENDPOINTS;
  let lastError: unknown;
  for (const host of hosts) {
    try {
      return await SigningStargateClient.connectWithSigner(host, wallet);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(
    `No RPC host answered (${lastError instanceof Error ? lastError.message : 'unknown'})`,
  );
};

/** GET reports whether the faucet can send, and from which account. */
export async function GET() {
  if (!CONFIGURED) {
    return NextResponse.json({ configured: false, chainId: CHAIN_ID });
  }
  try {
    const { address } = await getSigner();
    return NextResponse.json({
      configured: true,
      address,
      amountMicro: DRIP_MICRO,
      denom: DENOM,
      chainId: CHAIN_ID,
      cooldownMs: COOLDOWN_MS,
    });
  } catch {
    // A bad mnemonic is a misconfiguration, not a working faucet.
    return NextResponse.json({ configured: false, chainId: CHAIN_ID });
  }
}

export async function POST(request: NextRequest) {
  if (IS_MAINNET) {
    return NextResponse.json({ error: 'There is no faucet on mainnet.' }, { status: 404 });
  }
  if (!CONFIGURED) {
    return NextResponse.json(
      { error: 'The faucet is not configured on this deployment yet.' },
      { status: 503 },
    );
  }

  let recipient = '';
  try {
    const body = await request.json();
    recipient = String(body?.address ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with an address.' }, { status: 400 });
  }

  if (!LUMERA_ADDRESS.test(recipient)) {
    return NextResponse.json(
      { error: 'That is not a valid Lumera address. It should start with lumera1.' },
      { status: 400 },
    );
  }

  const ip = getClientIP(request);
  const addrLeft = onCooldown(`addr:${recipient}`);
  const ipLeft = onCooldown(`ip:${ip}`);
  const left = Math.max(addrLeft, ipLeft);
  if (left > 0) {
    return NextResponse.json(
      { error: `This ${addrLeft >= ipLeft ? 'address' : 'network'} already drew recently. Try again in ${humanLeft(left)}.` },
      { status: 429 },
    );
  }

  try {
    const { wallet, address: from } = await getSigner();
    const client = await connect(wallet);
    try {
      const fee = {
        amount: [{ denom: DENOM, amount: '5000' }],
        gas: '120000',
      };
      const result = await client.sendTokens(
        from,
        recipient,
        [{ denom: DENOM, amount: String(DRIP_MICRO) }],
        fee,
        'Lumera Hub faucet',
      );
      // assertIsDeliverTxSuccess would throw; check the code so a failed
      // delivery does not read as a success and burn the cooldown.
      if (result.code !== 0) {
        return NextResponse.json(
          { error: result.rawLog || `The send failed on chain (code ${result.code}).` },
          { status: 502 },
        );
      }
      commit(`addr:${recipient}`);
      commit(`ip:${ip}`);
      return NextResponse.json({ txhash: result.transactionHash, amountMicro: DRIP_MICRO });
    } finally {
      client.disconnect();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The faucet could not broadcast.';
    // Do not record a cooldown on failure — the caller got nothing.
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
