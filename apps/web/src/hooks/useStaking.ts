import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';
import { DENOM } from '@/contants/network';
import { IValidator } from '@/types/validator';

const useStaking = (address = '') => {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [totalValidators, setTotalValidators] = useState('0');
  const [currentTab, setCurrentTab] = useState('active');
  const [params, setParams] = useState({
      bond_denom: "ulume",
      historical_entries: 0,
      max_entries: 0,
      max_validators: 0,
      min_commission_rate: '0',
      unbonding_time: '0',
  });
  const [slashingParams, setSlashingParams] = useState({
      signed_blocks_window: "0",
      min_signed_per_window: "0",
      downtime_jail_duration: "0s",
      slash_fraction_double_sign: "0",
      slash_fraction_downtime: "0"
  });
  const [signingInfos, setSigningInfos] = useState([]);
  const [validatorTab, setValidatorTab] = useState('all');
  const [rewards, setRewards] = useState([]);
  const [subTab, setSubTab] = useState('delegations');
  const [isActivitiesLoading, setActivitiesLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesError, setActivitiesError] = useState('');
  const [isUnbondingDelegationsLoading, setUnbondingDelegationsLoading] = useState(false);
  const [unbondingDelegations, setUnbondingDelegations] = useState([]);
  const [unbondingDelegationsError, setUnbondingDelegationsError] = useState('');
  const [apr, setAPR] = useState(0);
  const [isAPRLoading, setAPRLoading] = useState(false);
  const [bondedTokens, setBondedTokens] = useState(0);

  const fetchValidator = async () => {
    setLoading(true);
    try {
      const [undondingRes, unbondedRes] = await Promise.all([
        instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_UNBONDING&pagination.count_total=true'),
        instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_UNBONDED'),
      ]);
      const allValidators = [...undondingRes.data.validators, ...unbondedRes.data.validators] as IValidator[];
      setValidators(allValidators);
      setTotalValidators(`${allValidators.length}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setLoading(false);
  }

  const fetchParams = async () => {
    setLoading(true);
    try {
      const [stakingParamsRes, slashingParamsRes, signingInfosRes] = await Promise.all([
        instance.get('/cosmos/staking/v1beta1/params'),
        instance.get('/cosmos/slashing/v1beta1/params'),
        instance.get('/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300'),
      ]);
      setParams(stakingParamsRes.data.params);
      setSlashingParams(slashingParamsRes.data.params);
      setSigningInfos(signingInfosRes.data.info);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setLoading(false);
  }

  const fetchRewards = async () => {
    try {
      const { data } = await instance.get(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`);
      setRewards(data.rewards);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  }

  const fetchActivities = async () => {
    setActivitiesLoading(true);
    setActivitiesError('');
    try {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs?query=message.sender=%27${address}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC`);
      setActivities(data.tx_responses);
    } catch (error) {
      setActivitiesError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setActivitiesLoading(false);
  }

  const fetchUnbondingDelegations = async () => {
    setUnbondingDelegationsLoading(true);
    setUnbondingDelegationsError('');
    try {
      const { data } = await instance.get(`/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`);
      setUnbondingDelegations(data.unbonding_responses);
    } catch (error) {
      setUnbondingDelegationsError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setUnbondingDelegationsLoading(false);
  }

  const fetchDataForAPR = async () => {
    setAPRLoading(true);
    try {
      const [resInflation, resPool, resSupply, resParams] = await Promise.all([
        instance.get('/cosmos/mint/v1beta1/inflation'),
        instance.get('/cosmos/staking/v1beta1/pool'),
        instance.get('/cosmos/bank/v1beta1/supply'),
        instance.get('/cosmos/distribution/v1beta1/params'),
      ]);
      let totalSupply = 0;
      for (const item of resSupply.data.supply) {
        if (item.denom === DENOM) {
          totalSupply += Number(item.amount);
        }
      }
      const inflation = Number(resInflation.data.inflation);
      const communityTax = Number(resParams.data.params.community_tax);
      const bondedTokens = Number(resPool.data.pool.bonded_tokens);
      const bondedRatio =  bondedTokens / totalSupply;
      const aprVal = inflation / bondedRatio * (1 - communityTax);
      setAPR(aprVal * 100);
      setBondedTokens(bondedTokens);
    } catch (error) {
      console.error(error)
    }
    setAPRLoading(false);
  }

  useEffect(() => {
    if (validatorTab === 'all') {
      fetchValidator();
      fetchParams();
      fetchDataForAPR();
    }
  }, []);

  useEffect(() => {
    if (address) {
      if (validatorTab === 'my') {
        if (subTab === 'activities') {
          fetchActivities();
        }
        if (subTab === 'unstake') {
          fetchUnbondingDelegations();
        }
      }
      if (validatorTab === 'all') {
        fetchRewards();
      }
    }
  }, [address]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  }

  const handleValidatorTabChange = (tab: string) => {
    setValidatorTab(tab);
  }

  const handleSubTabChange = (tab: string) => {
    setSubTab(tab);
    if (tab === 'activities') {
      fetchActivities();
    }
    if (tab === 'unstake') {
      fetchUnbondingDelegations();
    }
  }

  return {
    isLoading,
    error,
    validators,
    totalValidators,
    currentTab,
    params,
    slashingParams,
    signingInfos,
    validatorTab,
    rewards,
    subTab,
    isActivitiesLoading,
    activities,
    activitiesError,
    isUnbondingDelegationsLoading,
    unbondingDelegations,
    unbondingDelegationsError,
    apr,
    isAPRLoading,
    bondedTokens,
    handleSubTabChange,
    handleValidatorTabChange,
    handleTabChange,
  }
}

export default useStaking;
