// apps/web/src/app/api/faucet/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';

import { NETWORK_PROFILES, rpcEndpointsFor } from '@/contants/network';
import { getClientIP } from '@/lib/rate-limit';

/*
 * The hub's own testnet faucet.
 *
 * The form on /faucet posts an address here; this signs a bank send of a fixed
 * amount from a funded account and broadcasts it. That account is a server
 * secret (FAUCET_MNEMONIC) — never a NEXT_PUBLIC value — so the key never
 * reaches the browser and the send happens entirely server-side.
 *
 * The faucet always sends on testnet — there is no such thing as free mainnet
 * LUME — so it targets the testnet chain explicitly rather than the runtime's
 * active network. On the combined deployment the active network is switched
 * client-side and defaults to mainnet, so keying this route off that default
 * would wrongly refuse; the presence of FAUCET_MNEMONIC is what makes it live.
 * One address may draw once per COOLDOWN — best-effort and in memory, resetting
 * on cold start, which for a testnet faucet is an acceptable ceiling.
 */

// Node APIs (the signer needs crypto); never the edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MNEMONIC = process.env.FAUCET_MNEMONIC?.trim() || '';
const CONFIGURED = !!MNEMONIC;

// The faucet is a testnet facility; it sends on the testnet chain whatever the
// deployment's default network happens to be.
const TESTNET = NETWORK_PROFILES.testnet;
const CHAIN_ID = TESTNET.chainId;
const DENOM = TESTNET.denom;

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
// Roll back a reservation when the draw it was made for never lands, so a
// failed send does not cost the caller their daily allowance.
const release = (key: string) => lastDraw.delete(key);

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
  const hosts = process.env.FAUCET_RPC ? [process.env.FAUCET_RPC] : rpcEndpointsFor('testnet');
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

/*
 * The faucet account carries a single sequence number, so two broadcasts in
 * flight at once collide with "account sequence mismatch" and all but one fail.
 * Chain the sends so only one is ever in flight; a failure does not break the
 * chain for the next caller.
 */
let sendQueue: Promise<unknown> = Promise.resolve();
const runExclusive = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = sendQueue.then(fn, fn);
  sendQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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
  const addrKey = `addr:${recipient}`;
  const ipKey = `ip:${ip}`;

  // Check AND reserve the cooldown in one synchronous step. Node runs this to
  // completion without yielding, so two parallel draws for the same address or
  // IP cannot both pass the check before either commits — the previous
  // check-then-commit-after-broadcast left a multi-second window where they
  // could. The reservation is rolled back below if the send never lands.
  const addrLeft = onCooldown(addrKey);
  const ipLeft = onCooldown(ipKey);
  const left = Math.max(addrLeft, ipLeft);
  if (left > 0) {
    return NextResponse.json(
      { error: `This ${addrLeft >= ipLeft ? 'address' : 'network'} already drew recently. Try again in ${humanLeft(left)}.` },
      { status: 429 },
    );
  }
  commit(addrKey);
  commit(ipKey);

  try {
    const { wallet, address: from } = await getSigner();
    // Serialize the broadcast: the faucet account has one sequence number, so
    // concurrent sends would fail with "account sequence mismatch".
    const result = await runExclusive(async () => {
      const client = await connect(wallet);
      try {
        const fee = {
          amount: [{ denom: DENOM, amount: '5000' }],
          gas: '120000',
        };
        return await client.sendTokens(
          from,
          recipient,
          [{ denom: DENOM, amount: String(DRIP_MICRO) }],
          fee,
          'Lumera Hub faucet',
        );
      } finally {
        client.disconnect();
      }
    });
    // assertIsDeliverTxSuccess would throw; check the code so a failed
    // delivery does not read as a success and keep the cooldown.
    if (result.code !== 0) {
      release(addrKey);
      release(ipKey);
      return NextResponse.json(
        { error: result.rawLog || `The send failed on chain (code ${result.code}).` },
        { status: 502 },
      );
    }
    return NextResponse.json({ txhash: result.transactionHash, amountMicro: DRIP_MICRO });
  } catch (error) {
    // The caller got nothing, so free the reservation for a genuine retry.
    release(addrKey);
    release(ipKey);
    const message = error instanceof Error ? error.message : 'The faucet could not broadcast.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
