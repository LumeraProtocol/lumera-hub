'use client';

/*
 * What each watched address holds, for the dashboard's watched list: liquid
 * plus bonded LUME, and how many validators the bonded part sits with.
 *
 * Read straight from the LCD — one balance and one delegations query per
 * address — and refreshed on the same minute cadence as the chain figures. An
 * address whose reads both fail is left out, so the row shows an em dash
 * rather than a zero it cannot vouch for.
 */

import { useEffect, useState } from 'react';

import { getQuiet } from '@/utils/api';
import { RATE_VALUE } from '@/contants';
import { DENOM } from '@/contants/network';

export type WatchedTotal = { total: string; sub: string };

type Delegation = { balance?: { amount?: string } };

const whole = (micro: number) =>
  (micro / RATE_VALUE).toLocaleString('en-US', { maximumFractionDigits: 0 });

const REFRESH_MS = 60000;

const useWatchedTotals = (addresses: string[]) => {
  const [totals, setTotals] = useState<Record<string, WatchedTotal>>({});
  // A stable key, so a new array with the same addresses does not refetch.
  const key = addresses.join(',');

  useEffect(() => {
    if (!key) {
      setTotals({});
      return;
    }
    let cancelled = false;

    const read = async () => {
      const settle = <T,>(p: Promise<T>) => p.catch(() => null);
      const rows = await Promise.all(
        key.split(',').map(async (address) => {
          const [bank, delegations] = await Promise.all([
            settle(getQuiet(`/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${DENOM}`)),
            settle(getQuiet(`/cosmos/staking/v1beta1/delegations/${address}?pagination.limit=200`)),
          ]);
          if (!bank && !delegations) return null;

          const liquid = Number(bank?.data?.balance?.amount) || 0;
          const entries: Delegation[] = delegations?.data?.delegation_responses ?? [];
          const staked = entries.reduce((sum, d) => sum + (Number(d?.balance?.amount) || 0), 0);

          return {
            address,
            total: {
              total: `${whole(liquid + staked)} LUME`,
              sub:
                staked > 0
                  ? `${whole(staked)} staked · ${entries.length} validator${entries.length === 1 ? '' : 's'}`
                  : 'nothing delegated',
            },
          };
        }),
      );
      if (cancelled) return;

      const next: Record<string, WatchedTotal> = {};
      rows.forEach((row) => {
        if (row) next[row.address] = row.total;
      });
      setTotals(next);
    };

    void read();
    const timer = setInterval(() => {
      if (!document.hidden) void read();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [key]);

  return totals;
};

export default useWatchedTotals;
