import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';
import { DENOM } from '@/contants/network';
import { useSelector, useDispatch } from '@/redux/hooks';
import { isNumber } from '@/utils/helpers';
import { setCurrentTab, setValidatorTab, setSubTab } from '@/redux/app.slice';
import { IValidator } from '@/types/validator';
import { TUnbondingDelegation } from '@/types';

const useStaking = (address = '') => {
  const dispatch = useDispatch();
  const { currentTab, validatorTab, subTab } = useSelector((state) => state.app);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [totalValidators, setTotalValidators] = useState('0');
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
  const [rewards, setRewards] = useState([]);
  const [isActivitiesLoading, setActivitiesLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesError, setActivitiesError] = useState('');
  const [isUnbondingDelegationsLoading, setUnbondingDelegationsLoading] = useState(false);
  const [unbondingDelegations, setUnbondingDelegations] = useState<TUnbondingDelegation[]>([]);
  const [unbondingDelegationsError, setUnbondingDelegationsError] = useState('');
  const [apr, setAPR] = useState(0);
  const [isAPRLoading, setAPRLoading] = useState(false);
  const [bondedTokens, setBondedTokens] = useState(0);
  const [selectedModal, setSelectedModal] = useState('');
  const [selectedData, setSelectedData] = useState({
    validator: '',
    amount: '',
    customMemo: '',
    rewards: '',
  })

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

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    setActivitiesError('');
    try {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs?query=message.sender=%27${address}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC`);
      setActivities(data.tx_responses);
    } catch (error) {
      setActivitiesError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setActivitiesLoading(false);
  }, [])

  const fetchUnbondingDelegations = useCallback(async () => {
    setUnbondingDelegationsLoading(true);
    setUnbondingDelegationsError('');
    try {
      const [unbondingRes, redelegationsRes] = await Promise.all([
        instance.get(`/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`),
        instance.get(`/cosmos/staking/v1beta1/delegators/${address}/redelegations`),
      ]);
      const items: TUnbondingDelegation[] = unbondingRes.data.unbonding_responses.map((item: TUnbondingDelegation) => ({
        ...item,
        completion_time: item.entries[0].completion_time,
        type: 'unbonding',
      }));
      for (const item of redelegationsRes.data.redelegation_responses) {
        items.push({
          delegator_address: item.redelegation.delegator_address,
          validator_address: item.redelegation.validator_dst_address,
          validator_src_address: item.redelegation.validator_src_address,
          validator_dst_address: item.redelegation.validator_dst_address,
          type: 'redelegations',
          completion_time: item.entries[0].redelegation_entry.completion_time,
          entries: [{
            creation_height: item.entries[0].redelegation_entry.creation_height,
            completion_time: item.entries[0].redelegation_entry.completion_time,
            initial_balance: item.entries[0].redelegation_entry.initial_balance,
            unbonding_id: item.entries[0].redelegation_entry.unbonding_id,
            unbonding_on_hold_ref_count: '',
            balance: item.entries[0].balance,
          }]
        })
      }
      setUnbondingDelegations(items.sort((a, b) => dayjs(a.completion_time).valueOf() - dayjs(b.completion_time).valueOf()));
    } catch (error) {
      setUnbondingDelegationsError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setUnbondingDelegationsLoading(false);
  }, []);

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
      setAPR(isNumber(aprVal) ? aprVal * 100 : 0);
      setBondedTokens(bondedTokens);
    } catch (error) {
      console.error('fetchDataForAPR', error);
    }
    setAPRLoading(false);
  }

  const handleFetchDataForSubTab = useCallback((_subTab: string) => {
    switch (_subTab) {
      case 'activities':
        fetchActivities();
        break;
      case 'unstake':
        fetchUnbondingDelegations();
        break;
      default:
        break;
    }
  }, [fetchActivities, fetchUnbondingDelegations]);

  useEffect(() => {
    fetchValidator();
    if (validatorTab === 'all') {
      fetchParams();
      fetchDataForAPR();
    }
  }, [validatorTab]);

  useEffect(() => {
    if (address) {
      if (validatorTab === 'my') {
        handleFetchDataForSubTab(subTab);
      }
      fetchRewards();
    }
  }, [address, validatorTab, subTab]);

  const handleTabChange = (tab: string) => {
    dispatch(setCurrentTab({
      currentTab: tab,
    }));
  }

  const handleValidatorTabChange = (tab: string) => {
    dispatch(setValidatorTab({
      validatorTab: tab,
    }));
  }

  const handleSubTabChange = (tab: string) => {
    dispatch(setSubTab({
      subTab: tab,
    }));
    handleFetchDataForSubTab(tab);
  }

  const handleOpenModal = (name: string) => {
    setSelectedModal(name)
  }

  const handleCloseModal = () => {
    setSelectedModal('');
    setSelectedData({
      validator: '',
      amount: '',
      customMemo: '',
      rewards: '',
    });
  }

  const handleShowConfirmModal = (
    name: string,
    validator: string,
    amount: string,
    customMemo: string,
    rewards: string,
  ) => {
    handleOpenModal(name);
    setSelectedData({
      validator,
      amount,
      customMemo,
      rewards,
    })
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
    selectedModal,
    selectedData,
    fetchUnbondingDelegations,
    handleShowConfirmModal,
    handleOpenModal,
    handleCloseModal,
    handleSubTabChange,
    handleValidatorTabChange,
    handleTabChange,
  }
}

export default useStaking;
