import type { IValidator } from '@/types/validator';

/**
 * The staking return a delegator actually receives.
 *
 * The chain's figure is gross: inflation over the bonded ratio, after the
 * community tax. Nobody is paid that, because a delegator's validator keeps
 * its commission first. Both the dashboard and the staking screen label their
 * figure "net", so both have to take it off — and take it off the same way,
 * or the hub shows two different numbers for one metric.
 *
 * Commission is weighted by stake rather than averaged flat: a validator with
 * a fifth of the network applies its rate to a fifth of the rewards, and a
 * flat mean would let a tiny validator with an outlier rate move the figure as
 * much as the largest one.
 */
export const weightedCommission = (validators: IValidator[] | null | undefined): number | null => {
  let stake = 0;
  let weighted = 0;

  for (const v of validators ?? []) {
    const tokens = Number(v?.tokens) || 0;
    const rate = Number(v?.commission?.commission_rates?.rate);
    if (!tokens || !Number.isFinite(rate)) continue;
    stake += tokens;
    weighted += tokens * rate;
  }

  return stake > 0 ? weighted / stake : null;
};

/** Gross APR less the stake-weighted commission. Null in, null out. */
export const netApr = (
  grossPercent: number | null | undefined,
  validators: IValidator[] | null | undefined,
): number | null => {
  if (grossPercent == null || !Number.isFinite(grossPercent)) return null;
  const commission = weightedCommission(validators);
  return commission == null ? grossPercent : grossPercent * (1 - commission);
};
