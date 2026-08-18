import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import useTrackingHubTransaction from '@/hooks/useTrackingHubTransaction';
import { DENOM } from '@/contants/network';
import { GAS_LIMIT, FEE_VALUE, GAS_RATIO, FEE_RATIO } from '@/contants';
import { evmBalanceToMicroLume, getEvmBalance } from '@/utils/evm';

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

export interface ValidatorRewards {
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

export interface ValidatorUnbonding {
  delegator_address: string;
  validator_address: string;
  entries: IEntries[];
}

/** The `cosmos.auth.v1beta1.BaseAccount` record shown at the top of the account page. */
export interface BaseAccount {
  '@type': string;
  address: string;
  pub_key: {
    '@type': string;
    key: string;
  } | null;
  account_number: string;
  sequence: string;
}

export interface AccountInfoData {
  balances: Coin[];
  delegations: DelegationResponse[];
  rewards: ValidatorRewards[];
  rewardTotal?: Coin[];
  unbonding: ValidatorUnbonding[];
}

interface AccountInfoApiResponse<T> {
  data: T;
}

interface FetchEvmAccountInfoOptions {
  ethAddress: string;
  bech32Address: string;
  getBalance?: (address: string) => Promise<string>;
  get?: (path: string) => Promise<AccountInfoApiResponse<unknown>>;
}

export const fetchEvmAccountInfo = async ({
  ethAddress,
  bech32Address,
  getBalance = getEvmBalance,
  get = instance.get,
}: FetchEvmAccountInfoOptions): Promise<AccountInfoData> => {
  if (!bech32Address) {
    throw new Error('Cannot query staking data without a Bech32 address.');
  }

  const [balance, delegationsRes, rewardsRes, unbondingRes] = await Promise.all([
    getBalance(ethAddress),
    get(`/cosmos/staking/v1beta1/delegations/${bech32Address}`),
    get(`/cosmos/distribution/v1beta1/delegators/${bech32Address}/rewards`),
    get(`/cosmos/staking/v1beta1/delegators/${bech32Address}/unbonding_delegations`),
  ]);
  const delegationsData = delegationsRes.data as { delegation_responses?: DelegationResponse[] };
  const rewardsData = rewardsRes.data as { rewards?: ValidatorRewards[]; total?: Coin[] };
  const unbondingData = unbondingRes.data as { unbonding_responses?: ValidatorUnbonding[] };

  return {
    balances: [{ denom: DENOM, amount: evmBalanceToMicroLume(balance) }],
    delegations: delegationsData.delegation_responses || [],
    rewards: rewardsData.rewards || [],
    rewardTotal: rewardsData.total || [],
    unbonding: unbondingData.unbonding_responses || [],
  };
};

interface FetchAccountInfoOptions {
  get?: (path: string) => Promise<AccountInfoApiResponse<unknown>>;
}

export const fetchAccountInfo = async (
  address: string,
  { get = instance.get }: FetchAccountInfoOptions = {},
): Promise<AccountInfoData> => {
  const [balanceRes, delegationsRes, rewardsRes, unbondingRes] = await Promise.all([
    get(`/cosmos/bank/v1beta1/balances/${address}`),
    get(`/cosmos/staking/v1beta1/delegations/${address}`),
    get(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`),
    get(`/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`),
  ]);
  const balanceData = balanceRes.data as { balances?: Coin[] };
  const delegationsData = delegationsRes.data as { delegation_responses?: DelegationResponse[] };
  const rewardsData = rewardsRes.data as { rewards?: ValidatorRewards[]; total?: Coin[] };
  const unbondingData = unbondingRes.data as { unbonding_responses?: ValidatorUnbonding[] };

  return {
    balances: balanceData.balances || [],
    delegations: delegationsData.delegation_responses || [],
    rewards: rewardsData.rewards || [],
    rewardTotal: rewardsData.total || [],
    unbonding: unbondingData.unbonding_responses || [],
  };
};

/**
 * Reads the on-chain account record. Returns `null` for an address that has
 * never appeared on chain, which the account page renders as "no account".
 */
export const fetchBaseAccount = async (
  address: string,
  { get = instance.get }: FetchAccountInfoOptions = {},
): Promise<BaseAccount | null> => {
  const { data } = await get(`/cosmos/auth/v1beta1/accounts/${address}`);
  return (data as { account?: BaseAccount }).account ?? null;
};

export const getTotalRewards = (accountInfo: AccountInfoData | null) => {
  if (accountInfo?.rewardTotal) {
    return accountInfo.rewardTotal.reduce((total, reward) => {
      if (reward.denom === DENOM) {
        return total + Number(reward.amount);
      }
      return total;
    }, 0);
  }

  let total = 0;
  if (accountInfo?.rewards?.length) {
    for (const item of accountInfo?.rewards) {
      for (const reward of item.reward) {
        if (reward.denom === DENOM) {
          total += Number(reward.amount);
        }
      }
    }
  }
  return total;
}

const useAccountInfo = () => {
  const { trackingHubTransaction } = useTrackingHubTransaction();
  const { address, bech32Address, getClient, isEvm } = useWalletConnect();

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
    senderAddress: address,
    fees: FEE_VALUE,
    gas: GAS_LIMIT,
    memo: 'Claim rewards',
    totalRewards: '0',
  });
  const [isClaimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedModal, setSelectedModal] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<DelegationResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isEvm) {
        const _accountInfo = await fetchEvmAccountInfo({
          ethAddress: address,
          bech32Address,
        });
        setAccountInfo(_accountInfo);
        setClaimInfo((current) => ({
          ...current,
          totalRewards: `${getTotalRewards(_accountInfo)}`,
        }));
        return;
      }

      const _accountInfo = await fetchAccountInfo(address);
      setAccountInfo(_accountInfo);
      setClaimInfo({
        ...claimInfo,
        totalRewards: `${getTotalRewards(_accountInfo)}`,
      })
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
  }, [address, bech32Address, isEvm]);

  const handleClaimButtonClick = async () => {
    setErrorClaim(null);
    if (isEvm) {
      setErrorClaim('Staking rewards require a Keplr wallet connection.');
      return;
    }
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
        gasLimit = `${Math.ceil(gasEstimate * GAS_RATIO)}`;
      }

      let estimatedFee = claimInfo.fees;
      if (claimInfo.fees === FEE_VALUE) {
        estimatedFee = `${Math.ceil(Number(gasLimit) * FEE_RATIO)}`;// 0.028 ulume/gas
      }
      const fee = {
        amount: [{ denom: DENOM, amount: estimatedFee }],
        gas: gasLimit,
      };
      const result = await client.signAndBroadcast(claimInfo.senderAddress, msgWithdraw, fee, claimInfo.memo);
      if (result?.transactionHash) {
        setTransactionHash(result.transactionHash);
        await trackingHubTransaction({
          hash: result.transactionHash,
          creator: address,
          message_type: 'cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
          price: 0,
        });
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
    fetchData();
    if (!status) {
      setTransactionHash('');
    }
  }

  const handleOpenModal = (modal: string) => {
    setSelectedModal(modal);
    setErrorClaim('');
  }

  const handleCloseModal = () => {
    setSelectedModal('');
    setSelectedClaim(null);
    setErrorClaim('');
    fetchData();
    setTransactionHash('');
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
    setClaimModalOpen(false);
    setClaimLoading(false);
    setSelectedClaim(null);
    setErrorClaim('');
    fetchData();
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
    if (!status) {
      setTransactionHash('');
    }
    fetchData();
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
    fetchData,
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
