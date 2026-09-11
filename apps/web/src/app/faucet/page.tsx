'use client';

/*
 * The testnet faucet.
 *
 * The request form posts to FAUCET_API, which defaults to the hub's own signer
 * route (/api/faucet). That route is live only when the server holds a funded
 * account (FAUCET_MNEMONIC); a GET to it reports whether it can send and from
 * which address, so the form shows a working button rather than one that
 * cannot deliver. The drip log reads that account's recent sends straight off
 * the chain, so real history shows the moment the account is funded.
 *
 * On mainnet this route redirects. There is no free mainnet LUME.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getQuiet } from '@/utils/api';
import { RATE_VALUE } from '@/contants';
import { CHAIN_ID, DENOM, FAUCET_API, FAUCET_ADDRESS, IS_MAINNET } from '@/contants/network';
import { formatNumber } from '@/utils/format';
import { explorerTxUrl } from '@/utils/explorer';
import { FaucetScreen, type Drip, type FaucetState } from '@lumera-hub/ui/src/screens/hub/FaucetScreen';
import { short } from '@lumera-hub/ui/src/hub/session';

const RULES = [
  'One request per address per day. The limit is enforced by the faucet, not the chain.',
  'Test LUME has no value and cannot be bridged to mainnet.',
  'The testnet resets periodically. Balances do not survive a reset.',
  'Requests are ordinary transactions, so they appear in the explorer like any other.',
];

/** How many of the faucet's sends are read: enough to count a busy day. */
const LOG_WINDOW = 50;
/** How many of those the log shows. */
const LOG_ROWS = 8;
const DAY_MS = 86_400_000;

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

const lume = (micro: number) => formatNumber(micro / RATE_VALUE, { decimalsLength: 0, currency: 'en-US' });

type TxResponse = {
  txhash: string;
  timestamp: string;
  tx?: { body?: { messages?: Array<Record<string, unknown>> } };
};

/** What the signer route reports about itself. */
type FaucetInfo = {
  configured: boolean;
  address?: string;
  amountMicro?: number;
  cooldownMs?: number;
};

export default function FaucetPage() {
  const router = useRouter();
  const [state, setState] = useState<FaucetState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [drips, setDrips] = useState<Drip[]>([]);
  const [lastDay, setLastDay] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [dripsLoading, setDripsLoading] = useState(true);

  useEffect(() => {
    document.title = 'Faucet - Lumera Hub';
  }, []);

  // Mainnet has no faucet, so the route does not exist there.
  useEffect(() => {
    if (IS_MAINNET) router.replace('/');
  }, [router]);

  // Ask the signer route whether it can send, and from which account. Only our
  // own route answers this; an external FAUCET_API is assumed available.
  const ownSigner = FAUCET_API === '/api/faucet';
  useEffect(() => {
    if (!ownSigner) {
      setInfo({ configured: true });
      return;
    }
    let cancelled = false;
    fetch('/api/faucet')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setInfo(j as FaucetInfo);
      })
      .catch(() => {
        if (!cancelled) setInfo({ configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, [ownSigner]);

  // The account whose sends make up the log: the signer's own address once it
  // reports one, else an explicitly configured address.
  const faucetAddress = info?.address || FAUCET_ADDRESS;
  const amountMicro = info?.amountMicro ?? RATE_VALUE;
  const available = Boolean(FAUCET_API) && (info?.configured ?? false);

  /*
   * The faucet account's recent sends, and its balance, read off the chain.
   *
   * `get` resolves to the HTTP response, not its body, so the list lives under
   * `data.tx_responses`.
   */
  const loadDrips = useCallback(async () => {
    if (!faucetAddress) {
      setDripsLoading(false);
      return;
    }
    setDripsLoading(true);
    const [txRes, balanceRes] = await Promise.all([
      getQuiet(
        `/cosmos/tx/v1beta1/txs?query=${encodeURIComponent(
          `transfer.sender='${faucetAddress}'`,
        )}&order_by=ORDER_BY_DESC&pagination.limit=${LOG_WINDOW}`,
      ).catch(() => null),
      getQuiet(`/cosmos/bank/v1beta1/balances/${faucetAddress}/by_denom?denom=${DENOM}`).catch(
        () => null,
      ),
    ]);

    const sends: TxResponse[] = txRes?.data?.tx_responses ?? [];
    setLastDay(txRes ? sends.filter((tx) => Date.now() - Date.parse(tx.timestamp) < DAY_MS).length : null);
    setDrips(
      sends.slice(0, LOG_ROWS).map((tx) => {
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

    const micro = Number(balanceRes?.data?.balance?.amount);
    setBalance(balanceRes && Number.isFinite(micro) ? micro : null);
    setDripsLoading(false);
  }, [faucetAddress, router]);

  useEffect(() => {
    void loadDrips();
  }, [loadDrips]);

  const onRequest = useCallback(
    async (address: string) => {
      if (!available) return;
      setState('sending');
      setError(null);
      setLastHash(null);
      try {
        const res = await fetch(FAUCET_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error || `The faucet refused the request (${res.status}).`);
        }
        // Services differ in what they call the hash; take it if it is there.
        const hash = body?.txhash ?? body?.tx_hash ?? body?.hash ?? body?.transactionHash;
        setLastHash(typeof hash === 'string' && hash ? hash : null);
        setState('done');
        // A drip is a transaction; give the chain a block to include it.
        window.setTimeout(() => void loadDrips(), 6000);
      } catch (e) {
        setState('idle');
        setError(e instanceof Error ? e.message : 'The faucet could not be reached.');
      }
    },
    [available, loadDrips],
  );

  const dripsToday = lastDay != null && lastDay > 0
    ? `${lastDay >= LOG_WINDOW ? `${LOG_WINDOW}+` : lastDay} in the last day`
    : null;

  const amountLabel = `${lume(amountMicro)} LUME`;

  const stats = useMemo(
    () => [
      { label: 'DRIP AMOUNT', value: amountLabel },
      { label: 'RATE LIMIT', value: '1 per 24h' },
      {
        label: 'FAUCET BALANCE',
        value: balance != null ? `${lume(balance)} LUME` : '—',
      },
      {
        label: 'SENT, LAST 24H',
        value: lastDay != null ? (lastDay >= LOG_WINDOW ? `${LOG_WINDOW}+` : String(lastDay)) : '—',
      },
    ],
    [amountLabel, balance, lastDay],
  );

  return (
    <FaucetScreen
      available={available}
      unavailableReason={
        info && !info.configured
          ? faucetAddress
            ? 'The faucet is not accepting requests right now. The log below is real, read from the faucet account on chain.'
            : 'The faucet is not accepting requests right now.'
          : undefined
      }
      state={state}
      chainId={CHAIN_ID}
      amountLabel={amountLabel}
      stats={stats}
      error={error}
      drips={drips}
      dripsLoading={dripsLoading}
      dripsToday={dripsToday}
      onRequest={onRequest}
      onReset={() => {
        setState('idle');
        setError(null);
        setLastHash(null);
      }}
      lastTxUrl={lastHash ? explorerTxUrl(lastHash) : undefined}
      rules={RULES}
    />
  );
}
