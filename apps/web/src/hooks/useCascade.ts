'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from 'react-toastify';
import JSZip from 'jszip';
import { useChain } from '@interchain-kit/react';
import dayjs from 'dayjs';
import IPLocate from 'node-iplocate';

import { useSelector } from '@/redux/hooks';
import useTrackingCascadeDownload from '@/hooks/useTrackingCascadeDownload';
import * as instance from '@/utils/api';
import { delay } from '@/utils/helpers';
import {
  formatBytes,
  formatTokenDisplay,
} from '@/utils/format';
import {
  CHAIN_ID,
  SDK_PRESET,
  SNSCOPE_URL,
  SNAPI_URL,
  CHAIN_NAME,
  DENOM,
} from '@/contants/network';
import {
  UPLOAD_MAX_FILES,
  IMAGE_EXT,
  DOCUMENT_EXT,
  VIDEO_EXT,
  ARCHIVE_EXT,
  PROGRAM_EXT,
} from '@/contants';
import { IRecentActivity, IActionDetail } from '@/types';

export interface ITask {
  taskId?: string | undefined;
  status?: string | undefined;
  progress?: number | undefined;
}

export interface IMyFile {
  name: string;
  size: number;
  txId: string;
  type: string;
  actionID: string;
  lastModified: string;
  signatures: string;
  state: string;
  datahash: string;
  height: string;
  price: string;
  fee: string;
  taskId: string;
  isPublic: boolean | null;
}

export interface IMarker {
  latLng: [number, number];
  name: string;
  supernodeAccount: string;
  validatorAddress: string;
  validatorMoniker: string;
  address: string;
  p2pPort: string;
  continent:string;
  country: string;
  country_code: string;
  subdivision: string;
  city: string;
}

export type TFileTypeKey = 'all' | 'image' | 'program' | 'video' | 'archive' | 'document' | 'other';

interface FileTypeOption {
  value: TFileTypeKey;
  label: string;
}

interface FileToDownload {
  actionID: string;
  name: string;
  signatures: string;
}

interface ISupernode {
  actual_version: string;
  cpu_cores: number;
  cpu_usage_percent: number;
  current_state: string;
  failed_probe_counter: number;
  hardware_summary: string;
  ip_address: string;
  is_status_api_available: boolean;
  last_known_actual_version: string;
  last_status_check: string;
  last_successful_probe: string;
  memory_total_gb: number;
  memory_usage_percent: number;
  memory_used_gb: number;
  metrics_report: {
    ports: {
      p2p: boolean;
      p2pPort: number;
      port1: boolean;
      port1Num: number;
    };
    status: {
      Available: boolean;
      CPUCores: number;
      CPUUsagePercent: number;
      HardwareSummary: string;
      MemoryTotalGb: number;
      MemoryUsagePercent: number;
      MemoryUsedGb: number;
      PeersCount: number;
      Rank: number;
      StorageTotalBytes: number;
      StorageUsagePercent: number;
      StorageUsedBytes: number;
      UptimeSeconds: number;
      Version:string;
    };
  };
  p2p_port: number;
  peers_count: number;
  protocol_version: string;
  rank: number;
  schema_version: string;
  storage_total_bytes: number;
  storage_usage_percent: number;
  storage_used_bytes: number;
  supernode_account: string;
  uptime_seconds: number;
  validator_address: string;
  validator_moniker: string;
}

interface IAction {
  block_height: string;
  creator: string;
  decoded: {
    data_hash: string;
    file_name: string;
    rq_ids_ic: number;
    rq_ids_max: number;
    signatures: string;
    public: boolean;
  };
  id: string;
  state: string;
  type: string;
  size: number;
  price: {
    denom: string;
    amount: string;
  };
  register_tx_id: string;
  finalize_tx_id: string;
  finalize_tx_time: string;
  mime_type: string;
  register_tx_time: string;
}

type TError = {
  message: string | undefined;
  status: string | undefined
  statusCode: number;
  statusText: string;
}

export interface ISelectedFile {
  name: string;
  actionID: string;
  signatures: string;
}

type TCascadeStogre = {
  fileName: string;
  taskId: string;
  isPublic?: boolean;
  time: number;
}

export type TUploadCascadeInfo = {
  fileName: string;
  fileSize: number;
  uploadFee: string;
  type: string;
  status?: string;
  message?: string;
  isPublic?: boolean;
}

export const FILES_TYPE: FileTypeOption[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'image',
    label: 'Images',
  },
  {
    value: 'video',
    label: 'Videos',
  },
  {
    value: 'program',
    label: 'Programs',
  },
  {
    value: 'archive',
    label: 'Archives',
  },
  {
    value: 'document',
    label: 'Documents',
  },
  {
    value: 'other',
    label: 'Other',
  },
];

export const getFileType = (filename: string) => {
  if (!filename) return '';

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (IMAGE_EXT.includes(ext)) return 'image';
  if (DOCUMENT_EXT.includes(ext)) return 'document';
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (ARCHIVE_EXT.includes(ext)) return 'archive';
  if (PROGRAM_EXT.includes(ext)) return 'program';

  return 'other';
}

export const ITEM_PER_PAGE = 10;
const GAS_PRICE = '0.025ulume';
const storeName = 'lumera-cascade-files';

let ipLocateClient: IPLocate | undefined;

const getIpLocateClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_IPAPI_KEY;

  if (!apiKey) {
    return null;
  }

  ipLocateClient ??= new IPLocate(apiKey);
  return ipLocateClient;
};

export const getTxHash = (file: IMyFile, txs: IRecentActivity[]) => {
  const tx = txs?.find((t) => t.height.toString() === file.height.toString() && t.tx.body.messages.some((m) => m.metadata?.indexOf(file.datahash) !== -1));
  const amount = tx?.tx?.auth_info?.fee?.amount;
  return {
    txhash: tx ? tx.txhash : '',
    timestamp: tx?.timestamp,
    fee: `${amount?.length ? formatTokenDisplay({
      amount: amount[0].amount,
      denom: amount[0].denom,
    }) + ' LUME' : '0 LUME'}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCascade = ({ sdkjsReact }: { sdkjsReact: any }) => {
  const { trackingCascadeDownload } = useTrackingCascadeDownload();
  const { openView } = useChain(CHAIN_NAME);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { address } = useSelector((state) => state.wallet);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isFetchSummaryLoading, setFetchSummaryLoading] = useState(false);
  const [networkStorage, setNetworkStorage] = useState({
    totalSupernode: 0,
    networkStorage: 'TBD',
    usedStorageBytes: 0,
    availableStorageBytes: 0,
  });
  const [myUsage, setMyUsage] = useState({
    size: '0 Bytes',
    uploaded: 0,
  });
  const [fileTypeFilter, setFileTypeFilter] = useState<string[]>([FILES_TYPE[0].value]);
  const [fileSearch, setFileSearch] = useState('');
  const [myFiles, setMyFiles] = useState<IMyFile[]>([]);
  const [myFilesOriginal, setMyFilesOriginal] = useState<IMyFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<ISelectedFile[]>([]);
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [isDownloading, setDownloading] = useState(false);
  const [isAllDownloading, setAllDownloading] = useState(false);
  const [isMyFilesLoading, setMyFilesLoading] = useState(false);
  const [isMyFilesLoadMore, setMyFilesLoadMore] = useState(false);
  const [isMarkerLoading, setMarkerLoading] = useState(false);
  const [selectedUploadCascadeFiles, setSelectedUploadCascadeFiles] = useState<File[]>([]);
  const [selectedModal, setSelectedModal] = useState('');
  const [uploadCascadeInfo, setUploadCascadeInfo] = useState<TUploadCascadeInfo[]>([]);
  const [totalPage, setTotalPage] = useState(0);
  const [selectedFileDownload, setSelectedFileDownload] = useState<string[]>([]);
  const [currentOffset, setOffset] = useState(0);
  const [step, setStep] = useState('');
  const [totalBalance, setTotalBalance] = useState(0);
  const [recentlyUploaded, setRecentlyUploaded] = useState<IMyFile[]>([]);
  const [isRecentlyUploadedLoading, setRecentlyUploadedLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('myFiles');

  const filteredFiles = useMemo(() => {
    setOffset(0);
    return myFilesOriginal
      .filter(file => file.name.toLowerCase().includes(fileSearch.toLowerCase()))
      .filter(file => fileTypeFilter.includes('all') || fileTypeFilter.includes(file.type));
  }, [myFilesOriginal, fileSearch, fileTypeFilter]);

  const fileCounts: Record<TFileTypeKey, number> = useMemo(() => {
    const counts: Record<TFileTypeKey, number> = {
        all: myFilesOriginal.length,
        image: 0,
        program: 0,
        document: 0,
        video: 0,
        archive: 0,
        other: 0,
    };
    myFilesOriginal.forEach(file => {
      if (counts.hasOwnProperty(file.type)) {
        counts[file.type as TFileTypeKey]++;
      } else {
        counts.other++;
      }
    });
    return counts;
  }, [myFilesOriginal]);

  const fileSizes: Record<TFileTypeKey, number> = useMemo(() => {
    const sizes: Record<TFileTypeKey, number> = {
        all: 0,
        image: 0,
        program: 0,
        document: 0,
        video: 0,
        archive: 0,
        other: 0,
    };
    myFilesOriginal.forEach(file => {
      if (sizes.hasOwnProperty(file.type)) {
        sizes[file.type as TFileTypeKey] += file.size;
      } else {
        sizes.other += file.size;
      }
    });
    return sizes;
  }, [myFilesOriginal]);

  const handleSelectFile = (file: IMyFile) => {
    setSelectedFiles(prev => {
      const existFile = prev?.find((p) => p.actionID === file.actionID);
      if (existFile) {
        return prev.filter(f => f.actionID !== file.actionID);
      }
      return [...prev, {
        name: file.name,
        actionID: file.actionID,
        signatures: file.signatures,
      }];
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(filteredFiles.map(f => ({
        name: f.name,
        actionID: f.actionID,
        signatures: f.signatures,
      })));
    } else {
      setSelectedFiles([]);
    }
  };

  const fetchLocationFromIpWho = async (ip: string) => {
    try {
      const { data } = await instance.getExternal(`https://ipwho.is/${ip}`);
      return {
        latitude: data?.latitude || null,
        longitude: data?.longitude || null,
        subdivision: data?.capital || null,
        city: data?.city || null,
        country: data?.country || null,
        continent: data?.continent || null,
        country_code: data?.country_code || null,
      };
    } catch (error) {
      throw new Error((error as Error)?.message ||  'An unknown error occurred.')
    }
  }

  const fetchLocationFromIpLocate = async (ip: string) => {
    try {
      const client = getIpLocateClient();
      if (!client) {
        return null;
      }

      const result = await client.lookup(ip);
      return {
        latitude: result?.latitude || null,
        longitude: result?.longitude || null,
        subdivision: result?.subdivision || null,
        city: result?.city || null,
        country: result?.country || null,
        continent: result?.continent || null,
        country_code: result?.country_code || null,
      };
    } catch (error) {
      throw new Error((error as Error)?.message ||  'An unknown error occurred.')
    }
  }

  const fetchLocationFromAbstractApi = async (ip: string) => {
    try {
      const { data } = await instance.getExternal(`https://ip-intelligence.abstractapi.com/v1/?api_key=${process.env.NEXT_PUBLIC_ABSTRACTAPI_KEY || ''}&ip_address=${ip}`);
      return {
        latitude: data?.location?.latitude || null,
        longitude: data?.location?.longitude || null,
        subdivision: data?.location?.region || null,
        city: data?.location?.city || null,
        country: data?.location?.country || null,
        continent: data?.location?.continent || null,
        country_code: data?.location?.country_code || null,
      };
    } catch (error) {
      throw new Error((error as Error)?.message ||  'An unknown error occurred.')
    }
  }

  const fetchLocationForIP = async (ip: string) => {
    let data = null;
    try {
      const result = await fetchLocationFromIpWho(ip);
      if (result) {
        data = result;
      }
    } catch {
      // noop
    }
    if (!data) {
      try {
        const result = await fetchLocationFromIpLocate(ip);
        if (result) {
          data = result;
        }
      } catch {
        // noop
      }
    }
    if (!data) {
      try {
        const result = await fetchLocationFromAbstractApi(ip);
        if (result) {
          data = result;
        }
      } catch {
        // noop
      }
    }
    return data;
  }

  const readSupernodeFile = async (supernodes: ISupernode[]) => {
    try {
      if (!supernodes?.length) {
        return [];
      }
      const newSupernodeData = supernodes.map((supernode) => ({
        supernode_account: supernode.supernode_account,
        validator_address: supernode.validator_address,
        validator_moniker: supernode.validator_moniker,
        p2p_port: supernode.p2p_port,
        ip_address: supernode.ip_address,
      }));
      const { data } = await instance.postExternal('/api/supernode', { supernodes: newSupernodeData });
      return data?.supernodes || [];
    } catch {
      return [];
    }
  }

  const getChartMarker = useCallback(async (items: ISupernode[]) => {
    try {
      const results: IMarker[] = [];
      const supernodeData: IMarker[] = await readSupernodeFile(items);
      for (const item of items) {
        const address = item.ip_address;
        const ip = address.split(':')[0];
        const supernode = supernodeData?.find((s) => s.address.trim() === address.trim());
        if (!supernode) {
          const data = await fetchLocationForIP(ip);
          if (data?.latitude && data?.longitude) {
            results.push({
              latLng: [data.latitude, data.longitude],
              name: data?.city || '',
              continent: data?.continent || '',
              country: data?.country || '',
              country_code: data?.country_code || '',
              subdivision: data?.subdivision || '',
              city: data?.city || '',
              supernodeAccount: item.supernode_account,
              validatorAddress: item.validator_address,
              validatorMoniker: item.validator_moniker,
              address,
              p2pPort: item.p2p_port.toString(),
            });
          }
        } else {
          results.push(supernode);
        }
      }
      setMarkers(results);
    } catch (error) {
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
  }, [markers]);

  const fetchSupernodes = async (cursor = '') => {
    try {
      const nextCursor = cursor ? `&cursor=${cursor}` : '';
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/metrics?currentState=SUPERNODE_STATE_ACTIVE&status=available&minFailedProbeCounter=0&limit=200${nextCursor}`);

      return {
        next_cursor: data.next_cursor,
        nodes: data.nodes,
      }
    } catch {
      return {
        next_cursor: null,
        nodes: [],
      };
    }
  }

  const getSummary = useCallback(async () => {
    setFetchSummaryLoading(true);
    setMarkerLoading(true);
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/stats`);
      const snResults = [];
      let isContinue: boolean;
      let cursor = '';
      do {
        try {
          const supernodes = await fetchSupernodes(cursor);
          if (supernodes.nodes?.length) {
            snResults.push(...supernodes.nodes)
          }
          cursor = supernodes.next_cursor;
          isContinue = !!cursor;
        } catch {
          break;
        }
      } while (isContinue);
      setNetworkStorage({
        totalSupernode: snResults.length,
        networkStorage: data?.total_storage_bytes ? `${formatBytes(data.total_storage_bytes)}` : '',
        usedStorageBytes: data?.storage_used_percent?.toFixed(2) || 0,
        availableStorageBytes: data?.storage_available_percent?.toFixed(2) || 0,
      });
      setFetchSummaryLoading(false);
      await getChartMarker(snResults);
    } catch {
      setMarkerLoading(false);
    }
    setFetchSummaryLoading(false);
    setMarkerLoading(false);
  }, [address, getChartMarker]);

  const fetchMyFiles = async (nextKey = '') => {
    if (!address) {
      return {
        actions: null,
        nextKey: null,
      };
    }
    try {
      const nextKeyParam = nextKey ? `&cursor=${nextKey}` : '';
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/actions?type=ACTION_TYPE_CASCADE&limit=${ITEM_PER_PAGE}${nextKeyParam}&creator=${address}`);
      return {
        actions: data.items,
        nextKey: data.next_cursor,
      };
    } catch (e) {
      return {
        actions: null,
        nextKey: null,
      };
    }
  };

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

  const getFileInfo = async (action: IAction) => {
    try {
      const { data } = await instance.getExternal(`${SNAPI_URL}/api/v1/actions/cascade/${action.id}/tasks`);
      const item = data.requests[0];
      if (item) {
        return {
          file_size_kbs: item.file_size_kbs,
          created_at: item.created_at,
          action_id: item.action_id,
          task_id: item.task_id,
        };
      }
      return {
        file_size_kbs: 0,
        created_at: '',
        action_id: '',
        task_id: '',
      };
    } catch (e) {
      return {
        file_size_kbs: 0,
        created_at: '',
        action_id: '',
        task_id: '',
      };
    }
  }

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
    let register_tx_id = '';
    let size = 0;
    if (action) {
      const transaction = action.transactions?.find((tx) => tx.tx_type === 'register');
      if (transaction) {
        fee = `${formatTokenDisplay({
          amount: transaction.tx_fee,
          denom: transaction.tx_fee_denom,
        })} LUME`;
      }
      size = action.size;
      register_tx_id = action.register_tx_id;
    }
    return {
      fee,
      size,
      register_tx_id,
    };
  }

  const generateFile = async (items: IAction[]) => {
    const files: IMyFile[] = [];
    for (const item of items) {
      const fileInfo = await getFileInfo(item);
      const { fee, size, register_tx_id } = await getAction(item.id);
      files.push({
        name: item.decoded.file_name || '',
        size: item.size || size || fileInfo.file_size_kbs || 0,
        txId: item?.register_tx_id || register_tx_id,
        type: getFileType(item.decoded.file_name),
        actionID: item.id,
        signatures: item.decoded.signatures,
        lastModified: item.finalize_tx_time || fileInfo.created_at || item.register_tx_time,
        state: item.state,
        datahash: item.decoded.data_hash,
        height: item.block_height,
        price: `${formatTokenDisplay({
          amount: item.price.amount,
          denom: item.price.denom,
        })} LUME`,
        fee,
        isPublic: item.decoded.public,
        taskId: fileInfo.task_id,
      });
    }
    return [...new Map(files.map(item => [item.actionID, item])).values()];
  }

  const updateFilesStogre = (files: IMyFile[]) => {
    let results: TCascadeStogre[] = [];
    const currentUploadFiles = localStorage.getItem(storeName);
    if (currentUploadFiles) {
      const currentFiles: TCascadeStogre[] = JSON.parse(currentUploadFiles);
      const filteredFiles = currentFiles.filter(item => {
        const currentDate = dayjs().subtract(1, 'day').valueOf();
        const isExist = files.some(obj => obj.taskId === item.taskId && obj.name === item.fileName);
        return !isExist || Number(currentDate) > Number(item.time);
      });
      if (filteredFiles?.length) {
        localStorage.setItem(storeName, JSON.stringify(filteredFiles));
        results = filteredFiles;
      } else {
        localStorage.removeItem(storeName);
      }
    }
    if (results?.length) {
      return results.map((r) => ({
        name: r.fileName,
        size: 0,
        txId: '',
        type: getFileType(r.fileName),
        actionID: `${new Date().getTime()}`,
        signatures: '',
        lastModified: '',
        state: 'In progress',
        datahash: '',
        height: '',
        price: '0',
        fee: '0',
        isPublic: r.isPublic || false,
        taskId: r.taskId,
      }));
    }

    return [];
  }

  const getMyFiles = useCallback(async () => {
    if (!address) {
      return;
    }
    setMyFilesLoading(true);
    setMyFilesLoadMore(true);
    try {
      const results = await fetchMyFiles();
      let isContinue = false;
      let files: IMyFile[] = [];
      let nextCursor = '';
      if (results?.actions) {
        isContinue = !!results.nextKey;
        nextCursor = results.nextKey;
        const data = await generateFile(results?.actions);
        files = data;
        const stogreFiles = updateFilesStogre(files);
        if (stogreFiles) {
          files = [...stogreFiles, ...files];
        }
        setMyFilesOriginal(files);
      }
      setMyFilesLoading(false);
      if (nextCursor) {
        do {
          const myFilesResults = await fetchMyFiles(nextCursor);
          if (myFilesResults?.actions) {
            const data = await generateFile(myFilesResults?.actions);
            files = [...files, ...data];
            if (files?.length >= ITEM_PER_PAGE && !myFiles.length) {
              setMyFiles(files.slice(0, ITEM_PER_PAGE));
              setMyFilesOriginal(files.slice(0, ITEM_PER_PAGE));
            }
          }
          if (!myFilesResults?.nextKey) {
            break;
          }
          nextCursor = myFilesResults?.nextKey;
        } while (isContinue)
      }
      let uniqueArray = [...new Map(files.map(item => [item.actionID, item])).values()];
      const stogreFiles = updateFilesStogre(uniqueArray);
      if (stogreFiles) {
        uniqueArray = [...stogreFiles, ...uniqueArray];
        setMyFiles(uniqueArray.slice(0, ITEM_PER_PAGE));
      }
      setMyFilesOriginal(uniqueArray);
      const totalSize = uniqueArray.reduce((total, item) => total + item.size, 0);
      setMyUsage({
        size: formatBytes(totalSize),
        uploaded: uniqueArray?.length || 0,
      });
    } catch (error) {
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setMyFilesLoading(false);
    setMyFilesLoadMore(false);
  }, [address]);

  const fetchRecentlyUploaded = async () => {
    try {
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/actions?type=ACTION_TYPE_CASCADE&limit=20`);
      return {
        actions: data.items,
        nextKey: data.next_cursor,
      };
    } catch (e) {
      return {
        actions: null,
        nextKey: null,
      };
    }
  };

  const getRecentlyUploaded = useCallback(async () => {
    setRecentlyUploadedLoading(true);
    try {
      const results = await fetchRecentlyUploaded();
      if (results?.actions) {
        const data = await generateFile(results?.actions);
        setRecentlyUploaded(data);
      }
    } catch (error) {
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setRecentlyUploadedLoading(false);
  }, []);

  const getTotalBalances = useCallback(async () => {
    if (!address) {
      return;
    }

    try {
      const { data } = await instance.get(`/cosmos/bank/v1beta1/balances/${address}`);
      if (data?.balances?.length) {
        let total = 0;
        for (const item of data.balances) {
          if (item.denom === DENOM) {
            total += Number(item.amount);
          }
        }
        setTotalBalance(total);
      }
    } catch {
      // noop
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      getTotalBalances();
    }
  }, [address, getTotalBalances]);

  useEffect(() => {
    if (!address) {
      getRecentlyUploaded();
    }
  }, [address, getRecentlyUploaded]);

  useEffect(() => {
    if (address) {
      getMyFiles();
    }
  }, [address, getMyFiles]);

  useEffect(() => {
    getSummary();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (address && step === 'login' && selectedUploadCascadeFiles?.length) {
      handleUploadCascadeFiles();
    }
  }, [address, step, selectedUploadCascadeFiles]);

  useEffect(() => {
    setTotalPage(Math.ceil(filteredFiles?.length / ITEM_PER_PAGE));
  }, [filteredFiles]);

  const trackingCascadeUpload = async (taskId: string) => {
    try {
      await instance.postExternal(`/api/snag/tracking-cascade-upload`, {
        taskId,
        lumeraAddress: address,
      });
    } catch (error) {
      console.error(error);
    }
  }

  const updateCascadeStogre = (taskId: string, fileName: string, isPublic: boolean) => {
    try {
      trackingCascadeUpload(taskId);
      const currentUploadFiles = localStorage.getItem(storeName);
      let files = [];
      if (currentUploadFiles) {
        files = JSON.parse(currentUploadFiles);
      }
      files.push({
        taskId,
        fileName,
        isPublic,
        time: dayjs().valueOf(),
      });
      localStorage.setItem(storeName, JSON.stringify(files));
      const newFiles = myFilesOriginal;
      newFiles.unshift({
        name: fileName,
        size: 0,
        txId: '',
        type: getFileType(fileName),
        actionID: `${new Date().getTime()}`,
        signatures: '',
        lastModified: `${new Date()}`,
        state: 'In progress',
        datahash: '',
        height: '',
        price: '0',
        fee: '0',
        isPublic,
        taskId,
      });
      setMyFiles(newFiles.slice(0, ITEM_PER_PAGE));
      setMyFilesOriginal(newFiles);
    } catch (error) {
      console.error(error);
    }
  }

  const handleUploadCascadeFiles = async () => {
    setStep('');
    if (selectedUploadCascadeFiles?.length) {
      setUploading(true);
      setError('');
      setSelectedModal('');
      try {
        if (sdkjsReact) {
          const signer = await sdkjsReact.getKeplrSigner(CHAIN_ID);
          const signaturePrompter = await sdkjsReact.createBatchedSignaturePrompter();
          const txPrompter = await sdkjsReact.createDefaultTxPrompter() || undefined;
          const client = await sdkjsReact.createLumeraClient({
            signer,
            address,
            preset: SDK_PRESET,
            gasPrice: GAS_PRICE,
          }, true);
          // Calculate expiration time (default to 24 hours from now)
          // Date.now() returns milliseconds, convert to seconds
          const expirationTime = Math.floor(Date.now() / 1000 + 86400 * 1.5).toString();
          let counter = 1;
          let isSkip = false;
          setUploadCascadeInfo(prev => prev.map((f) => ({
            ...f,
            status: 'in-process',
            message: '',
          })));
          for (const file of selectedUploadCascadeFiles) {
            try {
              if (isSkip) {
                setUploadCascadeInfo(prev => prev.map((f) => {
                  let status = f.status;
                  let message = f.message;
                  if (f.fileName === file.name) {
                    status = 'error';
                    message = 'Not enough LUME';
                  }
                  return {
                    ...f,
                    status,
                    message,
                  }
                }));
                setSelectedModal('upload-cascade');
                await delay(1000);
              } else {
                setSelectedModal('');
                const fileBuffer = await file.arrayBuffer();
                const fileBytes = new Uint8Array(fileBuffer);
                setUploadCascadeInfo(prev => prev.map((f) => {
                  let status = f.status;
                  if (f.fileName === file.name) {
                    status = 'in-process'
                  }
                  return {
                    ...f,
                    status,
                  }
                }));
                const currentFile = uploadCascadeInfo?.find((f) => f.fileName === file.name);
                const isPublic = currentFile?.isPublic || false;
                const result = await client.Cascade.uploader.uploadFile(fileBytes, {
                  fileName: file.name,
                  expirationTime,
                  isPublic,
                  signaturePrompter,
                  txPrompter,
                });
                if (result?.task_id) {
                  updateCascadeStogre(result.task_id, file.name, isPublic);
                  setUploadCascadeInfo(prev => prev.map((f) => {
                    let status = f.status;
                    if (f.fileName === file.name) {
                      status = 'done'
                    }
                    return {
                      ...f,
                      status,
                    }
                  }));
                }
                if (counter < selectedUploadCascadeFiles.length) {
                  setSelectedModal('upload-cascade');
                  await delay(5000);
                }
              }
            } catch (error) {
              const message = (error as Error)?.message ||  '';
              if (message.indexOf('insufficient funds') !== -1) {
                isSkip = true;
              }
              setUploadCascadeInfo(prev => prev.map((f) => {
                let status = f.status;
                if (f.fileName === file.name) {
                  status = 'error'
                }
                return {
                  ...f,
                  status,
                  message,
                }
              }));
            }
            counter++;
          }
          setSelectedModal('upload-cascade-success');
        }
      } catch (error) {
        setError((error as Error)?.message ||  'An unknown error occurred.');
      }
      setUploading(false);
    }
  }

  const handleUploadCascade = () => {
    if (address) {
      handleUploadCascadeFiles();
    } else {
      setStep('login');
      setSelectedModal('');
      openView();
    }
  }

  const openActionFeeModal = async (files: File[]) => {
    if (files.length) {
      setUploading(true);
      setError('');
      const newFiles = files.sort((a, b) => a.size - b.size);
      setSelectedUploadCascadeFiles(newFiles);
      try {
        const client = await sdkjsReact.createLumeraClient({
          preset: SDK_PRESET,
        });
        const results = [];
        let errorMsg: string = '';
        for (const file of newFiles) {
          try {
            const { amount  } = await client.Blockchain.Action.getActionFee(file.size);
            const fee = formatTokenDisplay({
              amount: amount,
              denom: DENOM,
            });
            results.push({
              fileName: file.name,
              fileSize: file.size,
              uploadFee: `${fee} LUME`,
              status: '',
              type: getFileType(file.name),
              isPublic: false,
              message: Number(amount) > totalBalance ? 'Not enough LUME' : '',
            })
          } catch (error) {
            errorMsg = (error as Error)?.message ||  'An unknown error occurred.';
          }
        }
        if (!errorMsg) {
          setUploadCascadeInfo(results);
          setSelectedModal('upload-cascade');
        } else {
          setError(errorMsg);
        }
      } catch (error) {
        setError((error as Error)?.message ||  'An unknown error occurred.');
      }
      setUploading(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDropRejected = (fileRejections: any) => {
    if (fileRejections.length > 0) {
      setError(`You can only select a maximum of ${UPLOAD_MAX_FILES} files. Please select fewer.`);
    }
  }

  const closeActionFeeModal = () => {
    setSelectedUploadCascadeFiles([]);
    setUploadCascadeInfo([]);
    setSelectedModal('');
    setStep('');
  }

  const handleFileTypeFilterChange = (type: string) => {
    setFileTypeFilter(prev => {
      let results: string[] = prev;
      if (type === FILES_TYPE[0].value) {
        return [type];
      } else {
        const item = results?.find((value) => value === type);
        if (item && results.length === 1) {
          return [...results];
        }
        if (type !== FILES_TYPE[0].value) {
          results = results.filter((value) => value !== FILES_TYPE[0].value)
        }
        if (item) {
          results = results.filter((value) => value !== type);
        } else {
          results.push(type);
        }
      }
      return [...results];
    });
  }

  const handleFileSearchChange = (keyword: string) => {
    setFileSearch(keyword);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDownloadedBytes = async (stream: any) => {
    // Read the stream
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const downloadedBytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      downloadedBytes.set(chunk, offset);
      offset += chunk.length;
    }

    return downloadedBytes;
  }

  const downloadFile = (content: Blob, fileName: string) => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`File "${fileName}" downloaded successfully.`, {
      position: "bottom-right",
      theme: "dark",
    });
  }

  const handleDownloadFile = async (file: IMyFile) => {
    setDownloading(true);
    try {
      if (sdkjsReact) {
        setSelectedFileDownload((prev) => [...prev, file.actionID]);
        const signer = await sdkjsReact.getKeplrSigner(CHAIN_ID);
        const client = await sdkjsReact.createLumeraClient({
          preset: SDK_PRESET,
          signer,
          address: address!,
          gasPrice: "0.025ulume",
          http: {
            timeout: 45000,
            maxRetries: 3,
          },
        });
        const stream = await client.Cascade.downloader.download(file.actionID);
        const downloadedBytes = await getDownloadedBytes(stream);
        const blob1 = new Blob([downloadedBytes]);
        downloadFile(blob1, file.name);
        const parseFile = file.name.split('.');
        trackingCascadeDownload({
          actionID: file.actionID,
          fileType: parseFile[parseFile.length - 1],
        });
      }
    } catch (error) {
      const errorMessage = (error as Error)?.message || (error as TError)?.statusText ||  'An unknown error occurred.';
      toast.error(errorMessage, {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setSelectedFileDownload((prev) => prev.filter((val) => val !== file.actionID));
    setDownloading(false);
  }

  const handleDownloadAllFile = async () => {
    setAllDownloading(true);
    try {
      if (sdkjsReact) {
        const signer = await sdkjsReact.getKeplrSigner(CHAIN_ID);
        const client = await sdkjsReact.createLumeraClient({
          preset: SDK_PRESET,
          signer,
          address: address!,
          gasPrice: "0.025ulume",
          http: {
            timeout: 45000,
            maxRetries: 3,
          },
        });
        const files: FileToDownload[] = selectedFiles;
        const zipFileName = 'downloaded_files.zip';
        const zip = new JSZip();
        const actionIDs = [];
        for (const file of files) {
          const stream = await client.Cascade.downloader.download(file.actionID);
          const downloadedBytes = await getDownloadedBytes(stream);
          const blob = new Blob([downloadedBytes]);
          zip.file(file.name, blob);
          actionIDs.push(file.actionID);
          const parseFile = file.name.split('.');
          trackingCascadeDownload({
            actionID: file.actionID,
            fileType: parseFile[parseFile.length - 1],
          });
        }
        const content = await zip.generateAsync({ type: 'blob' });
        downloadFile(content, zipFileName);
        setSelectedFiles([]);
      }
    } catch (error) {
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setAllDownloading(false);
  }

  const handlePageClick = ({ selected }: { selected: number }) => {
    const offset = selected * ITEM_PER_PAGE;
    setOffset(offset)
  }

  const handleCloseUploadCascadeSuccessModal = () => {
    getMyFiles();
    setSelectedModal('');
    setUploadCascadeInfo([]);
    setSelectedUploadCascadeFiles([]);
  }

  const handleRemoveUploadFile = (file: TUploadCascadeInfo) => {
    const newFiles = uploadCascadeInfo.filter((f) => f.fileName !== file.fileName);
    setUploadCascadeInfo([...newFiles]);
    const newSelectFiles = selectedUploadCascadeFiles.filter((f) => f.name !== file.fileName);
    setSelectedUploadCascadeFiles(newSelectFiles);
  }

  const handlePublicFile = (fileName: string, status: boolean) => {
    const newUploadCascadeInfo = uploadCascadeInfo.map((file) => {
      if (file.fileName === fileName) {
        return ({
          ...file,
          isPublic: status,
        })
      }

      return file;
    });
    setUploadCascadeInfo(newUploadCascadeInfo);
  }

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'recentlyUploaded') {
      getRecentlyUploaded();
    }
  }

  return {
    isUploading,
    error,
    isFetchSummaryLoading,
    address,
    networkStorage,
    fileCounts,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    filteredFiles,
    markers,
    isDownloading,
    isAllDownloading,
    isMyFilesLoading,
    isMarkerLoading,
    selectedModal,
    uploadCascadeInfo,
    myUsage,
    totalPage,
    isMyFilesLoadMore,
    selectedFileDownload,
    currentOffset,
    recentlyUploaded,
    isRecentlyUploadedLoading,
    fileSizes,
    currentTab,
    handleTabChange,
    handlePublicFile,
    handleCloseUploadCascadeSuccessModal,
    handlePageClick,
    closeActionFeeModal,
    openActionFeeModal,
    handleDownloadAllFile,
    handleDownloadFile,
    handleSelectAll,
    handleSelectFile,
    handleFileSearchChange,
    handleFileTypeFilterChange,
    handleUploadCascade,
    handleRemoveUploadFile,
    handleDropRejected,
  }
}

export default useCascade;
