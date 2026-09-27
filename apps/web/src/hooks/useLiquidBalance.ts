'use client';

/*
 * The connected wallet's liquid LUME, for the header chip.
 *
 * One bank read, repeated each minute while the tab is visible. Nothing shows
 * until it answers, and a failed read shows nothing rather than a zero. EVM
 * accounts are skipped: the chip's line is denominated in the Cosmos balance.
 */

import { useEffect, useState } from 'react';

import { getQuiet } from '@/utils/api';
import { DENOM } from '@/contants/network';

const REFRESH_MS = 60000;

const useLiquidBalance = (address?: string) => {
  const [micro, setMicro] = useState<number | null>(null);

  useEffect(() => {
    setMicro(null);
    if (!address || !address.startsWith('lumera1')) return;
    let cancelled = false;

    const read = async () => {
      try {
        const res = await getQuiet(`/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${DENOM}`);
        const amount = Number(res?.data?.balance?.amount);
        if (!cancelled && Number.isFinite(amount)) setMicro(amount);
      } catch {
        // The chip simply goes without its balance line.
      }
    };

    void read();
    const timer = setInterval(() => {
      if (!document.hidden) void read();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address]);

  return micro;
};

export default useLiquidBalance;
