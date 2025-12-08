'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from 'react-toastify';
import JSZip from 'jszip';

import { useSelector } from '@/redux/hooks';
import useWalletConnect from '@/hooks/useWalletConnect';
import * as instance from '@/utils/api';
import { formatBytes, isValidIPv4 } from '@/utils/helpers';
import { formatNumber } from '@/utils/format';
import {
  CHAIN_ID,
  SDK_PRESET,
  SNSCOPE_URL,
} from '@/contants/network';
import { RATE_VALUE } from '@/contants';

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

export type TFileTypeKey = 'all' | 'image' | 'pdf' | 'video' | 'archive' | 'other';

interface FileTypeOption {
  value: TFileTypeKey;
  label: string;
}

interface FileToDownload {
  actionID: string;
  name: string;
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
  };
  id: string;
  state: string;
  type: string;
}

export interface ISelectedFile {
  name: string;
  actionID: string;
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const PDF_EXT = ['pdf'];
const VIDEO_EXT = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

export const FILES_TYPE: FileTypeOption[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'image',
    label: 'Image',
  },
  {
    value: 'pdf',
    label: 'PDF',
  },
  {
    value: 'video',
    label: 'Video',
  },
  {
    value: 'archive',
    label: 'Archive',
  },
];

const getFileType = (filename: string) => {
  if (!filename) return '';

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (IMAGE_EXT.includes(ext)) return 'image';
  if (PDF_EXT.includes(ext)) return 'pdf';
  if (VIDEO_EXT.includes(ext)) return 'video';

  return 'archive';
}

const ITEM_PER_PAGE = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCascade = ({ lumeraSdk }: { lumeraSdk: any }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getOfflineSigner } = useWalletConnect();
  const { address } = useSelector((state) => state.wallet);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<ITask | null>(null);
  const [isFetchSummaryLoading, setFetchSummaryLoading] = useState(false);
  const [networkStorage, setNetworkStorage] = useState({
    totalSupernode: 0,
    networkStorage: 'TBD',
  });
  const [myUsage, setMyUsage] = useState({
    size: '0 Bytes',
    uploaded: 0,
  });
  const [fileTypeFilter, setFileTypeFilter] = useState<string>(FILES_TYPE[0].value);
  const [fileSearch, setFileSearch] = useState('');
  const [myFiles, setMyFiles] = useState<IMyFile[]>([]);
  const [myFilesOriginal, setMyFilesOriginal] = useState<IMyFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<ISelectedFile[]>([]);
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [isDownloading, setDownloading] = useState(false);
  const [isMyFilesLoading, setMyFilesLoading] = useState(false);
  const [isMyFilesLoadMore, setMyFilesLoadMore] = useState(false);
  const [isMarkerLoading, setMarkerLoading] = useState(false);
  const [selectedUploadCascadeFiles, setSelectedUploadCascadeFiles] = useState<File[]>([]);
  const [selectedModal, setSelectedModal] = useState('');
  const [uploadCascadeInfo, setSploadCascadeInfo] = useState({
    fileName: '',
    fileZise: 0,
    uploadFee: '',
  });
  const [totalPage, setTotalPage] = useState(0);

  const filteredFiles = useMemo(() => {
    return myFiles
      .filter(file => file.name.toLowerCase().includes(fileSearch.toLowerCase()))
      .filter(file => fileTypeFilter === 'all' || file.type === fileTypeFilter);
  }, [myFiles, fileSearch, fileTypeFilter]);

  const fileCounts: Record<TFileTypeKey, number> = useMemo(() => {
    const counts: Record<TFileTypeKey, number> = {
        all: myFiles.length,
        image: 0,
        pdf: 0,
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

  const handleSelectFile = (file: IMyFile) => {
    setSelectedFiles(prev => {
      const existFile = prev.find((file) => file.actionID === file.actionID);
      if (existFile) {
        return prev.filter(f => f.actionID !== file.actionID);
      }
      return [...prev, {
        name: file.name,
        actionID: file.actionID,
      }];
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(filteredFiles.map(f => ({
        name: f.name,
        actionID: f.actionID,
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
      throw new Error(error instanceof Error ? error?.message : 'An unknown error occurred.')
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
    return data;
  }

  const readSupernodeFile = async () => {
    try {
      const { data } = await instance.postExternal('/api/supernode', {
        action: 'read'
      });
      return data?.supernodes || [];
    } catch {
      return [];
    }
  }

  const writeSupernodeFile = async (content: IMarker[]) => {
    try {
      const { data } = await instance.postExternal('/api/supernode', {
        action: 'write',
        content
      });
      return data;
    } catch {
      return null;
    }
  }

  const getChartMarker = useCallback(async (items: ISupernode[]) => {
    try {
      const results: IMarker[] = [];
      const supernodeData: IMarker[] = await readSupernodeFile();
      for (const item of items) {
        const address = item.ip_address;
        const ip = address.split(':')[0];
        if (isValidIPv4(ip)) {
          const supernode = supernodeData.find((s) => s.address === address);
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
      }
      setMarkers(results);
      if (results?.length) {
        await writeSupernodeFile(results);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
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
      if (lumeraSdk) {
        const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/supernodes/stats`);
        const snResults = [];
        let isContinue = true;
        let cursor = '';
        do {
          const data = await fetchSupernodes(cursor);
          if (data.nodes?.length) {
            snResults.push(...data.nodes)
          }
          cursor = data.next_cursor;
          if (!data.next_cursor) {
            isContinue = false;
          }
        } while (isContinue)
        setNetworkStorage({
          totalSupernode: snResults.length || 0,
          networkStorage: data?.total_memory_gb ? `${formatNumber(data.total_memory_gb, { decimalsLength: 2})} GB` : '',
        });
        setFetchSummaryLoading(false);
        await getChartMarker(snResults);
      }
    } catch {
      setMarkerLoading(false);
    }
    setFetchSummaryLoading(false);
    setMarkerLoading(false);
  }, [lumeraSdk, address, getChartMarker]);

  const fetchMyFiles = async (nextKey = '') => {
    try {
      const nextKeyParam = nextKey ? `&cursor=${nextKey}` : '';
      const { data } = await instance.getExternal(`${SNSCOPE_URL}/v1/actions?type=ACTION_TYPE_CASCADE&limit=${ITEM_PER_PAGE}${nextKeyParam}&creator=${address}`)

      return {
        actions: data.items,
        nextKey: data.next_cursor,
      };
    } catch (e) {
      console.error('API Error:', e);
      return {
        actions: null,
        nextKey: null,
      };
    }
  };

  const generateFile = (items: IAction[]) => {
    const files: IMyFile[] = [];
    for (const item of items) {
      files.push({
        name: item.decoded.file_name || '',
        size: 0,// TBD
        txId: '',// TBD
        type: getFileType(item.decoded.file_name),
        actionID: item.id,
        lastModified: `${new Date()}`,// TBD
      });
    }
    return files;
  }

  const getMyFiles = useCallback(async () => {
    setMyFilesLoading(true);
    setMyFilesLoadMore(true);
    try {
      const results = await fetchMyFiles();
      let isContinue = false;
      const files: IMyFile[] = [];
      let nextCursor = '';
      if (results?.actions) {
        isContinue = !!results.nextKey;
        nextCursor = results.nextKey;
        const data = generateFile(results?.actions);
        files.push(...data)
        setMyFiles(data);
      }
      let counter = 1;
      do {
        const results = await fetchMyFiles(nextCursor);
        if (results?.actions) {
          const data = generateFile(results?.actions);
          files.push(...data)
        }
        if (!results?.nextKey || counter > 3) {
          isContinue = false;
        }
        counter++;
      } while (isContinue)

      setMyFilesOriginal(files);
      const totalSize = files.reduce((total, item) => total + item.size, 0);
      setTotalPage(Math.ceil(files?.length / ITEM_PER_PAGE));
      setMyUsage({
        size: formatBytes(totalSize),
        uploaded: files?.length || 0,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setMyFilesLoading(false);
    setMyFilesLoadMore(false);
  }, []);

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

  const handleUploadCascade = async () => {
    if (selectedUploadCascadeFiles?.length) {
      setSelectedModal('');
      setUploading(true);
      setError('');
      setUploadResult(null);
      try {
        if (lumeraSdk) {
          const offlineSigner = await lumeraSdk.getKeplrSigner(CHAIN_ID);
          const selectedFile = selectedUploadCascadeFiles[0];
          const fileBuffer = await selectedFile.arrayBuffer();
          const fileBytes = new Uint8Array(fileBuffer);
          const expirationTime = Math.floor(Date.now() / 1000 + 86400 * 1.5).toString();
          const signaturePrompter = lumeraSdk.createBatchedSignaturePrompter();
          const txPrompter = lumeraSdk.createDefaultTxPrompter() || undefined;
          const client = await lumeraSdk.getLumeraClient({
            signer: offlineSigner,
            address,
            preset: SDK_PRESET,
          });
          const result = await lumeraSdk.uploadCascade({
            fileBytes,
            fileName: selectedFile.name,
            expirationTime,
            isPublic: false,
            signaturePrompter,
            txPrompter,
          }, client);
          setUploadResult(result);
          setSelectedModal('upload-cascade-success');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      setUploading(false);
    }
  }

  const openActionFeeModal = async (files: File[]) => {
    setUploading(true);
    setError('');
    setSelectedUploadCascadeFiles(files);
    try {
      const selectedFile = files[0];
      const client = await lumeraSdk.getLumeraClientWithoutSigner({
        preset: SDK_PRESET,
      });
      const result = await lumeraSdk.getActionFee(client, selectedFile.size);
      setSploadCascadeInfo({
        fileName: selectedFile.name,
        fileZise: selectedFile.size,
        uploadFee: `${parseFloat((Number(result.amount) / RATE_VALUE).toFixed(2))} LUME`,
      });
      setSelectedModal('upload-cascade');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setUploading(false);
  }

  const closeActionFeeModal = () => {
    setSelectedUploadCascadeFiles([]);
    setSelectedModal('');
  }

  const handleFileTypeFilterChange = (type: string) => {
    setFileTypeFilter(type);
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
  }

  const handleDownloadFile = async (file: IMyFile) => {
    setDownloading(true);
    try {
      if (lumeraSdk) {
        const lastActionId = file.actionID;
        const offlineSigner = await getOfflineSigner();
        const client = await lumeraSdk.getLumeraClient({
          signer: offlineSigner,
          address,
          preset: SDK_PRESET,
        });
        const stream =  await lumeraSdk.downloadCascade({
          lastActionId,
        }, client);
        if (!stream) {
          toast.error('Error when downloading the file. Please try again.', {
            position: "bottom-center",
            theme: "dark",
          });
          return;
        }
        const downloadedBytes = await getDownloadedBytes(stream);
        // Create a blob and download it
        const blob = new Blob([downloadedBytes]);
        downloadFile(blob, file.name);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setDownloading(false);
  }

  const handleDownloadAllFile = async () => {
    setDownloading(true);
    try {
      if (lumeraSdk) {
        const files: FileToDownload[] = selectedFiles;
        const zipFileName = 'downloaded_files.zip';
        const offlineSigner = await getOfflineSigner();
        const client = await lumeraSdk.getLumeraClient({
          signer: offlineSigner,
          address,
          preset: SDK_PRESET,
        });
        const zip = new JSZip();
        for (const file of files) {
          const stream =  await lumeraSdk.downloadCascade({
            lastActionId: file.actionID,
          }, client);

          if (!stream) {
            toast.error('Error when downloading the file. Please try again.', {
              position: "bottom-center",
              theme: "dark",
            });
            return;
          }
          const downloadedBytes = await getDownloadedBytes(stream);
          const blob = new Blob([downloadedBytes]);
          zip.file(file.name, blob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        downloadFile(content, zipFileName);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setDownloading(false);
  }

  const handlePageClick = ({ selected }: { selected: number }) => {
    const offset = selected * ITEM_PER_PAGE;
    setMyFiles(myFilesOriginal.slice(offset, offset + ITEM_PER_PAGE));
  }

  const handleCloseUploadCascadeSuccessModal = () => {
    getMyFiles();
    setSelectedModal('');
  }

  return {
    isUploading,
    error,
    uploadResult,
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
    isMyFilesLoading,
    isMarkerLoading,
    selectedModal,
    uploadCascadeInfo,
    myUsage,
    totalPage,
    isMyFilesLoadMore,
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
  }
}

export default useCascade;
