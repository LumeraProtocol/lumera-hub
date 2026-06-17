/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { useChain } from '@interchain-kit/react';

import * as instance from '@/utils/api';
import { SNSCOPE_URL } from '@/contants/network';
import { IValidator } from '@/types/validator';
import { TSupernodeAvatar, TSuperNodeList } from '@/hooks/useSupernodes';
import { CHAIN_NAME } from '@/contants/network';

type TPrevIpAddresses = {
  address: string;
  height: string;
}

type TPrevSupernodeAccount = {
  address: string;
  height: string;
}

type TState = {
  height: string;
  reason: string;
  state: string;
}

export type TSupernode = {
  evidence: any;
  note: string;
  p2p_port: string;
  supernode_account: string;
  validator_address: string;
  prev_ip_addresses: TPrevIpAddresses[];
  prev_supernode_accounts: TPrevSupernodeAccount[];
  states: TState[];
  metrics: {
    height: string;
    report_count: string;
  };

}

export type TTransaction = {
  tx_type: string;
  tx_hash: string;
  height: number;
  block_time: string;
  gas_wanted: number;
  gas_used: number;
  action_price: string;
  action_price_denom: string;
  flow_payer: string;
  flow_payee: string;
  tx_fee: string;
  tx_fee_denom: string;
}

type TAction = {
  id: string;
  type: string;
  creator: string;
  state: string;
  block_height: number;
  mime_type: string;
  size: string;
  price: {
    denom: string;
    amount: string;
  };
  decoded: {
    data_hash: string;
    file_name: string;
    public: boolean;
    rq_ids_ic: number;
    rq_ids_ids: string[];
    rq_ids_max: number;
    signatures: string;
  };
  register_tx_id: string;
  register_tx_time: string;
  finalize_tx_id: string;
  finalize_tx_time: string;
  transactions: TTransaction[];
}

type TCascadeOrSenseAction = {
  schema_version: string;
  states: {
    ACTION_STATE_DONE: number;
    ACTION_STATE_APPROVED: number;
    ACTION_STATE_PENDING: number;
    ACTION_STATE_EXPIRED: number;
  };
  supernode_address: string;
  total: number;
}

type TActionState = {
  schema_version: string;
  states: {
    ACTION_STATE_DONE: number;
    ACTION_STATE_APPROVED: number;
    ACTION_STATE_PENDING: number;
    ACTION_STATE_EXPIRED: number;
  };
  total: number;
}

type TBalance = {
  denom: string;
  amount: string;
}

type TMatrix = {
  supernode_account: string;
  validator_address: string;
  validator_moniker: string;
  current_state: string;
  ip_address: string;
  p2p_port: number;
  protocol_version: string;
  cpu_usage_percent: number;
  cpu_cores: number;
  memory_total_gb: number;
  memory_used_gb: number;
  memory_usage_percent: number;
  storage_total_bytes: number;
  storage_used_bytes: number;
  storage_usage_percent: number;
  hardware_summary: string;
  peers_count: number;
  uptime_seconds: number;
  rank: number;
  p2p_db_size_mb: number;
  p2p_records: number;
  last_status_check: string;
  is_status_api_available: boolean;
  metrics_report: {
    ports: {
      p2p: boolean;
      p2pPort: number;
      port1: boolean;
      port1Num: number
    };
    status: {
      Available: boolean;
      CPUCores: number;
      CPUUsagePercent: number;
      HardwareSummary: string;
      MemoryTotalGb: number;
      MemoryUsagePercent: number;
      MemoryUsedGb: number;
      P2PDbSizeMb: number;
      P2PRecords: number;
      PeersCount: number;
      Rank: number;
      StorageTotalBytes: number;
      StorageUsagePercent: number;
      StorageUsedBytes: number;
      UptimeSeconds: number;
      Version: string;
    };
  };
  schema_version: string;
  last_successful_probe: string;
  failed_probe_counter: string;
  last_known_actual_version: string;
  actual_version: string;
}

type TPaymentInfo = {
  denom: string;
  total_action_price: string;
  total_tx_fee: string;
}

const useSupernodeDetails = () => {
  const { assetList } = useChain(CHAIN_NAME);
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [supernode, setSupernode] = useState<TSupernode | null>(null);
  const [isRecentActivityLoading, setRecentActivityLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<TAction[]>([]);
  const [isCascadeActionLoading, setCascadeActionLoading] = useState(false);
  const [cascadeAction, setCascadeAction] = useState<TCascadeOrSenseAction | null>(null);
  const [isSenseActionLoading, setSenseActionLoading] = useState(false);
  const [senseAction, setSenseAction] = useState<TCascadeOrSenseAction | null>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [isValidatorLoading, setValidatorLoading] = useState(false);
  const [validator, setValidator] = useState<IValidator | null>(null);
  const [isMetricsLoading, setMetricsLoading] = useState(false);
  const [metrics, setMetrics] = useState<TMatrix | null>(null);
  const [isListSuperNodesLoading, setListSuperNodesLoading] = useState(false);
  const [listSuperNodes, setListSuperNodes] = useState<TSuperNodeList | null>(null);
  const [isBalanceLoading, setBalanceLoading] = useState(false);
  const [balances, setBalances] = useState<TBalance | null>(null);
  const [isActionStateLoading, setActionStateLoading] = useState(false);
  const [actionState, setActionState] = useState<TActionState | null>(null);
  const [isPaymentInfoLoading, setPaymentInfoLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<TPaymentInfo[]>([]);

  const fetchPaymentInfo = async (account: string) => {
    if (!account) {
      return null;
    }

    setPaymentInfoLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/${account}/paymentInfo`);
      setPaymentInfo(data.payments);
    } catch (error) {
      console.error(error);
    }
    setPaymentInfoLoading(false);
  }

  const fetchListSuperNodes = async () => {
    setListSuperNodesLoading(true);
    try {
      const { data } = await instance.get('/LumeraProtocol/lumera/supernode/v1/list_super_nodes?pagination.limit=1000&pagination.count_total=true');
      const results: TSuperNodeList = {};
      for (const item of  data.supernodes) {
        results[item.supernode_account] = item
      }
      setListSuperNodes(results);
    } catch (error) {
      console.error(error);
    }
    setListSuperNodesLoading(false);
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
      }
    } catch (error) {
      console.error(error);
    }
  }

  const fetchMetrics = async (account: string) => {
    if (!account) {
      return null;
    }

    setMetricsLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}v1/supernodes/${account}/metrics`);
      setMetrics(data);
    } catch (error) {
      console.error(error);
    }
    setMetricsLoading(false);
  }

  const fetchValidator = async (address: string) => {
    if (!address) {
      return null;
    }

    setValidatorLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/staking/v1beta1/validators/${address}`);
      setValidator(data.validator);
      fetchAvatar(data?.validator?.description?.identity)
    } catch (error) {
      console.error(error);
    }
    setValidatorLoading(false);
  }

  const fetchSupernode = async (account: string) => {
    if (!account) {
      return null;
    }

    setLoading(true);
    try {
      const { data } = await instance.get(`/LumeraProtocol/lumera/supernode/v1/get_super_node_by_address/${account}`);
      setSupernode(data.supernode);
      fetchValidator(data.supernode?.validator_address);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  const fetchActions = async (account: string) => {
    if (!account) {
      return null;
    }
    setRecentActivityLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}v1/actions?supernode=${account}&limit=50&include_transactions=true`);
      setRecentActivities(data.items.filter((item: TAction) => item.finalize_tx_id));
    } catch (error) {
      console.error(error);
    }
    setRecentActivityLoading(false);
  }

  const fetchCascadeActions = async (account: string) => {
    if (!account) {
      return null;
    }
    setCascadeActionLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}v1/supernodes/action-stats?address=${account}&type=ACTION_TYPE_CASCADE`);
      setCascadeAction(data);
    } catch (error) {
      console.error(error);
    }
    setCascadeActionLoading(false);
  }

  const fetchSenseActions = async (account: string) => {
    if (!account) {
      return null;
    }
    setSenseActionLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}v1/supernodes/action-stats?address=${account}&type=ACTION_TYPE_SENSE`);
      setSenseAction(data);
    } catch (error) {
      console.error(error);
    }
    setSenseActionLoading(false);
  }

  const fetchBalances = async (account: string) => {
    if (!account) {
      return null;
    }
    setBalanceLoading(true);
    try {
      const { data } = await instance.get(`/cosmos/bank/v1beta1/balances/${account}`);
      let total = 0;
      for (const balance of data?.balances) {
        if (balance.denom === 'ulume') {
          total += Number(balance.amount);
        }
      }
      setBalances({
        amount: total.toString(),
        denom: 'ulume',
      });
    } catch (error) {
      console.error(error);
    }
    setBalanceLoading(false);
  }

  const fetchActionsStats = async () => {
    setActionStateLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/actions/stats`);
      setActionState(data);
    } catch (error) {
      console.error(error);
    }
    setActionStateLoading(false);
  }

  useEffect(() => {
    fetchSupernode(params?.supernode as string || '');
    fetchActions(params?.supernode as string || '');
    fetchCascadeActions(params?.supernode as string || '');
    fetchSenseActions(params?.supernode as string || '');
    fetchMetrics(params?.supernode as string || '');
    fetchBalances(params?.supernode as string || '');
    fetchPaymentInfo(params?.supernode as string || '');
  }, [params?.supernode]);

  useEffect(() => {
    fetchListSuperNodes();
    fetchActionsStats();
  }, []);

  const extraMetrics = useMemo(() => {
    const m: any = supernode?.metrics;

    if (!m) {
      return {} as Record<string, any>;
    }

    if (m.metrics && typeof m.metrics === 'object') {
      return {
        ...m.metrics,
        report_count: m.report_count,
        height: m.height,
      };
    }

    return m as Record<string, any>;
  }, [supernode]);

  const networkActivityPercent = useMemo(() => {
    const globalDone = actionState?.states?.['ACTION_STATE_DONE'] || 0;
    const globalApproved = actionState?.states?.['ACTION_STATE_APPROVED'] || 0;
    const globalTotalOk = globalDone + globalApproved;
    if (!globalTotalOk) return null;

    const cascadeDone = cascadeAction?.states?.['ACTION_STATE_DONE'] || 0;
    const cascadeApproved = cascadeAction?.states?.['ACTION_STATE_APPROVED'] || 0;
    const senseDone = senseAction?.states?.['ACTION_STATE_DONE'] || 0;
    const senseApproved = senseAction?.states?.['ACTION_STATE_APPROVED'] || 0;
    const nodeOk = cascadeDone + cascadeApproved + senseDone + senseApproved;
    return (nodeOk / globalTotalOk) * 100;
  }, [actionState, senseAction, cascadeAction]);

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

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard!", {
      position: "bottom-right",
      theme: "dark",
    });
  }

  const handleRefresh = () => {
    fetchListSuperNodes();
    fetchActionsStats();
    fetchSupernode(params?.supernode as string || '');
    fetchActions(params?.supernode as string || '');
    fetchCascadeActions(params?.supernode as string || '');
    fetchSenseActions(params?.supernode as string || '');
    fetchMetrics(params?.supernode as string || '');
    fetchBalances(params?.supernode as string || '');
    fetchPaymentInfo(params?.supernode as string || '');
  }

  return {
    isLoading,
    supernode,
    isRecentActivityLoading,
    recentActivities,
    isCascadeActionLoading,
    cascadeAction,
    isSenseActionLoading,
    senseAction,
    showMoreInfo,
    extraMetrics,
    isValidatorLoading,
    validator,
    isMetricsLoading,
    metrics,
    isListSuperNodesLoading,
    listSuperNodes,
    isBalanceLoading,
    balances,
    networkActivityPercent,
    isActionStateLoading,
    actionState,
    isPaymentInfoLoading,
    paymentInfo,
    lumeExponent,
    setShowMoreInfo,
    copyToClipboard,
    handleRefresh,
  }
}

export default useSupernodeDetails;
