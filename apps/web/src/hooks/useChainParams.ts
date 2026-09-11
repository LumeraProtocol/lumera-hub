import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import { DENOM, subscribeNetworkChange } from '@/contants/network';

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
  /** Whether a vetoed proposal's deposits are burned rather than refunded. */
  burnVoteVeto: boolean | null;
  /** Whether a proposal that misses quorum has its deposits burned. */
  burnVoteQuorum: boolean | null;
  /** Whether deposits burn when the deposit period closes short of the minimum. */
  burnDepositPrevote: boolean | null;
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
  burnVoteVeto: null,
  burnVoteQuorum: null,
  burnDepositPrevote: null,
};

/*
 * Zero is treated as "not loaded" throughout, not as a real value.
 *
 * The staking hook seeds its params with a zero-filled placeholder
 * (`unbonding_time: '0'`, `max_entries: 0`, …) so the shape is present before
 * the chain answers. Those placeholders are truthy enough to survive a naive
 * guard and render as though they were real — an unbonding period of
 * "0 hours", a commission floor of "0%". None of these parameters can
 * legitimately be zero, so a non-positive reading means the value is unknown.
 */
const positiveOrNull = (n: number) => (Number.isFinite(n) && n > 0 ? n : null);

const ratioToPercent = (value?: string | null) => {
  if (value == null) return null;
  return positiveOrNull(Number(value) * 100);
};

const secondsOf = (value?: string | null) => {
  if (!value) return null;
  return positiveOrNull(parseInt(String(value).replace(/s$/, ''), 10));
};

const intOf = (value: unknown) => positiveOrNull(Number(value));

// One in-flight request shared by every caller; the parameters change about as
// often as a governance proposal passes, so refetching per screen is waste.
let cached: ChainParams | null = null;
let inFlight: Promise<ChainParams> | null = null;

// The two networks have different quorum, deposit and unbonding parameters, so
// the shared cache is dropped on a switch rather than shown against the wrong
// chain.
subscribeNetworkChange(() => {
  cached = null;
  inFlight = null;
});

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
    // Booleans only: an older node without the switch leaves it unknown.
    const flag = (value: unknown) => (typeof value === 'boolean' ? value : null);
    next.burnVoteVeto = flag(p.burn_vote_veto);
    next.burnVoteQuorum = flag(p.burn_vote_quorum);
    next.burnDepositPrevote = flag(p.burn_proposal_deposit_prevote);
  }

  if (stakingRes.status === 'fulfilled') {
    const p = stakingRes.value?.data?.params || {};
    next.unbondingSeconds = secondsOf(p.unbonding_time);
    next.maxRedelegationEntries = intOf(p.max_entries);
    next.maxValidators = intOf(p.max_validators);
    next.minCommissionRate = ratioToPercent(p.min_commission_rate);
  }

  if (distRes.status === 'fulfilled') {
    // A community tax of zero is legitimate, unlike the others.
    const tax = Number(distRes.value?.data?.params?.community_tax);
    next.communityTax = Number.isFinite(tax) ? tax * 100 : null;
  }

  return next;
};

/** True once at least one parameter actually resolved. */
const hasAnyValue = (p: ChainParams) => Object.values(p).some((v) => v != null);

const useChainParams = () => {
  const [params, setParams] = useState<ChainParams>(cached ?? EMPTY);
  const [isLoading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    inFlight ??= load();
    inFlight
      .then((next) => {
        // Only remember a read that produced something. Caching an all-null
        // result would make a transient LCD outage permanent for the session.
        if (hasAnyValue(next)) cached = next;
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
  if (seconds == null || seconds <= 0) return null;
  const days = seconds / 86400;
  if (days >= 1) {
    const rounded = Math.round(days);
    return `${rounded} day${rounded === 1 ? '' : 's'}`;
  }
  const hours = Math.round(seconds / 3600);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

export default useChainParams;
