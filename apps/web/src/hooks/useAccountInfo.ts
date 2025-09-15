import { useEffect, useState } from 'react';
import { useChain } from '@interchain-kit/react'
import axios from 'axios';

import { CHAIN_NAME, REST_AI_URL } from '@/contants/network';

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

interface AccountInfoHookResult {
  accountInfo: AccountInfoData | null;
  loading: boolean;
  error: Error | null;
}

const useAccountInfo = (): AccountInfoHookResult => {
  const { address } = useChain(CHAIN_NAME)

  const [accountInfo, setAccountInfo] = useState<AccountInfoData | null>({
    balances: [],
    delegations: [],
    rewards: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);


  useEffect(() => {
    if (!address) {
      setAccountInfo({ balances: [], delegations: [], rewards: [] });
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [balanceRes, delegationsRes, rewardsRes] = await Promise.all([
          axios.get(`${REST_AI_URL}/cosmos/bank/v1beta1/balances/${address}`),
          axios.get(`${REST_AI_URL}/cosmos/staking/v1beta1/delegations/${address}`),
          axios.get(`${REST_AI_URL}/cosmos/distribution/v1beta1/delegators/${address}/rewards`),
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

    fetchData();
  }, [address]);

  return { accountInfo, loading, error };
};

export default useAccountInfo;