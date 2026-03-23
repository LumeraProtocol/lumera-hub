import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { IValidator } from '@/types/validator';
import { ITransaction } from '@/hooks/useTransaction';

interface BaseAccount {
  "@type": string;
  address: string;
  pub_key: {
    "@type": string;
    key: string;
  } | null;
  account_number: string;
  sequence: string;
}

interface IDelegationResponses {
  balance: {
    amount: string;
    denom: string;
  };
  delegation: {
    delegator_address: string;
    shares: string;
    validator_address: string;
  }
}

type TReward = {
  amount: string;
  denom: string;
}

interface IRewards {
  validator_address: string;
  reward: TReward[];
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

interface IBalance {
  amount: string;
  denom: string;
}

const useAccount = () => {
  const params = useParams();
  const [isAccountLoading, setAccountLoading] = useState(false);
  const [account, setAccount] = useState<BaseAccount | null>(null);
  const [isDelegationsLoading, setDelegationsLoading] = useState(false);
  const [delegations, setDelegations] = useState<IDelegationResponses[]>([]);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isRewardsLoading, setRewardsLoading] = useState(false);
  const [rewards, setRewards] = useState<IRewards[]>([]);
  const [isUnbondingDelegationsLoading, setUnbondingDelegationsLoading] = useState(false);
  const [unbondingDelegations, setUnbondingDelegations] = useState<ValidatorUnbonding[]>([]);
  const [isTransactionsLoading, setTransactionsLoading] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [isRecentReceivedLoading, setRecentReceivedLoading] = useState(false);
  const [recentReceived, setRecentReceived] = useState<ITransaction[]>([]);
  const [isBalancesLoading, setBalancesLoading] = useState(false);
  const [balances, setBalances] = useState<IBalance[]>([]);
  const [delegationsTab, setDelegationsTab] = useState('delegations');

  const getBalances = async () => {
    if (!params?.validator) {
      return;
    }
    setBalancesLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/bank/v1beta1/balances/${params?.validator}`);
      setBalances(data?.balances);
    } catch (error) {
      console.error(error);
    }
    setBalancesLoading(false);
  }

  const getAccountInfo = async () => {
    if (!params?.validator) {
      return;
    }
    setAccountLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/auth/v1beta1/accounts/${params?.validator}`);
      setAccount(data?.account);
    } catch (error) {
      console.error(error);
    }
    setAccountLoading(false);
  }

  const getDelegationsInfo = async () => {
    if (!params?.validator) {
      return;
    }
    setDelegationsLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/staking/v1beta1/delegations/${params?.validator}`);
      setDelegations(data?.delegation_responses);
    } catch (error) {
      console.error(error);
    }
    setDelegationsLoading(false);
  }

  const getRewards = async () => {
    if (!params?.validator) {
      return;
    }
    setRewardsLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/distribution/v1beta1/delegators/${params?.validator}/rewards`);
      setRewards(data?.rewards);
    } catch (error) {
      console.error(error);
    }
    setRewardsLoading(false);
  }

  const getUnbondingDelegations = async () => {
    if (!params?.validator) {
      return;
    }
    setUnbondingDelegationsLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/staking/v1beta1/delegators/${params?.validator}/unbonding_delegations`);
      setUnbondingDelegations(data?.unbonding_responses);
    } catch (error) {
      console.error(error);
    }
    setUnbondingDelegationsLoading(false);
  }

  const getValidators = async () => {
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      setValidators(data.validators);
    } catch (e) {
      console.error('API Error:', e);
    }
  }

  const getTransactions = async () => {
    if (!params?.validator) {
      return;
    }
    setTransactionsLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs?query=message.sender=%27${params?.validator}%27&pagination.limit=20&pagination.offset=0`);
      setTransactions(data.tx_responses);
    } catch (e) {
      console.error('API Error:', e);
    }
    setTransactionsLoading(false);
  }

  const getRecentReceived = async () => {
    if (!params?.validator) {
      return;
    }
    setRecentReceivedLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs?&pagination.reverse=true&query=coin_received.receiver=%27${params?.validator}%27&pagination.limit=5&pagination.limit=20&pagination.count_total=true`);
      setRecentReceived(data.tx_responses);
    } catch (e) {
      console.error('API Error:', e);
    }
    setRecentReceivedLoading(false);
  }

  useEffect(() => {
    getRewards();
    getBalances();
    getRecentReceived();
    getTransactions();
    getUnbondingDelegations();
    getValidators();
    getAccountInfo();
    getDelegationsInfo();
  }, [params?.validator]);

  const handleDelegationsTabChange = (val: string) => {
    setDelegationsTab(val);
  }

  return {
    isAccountLoading,
    isDelegationsLoading,
    delegations,
    account,
    validators,
    address: params?.validator,
    isRewardsLoading,
    rewards,
    isUnbondingDelegationsLoading,
    unbondingDelegations,
    isTransactionsLoading,
    transactions,
    isRecentReceivedLoading,
    recentReceived,
    isBalancesLoading,
    balances,
    delegationsTab,
    handleDelegationsTabChange,
  }
}

export default useAccount;
