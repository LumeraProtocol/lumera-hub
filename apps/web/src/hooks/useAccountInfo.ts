import { useEffect, useState } from 'react';
import { useChain, useChainWallet } from '@interchain-kit/react'

import { CHAIN_NAME } from '@/contants/chain';

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
  const { chain } = useChainWallet(CHAIN_NAME, address)

  const [accountInfo, setAccountInfo] = useState<AccountInfoData | null>({
    balances: [],
    delegations: [],
    rewards: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);


  useEffect(() => {
    if (!address || !chain?.apis?.rest?.[0]?.address) {
      setAccountInfo({ balances: [], delegations: [], rewards: [] });
      setLoading(false);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const restUrl = chain?.apis?.rest?.[0]?.address;

      try {
        const [balanceRes, delegationsRes, rewardsRes] = await Promise.all([
          fetch(`${restUrl}/cosmos/bank/v1beta1/balances/${address}`),
          fetch(`${restUrl}/cosmos/staking/v1beta1/delegations/${address}`),
          fetch(`${restUrl}/cosmos/distribution/v1beta1/delegators/${address}/rewards`),
        ]);

        if (!balanceRes.ok || !delegationsRes.ok || !rewardsRes.ok) {
          throw new Error('Failed to fetch account data. Check network status or address.');
        }

        const balanceData = await balanceRes.json();
        const delegationsData = await delegationsRes.json();
        const rewardsData = await rewardsRes.json();
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
  }, [address, chain]);

  return { accountInfo, loading, error };
};

export default useAccountInfo;