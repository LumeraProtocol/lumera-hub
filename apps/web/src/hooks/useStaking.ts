import { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';
import { CHAIN_ID, DENOM } from '@/contants/network';
import { useSelector, useDispatch } from '@/redux/hooks';
import { isNumber } from '@/utils/helpers';
import { canQueryCosmosAccountData } from '@/utils/cosmos-transactions';
import { setCurrentTab, setValidatorTab, setSubTab } from '@/redux/app.slice';
import { IValidator } from '@/types/validator';
import { TUnbondingDelegation } from '@/types';
import { BONDED_VALIDATORS_PATH } from '@/utils/staking-validators';
import {
  readStakingOverviewCache,
  writeStakingOverviewCache,
  getStakingRefreshProgress,
  getStakingAutoRefreshDelay,
  STAKING_REFRESH_RETRY_DELAY_MS,
  type StakingOverviewCache,
  type StakingParams,
  type SlashingParams,
} from '@/utils/staking-overview-cache';

const DEFAULT_STAKING_PARAMS: StakingParams = {
  bond_denom: DENOM,
  historical_entries: 0,
  max_entries: 0,
  max_validators: 0,
  min_commission_rate: '0',
  unbonding_time: '0',
};

const DEFAULT_SLASHING_PARAMS: SlashingParams = {
  signed_blocks_window: '0',
  min_signed_per_window: '0',
  downtime_jail_duration: '0s',
  slash_fraction_double_sign: '0',
  slash_fraction_downtime: '0',
};

const PUBLIC_STAKING_REQUEST_COUNT = 10;

interface ApiResponse<T> {
  data: T;
}

interface ValidatorsResponse {
  validators: IValidator[];
  pagination?: { total?: string };
}

const useStaking = (address = '', isEvm = false) => {
  const dispatch = useDispatch();
  const { currentTab, validatorTab, subTab } = useSelector((state) => state.app);
  const [error, setError] = useState('');
  const [activeValidators, setActiveValidators] = useState<IValidator[]>([]);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [totalValidators, setTotalValidators] = useState('0');
  const [params, setParams] = useState<StakingParams>(DEFAULT_STAKING_PARAMS);
  const [slashingParams, setSlashingParams] = useState<SlashingParams>(DEFAULT_SLASHING_PARAMS);
  const [signingInfos, setSigningInfos] = useState<StakingOverviewCache['signingInfos']>([]);
  const [hasLoadedOverview, setHasLoadedOverview] = useState(false);
  const [isRefreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isCacheReady, setCacheReady] = useState(false);
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const refreshingRef = useRef(false);
  const initializedRef = useRef(false);
  const [rewards, setRewards] = useState([]);
  const [isActivitiesLoading, setActivitiesLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesError, setActivitiesError] = useState('');
  const [isUnbondingDelegationsLoading, setUnbondingDelegationsLoading] = useState(false);
  const [unbondingDelegations, setUnbondingDelegations] = useState<TUnbondingDelegation[]>([]);
  const [unbondingDelegationsError, setUnbondingDelegationsError] = useState('');
  const [apr, setAPR] = useState(0);
  const [bondedTokens, setBondedTokens] = useState(0);
  const [selectedModal, setSelectedModal] = useState('');
  const [selectedData, setSelectedData] = useState({
    validator: '',
    amount: '',
    customMemo: '',
    rewards: '',
  })

  const applyOverview = useCallback((overview: StakingOverviewCache) => {
    setActiveValidators(overview.activeValidators);
    setValidators(overview.inactiveValidators);
    setTotalValidators(overview.activeValidatorTotal);
    setParams(overview.params);
    setSlashingParams(overview.slashingParams);
    setSigningInfos(overview.signingInfos);
    setAPR(overview.apr);
    setBondedTokens(overview.bondedTokens);
    setLastUpdated(overview.updatedAt);
    setHasLoadedOverview(true);
  }, []);

  const refreshOverview = useCallback(async () => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setRefreshing(true);
    setRefreshProgress(0);
    setError('');
    let completedRequests = 0;
    const track = async <T,>(request: Promise<T>): Promise<T> => {
      try {
        return await request;
      } finally {
        completedRequests += 1;
        setRefreshProgress(getStakingRefreshProgress(
          completedRequests,
          PUBLIC_STAKING_REQUEST_COUNT,
        ));
      }
    };

    try {
      const results = await Promise.allSettled([
        track(instance.get(BONDED_VALIDATORS_PATH)),
        track(instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_UNBONDING&pagination.count_total=true')),
        track(instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_UNBONDED')),
        track(instance.get('/cosmos/staking/v1beta1/params')),
        track(instance.get('/cosmos/slashing/v1beta1/params')),
        track(instance.get('/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300')),
        track(instance.get('/cosmos/mint/v1beta1/inflation')),
        track(instance.get('/cosmos/staking/v1beta1/pool')),
        track(instance.get('/cosmos/bank/v1beta1/supply')),
        track(instance.get('/cosmos/distribution/v1beta1/params')),
      ]);
      const failedRequest = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failedRequest) throw failedRequest.reason;

      const responses = results.map((result) => (
        result as PromiseFulfilledResult<ApiResponse<unknown>>
      ).value);
      const [
        activeRes,
        unbondingRes,
        unbondedRes,
        stakingParamsRes,
        slashingParamsRes,
        signingInfosRes,
        inflationRes,
        poolRes,
        supplyRes,
        distributionParamsRes,
      ] = responses as [
        ApiResponse<ValidatorsResponse>,
        ApiResponse<ValidatorsResponse>,
        ApiResponse<ValidatorsResponse>,
        ApiResponse<{ params: StakingParams }>,
        ApiResponse<{ params: SlashingParams }>,
        ApiResponse<{ info: StakingOverviewCache['signingInfos'] }>,
        ApiResponse<{ inflation: string }>,
        ApiResponse<{ pool: { bonded_tokens: string } }>,
        ApiResponse<{ supply: { denom: string; amount: string }[] }>,
        ApiResponse<{ params: { community_tax: string } }>,
      ];
      const inactiveValidators = [
        ...unbondingRes.data.validators,
        ...unbondedRes.data.validators,
      ] as IValidator[];
      const totalSupply = supplyRes.data.supply.reduce(
        (total: number, coin: { denom: string; amount: string }) =>
          coin.denom === DENOM ? total + Number(coin.amount) : total,
        0,
      );
      const bondedTokens = Number(poolRes.data.pool.bonded_tokens);
      const bondedRatio = bondedTokens / totalSupply;
      const aprValue = Number(inflationRes.data.inflation) / bondedRatio
        * (1 - Number(distributionParamsRes.data.params.community_tax));
      const updatedOverview: StakingOverviewCache = {
        version: 1,
        updatedAt: Date.now(),
        activeValidators: activeRes.data.validators,
        inactiveValidators,
        activeValidatorTotal: activeRes.data.pagination?.total
          ?? `${activeRes.data.validators.length}`,
        params: stakingParamsRes.data.params,
        slashingParams: slashingParamsRes.data.params,
        signingInfos: signingInfosRes.data.info,
        apr: isNumber(aprValue) ? aprValue * 100 : 0,
        bondedTokens,
      };

      applyOverview(updatedOverview);
      writeStakingOverviewCache(window.localStorage, CHAIN_ID, updatedOverview);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to update staking data.');
      setHasLoadedOverview(true);
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  }, [applyOverview]);

  const fetchRewards = async () => {
    if (!canQueryCosmosAccountData({ address, isEvmNetwork: isEvm })) {
      setRewards([]);
      return;
    }
    try {
      const { data } = await instance.get(`/cosmos/distribution/v1beta1/delegators/${address}/rewards`);
      setRewards(data.rewards);
    } catch {
      setRewards([]);
    }
  }

  const fetchActivities = useCallback(async () => {
    if (!canQueryCosmosAccountData({ address, isEvmNetwork: isEvm })) {
      setActivities([]);
      setActivitiesLoading(false);
      setActivitiesError('');
      return;
    }
    setActivitiesLoading(true);
    setActivitiesError('');
    try {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs?query=message.sender=%27${address}%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC`);
      setActivities(data.tx_responses);
    } catch (error) {
      setActivitiesError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setActivitiesLoading(false);
  }, [address, isEvm])

  const fetchUnbondingDelegations = useCallback(async () => {
    if (!canQueryCosmosAccountData({ address, isEvmNetwork: isEvm })) {
      setUnbondingDelegations([]);
      setUnbondingDelegationsLoading(false);
      setUnbondingDelegationsError('');
      return;
    }
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
  }, [address, isEvm]);

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
    if (initializedRef.current) return;
    initializedRef.current = true;

    const cachedOverview = readStakingOverviewCache(window.localStorage, CHAIN_ID);
    if (cachedOverview) applyOverview(cachedOverview);
    setCacheReady(true);
  }, [applyOverview]);

  useEffect(() => {
    if (!isCacheReady) return;

    const refreshTimer = window.setTimeout(() => {
      void refreshOverview();
    }, getStakingAutoRefreshDelay(lastUpdated));

    return () => window.clearTimeout(refreshTimer);
  }, [isCacheReady, lastUpdated, refreshOverview]);

  useEffect(() => {
    if (canQueryCosmosAccountData({ address, isEvmNetwork: isEvm })) {
      if (validatorTab === 'my') {
        handleFetchDataForSubTab(subTab);
      }
      fetchRewards();
    } else {
      setRewards([]);
      setActivities([]);
      setActivitiesLoading(false);
      setActivitiesError('');
      setUnbondingDelegations([]);
      setUnbondingDelegationsLoading(false);
      setUnbondingDelegationsError('');
    }
  }, [address, isEvm, validatorTab, subTab]);

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
    isLoading: !hasLoadedOverview,
    isRefreshing,
    refreshProgress,
    lastUpdated,
    error,
    activeValidators,
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
    isAPRLoading: !hasLoadedOverview,
    bondedTokens,
    selectedModal,
    selectedData,
    fetchUnbondingDelegations,
    refreshOverview,
    handleShowConfirmModal,
    handleOpenModal,
    handleCloseModal,
    handleSubTabChange,
    handleValidatorTabChange,
    handleTabChange,
  }
}

export default useStaking;
