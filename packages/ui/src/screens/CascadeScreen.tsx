'use client';

import React, { useState } from 'react';
import {
  YStack,
  Card,
  H3,
  Paragraph,
  Input,
  Checkbox,
  Dialog,
  VisuallyHidden,
  RadioGroup,
  Label,
  Tooltip,
} from 'tamagui';
import Dropzone from 'react-dropzone';
import { CloudUpload } from '@tamagui/lucide-icons';
import { worldMill } from "@react-jvectormap/world";
import {
  Search,
  Download,
  ImageIcon,
  Video,
  FileText,
  FileArchive,
  FileIcon,
  Check as CheckIcon,
  CircleX,
} from 'lucide-react';
import ReactPaginate from 'react-paginate';
import dayjs from 'dayjs';

import Loading from '@/components/Loading';
import Skeleton from '@/components/Skeleton';
import AppButton from '@/components/AppButton';
import AppLink from '@/components/AppLink';
import { ConnectWalletButton } from '@/components/ConnectWallet';
import useCascade, {
  FILES_TYPE,
  TFileTypeKey,
  IMarker,
  ISelectedFile,
  IMyFile,
  getTxHash,
} from '@/hooks/useCascade';
import { formatAddress, formatFileSize } from '@/utils/format';
import { getSimplifiedType, formatBytes } from '@/utils/helpers';
import { useLumeraClientWrapper } from '@/hooks/useLumeraClientWrapper';

import 'react-paginate/theme/basic/react-paginate.css';

interface ICascadeScreen {
  JVectorMapWithNoSSR: any;
}

interface ICascadeContent {
  JVectorMapWithNoSSR: any;
  client: any;
}

interface ISuperNodeMap {
  JVectorMapWithNoSSR: any;
  markers: IMarker[];
}

interface IActionFeeModal {
  isOpen: boolean;
  fileName: string;
  fileSize: number;
  uploadFee: string;
  onCloseModal: () => void;
  onCancelClick: () => void;
  onOkClick: () => void;
  setPublish: (status: boolean) => void;
}

interface IUploadCascadeSuccessModal {
  isOpen: boolean;
  onCloseModal: () => void;
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
    return null;
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
                  {selectedMarker.validatorAddress ?
                    <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                      <div className='w-full md:w-60 text-gray-500'>Validator Name:</div>
                      <div className="w-full truncate">
                        <AppLink href={`/block/${selectedMarker.validatorAddress}`}>
                          {selectedMarker.validatorMoniker}
                        </AppLink>
                      </div>
                    </div> : null
                  }
                  {selectedMarker.validatorAddress ?
                    <div className='flex items-center flex-col md:flex-row py-1 md:py-3 px-4'>
                      <div className='w-full md:w-60 text-gray-500'>Validator Address:</div>
                      <div className="w-full truncate">
                        <AppLink href={`/staking/${selectedMarker.validatorAddress}`}>
                          {formatAddress(selectedMarker.validatorAddress, 15, -6)}
                        </AppLink>
                      </div>
                    </div> : null
                  }
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
  switch (type) {
    case 'Image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
    case 'Video': return <Video className="w-4 h-4 text-purple-400" />;
    case 'PDF': return <FileText className="w-4 h-4 text-red-400" />;
    case 'Archive': return <FileArchive className="w-4 h-4 text-yellow-400" />;
    default: return <FileIcon className="w-4 h-4 text-gray-400" />;
  }
};

const checkSelectedFile = (selectedFiles: ISelectedFile[], file: IMyFile) => {
  const existFile = selectedFiles.find((f) => f.actionID === file.actionID);
  if (existFile) {
    return true;
  }
  return false;
}

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
    <CascadeContent client={module} JVectorMapWithNoSSR={JVectorMapWithNoSSR} />
  );
};

const ActionFeeModal = ({
  isOpen,
  fileName,
  fileSize,
  uploadFee,
  onCloseModal,
  onCancelClick,
  onOkClick,
  setPublish,
}: IActionFeeModal) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onCloseModal}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className="relative p-3">
            <div className='mx-auto max-w-[550px] sm:min-w-[450px]'>
              <p>You are uploading "<strong>{fileName}</strong>"</p>
              <p>Size: <strong>{formatFileSize(fileSize)}</strong></p>
              <p>Fee: <strong>{uploadFee}</strong></p>
              <p className='mt-2'>Do you want to upload this file?</p>
              <div>
                <RadioGroup
                  defaultValue="private"
                  name="status"
                  id="status"
                  onValueChange={(value) => setPublish(value === 'publish')}
                >
                  <div className='flex items-center gap-6 mt-1'>
                    <div className='flex items-center gap-2'>
                      <RadioGroup.Item value='private' id='radiogroup-private' size="$4">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label size="$4" id='radiogroup-private' className='leading-none'>
                        Private
                      </Label>
                    </div>
                    <div className='flex items-center gap-2'>
                      <RadioGroup.Item value='publish' id='radiogroup-publish' size="$4">
                        <RadioGroup.Indicator />
                      </RadioGroup.Item>
                      <Label size="$4" id='radiogroup-publish' className='leading-none'>
                        Publish
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className='flex justify-end mt-5 gap-3'>
              <AppButton
                variant="secondary"
                onClick={onCancelClick}
              >
                Cancel
              </AppButton>
              <AppButton onClick={onOkClick} className='min-w-[100px]'>Continue</AppButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

const UploadCascadeSuccessModal = ({
  isOpen,
  onCloseModal,
}: IUploadCascadeSuccessModal) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onCloseModal}
      modal
    >
      <Dialog.Trigger asChild>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <VisuallyHidden>
            <Dialog.Title></Dialog.Title>
          </VisuallyHidden>
          <div className='withdraw-main-content relative text-center p-5 max-w-[450px]'>
            <div className='flex justify-between items-center'>
              <div>&nbsp;</div>
              <button className='btn-close-modal cursor-pointer' onClick={onCloseModal}><CircleX /></button>
            </div>
            <div className='mt-4'>
              <H3 className='!text-green-500 text-[32px] !leading-0'>Congratulations! upload completed successfully.</H3>
            </div>
            <div className='mt-5 pb-3'>
              <button
                className='cursor-pointer bg-lumera-teal hover:bg-lumera-green text-white rounded-[9px] px-4 py-2'
                onClick={onCloseModal}
              >
                Back to Cascade
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

const getFileStatus = (state: string) => {
  if (!state) {
    return '--';
  }
  return state.replaceAll('ACTION_STATE_', '').replaceAll('_', ' ').toLocaleLowerCase();
}

const getStatusColor = (state: string) => {
  if (!state) {
    return '';
  }
  switch (state) {
    case 'ACTION_STATE_EXPIRED':
      return 'text-red-700';
    case 'ACTION_STATE_DONE':
      return 'text-lumera-green';
    case 'ACTION_STATE_PENDING':
      return 'text-lumera-warning';
    default:
      return '';
  }
}

export const CascadeContent = React.memo(({
  JVectorMapWithNoSSR,
  client,
}: ICascadeContent) => {
  const memoizedClient = React.useMemo(() => client, [client]);

  const {
    isUploading,
    error,
    isFetchSummaryLoading,
    networkStorage,
    address,
    fileCounts,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    filteredFiles,
    markers,
    isMyFilesLoading,
    isMarkerLoading,
    selectedModal,
    uploadCascadeInfo,
    myUsage,
    totalPage,
    isMyFilesLoadMore,
    selectedFileDownload,
    txs,
    isAllDownloading,
    setPublish,
    openActionFeeModal,
    closeActionFeeModal,
    handleDownloadAllFile,
    handleDownloadFile,
    handleSelectFile,
    handleSelectAll,
    handleFileSearchChange,
    handleFileTypeFilterChange,
    handleUploadCascade,
    handlePageClick,
    handleCloseUploadCascadeSuccessModal,
  } = useCascade({ lumeraSdk: memoizedClient });

  const memoizedFilteredFiles = React.useMemo(() => filteredFiles, [filteredFiles, fileSearch, fileTypeFilter]);

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$2">
      <div className="flex justify-between gap-6 w-full cascade-overview relative">
        <Card elevate size="$4" bordered className='cascade-top-left'>
          <Card.Header padded>
            <H3 className='text-white'>Network Storage</H3>
            <div className='font-bold text-lumera-blue-light leading-[1.1]'>
              {
                isFetchSummaryLoading ? <Skeleton /> : <>
                  <span className='text-[40px]'>{networkStorage.networkStorage}</span> <span className='text-xl whitespace-nowrap'>({networkStorage.totalSupernode} Active Supernodes)</span>
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
                  isMyFilesLoading ? <Skeleton /> : <>
                    <div className='font-bold text-white leading-[1.1]'>
                      <span className='text-[40px]'>{myUsage.size}</span> <span className='text-xl whitespace-nowrap'>({myUsage.uploaded} Files Uploaded)</span>
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
          {isMarkerLoading ?
            <div className='min-h-[500px]'>
              <Skeleton className='min-h-[500px] !mb-0' />
            </div> : null
          }
          <SuperNodeMap JVectorMapWithNoSSR={JVectorMapWithNoSSR} markers={markers} />
        </Card>
      </div>
      <div className='mt-6 w-full relative'>
        <Loading isLoading={isUploading} />
        <Dropzone onDrop={openActionFeeModal} multiple={false}>
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
      {address ?
        <div className='mt-6 w-full relative'>
          <Card elevate size="$4" bordered className='w-full !p-[18px]'>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold text-white">My Files</h2>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="flex items-center border border-gray-700 rounded-lg p-1 bg-gray-900/50 gap-1 overflow-x-auto">
                  {!isMyFilesLoadMore ?
                    <>
                      {FILES_TYPE.map(type => (
                        <button
                          key={type.value}
                          onClick={() => handleFileTypeFilterChange(type.value)}
                          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 cursor-pointer whitespace-nowrap ${fileTypeFilter === type.value ? 'bg-lumera-teal text-white' :
                            'text-gray-300 hover:bg-lumera-teal hover:text-white'}`}
                        >
                          {type.label} ({fileCounts[type.value as TFileTypeKey]})
                        </button>
                      ))}
                    </> : null
                  }
                  {isMyFilesLoadMore ? (
                    <Skeleton className='min-w-[426px] !mb-0 min-h-[22px]' />
                  ) : null }
                </div>
                <div className="relative w-full md:w-auto">
                  <div className='input-wrapper'>
                    <Input
                      id="keyword"
                      placeholder="Search my files..."
                      className='input  has-symbol'
                      value={fileSearch}
                      onChangeText={handleFileSearchChange}
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
                <AppButton variant="secondary" className={`!py-1.5 !px-4 ${isAllDownloading ? 'opacity-40 cursor-default' : ''}`} onClick={handleDownloadAllFile} disabled={isAllDownloading}>
                  <Download className="w-4 h-4" /> {isAllDownloading ? 'Downloading' : 'Download as .zip'}
                </AppButton>
              </div>
            }
            <div className='md:overflow-x-auto '>
              <div className="space-y-2 md:min-w-[1130px]">
                <table className='w-full border-separate border-spacing-y-2 text-sm'>
                  <thead>
                    <tr>
                      <th className='px-2 py-3'>
                        <div className='flex items-start'>
                          <div className='w-7'>
                            <Checkbox
                              id="checkAll"
                              size="$4"
                              checked={selectedFiles.length === memoizedFilteredFiles.length && memoizedFilteredFiles.length > 0}
                              onCheckedChange={handleSelectAll}
                            >
                              <Checkbox.Indicator>
                                <CheckIcon />
                              </Checkbox.Indicator>
                            </Checkbox>
                          </div>
                          <span>Name</span>
                        </div>
                      </th>
                      <th align='left' className='px-2 py-3'>Public</th>
                      <th align='left' className='px-2 py-3'>Status</th>
                      <th align='left' className='px-2 py-3'>TX ID</th>
                      <th align='right' className='px-2 py-3'>Price</th>
                      <th align='right' className='px-2 py-3'>Fee</th>
                      <th align='right' className='px-2 py-3'>Size</th>
                      <th align='left' className='px-2 py-3'>Last Modified</th>
                      <th align='right' className='px-2 py-3'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredFiles?.length && !isMyFilesLoading ? (
                      <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                        <td colSpan={9} className='px-2 py-3'>
                          <H3 className='text-2xl'>No files</H3>
                        </td>
                      </tr>
                     ) : null }
                    {isMyFilesLoading ? (
                      <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                        <td colSpan={9} className='px-2 py-3'>
                          <Skeleton type='list' className='min-h-8' count={3} />
                        </td>
                      </tr>
                    ) : null }
                    {!isMyFilesLoading && memoizedFilteredFiles.map((file, index) => {
                      const isDisabledButton = selectedFileDownload.includes(file.actionID) || file.state !== 'ACTION_STATE_DONE' || file.size <= 0;
                      let txId = file.txId;
                      let lastModified = file.lastModified;
                      let price = file.price;
                      let fee = file.fee;
                      if (!txId || !lastModified || !Number(price) || !Number(fee)) {
                        const tx = getTxHash(file, txs);
                        txId = tx.txhash;
                        lastModified = tx.timestamp || '';
                        price = tx.price || '';
                        fee = tx.fee || '';
                      }
                      const isExpired = file.state === 'ACTION_STATE_EXPIRED';
                      return (
                        <tr key={index} className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                          <td className='px-2 py-3'>
                            <div className='flex items-start w-full'>
                              <div className='w-7'>
                                <Checkbox
                                  id="checkAll"
                                  size="$4"
                                  checked={checkSelectedFile(selectedFiles, file)}
                                  onCheckedChange={() => handleSelectFile(file)}
                                >
                                  <Checkbox.Indicator>
                                    <CheckIcon />
                                  </Checkbox.Indicator>
                                </Checkbox>
                              </div>
                              <div className='w-[82%]'>
                                <Tooltip>
                                  <Tooltip.Trigger>
                                    <div className='flex items-start flex-wrap gap-2 w-full'>
                                      {getFileIcon(getSimplifiedType(file.type))}
                                      <span className="font-medium text-white truncate max-w-2/3 inline-block">{file.name}</span>
                                    </div>
                                  </Tooltip.Trigger>
                                  <Tooltip.Content
                                    enterStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                    exitStyle={{ x: 0, y: -5, opacity: 0, scale: 0.9 }}
                                    scale={1}
                                    x={0}
                                    y={0}
                                    opacity={1}
                                    animation={[
                                      'quick',
                                      {
                                        opacity: {
                                          overshootClamping: true,
                                        },
                                      },
                                    ]}
                                  >
                                    <div className='text-white'>
                                      {file.name}
                                    </div>
                                  </Tooltip.Content>
                                </Tooltip>
                              </div>
                            </div>
                          </td>
                          <td className='px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">Public: </span>
                            <span>{file.isPublic ? 'Yes' : 'No'}</span>
                          </td>
                          <td className='px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">Status: </span>
                            <span className={`capitalize ${getStatusColor(file.state)}`}>{getFileStatus(file.state)}</span>
                          </td>
                          <td className='px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">TX ID: </span>
                            {txId && !isExpired ?
                              <AppLink
                                href={`/tx/${txId}`}
                                className="font-mono text-lumera-teal hover:text-lumera-green truncate inline-flex items-center gap-1.5"
                              >
                                {formatAddress(txId, 6, -4)}
                              </AppLink> : '--'
                            }
                          </td>
                          <td className='text-right px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">Price: </span>
                            {!isExpired ? price : '0 LUME'}
                          </td>
                          <td className='text-right px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">Fee: </span>
                            {!isExpired ? fee : '0 LUME'}
                          </td>
                          <td className='text-right px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">Size: </span>
                            {formatBytes(!isExpired ? file.size : 0)}
                          </td>
                          <td className='px-2 py-3'>
                            <span className="md:hidden font-semibold text-gray-500 mr-2">Last Modified: </span>
                            {lastModified ?
                            <>
                              {dayjs(lastModified).format('MMMM DD, YYYY')} at {dayjs(lastModified).format('HH:mm:ss')}
                            </> : '--'}
                          </td>
                          <td className='text-right px-2 py-3'>
                            <div className='flex justify-end w-full'>
                              <AppButton
                                variant="secondary"
                                className={`!px-4 !text-sm w-full md:w-auto max-w-40 !font-normal ${isDisabledButton ? 'cursor-default opacity-40' : ''}`}
                                onClick={() => handleDownloadFile(file)}
                                disabled={isDisabledButton}
                              >
                                <Download className="w-3 h-3"/> {selectedFileDownload.includes(file.actionID) ? 'Downloading' : 'Download'}
                              </AppButton>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {isMyFilesLoadMore && !isMyFilesLoading ?
              <div className='my-3'>Searching for more data</div> : null
            }
            {isAllDownloading ?
              <div className='fixed right-2 bottom-2 z-50'>
                <Card elevate bordered className='w-full !overflow-hidden'>
                  <div className='px-5 py-3 flex items-center gap-2'>
                    <Loading isLoading className='relative !top-0 !left-0 !transform-none' /> Downloading ....
                  </div>
                </Card>
              </div> : null
            }
            {totalPage > 1 && !isMyFilesLoadMore && !isMyFilesLoading ?
              <div className="paginate-wrapper pt-3">
                <ReactPaginate
                  breakLabel="..."
                  nextLabel=">"
                  onPageChange={handlePageClick}
                  pageRangeDisplayed={3}
                  pageCount={totalPage}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  className='react-paginate'
                />
              </div> : null
            }
          </Card>
        </div> : null
      }
      <ActionFeeModal
        fileName={uploadCascadeInfo.fileName}
        fileSize={uploadCascadeInfo.fileSize}
        uploadFee={uploadCascadeInfo.uploadFee}
        isOpen={selectedModal === 'upload-cascade'}
        onCancelClick={closeActionFeeModal}
        onCloseModal={closeActionFeeModal}
        onOkClick={handleUploadCascade}
        setPublish={setPublish}
      />
      <UploadCascadeSuccessModal
        isOpen={selectedModal === 'upload-cascade-success'}
        onCloseModal={handleCloseUploadCascadeSuccessModal}
      />
    </YStack>
  )
})
