import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import { DENOM } from '@/contants/network';

/**
 * The chain's own governance, staking and distribution parameters.
 *
 * Quorum, threshold, the unbonding period, the minimum deposit and the
 * redelegation entry limit were previously hardcoded across several screens.
 * They are all published by the chain, and a testnet or a parameter-change
 * proposal can move any of them, so nothing that depends on them should carry
 * a literal.
 *
 * Every field is nullable on purpose: a value that did not load renders as an
 * em dash rather than as a plausible-looking default.
 */
export type ChainParams = {
  /** Share of bonded stake that must vote for a tally to count, 0-100. */
  quorum: number | null;
  /** Share of non-abstain votes needed to pass, 0-100. */
  threshold: number | null;
  /** Share of NoWithVeto that kills a proposal outright, 0-100. */
  vetoThreshold: number | null;
  /** Minimum deposit in micro-denom. */
  minDepositMicro: number | null;
  /** Seconds a proposal may collect deposits. */
  maxDepositPeriodSeconds: number | null;
  /** Seconds a proposal stays open for voting. */
  votingPeriodSeconds: number | null;
  /** Seconds stake stays locked after undelegating. */
  unbondingSeconds: number | null;
  /** Concurrent redelegations allowed between one validator pair. */
  maxRedelegationEntries: number | null;
  /** Size of the active set. */
  maxValidators: number | null;
  /** Lowest commission a validator may charge, 0-100. */
  minCommissionRate: number | null;
  /** Share of rewards diverted to the community pool, 0-100. */
  communityTax: number | null;
};

const EMPTY: ChainParams = {
  quorum: null,
  threshold: null,
  vetoThreshold: null,
  minDepositMicro: null,
  maxDepositPeriodSeconds: null,
  votingPeriodSeconds: null,
  unbondingSeconds: null,
  maxRedelegationEntries: null,
  maxValidators: null,
  minCommissionRate: null,
  communityTax: null,
};

const ratioToPercent = (value?: string | null) => {
  const n = Number(value);
  return Number.isFinite(n) && value != null ? n * 100 : null;
};

const secondsOf = (value?: string | null) => {
  if (!value) return null;
  const n = parseInt(String(value).replace(/s$/, ''), 10);
  return Number.isFinite(n) ? n : null;
};

const intOf = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// One in-flight request shared by every caller; the parameters change about as
// often as a governance proposal passes, so refetching per screen is waste.
let cached: ChainParams | null = null;
let inFlight: Promise<ChainParams> | null = null;

const load = async (): Promise<ChainParams> => {
  const [govRes, stakingRes, distRes] = await Promise.allSettled([
    instance.get('/cosmos/gov/v1/params/tallying'),
    instance.get('/cosmos/staking/v1beta1/params'),
    instance.get('/cosmos/distribution/v1beta1/params'),
  ]);

  const next = { ...EMPTY };

  if (govRes.status === 'fulfilled') {
    // v1 returns the modern `params` block alongside the deprecated
    // `tally_params`; prefer the former and fall back for older nodes.
    const data = govRes.value?.data || {};
    const p = data.params || {};
    const tally = data.tally_params || {};
    next.quorum = ratioToPercent(p.quorum ?? tally.quorum);
    next.threshold = ratioToPercent(p.threshold ?? tally.threshold);
    next.vetoThreshold = ratioToPercent(p.veto_threshold ?? tally.veto_threshold);
    const minDeposit = (p.min_deposit || data.deposit_params?.min_deposit || []).find(
      (c: { denom: string }) => c.denom === DENOM,
    );
    next.minDepositMicro = minDeposit ? intOf(minDeposit.amount) : null;
    next.maxDepositPeriodSeconds = secondsOf(
      p.max_deposit_period ?? data.deposit_params?.max_deposit_period,
    );
    next.votingPeriodSeconds = secondsOf(p.voting_period);
  }

  if (stakingRes.status === 'fulfilled') {
    const p = stakingRes.value?.data?.params || {};
    next.unbondingSeconds = secondsOf(p.unbonding_time);
    next.maxRedelegationEntries = intOf(p.max_entries);
    next.maxValidators = intOf(p.max_validators);
    next.minCommissionRate = ratioToPercent(p.min_commission_rate);
  }

  if (distRes.status === 'fulfilled') {
    next.communityTax = ratioToPercent(distRes.value?.data?.params?.community_tax);
  }

  return next;
};

const useChainParams = () => {
  const [params, setParams] = useState<ChainParams>(cached ?? EMPTY);
  const [isLoading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    inFlight ??= load();
    inFlight
      .then((next) => {
        cached = next;
        if (!cancelled) setParams(next);
      })
      .catch(() => {
        // Leave every field null; callers render em dashes.
      })
      .finally(() => {
        inFlight = null;
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { params, isLoading };
};

/** "21 days", "3 days", "2 days" — or null when the chain did not answer. */
export const formatDuration = (seconds: number | null) => {
  if (seconds == null) return null;
  const days = seconds / 86400;
  if (days >= 1) {
    const rounded = Math.round(days);
    return `${rounded} day${rounded === 1 ? '' : 's'}`;
  }
  const hours = Math.round(seconds / 3600);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

export default useChainParams;
