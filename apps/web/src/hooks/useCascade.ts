'use client';

import { useState, useEffect, useMemo } from "react";
import { toast } from 'react-toastify';
import JSZip from 'jszip';
// import { useLumeraClient } from 'react-lumera-sdk';

import { useSelector } from '@/redux/hooks';
import useWalletConnect from '@/hooks/useWalletConnect';

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
  value: number;
  style?: { fill: string };
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

const fakeData = [
  { name: 'project-lumera-whitepaper.pdf', size: 5242880, lastModified: '2025-07-10T10:00:00Z', type: 'pdf', txId: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`},
  { name: 'brand-assets.zip', size: 157286400, lastModified: '2025-07-09T15:30:00Z', type: 'zip', txId: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`},
  { name: 'dashboard-preview.png', size: 1887436, lastModified: '2025-07-08T11:20:00Z', type: 'image', txId: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`},
  { name: 'meeting-notes-q2.docx', size: 34560, lastModified: '2025-07-07T18:00:00Z', type: 'docx', txId: `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`},
];

const fakeMarkers: IMarker[] = [
  { latLng: [48.8566, 2.3522], name: "Paris", value: 10, style: { fill: "#66586d" } }, // France
  { latLng: [40.7128, -74.006], name: "New York", value: 20, style: { fill: "#66586d" } }, // USA
  { latLng: [35.6895, 139.6917], name: "Tokyo", value: 15, style: { fill: "#66586d" } }, // Japan
  { latLng: [-33.8688, 151.2093], name: "Sydney", value: 8, style: { fill: "#868991" } }, // Australia
  { latLng: [55.7558, 37.6173], name: "Moscow", value: 12, style: { fill: "#66586d" } }, // Russia
  { latLng: [51.5074, -0.1278], name: "London", value: 14, style: { fill: "#66586d" } }, // UK
  { latLng: [-23.5505, -46.6333], name: "São Paulo", value: 9, style: { fill: "#868991" } }, // Brazil
  { latLng: [39.9042, 116.4074], name: "Beijing", value: 18, style: { fill: "#66586d" } }, // China
  { latLng: [28.6139, 77.209], name: "New Delhi", value: 7, style: { fill: "#868991" } }, // India
  { latLng: [-26.2041, 28.0473], name: "Johannesburg", value: 11, style: { fill: "#66586d" } }, // South Africa
  { latLng: [25.2769, 55.2962], name: "Dubai", value: 13, style: { fill: "#66586d" } }, // UAE
  { latLng: [43.6532, -79.3832], name: "Toronto", value: 6, style: { fill: "#868991" } }, // Canada
  { latLng: [1.3521, 103.8198], name: "Singapore", value: 16, style: { fill: "#66586d" } }, // Singapore
  { latLng: [37.7749, -122.4194], name: "San Francisco", value: 17, style: { fill: "#66586d" } }, // USA
  { latLng: [19.4326, -99.1332], name: "Mexico City", value: 8, style: { fill: "#868991" } }, // Mexico
  { latLng: [41.9028, 12.4964], name: "Rome", value: 10, style: { fill: "#66586d" } }, // Italy
  { latLng: [-34.6037, -58.3816], name: "Buenos Aires", value: 5, style: { fill: "#868991" } }, // Argentina
  { latLng: [30.0444, 31.2357], name: "Cairo", value: 12, style: { fill: "#66586d" } }, // Egypt
  { latLng: [13.7563, 100.5018], name: "Bangkok", value: 9, style: { fill: "#868991" } }, // Thailand
  { latLng: [59.9139, 10.7522], name: "Oslo", value: 11, style: { fill: "#66586d" } }, // Norway
];

const GAS_PRICE = '0.025ulume';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCascade = ({ lumeraSdk }: { lumeraSdk: any }) => {
  const { getOfflineSigner } = useWalletConnect();
  const { address } = useSelector((state) => state.wallet);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<ITask | null>(null);
  const [isFetchSumaryLoading, setFetchSumaryLoading] = useState(false);
  const [sumary, setSumary] = useState({
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

  const fetchSumary = async (counter = 1) => {
    setFetchSumaryLoading(true);
    try {
      if (lumeraSdk) {
        const offlineSigner = await getOfflineSigner();
        const items = await lumeraSdk.getSupernodes({
          chainId: CHAIN_ID,
          rpcUrl: RPC_ENDPOINT,
          lcdUrl: REST_AI_URL,
          snapiUrl: SNAPI_URL,
          signer: offlineSigner,
          address,
          gasPrice: GAS_PRICE,
        });
        setSumary({
          totalSupernode: items?.length || 0,
          networkStorage: '25 TB', // TBD
          myUsage: '50 MB', // TBD
          myUploaded: 10, // TBD
        });
      }
    } catch {
      if (counter <= 2) {
       setTimeout(() => fetchSumary(counter + 1), 30000)
        return;
      }
    }
    setFetchSumaryLoading(false);
  }

  const fetchChartMarker = async () => {
    setMarkerLoading(true);
    try {
     setMarkers(fakeMarkers); // TBD
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setMarkerLoading(false);
  }

  const fetchMyFiles = async () => {
    setMyFilesLoading(true);
    try {
      setMyFiles(fakeData);  // TBD
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setMyFilesLoading(false);
  }

  useEffect(() => {
    if (address) {
      fetchSumary();
      fetchMyFiles();
      fetchChartMarker();
    }
  }, [address]);

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

  const handleDonwloadFile = async (file: IMyFile) => {
    setDownloading(true);
    try {
      if (lumeraSdk) {
        const lastActionId = '';
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

        if (!downloadedBytes) {
          toast.error('Error when downloading the file. Please try again.', {
            position: "bottom-center",
            theme: "dark",
          });
          return;
        }
        // Create a blob and download it
        const blob = new Blob([downloadedBytes]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.', {
        position: "bottom-center",
        theme: "dark",
      });
    }
    setDownloading(false);
  }

  const handleDonwloadAllFile = async () => {
    setDownloading(true);
    try {
      if (lumeraSdk) {
        const files: FileToDownload[] = [];
        const zipFileName = 'downloaded_files.zip';

        const offlineSigner = await getOfflineSigner();

        const zip = new JSZip();
        const downloadPromises: Promise<void>[] = [];

        for (const file of files) {
          const downloadPromise = (async () => {
            try {
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

              if (!downloadedBytes) {
                toast.error('Error when downloading the file. Please try again.', {
                  position: "bottom-center",
                  theme: "dark",
                });
                return;
              }

              if (downloadedBytes) {
                zip.file(file.name, downloadedBytes);
              }
            } catch (error) {
              console.error(error);
            }
          })();
          downloadPromises.push(downloadPromise);
        }

        await Promise.all(downloadPromises);

        const content = await zip.generateAsync({ type: 'blob' });

        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
    isFetchSumaryLoading,
    address,
    sumary,
    fileCounts,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    filteredFiles,
    markers,
    isDownloading,
    isMyFilesLoading,
    isMarkerLoading,
    handleDonwloadAllFile,
    handleDonwloadFile,
    handleSelectAll,
    handleSelectFile,
    handleFileSearchChange,
    handleFileTypeFilterChange,
    handleUploadCascade,
  }
}

export default useCascade;
