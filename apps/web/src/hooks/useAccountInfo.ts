import { useEffect, useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, DENOM } from '@/contants/network';

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
  const { address, getOfflineSigner } = useWalletConnect();

  const [accountInfo, setAccountInfo] = useState<AccountInfoData | null>({
    balances: [],
    delegations: [],
    rewards: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isClaimLoading, setClaimLoading] = useState(false);
  const [errorClaim, setErrorClaim] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState({
    senderAddress: '',
    fees: '2000',
    gas: '200000',
    memo: 'Claim rewards',
  });
  const [isClaimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState('');
  const [transactionHash, setTransactionHash] = useState('');

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

    if (address) {
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
      const offlineSigner = await getOfflineSigner();
      if (!offlineSigner) {
        setErrorClaim('Please connect wallet before using');
        return;
      }
      const client = await SigningStargateClient.connectWithSigner(
        RPC_ENDPOINT,
        offlineSigner,
        {
          registry: new Registry([
            ["/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward", MsgWithdrawDelegatorReward],
          ]),
        }
      );
      const msgWithdraw = [];
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
      const fee = {
        amount: [{ denom: DENOM, amount: claimInfo.fees }], // Fee gas
        gas: claimInfo.gas, // Gas limit
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
  }

  const handleOpenModal = (modal: string) => {
    setSelectedModal(modal);
  }

  const handleCloseModal = () => {
    setSelectedModal('');
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
    setClaimModalOpen(false);
    setClaimLoading(false);
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
    handleCloseCongratulationsModal,
    handleClaimButtonClick,
    handleClaimChange,
    handleToggleClaimModal,
    handleOpenModal,
    handleCloseModal,
  };
};

export default useAccountInfo;
