'use client';

import React, { useState } from 'react';
import {
  YStack,
  Card,
  H3,
  Paragraph,
  Input,
  Checkbox,
} from 'tamagui';
import Dropzone from 'react-dropzone';
import { CloudUpload } from '@tamagui/lucide-icons';
import { worldMill } from "@react-jvectormap/world";
import {
  Search,
  Download,
  ArrowUpRight,
  ImageIcon,
  Video,
  FileText,
  FileArchive,
  FileIcon,
  Check as CheckIcon,
  CircleX,
} from 'lucide-react';

import Loading from '@/components/Loading';
import Skeleton from '@/components/Skeleton';
import AppButton from '@/components/AppButton';
import AppLink from '@/components/AppLink';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import useCascade, { FILES_TYPE, TFileTypeKey, IMarker } from '@/hooks/useCascade';
import { formatAddress } from '@/utils/format';
import { getSimplifiedType, formatBytes } from '@/utils/helpers';
import { useLumeraClientWrapper } from '@/hooks/useLumeraClientWrapper';

interface ICascadeScreen {
  JVectorMapWithNoSSR: any;
}

interface ICascadeContent {
  JVectorMapWithNoSSR: any;
  module: any;
}

interface ISuperNodeMap {
  JVectorMapWithNoSSR: any;
  markers: IMarker[];
}

const countryNames: { [key: string]: string } = {
  AR: "Argentina",
  AU: "Australia",
  BH: "Bahrain",
  BR: "Brazil",
  CM: "Cameroon",
  CA: "Canada",
  CN: "China",
  CO: "Colombia",
  CU: "Cuba",
  FR: "France",
  GL: "Greenland",
  GU: "Guam",
  HK: "Hong Kong",
  IN: "India",
  ID: "Indonesia",
  IL: "Israel",
  IT: "Italy",
  JP: "Japan",
  MO: "Macau",
  MV: "Maldives",
  MX: "Mexico",
  NZ: "New Zealand",
  NO: "Norway",
  PY: "Paraguay",
  PE: "Peru",
  QA: "Qatar",
  RU: "Russia",
  SN: "Senegal",
  SG: "Singapore",
  ZA: "South Africa",
  ES: "Spain",
  TW: "Taiwan",
  TZ: "Tanzania",
  GB: "United Kingdom",
  // US: "United States",
  UZ: "Uzbekistan",
  VN: "Vietnam",
};

const SuperNodeMap = React.memo(({ JVectorMapWithNoSSR, markers }: ISuperNodeMap) => {
  const [selectedMarker, seSelectedMarker] = useState<IMarker | null>(null);

  if (!JVectorMapWithNoSSR || !markers?.length) {
    return (
      <div className='min-h-80'></div>
    );
  }

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <JVectorMapWithNoSSR
        map={worldMill}
        backgroundColor="#151d29"
        zoomOnScroll={true}
        zoomMax={8}
        regionStyle={{
          initial: {
            fill: "#0e1420",
            stroke: "none",
          },
          hover: {
            cursor: "pointer",
          },
        }}
        regionLabelStyle={{
          initial: {
            fill: "#373c44",
            fontSize: 12,
            fontWeight: "bold",
          },
          hover: {
            fill: "#373c44",
          },
        }}
        labels={{
          regions: {
            render: (code: string) => countryNames[code] || '',
            offsets: (code: string) => {
              return [0, 0];
            },
          },
        }}
        markerStyle={{
          initial: {
            r: 5,
            fill: "#078A8A",
            stroke: "#2a323f",
            "stroke-width": 1,
          },
          hover: {
            r: 6,
            stroke: "#2a323f",
          },
        }}
        markers={markers}
        onMarkerClick={(event: Event, code: string) => {
          const index = parseInt(code);
          const selectedMarker = markers[index];
          seSelectedMarker(selectedMarker);
        }}
      />
      {selectedMarker ? (
        <>
          <div className='fixed top-0 right-0 z-[100] bottom-0 transform-3d transition-all duration-300'>
            <Card elevate size="$4" bordered className='!h-full'>
              <div className='relative'>
                <div className='text-right my-2 pr-5'>
                  <button className='cursor-pointer' onClick={() => seSelectedMarker(null)}>
                    <CircleX />
                  </button>
                </div>
                <div className='h-full p-5 overflow-y-auto max-h-[90vh]'>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500 whitespace-nowrap'>Supernode Account:</div>
                    <div className="w-full truncate">
                      {formatAddress(selectedMarker.supernodeAccount, 15, -6)}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>Validator Address:</div>
                    <div className="w-full truncate">
                      <AppLink href={`/staking/${selectedMarker.validatorAddress}`}>
                        {formatAddress(selectedMarker.validatorAddress, 15, -6)}
                      </AppLink>
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>IP:</div>
                    <div className="w-full truncate">
                      {selectedMarker.address}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>P2pPort:</div>
                    <div className="w-full truncate">
                      {selectedMarker.p2pPort}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>Height:</div>
                    <div className="w-full truncate">
                      <AppLink href={`/block/${selectedMarker.height}`}>
                        {selectedMarker.height}
                      </AppLink>
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>City:</div>
                    <div className="w-full truncate">
                      {selectedMarker.city}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>Country:</div>
                    <div className="w-full truncate">
                      {selectedMarker.country}
                    </div>
                  </div>
                  <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                    <div className='w-full md:w-60 text-gray-500'>Continent:</div>
                    <div className="w-full truncate">
                      {selectedMarker.continent}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <div className='fixed inset-0 z-50 bg-black/10' onClick={() => seSelectedMarker(null)}></div>
        </>
      ): null
      }
    </div>
  );
});

const getFileIcon = (type: string) => {
  const simpleType = getSimplifiedType(type);
  switch (simpleType) {
    case 'Image': return <ImageIcon className="w-6 h-6 text-blue-400" />;
    case 'Video': return <Video className="w-6 h-6 text-purple-400" />;
    case 'PDF': return <FileText className="w-6 h-6 text-red-400" />;
    case 'Archive': return <FileArchive className="w-6 h-6 text-yellow-400" />;
    default: return <FileIcon className="w-6 h-6 text-gray-400" />;
  }
};

export const CascadeScreen = ({
  JVectorMapWithNoSSR,
}: ICascadeScreen) => {
  const { module, isLoaded, error } = useLumeraClientWrapper();

  if (!isLoaded || error) {
    return (
      <div className='w-full h-full relative flex items-center justify-center min-h-[82vh]'>
        <div className='inline-flex items-center gap-3 w-auto'>
          <div>
            <Loading isLoading className='relative !top-0 !left-0 !transform-none' />
          </div>
          <span>Loading ...</span>
        </div>
      </div>
    );
  }

  return (
    <CascadeContent module={module} JVectorMapWithNoSSR={JVectorMapWithNoSSR} />
  );
};

export const CascadeContent = React.memo(({
  JVectorMapWithNoSSR,
  module,
}: ICascadeContent) => {
  const client = module.useLumeraClient();
  const memoizedClient = React.useMemo(() => client, [client]);

  const {
    isUploading,
    error,
    isFetchSummaryLoading,
    summary,
    address,
    fileCounts,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    filteredFiles,
    markers,
    isDownloading,
    isMyFilesLoading,
    isMarkerLoading,
    handleDownloadAllFile: onDownloadAllFile,
    handleDownloadFile: onDownloadClick,
    handleSelectFile:onSelectFile,
    handleSelectAll: onSelectAll,
    handleFileSearchChange: onFileSearchChange,
    handleFileTypeFilterChange: onFileTypeFilterChange,
    handleUploadCascade: onFileChange,
  } = useCascade({ lumeraSdk: memoizedClient });

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <div className="flex justify-between gap-6 w-full cascade-overview relative">
        <Card elevate size="$4" bordered className='cascade-top-left'>
          <Card.Header padded>
            <H3 className='text-white'>Network Storage</H3>
            <div className='font-bold text-lumera-blue-light leading-[1.1]'>
              {
                isFetchSummaryLoading ? <Skeleton /> : <>
                  <span className='text-[40px]'>{summary.networkStorage}</span> <span className='text-xl whitespace-nowrap'>({summary.totalSupernode} Active Supernodes)</span>
                </>
              }
            </div>
            <div className='text-lumera-label mt-2'>Total data stored across all supernodes.</div>
          </Card.Header>
        </Card>
        <Card elevate size="$4" bordered className='cascade-top-right'>
          <Card.Header padded>
            <H3 className='text-white'>Your Usage</H3>
            {address ?
              <>
                {
                  isFetchSummaryLoading ? <Skeleton /> : <>
                    <div className='font-bold text-white leading-[1.1]'>
                      <span className='text-[40px]'>{summary.myUsage}</span> <span className='text-xl whitespace-nowrap'>({summary.myUploaded} Files Uploaded)</span>
                    </div>
                  </>
                }
                <div className='text-lumera-label mt-2'>Your contribution to the network.</div>
              </> : <>
                <Paragraph className='text-base text-lumera-gray'>Please connect your wallet to view this section.</Paragraph>
                <div className='mt-3'>
                  <ConnectWalletButton />
                </div>
              </>
            }
          </Card.Header>
        </Card>
      </div>
      <div className='mt-6 w-full'>
        <Card elevate size="$4" bordered className='w-full relative overflow-hidden'>
          <Loading isLoading={isMarkerLoading} />
          <SuperNodeMap JVectorMapWithNoSSR={JVectorMapWithNoSSR} markers={markers} />
        </Card>
      </div>
      <div className='mt-6 w-full relative'>
        <Loading isLoading={isUploading} />
        <Dropzone onDrop={onFileChange} multiple={false}>
          {({getRootProps, getInputProps}) => (
            <div {...getRootProps()} className='dropzone-wrapper flex flex-col justify-center items-center'>
              <input {...getInputProps()} />
              <div className='text-center'>
                <div className='upload-icon flex justify-center'>
                  <CloudUpload />
                </div>
                <div className='mt-2'>Drag & drop files here</div>
                <div className='text-sm text-lumera-label mt-3'>or</div>
                <div className='mt-2 flex justify-center btn-blue'>
                  <AppButton className='font-bold'>Browse Files</AppButton>
                </div>
                {error ?
                  <div className='mt-5 text-red-600'>{error}</div> : null
                }
              </div>
            </div>
          )}
        </Dropzone>
      </div>
      <div className='mt-6 w-full relative'>
        <Loading isLoading={isMyFilesLoading} />
        <Card elevate size="$4" bordered className='w-full !p-[18px]'>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-white">My Files</h2>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="flex items-center border border-gray-700 rounded-lg p-1 bg-gray-900/50 gap-1 overflow-x-auto">
                {FILES_TYPE.map(type => (
                  <button
                    key={type.value}
                    onClick={() => onFileTypeFilterChange(type.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${fileTypeFilter === type.value ? 'bg-lumera-teal text-white' :
                      'text-gray-300 hover:bg-lumera-teal'}`}
                  >
                    {type.label} ({fileCounts[type.value as TFileTypeKey]})
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-auto">
                <div className='input-wrapper'>
                  <Input
                    id="keyword"
                    placeholder="Search my files..."
                    className='input  has-symbol'
                    value={fileSearch}
                    onChangeText={onFileSearchChange}
                  />
                  <span className='input-symbol'>
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 &&
            <div className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-white">{selectedFiles.length} file(s) selected</span>
              <AppButton variant="secondary" className="!py-1.5 !px-4" onClick={onDownloadAllFile}>
                <Download className="w-4 h-4" /> Download as .zip
              </AppButton>
            </div>
          }
          <div className='md:overflow-x-auto '>
            <div className="space-y-2 md:min-w-[1050px]">
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 uppercase items-center">
                <div className="col-span-5">
                  <div className='flex items-start'>
                    <div className='w-10'>
                      <Checkbox
                        id="checkAll"
                        size="$4"
                        checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                        onCheckedChange={onSelectAll}
                      >
                        <Checkbox.Indicator>
                          <CheckIcon />
                        </Checkbox.Indicator>
                      </Checkbox>
                    </div>
                    <span>Name</span>
                  </div>
                </div>
                <div className="col-span-2">Last Modified</div>
                <div className="col-span-2">TX ID</div>
                <div className="col-span-1 text-right">Size</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              {filteredFiles.map((file, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-900/40 hover:bg-gray-800/60 p-4 rounded-lg">
                  <div className="col-span-full md:col-span-5 flex items-center gap-4">
                    <div className='flex items-start'>
                      <div className='w-10'>
                        <Checkbox
                          id="checkAll"
                          size="$4"
                          checked={selectedFiles.includes(file.name)}
                          onCheckedChange={() => onSelectFile(file)}
                        >
                          <Checkbox.Indicator>
                            <CheckIcon />
                          </Checkbox.Indicator>
                        </Checkbox>
                      </div>
                      <div className='flex items-start flex-wrap gap-2'>
                        {getFileIcon(getSimplifiedType(file.type))}
                        <span className="font-medium text-white truncate">{file.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-full md:col-span-2 text-sm text-gray-400">
                    <span className="md:hidden font-semibold text-gray-500 mr-2">Last Modified: </span>
                    {new Date(file.lastModified).toLocaleDateString()}
                  </div>
                  <div className="col-span-full md:col-span-2 text-sm">
                    <span className="md:hidden font-semibold text-gray-500 mr-2">TX ID: </span>
                    <AppLink
                      href={`/tx/${file.txId}`}
                      className="font-mono text-indigo-400 hover:underline truncate inline-flex items-center gap-1.5"
                    >
                      {formatAddress(file.txId, 6, -6)}<ArrowUpRight className="w-3 h-3"/>
                    </AppLink>
                  </div>
                  <div className="col-span-full md:col-span-1 text-sm text-gray-300 md:text-right">
                    <span className="md:hidden font-semibold text-gray-500 mr-2">Size: </span>
                    {formatBytes(file.size)}
                  </div>
                  <div className="col-span-full md:col-span-2 flex justify-start md:justify-end">
                    <AppButton
                      variant="secondary"
                      className="!py-1.5 !px-4 text-sm w-full md:w-auto max-w-40"
                      onClick={() => onDownloadClick(file)}
                    >
                      <Download className="w-4 h-4"/> Download
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {isDownloading ?
        <div className='fixed right-2 bottom-2 z-50'>
          <Card elevate bordered className='w-full !overflow-hidden'>
            <div className='px-5 py-3 flex items-center gap-2'>
              <Loading isLoading className='relative !top-0 !left-0 !transform-none' /> Downloading ....
            </div>
          </Card>
        </div> : null
      }
    </YStack>
  )
})
