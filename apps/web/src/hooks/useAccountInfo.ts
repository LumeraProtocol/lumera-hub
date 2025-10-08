import { useEffect, useState } from 'react';
import { useChain } from '@interchain-kit/react';
import { MsgWithdrawDelegatorReward, MsgWithdrawValidatorCommission } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';

import { CHAIN_NAME, DENOM } from '@/contants/network';
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
  const { address, getSigningClient } = useChain(CHAIN_NAME)

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
          const signingClient = await getSigningClient();

          if (!signingClient) {
            throw new Error('SigningClient không khả dụng sau khi init');
          }

          // create MsgWithdrawDelegatorReward
          const msg = [
              {
              typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
              value: MsgWithdrawDelegatorReward.fromPartial({
                delegatorAddress: address, // delegator address
                validatorAddress: item.delegation.validator_address, // Validator address
              }),
            },
            {
              typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
              value: MsgWithdrawValidatorCommission.fromPartial({
                validatorAddress: item.delegation.validator_address,
              }),
            }
          ];
          // Fee
          const fee = {
            amount: [{ denom: DENOM, amount: '2500' }],
            gas: '250000',
          };

          // Broadcast transaction
          const response = await signingClient.signAndBroadcast(
            address,
            msg,
            fee,
            `Withdraw staking rewards from ${item.delegation.validator_address}`
          );
          console.log(`Claim staking rewards thành công! Tx hash: ${response.transactionHash}`)
        }
        // fetchData();
      }
      
    } catch (e) {
      console.error('API Error:', e);
      // if (e instanceof Error) {
      //   setErrorClaim(e);
      // } else {
      //   setErrorClaim(new Error('An unknown error occurred.'));
      // }
    } finally {
      setLoading(false);
    }
  }

  return { accountInfo, loading, error, handleClaimButtonClick, isClaimLoading, errorClaim };
};

export default useAccountInfo;