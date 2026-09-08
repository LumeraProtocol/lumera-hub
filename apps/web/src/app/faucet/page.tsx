'use client';

/*
 * The testnet faucet.
 *
 * Two halves, configured separately, because they fail separately. Sending
 * needs NEXT_PUBLIC_FAUCET_API — a service holding a funded account — and
 * without it the screen says so instead of offering a button that cannot work.
 * The drip log only needs NEXT_PUBLIC_FAUCET_ADDRESS, since a faucet's sends
 * are ordinary transactions and can be read straight off the chain, so real
 * history can show even before the sending half exists.
 *
 * On mainnet this route redirects. There is no free mainnet LUME.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { get } from '@/utils/api';
import { RATE_VALUE } from '@/contants';
import { DENOM, FAUCET_API, FAUCET_ADDRESS, IS_MAINNET } from '@/contants/network';
import { formatNumber } from '@/utils/format';
import { FaucetScreen, type Drip, type FaucetState } from '@lumera-hub/ui/src/screens/hub/FaucetScreen';
import { short } from '@lumera-hub/ui/src/hub/session';

const RULES = [
  'One request per address per day. The limit is enforced by the faucet, not the chain.',
  'Test LUME has no value and cannot be bridged to mainnet.',
  'The testnet resets periodically. Balances do not survive a reset.',
  'Requests are ordinary transactions, so they appear in the explorer like any other.',
];

/** "2h ago", "3d ago" — the drip log only needs coarse recency. */
const ago = (iso: string): string => {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '—';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : `${Math.round(days / 30)}mo ago`;
};

type TxResponse = {
  txhash: string;
  timestamp: string;
  tx?: { body?: { messages?: Array<Record<string, unknown>> } };
};

export default function FaucetPage() {
  const router = useRouter();
  const [state, setState] = useState<FaucetState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [drips, setDrips] = useState<Drip[]>([]);
  const [dripsLoading, setDripsLoading] = useState(Boolean(FAUCET_ADDRESS));

  useEffect(() => {
    document.title = 'Faucet - Lumera Hub';
  }, []);

  // Mainnet has no faucet, so the route does not exist there.
  useEffect(() => {
    if (IS_MAINNET) router.replace('/');
  }, [router]);

  /** The faucet's own recent sends, read off the chain. */
  const loadDrips = useCallback(async () => {
    if (!FAUCET_ADDRESS) return;
    setDripsLoading(true);
    try {
      const data = (await get(
        `/cosmos/tx/v1beta1/txs?query=${encodeURIComponent(
          `transfer.sender='${FAUCET_ADDRESS}'`,
        )}&order_by=ORDER_BY_DESC&pagination.limit=8`,
      )) as { tx_responses?: TxResponse[] } | null;

      setDrips(
        (data?.tx_responses ?? []).map((tx: TxResponse) => {
          const msg = tx.tx?.body?.messages?.[0] as
            | { to_address?: string; amount?: Array<{ amount?: string; denom?: string }> }
            | undefined;
          const coin = msg?.amount?.find((a) => a.denom === DENOM) ?? msg?.amount?.[0];
          const micro = Number(coin?.amount ?? 0);

          return {
            hash: tx.txhash,
            address: msg?.to_address ? short(msg.to_address, 12, 6) : '—',
            amount: micro ? `${formatNumber(micro / RATE_VALUE)} LUME` : '—',
            when: ago(tx.timestamp),
            onOpen: () => router.push(`/tx/${tx.txhash}`),
          };
        }),
      );
    } catch {
      // The log is secondary; the request form still works without it.
      setDrips([]);
    }
    setDripsLoading(false);
  }, [router]);

  useEffect(() => {
    void loadDrips();
  }, [loadDrips]);

  const onRequest = useCallback(
    async (address: string) => {
      if (!FAUCET_API) return;
      setState('sending');
      setError(null);
      try {
        const res = await fetch(FAUCET_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `The faucet refused the request (${res.status}).`);
        }
        setState('done');
        // A drip is a transaction; give the chain a block to include it.
        window.setTimeout(() => void loadDrips(), 6000);
      } catch (e) {
        setState('idle');
        setError(e instanceof Error ? e.message : 'The faucet could not be reached.');
      }
    },
    [loadDrips],
  );

  /** Of what was fetched, how much landed in the last day. */
  const dripsToday = useMemo(() => {
    const n = drips.filter((d) => /^\d+[mh] ago$/.test(d.when)).length;
    return n ? `${n} in the last day` : null;
  }, [drips]);

  return (
    <FaucetScreen
      available={Boolean(FAUCET_API)}
      unavailableReason={
        FAUCET_ADDRESS
          ? 'No faucet service is configured on this deployment, so requests cannot be sent from here. The log below is real, read from the faucet account on chain.'
          : undefined
      }
      state={state}
      amountLabel="1.00 test LUME"
      error={error}
      drips={drips}
      dripsLoading={dripsLoading}
      dripsToday={dripsToday}
      onRequest={onRequest}
      rules={RULES}
    />
  );
}
