/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useChain } from '@interchain-kit/react';
import { toast } from 'react-toastify';

import * as instance from '@/utils/api';
import {
  TSupernodesStats,
  TPoolState,
  TSupernodeAccount,
  TSupernode,
  TMatrix,
  TActionsStats,
} from '@/types';
import { IValidator } from '@/types/validator';
import { SNSCOPE_URL } from '@/contants/network';
import { CHAIN_NAME } from '@/contants/network';
import useAppRouter from '@/hooks/useAppRouter';
import useWalletConnect from '@/hooks/useWalletConnect';

export const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All Status',
  },
  {
    value: 'online',
    label: 'Online Only',
  },
  {
    value: 'offline',
    label: 'Offline Only',
  },
];

export const STATE_OPTIONS = [
  {
    value: 'all',
    label: 'All States',
  },
  {
    value: 'active',
    label: 'Active',
  },
  {
    value: 'disabled',
    label: 'Disabled',
  },
  {
    value: 'postponed',
    label: 'Postponed',
  },
];

export type TSupernodeAvatar = {
  [key: string]: string;
}

type TSmoothedWeightInfo = {
  [key: string]: number;
}

type TParticipationPercent = {
  [key: string]: {
    ACTION_STATE_DONE: number;
    ACTION_STATE_APPROVED: number;
    ACTION_STATE_PENDING: number;
    ACTION_STATE_EXPIRED: number;
  };
}

type TPrevIpAddresses = {
  address: string;
  height: string;
}

type TPrevSupernodeAccounts = {
  account: string;
  height: string;
}

type TState = {
  height: string;
  reason: string;
  state: string;
}

export type TSuperNodeList = {
  [key: string]: {
    supernode_account: string;
    validator_address: string;
    prev_ip_addresses: TPrevIpAddresses[];
    prev_supernode_accounts: TPrevSupernodeAccounts[];
    states: TState[];
  }
}

type TEligibilityMap = {
  [key: string]: {
    status: string;
    err?: string;
    data?: {
      eligible: boolean;
      reason: string;
      cascade_kademlia_db_bytes: bigint;
      smoothed_weight: bigint;
    };
  }
}

type TSupernodeBalance = {
  [key: string]: {
    amount: number;
    denom: string;
  }
}

type TValidatorDetails = {
  [key: string]: IValidator;
}

const toBigIntSafe = (v: string | number | undefined | null) => {
  if (v === undefined || v === null) return 0n;
  if (typeof v === 'string') {
    if (/^-?\d+$/.test(v)) {
      try { return BigInt(v); } catch { return 0n; }
    }
    const n = Number(v);
    if (!Number.isFinite(n)) return 0n;
    return BigInt(Math.trunc(n));
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 0n;
    return BigInt(Math.trunc(v));
  }
  return 0n;
}

const APPROX_BLOCK_SECONDS = 6;
let _blocksRemaining = 0

const useSupernodes = () => {
  const { assetList } = useChain(CHAIN_NAME);
  const { redirect } = useAppRouter();
  const { address, isConnected } = useWalletConnect();
  const [isSupernodeLoading, setSupernodeLoading] = useState(false);
  const [supernodes, setSupernodes] = useState<TSupernode[]>([]);
  const [supernodesOriginal, setSupernodesOriginal] = useState<TSupernode[]>([]);
  const [isStatsLoading, setStatsLoading] = useState(false);
  const [supernodesStats, setSupernodesStats] = useState<TSupernodesStats | null>(null);
  const [isSupernodeAccountLoading, setSupernodeAccountLoading] = useState(false);
  const [supernodeAccount, setSupernodeAccount] = useState<TSupernodeAccount | null>(null);
  const [isPoolStateLoading, setPoolStateLoading] = useState(false);
  const [poolState, setPoolState] = useState<TPoolState | null>(null);
  const [isMatrixLoading, setMatrixLoading] = useState(false);
  const [matrix, setMatrix] = useState<TMatrix | null>(null);
  const [isActionsStatsLoading, setActionsStatsLoading] = useState(false);
  const [actionsStats, setActionsStats] = useState<TActionsStats | null>(null);
  const [isValidatorsLoading, setValidatorsLoading] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isSmoothedWeightLoading, setSmoothedWeightLoading] = useState(true);
  const [smoothedWeight, setSmoothedWeight] = useState(0);
  const [smoothedWeightInfo, setSmoothedWeightInfo] = useState<TSmoothedWeightInfo>({});
  const [isParticipationPercentLoading, setParticipationPercentLoading] = useState(false);
  const [participationPercent, setParticipationPercent] = useState<TParticipationPercent | null>(null);
  const [isListSuperNodesLoading, setListSuperNodesLoading] = useState(false);
  const [listSuperNodes, setListSuperNodes] = useState<TSuperNodeList | null>(null);
  const [eligibilityMap, setEligibilityMap] = useState<TEligibilityMap>({});
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0].value);
  const [stateFilter, setStateFilter] = useState(STATE_OPTIONS[0].value);
  const [versionFilter, setVersionFilter] = useState('all');
  const [tab, setTab] = useState('all');
  const [supernodeBalances, setSupernodeBalances] = useState<TSupernodeBalance>({});
  const [scheduleError, setScheduleError] = useState('');
  const [nextPayoutHeight, setNextPayoutHeight] = useState(0);
  const [blocksRemaining, setBlocksRemaining] = useState(0);
  const [lastDistributionHeight, setLastDistributionHeight] = useState(0);
  const [paymentPeriodBlocks, setPaymentPeriodBlocks] = useState(0);
  const [currentHeightBig, setCurrentHeightBig] = useState(0);
  const [etaSecondsApprox, setEtaSecondsApprox] = useState(0);
  const [isTopSupernodeLoading, setTopSupernodeLoading] = useState(false);
  const [topSupernode, setTopSupernode] = useState<TSupernode[]>([]);
  const [listSuperAccount, setListSuperAccount] = useState<string[]>([]);
  const [supernodeAvatars, setSupernodeAvatars] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [validatorDetails, setValidatorDetails] = useState<TValidatorDetails | null>(null)

  const lumeAsset = useMemo(() => {
    const assets = assetList?.assets || [];
    return assets.find(
      (a) => (a.base || a.name) === 'ulume' || a.display === 'LUME' || a.symbol === 'LUME'
    );
  }, [assetList]);

  const lumeExponent = useMemo(() => {
    const denomUnit = lumeAsset?.denomUnits?.find(
        (unit: any) => unit.denom === lumeAsset.display || unit.denom === lumeAsset.symbol
    );

    const expStr = denomUnit?.exponent ?? (lumeAsset as any)?.exponent ?? '6';

    const n = Number(expStr);
    return Number.isFinite(n) ? n : 6;
  }, [lumeAsset]);

  const getValidators = async () => {
    setValidatorsLoading(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      await fetchAvatars(data.validators);
      setValidators(data.validators);
    } catch (error) {
      console.error(error);
    }
    setValidatorsLoading(false);
  }

  const fetchAvatars = async (validators: IValidator[]) => {
    for (const validator of validators) {
      await fetchAvatar(validator?.description?.identity);
    }
  }

  const fetchAvatar = async (identity: string) => {
    if (!identity) {
      return;
    }
    try {
      const cache = localStorage.getItem('supernode-avatars');
      let parseCache: TSupernodeAvatar = {};
      if (cache) {
        parseCache = JSON.parse(cache);
        if (parseCache[identity]) {
          return;
        }
      }
      const { data } = await instance.getExternal(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`);
      const url = data?.them?.[0]?.pictures?.primary?.url;
      if (url) {
        const parseUrl = url.split('/');
        parseCache[identity] = parseUrl[parseUrl.length - 1];
        localStorage.setItem('supernode-avatars', JSON.stringify(parseCache));
        getSupernodeAvatars();
      }
    } catch (error) {
      console.error(error);
    }
  }

  const getSmoothedWeight = async (items: TSupernode[]) => {
    setSmoothedWeightLoading(true);
    let totalSmoothedWeight = 0;
    const eligibility: TEligibilityMap = {};
    for (const supernode of items) {
      try {
        getSupernodesBalances(supernode.supernode_account);
        eligibility[supernode.validator_address] = {
          status: 'loading'
        }
        const { data } = await instance.get(`/LumeraProtocol/lumera/supernode/v1/sn_eligibility/${supernode.validator_address}`);
        if (data?.smoothed_weight) {
          totalSmoothedWeight += Number(data?.smoothed_weight);
          setSmoothedWeightInfo((prev) => ({
            ...prev,
            [supernode.validator_address]: Number(data?.smoothed_weight),
          }));
        }
        eligibility[supernode.validator_address] = {
          status: 'ok',
          data: {
            eligible: !!data.eligible,
            reason: data.reason || '',
            cascade_kademlia_db_bytes: toBigIntSafe(data.cascade_kademlia_db_bytes),
            smoothed_weight: toBigIntSafe(data.smoothed_weight),
          },
        }
      } catch (error: any) {
        console.error(error);
        eligibility[supernode.validator_address] = {
          status: 'error',
          err: error?.message || String(error)
        }
      }
    }
    setSmoothedWeight(totalSmoothedWeight);
    setEligibilityMap(eligibility);
    setSmoothedWeightLoading(false);
  }

  const getValidatorDetails = async (items: TSupernode[]) => {
    for (const supernode of items) {
      try {
        const { data } = await instance.get(`/cosmos/staking/v1beta1/validators/${supernode.validator_address}`);
        if (data?.validator) {
          setValidatorDetails((prev) => ({
            ...prev,
            [supernode.validator_address]: data.validator,
          }))
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  const getActionStats = async (items: TSupernode[]) => {
    setParticipationPercentLoading(true);
    for (const supernode of items) {
      try {
        const { data } = await instance.getExternal(`${SNSCOPE_URL}v1/supernodes/action-stats?address=${supernode.supernode_account}`);
        if (data?.states) {
          setParticipationPercent((prev) => ({
            ...prev,
            [supernode.supernode_account]: data.states,
          }))
        }
      } catch (error) {
        console.error(error)
      }
    }
    setParticipationPercentLoading(false);
  }

  const getSupernodes = async () => {
    setSupernodeLoading(true);
    setListSuperNodesLoading(true);
    try {
      const [metricsRes, supernodeRes] = await Promise.all([
        instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/metrics?limit=200`),
        instance.get('/LumeraProtocol/lumera/supernode/v1/list_super_nodes?pagination.limit=1000&pagination.count_total=true'),
      ]);
      let newSupernode: TSupernode[] = metricsRes.data.nodes || [];
      if (!newSupernode?.length) {
        newSupernode = supernodeRes.data.supernodes?.map((s: any) => {
          const prevIpAddresses = s.prev_ip_addresses;
          return ({
            ...s,
            ip_address: prevIpAddresses[prevIpAddresses.length - 1].address,
          })
        });
      }
      setSupernodes(newSupernode);
      setSupernodesOriginal(newSupernode);
      getSmoothedWeight(newSupernode);
      getActionStats(newSupernode);
      getValidatorDetails(newSupernode);

      const results: TSuperNodeList = {};
      const items: string[] = [];
      for (const item of supernodeRes.data.supernodes) {
        results[item.supernode_account] = item;
        items.push(item.supernode_account);
      }
      setListSuperAccount(items);
      setListSuperNodes(results);
    } catch (error) {
      console.error(error);
    }
    setSupernodeLoading(false);
    setListSuperNodesLoading(false);
  }

  const getSupernodesBalances = async (account: string) => {
    try {
      const { data } = await instance.get(`/cosmos/bank/v1beta1/balances/${account}`);
      let totalBalances = 0;
      if (data?.balances?.length) {
        for (const item of data.balances) {
          if (item.denom === 'ulume') {
            totalBalances += Number(item.amount)
          }
        }
      }
      setSupernodeBalances((prev) => ({
        ...prev,
        [account]: {
          amount: totalBalances,
          denom: 'ulume',
        }
      }));
    } catch (error) {
      console.error(error);
    }
  }

  const getSupernodesStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/stats`);
      setSupernodesStats(data);
    } catch (error) {
      console.error(error);
    }
    setStatsLoading(false);
  }

  const getSupernodeAccount = async () => {
    setSupernodeAccountLoading(true);
    try {
      const { data } = await instance.get('/cosmos/auth/v1beta1/module_accounts/supernode');
      setSupernodeAccount(data?.account);
    } catch (error) {
      console.error(error);
    }
    setSupernodeAccountLoading(false);
  }

  const getPoolState = async () => {
    setPoolStateLoading(true);
    try {
      const { data } = await instance.get('/LumeraProtocol/lumera/supernode/v1/pool_state');
      setPoolState(data);
      const lastH = data?.last_distribution_height;
      if (lastH === undefined || lastH === null) {
        setScheduleError('Schedule unavailable');
      } else {
        setLastDistributionHeight(Number(lastH));
      }
    } catch (error) {
      console.error(error);
      setScheduleError('Schedule unavailable');
    }
    setPoolStateLoading(false);
  }

  const getSupernodeParams = async () => {
    try {
      const { data } = await instance.get('/LumeraProtocol/lumera/supernode/v1/params');
      const ppb = data.params.reward_distribution.payment_period_blocks;
      if (!ppb) {
        setScheduleError('Schedule unavailable');
      } else {
        setPaymentPeriodBlocks(Number(ppb));
      }
    } catch (error) {
      console.error(error);

    }
  }

  const getMatrix = async () => {
    setMatrixLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/version/matrix`);
      setMatrix(data);
    } catch (error) {
      console.error(error);
    }
    setMatrixLoading(false);
  }

  const getActionsStats = async () => {
    setActionsStatsLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}v1/actions/stats`);
      setActionsStats(data);
    } catch (error) {
      console.error(error);
    }
    setActionsStatsLoading(false);
  }

  const getLatest = async () => {
    try {
      const { data } = await instance.get('/cosmos/base/tendermint/v1beta1/blocks/latest');
      const height = data?.block?.header?.height;
      const t = data?.block?.header?.time;
      if (height) {
        setCurrentHeightBig(Number(height));
      }
      if (t) {
        const blockMs = Date.parse(t);
        if (Number.isFinite(blockMs)) {
          const nextPayoutAtMs = blockMs + _blocksRemaining * APPROX_BLOCK_SECONDS * 1000;
          const nowTick = new Date();
          const delta = Math.round((nextPayoutAtMs - nowTick.getTime()) / 1000);
          setEtaSecondsApprox(delta > 0 ? delta : 0)
        }
      }
    } catch (error) {
      console.error(error);
    }
    setTimeout(() => {
      getLatest();
    }, 6000);
  }

  const getTopSupernode = async () => {
    setTopSupernodeLoading(true);
    try {
      const { data } = await instance.get('/LumeraProtocol/lumera/supernode/v1/get_top_super_nodes_for_block/5530134?state=SUPERNODE_STATE_ACTIVE');
      setTopSupernode(data.supernodes);
    } catch (error) {
      console.error(error);
    }
    setTopSupernodeLoading(false);
  }

  const logo = (identity?: string) => {
    if (!identity) {
      return '';
    }
    try {
      const cache = supernodeAvatars;
      if (cache) {
        const parseCache = JSON.parse(cache);
        if (!identity || !parseCache[identity]) {
          fetchAvatar(identity);
          return '';
        }
        const url = parseCache[identity] || '';
        return url.startsWith('http')
          ? url
          : `https://s3.amazonaws.com/keybase_processed_uploads/${url}`;
      }
    } catch (err) {
      console.error(err);
    }
    return '';
  };

  const getSupernodeAvatars = () => {
    try {
      const cache = localStorage.getItem('supernode-avatars');
      if (cache) {
        setSupernodeAvatars(cache);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const getFavorites = async () => {
    if (address && isConnected) {
      try {
        const { data } = await instance.getExternal(`/api/supernode/favorites?lumeraAddress=${address}`);
        setFavorites(new Set(data));
      } catch (err) {
        console.error(err);
      }
    } else {
      const saved = localStorage.getItem('supernode_favorites');
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    }
  }

  const initFavorites = async () => {
    await getFavorites();
    await syncFavorites();
  }

  useEffect(() => {
    getSupernodes();
    getSupernodesStats();
    getSupernodeAccount();
    getPoolState();
    getMatrix();
    getActionsStats();
    getValidators();
    getSupernodeParams();
    getLatest();
    getTopSupernode();
    getSupernodeAvatars();
  }, []);

  useEffect(() => {
    initFavorites();
    if (!isConnected && favorites.size > 0) {
      setFavorites(new Set());
    }
  }, [address, isConnected]);

  useEffect(() => {
    setSupernodes(getSupernodesByFilter(tab));
  }, [statusFilter, stateFilter, versionFilter, tab, listSuperAccount, supernodes, supernodeAvatars]);

  useEffect(() => {
    if (lastDistributionHeight && paymentPeriodBlocks) {
      setNextPayoutHeight(lastDistributionHeight + paymentPeriodBlocks);
    }
  }, [lastDistributionHeight, paymentPeriodBlocks]);

  useEffect(() => {
    if (currentHeightBig && nextPayoutHeight) {
      const diff = nextPayoutHeight - currentHeightBig;
      setBlocksRemaining(diff > 0 ? diff : 0);
      _blocksRemaining = diff > 0 ? diff : 0;
    }
  }, [currentHeightBig, nextPayoutHeight]);

  const toggleFavorite = async (account: string) => {
    const isFavorited = favorites.has(account);
    const newFavorites = new Set(favorites);

    if (isFavorited) {
      newFavorites.delete(account);
    } else {
      newFavorites.add(account);
    }

    setFavorites(newFavorites);

    if (!address && !isConnected) {
      localStorage.setItem('supernode_favorites', JSON.stringify([...newFavorites]));
    } else {
      await instance.postExternal('/api/supernode/favorites', {
        lumeraAddress: address,
        supernodeAccount: account,
      });
    }
  }

  const isFavorited = (id: string) => favorites.has(id);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  }

  const handleStateFilterChange = (value: string) => {
    setStateFilter(value);
  }

  const handleVersionFilterChange = (value: string) => {
    setVersionFilter(value);
  }

  const handleRefresh = () => {
    setStatusFilter(STATUS_OPTIONS[0].value);
    setStateFilter(STATE_OPTIONS[0].value);
    setVersionFilter('all');
    setSupernodes(supernodesOriginal);
  }

  const getSupernodesByFilter = (currentTab: string) => {
    let newSupernodesOriginal = supernodesOriginal;
    if (currentTab === 'top') {
      newSupernodesOriginal = topSupernode.map((t) => {
        const item = supernodesOriginal.find((s) => s.supernode_account === t.supernode_account);
        return ({
          ...t,
          ...item,
          current_state: '',
        })
      })

    } else {
      const orderMap = new Map(
        listSuperAccount.map((account, index) => [account, index])
      );
      newSupernodesOriginal = supernodesOriginal.sort((a, b) => {
        const indexA = orderMap.get(a.supernode_account) ?? Infinity;
        const indexB = orderMap.get(b.supernode_account) ?? Infinity;
        return indexA - indexB;
      });
    }
    switch (currentTab) {
      case 'favorites':
        newSupernodesOriginal = newSupernodesOriginal.filter((s) => isFavorited(s.supernode_account))
        break;
      case 'top':
        break;
    }
    if (statusFilter !== STATUS_OPTIONS[0].value) {
      if (statusFilter === STATUS_OPTIONS[1].value) {
        newSupernodesOriginal = newSupernodesOriginal.filter((s) => s.is_status_api_available);
      } else {
        newSupernodesOriginal = newSupernodesOriginal.filter((s) => !s.is_status_api_available);
      }
    }
    if (stateFilter !== STATE_OPTIONS[0].value) {
      switch (stateFilter) {
        case STATE_OPTIONS[1].value:
          newSupernodesOriginal = newSupernodesOriginal.filter((s) => s.current_state.indexOf('SUPERNODE_STATE_ACTIVE') !== -1);
          break;
        case STATE_OPTIONS[2].value:
          newSupernodesOriginal = newSupernodesOriginal.filter((s) => s.current_state.indexOf('SUPERNODE_STATE_DISABLED') !== -1);
          break;
        case STATE_OPTIONS[3].value:
          newSupernodesOriginal = newSupernodesOriginal.filter((s) => s.current_state.indexOf('SUPERNODE_STATE_POSTPONED') !== -1);
          break;
      }
    }
    if (versionFilter !== 'all') {
      newSupernodesOriginal = newSupernodesOriginal.filter((s) => s.actual_version === versionFilter);
    }
    return newSupernodesOriginal;
  }

  const handleTabChange = (value: string) => {
    setTab(value);
    setSupernodes(getSupernodesByFilter(value));
  }

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard!", {
      position: "bottom-right",
      theme: "dark",
    });
  }

  const syncFavorites = async () => {
    if (!address || !isConnected) return;

    try {
      const localData = localStorage.getItem('supernode_favorites');
      const localFavorites: string[] = localData ? JSON.parse(localData) : [];

      if (localFavorites.length === 0) return;

      const { data } = await instance.postExternal('/api/supernode/favorites/sync', {
        localFavorites,
        lumeraAddress: address
      });

      if (data.status) {
        setFavorites(new Set(data.syncedFavorites));

        localStorage.removeItem('supernode_favorites');
      }
    } catch (err) {
      console.error('Sync failed', err);
    }
  };

  return {
    isSupernodeLoading,
    supernodes,
    isStatsLoading,
    supernodesStats,
    isSupernodeAccountLoading,
    supernodeAccount,
    isPoolStateLoading,
    poolState,
    isMatrixLoading,
    matrix,
    isActionsStatsLoading,
    actionsStats,
    isValidatorsLoading,
    validators,
    smoothedWeight,
    isSmoothedWeightLoading,
    smoothedWeightInfo,
    isParticipationPercentLoading,
    participationPercent,
    isListSuperNodesLoading,
    listSuperNodes,
    eligibilityMap,
    lumeExponent,
    statusFilter,
    stateFilter,
    versionFilter,
    tab,
    supernodeBalances,
    scheduleError,
    nextPayoutHeight,
    blocksRemaining,
    etaSecondsApprox,
    isTopSupernodeLoading,
    favorites,
    validatorDetails,
    isFavorited,
    logo,
    handleTabChange,
    toggleFavorite,
    handleStatusFilterChange,
    handleStateFilterChange,
    handleVersionFilterChange,
    handleRefresh,
    copyToClipboard,
    redirect,
  };
}

export default useSupernodes;
