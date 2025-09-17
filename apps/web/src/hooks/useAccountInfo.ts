import { useEffect, useState } from 'react';
import { useChain } from '@interchain-kit/react'

import { CHAIN_NAME, REST_AI_URL } from '@/contants/network';
import * as instance from '@/utils/api';


export interface Coin {
  denom: string;
  amount: string;
}

interface DelegationResponse {
  delegation: {
    delegator_address: string;
    validator_address: string;
    shares: string;
  };
  balance: Coin
}

interface ValidatorRewards {
  validator_address: string;
  reward: Coin[];
}

export interface AccountInfoData {
  balances: Coin[];
  delegations: DelegationResponse[];
  rewards: ValidatorRewards[];
}

const useAccountInfo = () => {
  const { address } = useChain(CHAIN_NAME)

  const [accountInfo, setAccountInfo] = useState<AccountInfoData | null>({
    balances: [],
    delegations: [],
    rewards: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isClaimLoading, setClaimLoading] = useState(false);
  const [errorClaim, setErrorClaim] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [balanceRes, delegationsRes, rewardsRes] = await Promise.all([
        instance.get(`/cosmos/bank/v1beta1/balances/${address}`),
        instance.get(`/cosmos/staking/v1beta1/delegations/${address}`),
        instance.get(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`),
      ]);

      const balanceData = balanceRes.data;
      const delegationsData = delegationsRes.data;
      const rewardsData = rewardsRes.data;
      setAccountInfo({
        balances: balanceData.balances,
        delegations: delegationsData.delegation_responses,
        rewards: rewardsData.rewards,
      });
    } catch (e) {
      console.error('API Error:', e);
      if (e instanceof Error) {
        setError(e);
      } else {
        setError(new Error('An unknown error occurred.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!address) {
      setAccountInfo({ balances: [], delegations: [], rewards: [] });
      setLoading(false);
      setError(null);
      return;
    }

    fetchData();
  }, [address]);

  const handleClaimButtonClick = async () => {
    setErrorClaim(null);
    if (!address) {
      return;
    }
    setClaimLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/staking/v1beta1/delegations/${address}`);
      if (data?.delegation_responses?.length) {
        for (const item of data?.delegation_responses) {
          await Promise.all([
            instance.post(`/cosmos.distribution.v1beta1.Msg/WithdrawDelegatorReward`, {
              delegator_address: item.delegation.delegator_address,
              validator_address: item.delegation.validator_address,
            }),
            instance.post(`/cosmos.distribution.v1beta1.Msg/WithdrawValidatorCommission`, {
              alidator_address: item.delegation.validator_address,
            }),
          ]);
        }
        fetchData();
      }
    } catch (e) {
      console.error('API Error:', e);
      if (e instanceof Error) {
        setErrorClaim(e);
      } else {
        setErrorClaim(new Error('An unknown error occurred.'));
      }
    } finally {
      setLoading(false);
    }
  }

  return { accountInfo, loading, error, handleClaimButtonClick, isClaimLoading, errorClaim };
};

export default useAccountInfo;