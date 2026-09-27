import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import { accountAddressFromValoper } from '@/utils/consensus-address';

export type ValidatorProfile = {
  /** Operator's own delegation, in micro-denom. */
  selfBondedMicro: number | null;
  /** Total delegator count reported by pagination. */
  delegators: number | null;
  /** Keybase avatar for the validator's identity, when it publishes one. */
  logo: string | null;
  isLoading: boolean;
};

const EMPTY: ValidatorProfile = {
  selfBondedMicro: null,
  delegators: null,
  logo: null,
  isLoading: false,
};

// Keybase lookups are slow and rate-limited, so a resolved picture is kept for
// the life of the tab.
const logoCache = new Map<string, string | null>();

const fetchKeybaseLogo = async (identity: string) => {
  if (!/^[0-9A-Fa-f]{16}$/.test(identity)) return null;
  if (logoCache.has(identity)) return logoCache.get(identity) ?? null;
  try {
    const response = await fetch(
      `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`,
    );
    const json = await response.json();
    const url = json?.them?.[0]?.pictures?.primary?.url || null;
    logoCache.set(identity, url);
    return url;
  } catch {
    logoCache.set(identity, null);
    return null;
  }
};

/**
 * The parts of a validator profile that are not in the staking list response:
 * how much the operator has staked on itself, how many delegators it has, and
 * its Keybase picture.
 *
 * Self-bond matters because it is the operator's own money at risk, and it is
 * the one number the list view cannot show.
 */
const useValidatorProfile = (operatorAddress?: string, identity?: string) => {
  const [profile, setProfile] = useState<ValidatorProfile>(EMPTY);

  useEffect(() => {
    if (!operatorAddress) {
      setProfile(EMPTY);
      return;
    }
    let cancelled = false;
    setProfile({ ...EMPTY, isLoading: true });

    const run = async () => {
      const selfAccount = accountAddressFromValoper(operatorAddress);

      const [selfRes, delegatorsRes, logo] = await Promise.all([
        selfAccount
          ? instance
              .get(
                `/cosmos/staking/v1beta1/validators/${operatorAddress}/delegations/${selfAccount}`,
              )
              .catch(() => null)
          : Promise.resolve(null),
        instance
          .get(
            `/cosmos/staking/v1beta1/validators/${operatorAddress}/delegations?pagination.limit=1&pagination.count_total=true`,
          )
          .catch(() => null),
        identity ? fetchKeybaseLogo(identity) : Promise.resolve(null),
      ]);

      if (cancelled) return;

      const selfAmount = selfRes?.data?.delegation_response?.balance?.amount;
      const total = delegatorsRes?.data?.pagination?.total;

      setProfile({
        selfBondedMicro: selfAmount != null ? Number(selfAmount) : null,
        delegators: total != null ? Number(total) : null,
        logo: logo ?? null,
        isLoading: false,
      });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [identity, operatorAddress]);

  return profile;
};

export default useValidatorProfile;
