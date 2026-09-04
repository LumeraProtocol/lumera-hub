import { useEffect, useRef, useState } from 'react';

import * as instance from '@/utils/api';
import { DENOM } from '@/contants/network';
import { RATE_VALUE } from '@/contants';

export type TxReceipt = {
  height: string | null;
  /** 0 means the chain accepted it. Anything else is an on-chain failure. */
  code: number | null;
  gasUsed: string | null;
  gasWanted: string | null;
  /** Fee actually charged, in display units. */
  fee: string | null;
  rawLog: string | null;
  timestamp: string | null;
  /** Decoded messages from the transaction body, in order. */
  messages: Array<Record<string, unknown>>;
  memo: string | null;
};

const EMPTY: TxReceipt = {
  height: null,
  code: null,
  gasUsed: null,
  gasWanted: null,
  fee: null,
  rawLog: null,
  timestamp: null,
  messages: [],
  memo: null,
};

/**
 * Reads a broadcast transaction back from the chain.
 *
 * The signing hooks keep only the transaction hash and drop the rest of the
 * CosmJS response, so the receipt had nothing real to show — and, worse, a
 * hash was being treated as success. A transaction can be included in a block
 * and still fail there (out of gas is the usual one), which charges the fee.
 * Reading the transaction back gives the true code, height, gas and fee.
 *
 * The tx index lags the broadcast by a block or so, so this retries briefly
 * rather than concluding "not found" on the first miss.
 */
const useTxReceipt = (hash?: string, attempts = 8, intervalMs = 1500) => {
  const [receipt, setReceipt] = useState<TxReceipt>(EMPTY);
  const [isLoading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!hash) {
      setReceipt(EMPTY);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let tries = 0;
    setLoading(true);

    const read = async () => {
      tries += 1;
      try {
        const { data } = await instance.get(`/cosmos/tx/v1beta1/txs/${hash}`);
        if (cancelled) return;
        const response = data?.tx_response;
        if (response) {
          const feeCoin = (data?.tx?.auth_info?.fee?.amount || []).find(
            (c: { denom: string }) => c.denom === DENOM,
          );
          setReceipt({
            height: response.height ? String(response.height) : null,
            code: Number(response.code ?? 0),
            gasUsed: response.gas_used ?? null,
            gasWanted: response.gas_wanted ?? null,
            fee: feeCoin
              ? `${(Number(feeCoin.amount) / RATE_VALUE).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} ${DENOM.replace(/^u/, '').toUpperCase()}`
              : null,
            rawLog: response.raw_log || null,
            timestamp: response.timestamp || null,
            messages: data?.tx?.body?.messages || [],
            memo: data?.tx?.body?.memo || null,
          });
          setLoading(false);
          return;
        }
      } catch {
        // Not indexed yet, most likely. Fall through to the retry.
      }
      if (cancelled) return;
      if (tries >= attempts) {
        // Give up quietly: the drawer already knows the hash and can link out.
        setLoading(false);
        return;
      }
      timer.current = setTimeout(read, intervalMs);
    };

    read();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [attempts, hash, intervalMs]);

  return { receipt, isLoading };
};

export default useTxReceipt;
