import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { DENOM } from '@/contants/network';
import { GAS_LIMIT, FEE_VALUE } from '@/contants';

export interface Coin {
  denom: string;
  amount: string;
}

export interface DelegationResponse {
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

interface IEntries {
  balance: string;
  completion_time: string;
  creation_height: string;
  initial_balance: string;
  unbonding_id: string;
  unbonding_on_hold_ref_count: string;
}

interface ValidatorUnbonding {
  delegator_address: string;
  validator_address: string;
  entries: IEntries[];
}

export interface AccountInfoData {
  balances: Coin[];
  delegations: DelegationResponse[];
  rewards: ValidatorRewards[];
  unbonding: ValidatorUnbonding[];
}

const useAccountInfo = () => {
  const { address, getClient } = useWalletConnect();

  const [accountInfo, setAccountInfo] = useState<AccountInfoData | null>({
    balances: [],
    delegations: [],
    rewards: [],
    unbonding: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isClaimLoading, setClaimLoading] = useState(false);
  const [errorClaim, setErrorClaim] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState({
    senderAddress: '',
    fees: FEE_VALUE,
    gas: GAS_LIMIT,
    memo: 'Claim rewards',
  });
  const [isClaimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<DelegationResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [balanceRes, delegationsRes, rewardsRes, resUnbonding] = await Promise.all([
        instance.get(`/cosmos/bank/v1beta1/balances/${address}`),
        instance.get(`/cosmos/staking/v1beta1/delegations/${address}`),
        instance.get(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`),
        instance.get(`/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`),
      ]);

      const balanceData = balanceRes.data;
      const delegationsData = delegationsRes.data;
      const rewardsData = rewardsRes.data;
      setAccountInfo({
        balances: balanceData.balances,
        delegations: delegationsData.delegation_responses,
        rewards: rewardsData.rewards,
        unbonding: resUnbonding.unbonding_responses,
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
      setAccountInfo({ balances: [], delegations: [], rewards: [], unbonding: [], });
      setLoading(false);
      setError(null);
      return;
    } else {
      setClaimInfo({
        ...claimInfo,
        senderAddress: address,
      });
    }

    fetchData();
  }, [address]);

  const handleClaimButtonClick = async () => {
    setErrorClaim(null);
    if (!claimInfo.senderAddress) {
      return;
    }
    setClaimLoading(true);
    try {
      const client = await getClient();
      const msgWithdraw = [];
      if (selectedClaim) {
        msgWithdraw.push({
          typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
          value: {
            delegatorAddress: selectedClaim.delegation.delegator_address,
            validatorAddress: selectedClaim.delegation.validator_address,
          },
        })
      } else {
        const { data } = await instance.get(`/cosmos/staking/v1beta1/delegations/${claimInfo.senderAddress}`);
        for (const item of data?.delegation_responses) {
          msgWithdraw.push({
            typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
            value: {
              delegatorAddress: item.delegation.delegator_address,
              validatorAddress: item.delegation.validator_address,
            },
          })
        }
      }
      let gasLimit = claimInfo.gas
      if (claimInfo.gas === GAS_LIMIT) {
        const gasEstimate = await client.simulate(claimInfo.senderAddress, msgWithdraw, claimInfo.memo);
        gasLimit = `${Math.round(gasEstimate * 1.3)}`;
      }

      let estimatedFee = claimInfo.fees;
      if (claimInfo.fees === FEE_VALUE) {
        estimatedFee = `${Math.ceil(Number(gasLimit) * 0.028)}`;// 0.028 ulume/gas
      }
      const fee = {
        amount: [{ denom: DENOM, amount: estimatedFee }],
        gas: gasLimit,
      };
      const result = await client.signAndBroadcast(claimInfo.senderAddress, msgWithdraw, fee, claimInfo.memo);
      if (result?.transactionHash) {
        setTransactionHash(result.transactionHash);
        // setClaimModalOpen(false);
        fetchData();
      }
    } catch (e) {
      // console.error('API Error:', e);
      if (e instanceof Error) {
        setErrorClaim(e.message);
      } else {
        setErrorClaim('An unknown error occurred.');
      }
    } finally {
      setClaimLoading(false);
    }
  }

  const handleClaimChange = (name: string, value: string) => {
    const currentClaimInfo = claimInfo;
    setClaimInfo({
      ...currentClaimInfo,
      [name]: value,
    })
  }

  const handleToggleClaimModal = (status: boolean) => {
    setClaimLoading(false);
    setClaimModalOpen(status);
    setSelectedClaim(null);
    setErrorClaim('');
  }

  const handleOpenModal = (modal: string) => {
    setSelectedModal(modal);
    setErrorClaim('');
  }

  const handleCloseModal = () => {
    setSelectedModal('');
    setSelectedClaim(null);
    setErrorClaim('');
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
    setClaimModalOpen(false);
    setClaimLoading(false);
    setSelectedClaim(null);
    setErrorClaim('');
  }

  const handleToggleClaimItemModal = (status: boolean, item: DelegationResponse) => {
    setClaimLoading(false);
    setClaimModalOpen(status);
    setErrorClaim('');
    if (!status) {
      setSelectedClaim(null);
    } else {
      setSelectedClaim(item);
    }
  }

  return {
    accountInfo,
    loading,
    error,
    isClaimLoading,
    errorClaim,
    claimInfo,
    isClaimModalOpen,
    selectedModal,
    transactionHash,
    selectedClaim,
    handleToggleClaimItemModal,
    handleCloseCongratulationsModal,
    handleClaimButtonClick,
    handleClaimChange,
    handleToggleClaimModal,
    handleOpenModal,
    handleCloseModal,
  };
};

export default useAccountInfo;
