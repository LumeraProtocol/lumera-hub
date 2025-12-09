'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from 'react-toastify';
import JSZip from 'jszip';
import IPLocate from 'node-iplocate';

import { useSelector } from '@/redux/hooks';
import useWalletConnect from '@/hooks/useWalletConnect';
import { getExternal } from '@/utils/api';
import {
  RPC_ENDPOINT,
  CHAIN_ID,
  REST_AI_URL,
  SNAPI_URL,
} from '@/contants/network';

export interface ITask {
  taskId?: string | undefined;
  status?: string | undefined;
  progress?: number | undefined;
}

export interface IMyFile {
  lastModified: string;
  name: string;
  size: number;
  txId: string;
  type: string;
}

export interface IMarker {
  latLng: [number, number];
  name: string;
  supernodeAccount: string;
  validatorAddress: string;
  address: string;
  height: string;
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
  lastActionId: string;
  name: string;
}

type TIpAddresses = {
  address: string;
  height: string;
}

interface ISupernode {
  metrics: {
    height: string;
    reportCount: string;
  };
  note: string;
  p2pPort: string;
  prevIpAddresses: TIpAddresses[];
  supernodeAccount: string;
  validatorAddress: string;
}

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

const GAS_PRICE = '0.025ulume';

const client = new IPLocate(process.env.NEXT_PUBLIC_IPAPI_KEY || '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCascade = ({ lumeraSdk }: { lumeraSdk: any }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getOfflineSigner } = useWalletConnect();
  const { address } = useSelector((state) => state.wallet);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<ITask | null>(null);
  const [isFetchSummaryLoading, setFetchSummaryLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalSupernode: 0,
    networkStorage: '0',
    myUsage: '0',
    myUploaded: 0,
  });
  const [fileTypeFilter, setFileTypeFilter] = useState<string>(FILES_TYPE[0].value);
  const [fileSearch, setFileSearch] = useState('');
  const [myFiles, setMyFiles] = useState<IMyFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [markers, setMarkers] = useState<IMarker[]>([]);
  const [isDownloading, setDownloading] = useState(false);
  const [isMyFilesLoading, setMyFilesLoading] = useState(false);
  const [isMarkerLoading, setMarkerLoading] = useState(false);

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
    myFiles.forEach(file => {
      if (counts.hasOwnProperty(file.type)) {
        counts[file.type as TFileTypeKey]++;
      } else {
        counts.other++;
      }
    });
    return counts;
  }, [myFiles]);


  const handleSelectFile = (file: IMyFile) => {
    setSelectedFiles(prev => prev.includes(file.name) ? prev.filter(f => f !== file.name) : [...prev, file.name]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(filteredFiles.map(f => f.name));
    } else {
      setSelectedFiles([]);
    }
  };

  const fetchLocationFromIpLocate = async (ip: string) => {
    try {
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
      throw new Error(error instanceof Error ? error?.message : 'An unknown error occurred.')
    }
  }

  const fetchLocationFromIpWho = async (ip: string) => {
    try {
      const { data } = await getExternal(`https://ipwho.is/${ip}`);
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

  const fetchLocationFromAbstractApi = async (ip: string) => {
    try {
      const { data } = await getExternal(`https://ip-intelligence.abstractapi.com/v1/?api_key=${process.env.NEXT_PUBLIC_ABSTRACTAPI_KEY || ''}&ip_address=${ip}`);
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

  const fetchChartMarker = useCallback(async (items: ISupernode[]) => {
    if (markers?.length || items?.length === markers.length) {
      return;
    }
    try {
      const results: IMarker[] = [];
      for (const item of items) {
        const ip = item.prevIpAddresses[0].address.split(':')[0];
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
            supernodeAccount: item.supernodeAccount,
            validatorAddress: item.validatorAddress,
            address: item.prevIpAddresses[0].address,
            height: item.prevIpAddresses[0].height,
            p2pPort: item.p2pPort,
          });
        }
      }
      setMarkers(results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
  }, [markers]);

const fetchSummary = useCallback(async () => {
  setFetchSummaryLoading(true);
  setMarkerLoading(true);
  try {
    if (lumeraSdk) {
      const offlineSigner = await getOfflineSigner();
      const items: ISupernode[] = await lumeraSdk.getSupernodes({
        chainId: CHAIN_ID,
        rpcUrl: RPC_ENDPOINT,
        lcdUrl: REST_AI_URL,
        snapiUrl: SNAPI_URL,
        signer: offlineSigner,
        address,
        gasPrice: GAS_PRICE,
      });
      setSummary({
        totalSupernode: items?.length || 0,
        networkStorage: '25 TB', // TBD
        myUsage: '50 MB', // TBD
        myUploaded: 10, // TBD
      });

      await fetchChartMarker(items);
    }
  } catch {
    setMarkerLoading(false);
  }
  setFetchSummaryLoading(false);
  setMarkerLoading(false);
}, [lumeraSdk, address, fetchChartMarker]);

const fetchMyFiles = useCallback(async () => {
  setMyFilesLoading(true);
  try {
    // TODO: Implement
    setMyFiles([]);  // TBD
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
      position: "bottom-center",
      theme: "dark",
    });
  }
  setMyFilesLoading(false);
}, []);

useEffect(() => {
  if (address) {
    fetchMyFiles();
    fetchSummary();
  }
}, [address, fetchMyFiles, fetchSummary]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleUploadCascade = async (files: File[]) => {
    setUploading(true);
    setError('');
    setUploadResult(null);
    try {
      if (lumeraSdk) {
        const offlineSigner = await lumeraSdk.getKeplrSigner(CHAIN_ID);
        const selectedFile = files[0];
        const fileBuffer = await selectedFile.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        const expirationTime = Math.floor(Date.now() / 1000 + 86400 * 1.5).toString();
        const signaturePrompter = lumeraSdk.createBatchedSignaturePrompter();
        const txPrompter = lumeraSdk.createDefaultTxPrompter() || undefined;
        const result = await lumeraSdk.uploadCascade({
          fileBytes,
          fileName: selectedFile.name,
          expirationTime,
          isPublic: false,
          signaturePrompter,
          txPrompter,
        }, {
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          signer: offlineSigner,
          address,
          gasPrice: GAS_PRICE,
        });
        setUploadResult(result);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setUploading(false);
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

  const downloadFilee = (content: Blob, fileName: string) => {
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
        const lastActionId = ''; // TBD
        const offlineSigner = await getOfflineSigner();
        const stream =  await lumeraSdk.downloadCascade({
          lastActionId,
        }, {
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          signer: offlineSigner,
          address,
          gasPrice: GAS_PRICE,
        });
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
        downloadFilee(blob, file.name);
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
        // TODO: Implement
        const files: FileToDownload[] = selectedFiles.map((name) => ({
          name,
          lastActionId: '',
        })); // TBD
        const zipFileName = 'downloaded_files.zip';
        const offlineSigner = await getOfflineSigner();
        const zip = new JSZip();
        for (const file of files) {
          const stream =  await lumeraSdk.downloadCascade({
            lastActionId: file.lastActionId,
          }, {
            chainId: CHAIN_ID,
            rpcUrl: RPC_ENDPOINT,
            lcdUrl: REST_AI_URL,
            snapiUrl: SNAPI_URL,
            signer: offlineSigner,
            address,
            gasPrice: GAS_PRICE,
          });

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
        downloadFilee(content, zipFileName);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setDownloading(false);
  }

  return {
    isUploading,
    error,
    uploadResult,
    isFetchSummaryLoading,
    address,
    summary,
    fileCounts,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    filteredFiles,
    markers,
    isDownloading,
    isMyFilesLoading,
    isMarkerLoading,
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
