'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from 'react-toastify';
import JSZip from 'jszip';

import { useSelector } from '@/redux/hooks';
import useWalletConnect from '@/hooks/useWalletConnect';
import { getExternal, postExternal } from '@/utils/api';
import { isValidIPv4 } from '@/utils/helpers';
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
      const { data } = await postExternal('/api/supernode', {
        action: 'read'
      });
      return data?.supernodes || [];
    } catch {
      return [];
    }
  }

  const writeSupernodeFile = async (content: IMarker[]) => {
    try {
      const { data } = await postExternal('/api/supernode', {
        action: 'write',
        content
      });
      return data;
    } catch {
      return null;
    }
  }

  const fetchChartMarker = useCallback(async (items: ISupernode[]) => {
    if (markers?.length || items?.length === markers.length) {
      return;
    }
    try {
      const results: IMarker[] = [];
      const supernodeData: IMarker[] = await readSupernodeFile();
      for (const item of items) {
        const address = item.prevIpAddresses[0].address;
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
                supernodeAccount: item.supernodeAccount,
                validatorAddress: item.validatorAddress,
                address,
                height: item.prevIpAddresses[0].height,
                p2pPort: item.p2pPort,
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

  const fetchSummary = useCallback(async () => {
    setFetchSummaryLoading(true);
    setMarkerLoading(true);
    try {
      if (lumeraSdk) {
        const client = await lumeraSdk.getLumeraClientWithoutSigner({
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          gasPrice: GAS_PRICE,
        });
        const items: ISupernode[] = await lumeraSdk.getSupernodes(client);
        setSummary({
          totalSupernode: items?.length || 0,
          networkStorage: '25 TB', // TBD
          myUsage: '50 MB', // TBD
          myUploaded: 10, // TBD
        });
        setFetchSummaryLoading(false);
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
    }
  }, [address, fetchMyFiles]);

  useEffect(() => {
    fetchSummary();

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
        const client = await lumeraSdk.getLumeraClient({
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          signer: offlineSigner,
          address,
          gasPrice: GAS_PRICE,
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
        const client = await lumeraSdk.getLumeraClient({
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          signer: offlineSigner,
          address,
          gasPrice: GAS_PRICE,
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
        const client = await lumeraSdk.getLumeraClient({
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          signer: offlineSigner,
          address,
          gasPrice: GAS_PRICE,
        });
        const zip = new JSZip();
        for (const file of files) {
          const stream =  await lumeraSdk.downloadCascade({
            lastActionId: file.lastActionId,
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
