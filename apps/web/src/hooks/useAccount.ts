import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { IValidator } from '@/types/validator';
import { ITransaction } from '@/hooks/useTransaction';
import { SNSCOPE_URL } from '@/contants/network';
import { formatTokenDisplay } from '@/utils/format';
import { IActionDetail } from '@/types';

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

interface ICascade {
  block_height: number;
  creator: string;
  decoded: {
    data_hash: string;
    file_name: string;
    rq_ids_ic: number;
    rq_ids_ids: string[];
    rq_ids_max: number;
    signatures: string;
    public?: boolean;
  };
  finalize_tx_id: string;
  finalize_tx_time: string;
  id: string;
  mime_type: string;
  price: {
    amount: string;
    denom: string;
  };
  register_tx_id: string;
  register_tx_time: string;
  size: number;
  fee: string;
  state: string;
  type: string;
}

const useAccount = () => {
  const params = useParams();
  const [isAccountLoading, setAccountLoading] = useState(false);
  const [account, setAccount] = useState<BaseAccount | null>(null);
  const [isDelegationsLoading, setDelegationsLoading] = useState(false);
  const [delegations, setDelegations] = useState<IDelegationResponses[]>([]);
  const [isValidatorsLoading, setValidatorsLoading] = useState(false);
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
  const [isCascadeFilesLoading, setCascadeFilesLoading] = useState(false);
  const [cascades, setCascades] = useState<ICascade[]>([]);

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
    setValidatorsLoading(true);
    try {
      const [undondingRes, unbondedRes] = await Promise.all([
        instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true'),
        instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_UNBONDED'),
      ]);
      const allValidators = [...undondingRes.data.validators, ...unbondedRes.data.validators] as IValidator[];
      setValidators(allValidators);
    } catch (e) {
      console.error('API Error:', e);
    }
    setValidatorsLoading(false);
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

  const fetchAction = async (actionId = ''): Promise<IActionDetail | null> => {
    if (!actionId) {
      return null;
    }
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/actions/${actionId}`);
      return data;
    } catch {
      return null
    }
  };

  const getAction = async (actionId: string) => {
    if (!actionId) {
      return {
        fee: '0 LUME',
        size: 0,
        register_tx_id: '',
      };
    }
    const action = await fetchAction(actionId);
    let fee = '0 LUME';
    if (action) {
      const transaction = action.transactions?.find((tx) => tx.tx_type === 'register');
      if (transaction) {
        fee = `${formatTokenDisplay({
          amount: transaction.tx_fee,
          denom: transaction.tx_fee_denom,
        })} LUME`;
      }
    }
    return {
      fee,
    };
  }

  const getCascadeFiles = async () => {
    if (!params?.validator) {
      return;
    }
    setCascadeFilesLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/actions?type=ACTION_TYPE_CASCADE&limit=50&creator=${params?.validator}`);
      const results = [];
      for (const item of data.items) {
        const { fee } = await getAction(item.id);
        results.push({
          ...item,
          fee,
        })
      }
      setCascades(results);
    } catch (e) {
      console.error('API Error:', e);
    }
    setCascadeFilesLoading(false);
  }

  useEffect(() => {
    getCascadeFiles();
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
    isCascadeFilesLoading,
    cascades,
    isValidatorsLoading,
    handleDelegationsTabChange,
  }
}

export default useAccount;
