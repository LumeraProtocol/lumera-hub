import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import { rpcGet } from '@/utils/rpc';
import { DENOM, SNSCOPE_URL } from '@/contants/network';

/**
 * Live chain statistics for the hub's headline tiles.
 *
 * Modelled on the sources the Lumera website reads (`lumera-site-v2`
 * network-stats.ts), which were verified endpoint by endpoint against the
 * chain. Several are better than what the hub was using:
 *
 *   - the validator count comes from `pagination.total`, not the length of a
 *     page that a limit may have capped;
 *   - the SuperNode count comes from the chain's own supernode module rather
 *     than from however many nodes the metrics indexer happened to answer with
 *     — 28 registered against the indexer's 11;
 *   - stored objects are completed Cascade actions, a number the hub had no
 *     source for at all;
 *   - block time is measured across real headers instead of assumed.
 *
 * The same ground rule as that file applies here: a figure with no source is
 * left null and rendered as an em dash. Nothing is synthesised.
 */
export type NetworkStats = {
  /** Micro-denom bonded to the active set. */
  bondedMicro: number | null;
  /** Micro-denom in existence. */
  totalSupplyMicro: number | null;
  /** Bonded as a share of supply, 0-100. */
  bondedPercent: number | null;
  /** Nominal staking yield before validator commission, 0-100. */
  aprPercent: number | null;
  /** The share of block rewards diverted to the community pool, 0-100. */
  communityTaxPercent: number | null;
  /** Size of the active set, from pagination rather than a capped page. */
  activeValidators: number | null;
  /** Mean seconds per block over the last ~20 headers. */
  blockTimeSeconds: number | null;
  /** Registered SuperNodes, from the chain's supernode module. */
  supernodes: number | null;
  /** Completed Cascade actions — files the network is holding. */
  storedObjects: number | null;
  /** Micro-denom held by the community pool. */
  communityPoolMicro: number | null;
  /** Accounts that have appeared on chain. */
  accounts: number | null;
  /** Bytes of SuperNode disk offered, from the metrics indexer. */
  storageTotalBytes: number | null;
  storageUsedBytes: number | null;
  storageUsedPercent: number | null;
};

const EMPTY: NetworkStats = {
  bondedMicro: null,
  totalSupplyMicro: null,
  bondedPercent: null,
  aprPercent: null,
  communityTaxPercent: null,
  activeValidators: null,
  blockTimeSeconds: null,
  supernodes: null,
  storedObjects: null,
  communityPoolMicro: null,
  accounts: null,
  storageTotalBytes: null,
  storageUsedBytes: null,
  storageUsedPercent: null,
};

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
};

const positive = (n: number | null) => (n != null && n > 0 ? n : null);

/** The portal formats SuperNode disk in binary units, so this matches it. */
export const TIB = 1024 ** 4;

type Meta = { header?: { height?: string; time?: string } };
type BlockResult = { result?: { block?: { header?: { time?: string } } } };

/** How far back block time is measured. The design quotes this figure. */
export const BLOCK_TIME_SAMPLE = 1000;

/** Mean seconds per block across a run of headers. */
const meanBlockTime = (metas: Meta[]): number | null => {
  const points = metas
    .map((m) => ({ h: num(m?.header?.height), t: Date.parse(m?.header?.time ?? '') }))
    .filter((p): p is { h: number; t: number } => p.h != null && Number.isFinite(p.t));
  if (points.length < 2) return null;
  const dh = Math.abs(points[0].h - points[points.length - 1].h);
  const dt = Math.abs(points[0].t - points[points.length - 1].t) / 1000;
  if (!dh || !dt) return null;
  const avg = dt / dh;
  // A figure outside this range means the headers were not what we assumed.
  return avg >= 1 && avg <= 15 ? avg : null;
};

const CHAIN_MS = 60000;

const useNetworkStats = () => {
  const [stats, setStats] = useState<NetworkStats>(EMPTY);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      const settle = <T,>(p: Promise<T>) => p.catch(() => null);

      const [
        poolRes,
        validatorsRes,
        supplyRes,
        inflationRes,
        distParamsRes,
        communityRes,
        accountsRes,
        supernodesRes,
        actionsRes,
        headers,
        snStats,
      ] = await Promise.all([
        settle(instance.get('/cosmos/staking/v1beta1/pool')),
        settle(
          instance.get(
            '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.count_total=true&pagination.limit=1',
          ),
        ),
        settle(instance.get(`/cosmos/bank/v1beta1/supply/by_denom?denom=${DENOM}`)),
        settle(instance.get('/cosmos/mint/v1beta1/inflation')),
        settle(instance.get('/cosmos/distribution/v1beta1/params')),
        settle(instance.get('/cosmos/distribution/v1beta1/community_pool')),
        settle(
          instance.get('/cosmos/auth/v1beta1/accounts?pagination.count_total=true&pagination.limit=1'),
        ),
        // count_total avoids pulling the full list to learn one integer, and
        // reverse=true skips the first record's long state history.
        settle(
          instance.get(
            '/LumeraProtocol/lumera/supernode/v1/list_super_nodes?pagination.count_total=true&pagination.limit=1&pagination.reverse=true',
          ),
        ),
        // Objects stored = completed Cascade actions. The module filters
        // server-side, so one row is enough to read the count off pagination.
        settle(
          instance.get(
            '/LumeraProtocol/lumera/action/v1/list_actions?pagination.count_total=true&pagination.limit=1&actionType=ACTION_TYPE_CASCADE&actionState=ACTION_STATE_DONE',
          ),
        ),
        /*
         * Block time over a long window rather than the last handful.
         * /blockchain returns only the most recent twenty headers, and twenty
         * blocks is two minutes — short enough that one slow proposer visibly
         * moves the number. Two headers a thousand apart give the same figure
         * for two requests and hold steady.
         */
        settle(rpcGet<{ result?: { block_metas?: Meta[] } }>('/blockchain')),
        settle(instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/stats`)),
      ]);

      if (cancelled) return;

      const bonded = positive(num(poolRes?.data?.pool?.bonded_tokens));
      const supply = positive(num(supplyRes?.data?.amount?.amount));
      const ratio = bonded != null && supply ? bonded / supply : null;

      const inflation = num(inflationRes?.data?.inflation);
      const tax = num(distParamsRes?.data?.params?.community_tax) ?? 0;
      // Inflation accrues to bonded stake only, after the community tax is
      // taken off the top. This is the gross figure, before commission.
      const apr =
        inflation != null && inflation > 0 && ratio
          ? (inflation * (1 - tax)) / ratio * 100
          : null;

      const communityPool = positive(
        num(
          (communityRes?.data?.pool || []).find(
            (c: { denom?: string }) => c?.denom === DENOM,
          )?.amount,
        ),
      );

      const storageTotal = positive(num(snStats?.data?.total_storage_bytes));
      const storageUsed = num(snStats?.data?.used_storage_bytes);

      setStats({
        bondedMicro: bonded,
        totalSupplyMicro: supply,
        bondedPercent: ratio != null ? ratio * 100 : null,
        aprPercent: apr != null && apr > 0 && apr < 1000 ? apr : null,
        communityTaxPercent: tax != null ? tax * 100 : null,
        activeValidators: positive(num(validatorsRes?.data?.pagination?.total)),
        blockTimeSeconds: meanBlockTime(headers?.result?.block_metas ?? []),
        supernodes: positive(num(supernodesRes?.data?.pagination?.total)),
        storedObjects: positive(
          num(actionsRes?.data?.pagination?.total ?? actionsRes?.data?.total),
        ),
        communityPoolMicro: communityPool,
        accounts: positive(num(accountsRes?.data?.pagination?.total)),
        storageTotalBytes: storageTotal,
        storageUsedBytes: storageUsed,
        storageUsedPercent:
          num(snStats?.data?.storage_used_percent) ??
          (storageTotal && storageUsed != null ? (storageUsed / storageTotal) * 100 : null),
      });
      setLoading(false);

      /*
       * Block time over a long window, measured after the rest is rendered.
       *
       * /blockchain carries only the last twenty headers, and twenty blocks is
       * two minutes — short enough that one slow proposer visibly moves the
       * figure. Two headers a thousand apart give a number that holds steady.
       *
       * It needs the tip height before it can ask for anything, so it cannot
       * join the batch above; running it there made every other figure on the
       * dashboard wait about half a minute for it. The short-run mean is
       * already showing by now, and this replaces it in place.
       */
      const metas = headers?.result?.block_metas ?? [];
      const tip = num(metas[0]?.header?.height);
      if (tip == null || tip <= BLOCK_TIME_SAMPLE) return;

      const [tipBlock, oldBlock] = await Promise.all([
        settle(rpcGet<BlockResult>(`/block?height=${tip}`)),
        settle(rpcGet<BlockResult>(`/block?height=${tip - BLOCK_TIME_SAMPLE}`)),
      ]);
      if (cancelled) return;

      const t1 = Date.parse(tipBlock?.result?.block?.header?.time ?? '');
      const t0 = Date.parse(oldBlock?.result?.block?.header?.time ?? '');
      if (!Number.isFinite(t1) || !Number.isFinite(t0) || t1 <= t0) return;

      const avg = (t1 - t0) / 1000 / BLOCK_TIME_SAMPLE;
      if (avg >= 1 && avg <= 15) {
        setStats((prev) => ({ ...prev, blockTimeSeconds: avg }));
      }
    };

    void read();
    // None of these move faster than a block, and polling a public endpoint
    // from every visitor forever is how you get rate-limited.
    const timer = setInterval(() => {
      if (!document.hidden) void read();
    }, CHAIN_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { stats, isLoading };
};

export default useNetworkStats;
