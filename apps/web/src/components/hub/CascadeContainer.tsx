'use client'

/*
 * Cascade needs the Lumera WASM SDK, which only exists in the browser, so the
 * page imports this container with `ssr: false`.
 *
 * The SDK is about ten megabytes and is only used to upload and download
 * files. Blocking the page on it meant a visitor with no wallet — who cannot
 * use the drive at all — spent half a minute on "Downloading the Lumera SDK…"
 * before seeing the network figures, which are plain HTTP reads that need
 * nothing from it.
 *
 * So the page renders straight away and the SDK is fetched only when it is
 * about to be used: as soon as a wallet is connected, or when the reader
 * starts an upload or a download.
 */

import React, { useEffect, useMemo } from 'react'

import useCascade, { getFileType, type IMyFile } from '@/hooks/useCascade'
import { useLumeraClientWrapper } from '@/hooks/useLumeraClientWrapper'
import { formatBytes } from '@/utils/format'
import { CascadeScreen, type CascadeFile } from '@lumera-hub/ui/src/screens/hub/CascadeScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Card, Notice, PageTitle, Skeleton } from '@lumera-hub/ui/src/design/primitives'

/** Colours for the storage breakdown, drawn from the accent and neutral ramps. */
const TYPE_CLASS: Record<string, string> = {
  image: 'bg-lumera-green',
  video: 'bg-lumera-teal',
  document: 'bg-neutral-bar',
  archive: 'bg-warn',
  program: 'bg-lumera-cyan',
  other: 'bg-text-disabled',
}

const TYPE_LABEL: Record<string, string> = {
  image: 'Images',
  video: 'Videos',
  document: 'Documents',
  archive: 'Archives',
  program: 'Programs',
  other: 'Other',
}

export default function CascadeContainer() {
  const hub = useHub()
  // Connected readers are the ones who can actually act, so start the download
  // for them in the background. Everyone else pays nothing.
  const { module, isLoading, error, load } = useLumeraClientWrapper(hub.isConnected)

  useEffect(() => {
    document.title = 'Cascade - Lumera Hub'
  }, [])

  return (
    <CascadeBody
      client={module}
      sdkLoading={isLoading}
      sdkError={error}
      ensureSdk={load}
    />
  )
}

function CascadeBody({
  client,
  sdkLoading,
  sdkError,
  ensureSdk,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
  sdkLoading: boolean
  sdkError: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ensureSdk: () => Promise<any>
}) {
  const hub = useHub()
  const memoizedClient = useMemo(() => client, [client])
  const cascade = useCascade({ sdkjsReact: memoizedClient })

  const {
    networkStorage,
    myUsage,
    filteredFiles,
    fileCounts,
    fileSizes,
    fileTypeFilter,
    fileSearch,
    selectedFiles,
    markers,
    isMyFilesLoading,
    isUploading,
    isAllDownloading,
    handleFileTypeFilterChange,
    handleFileSearchChange,
    handleSelectFile,
    handleDownloadFile,
    handleDownloadAllFile,
    handleUploadCascade,
  } = cascade

  const files: CascadeFile[] = useMemo(
    () =>
      (filteredFiles || []).map((f: IMyFile) => ({
        key: f.actionID || f.txId || f.name,
        name: f.name,
        size: formatBytes(f.size),
        extension: `.${(f.name.split('.').pop() || '').toLowerCase()}`,
        kind: TYPE_LABEL[getFileType(f.name)] || 'Other',
        isPublic: f.isPublic,
        state: f.state,
        selected: (selectedFiles || []).some((s) => s.actionID === f.actionID),
        onToggle: () => handleSelectFile(f),
        onDownload: async () => {
          await ensureSdk()
          void handleDownloadFile(f)
        },
      })),
    [ensureSdk, filteredFiles, handleDownloadFile, handleSelectFile, selectedFiles],
  )

  const storageBreakdown = useMemo(
    () =>
      Object.keys(TYPE_LABEL).map((key) => ({
        label: TYPE_LABEL[key],
        bytes: (fileSizes as unknown as Record<string, number>)?.[key] || 0,
        className: TYPE_CLASS[key],
      })),
    [fileSizes],
  )

  /*
   * Supernodes are geolocated one at a time, so the marker list arrives with a
   * place per node rather than a region. Grouping by the last path of the
   * label keeps the panel honest about what actually resolved.
   */
  const regions = useMemo(() => {
    const byPlace = new Map<string, number>()
    ;(markers || []).forEach((m) => {
      const place = m.name?.split(',').pop()?.trim() || 'Unknown'
      byPlace.set(place, (byPlace.get(place) || 0) + 1)
    })
    return [...byPlace.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [markers])

  return (
    <CascadeScreen
      loading={isMyFilesLoading}
      networkStored={
        networkStorage.totalBytes && networkStorage.usedPercent
          ? formatBytes(networkStorage.totalBytes * (networkStorage.usedPercent / 100))
          : '—'
      }
      networkUsedPercent={networkStorage.usedPercent}
      networkCapacity={networkStorage.networkStorage || '—'}
      supernodes={networkStorage.totalSupernode ? String(networkStorage.totalSupernode) : '—'}
      myStored={myUsage.size}
      files={files}
      fileCounts={fileCounts as unknown as Record<string, number>}
      typeFilter={fileTypeFilter?.[0] || 'all'}
      onTypeFilterChange={handleFileTypeFilterChange}
      search={fileSearch}
      onSearchChange={handleFileSearchChange}
      onUpload={() =>
        hub.gate(
          { title: 'Upload to Cascade', line: 'Storage is paid for from your liquid balance' },
          async () => {
            // The picker needs the SDK to chunk and sign. If the background
            // fetch has not finished, wait for it here rather than failing.
            await ensureSdk()
            handleUploadCascade()
          },
        )
      }
      isUploading={isUploading}
      selectedCount={(selectedFiles || []).length}
      onDownloadSelected={async () => {
        await ensureSdk()
        void handleDownloadAllFile()
      }}
      isDownloading={isAllDownloading}
      storageBreakdown={storageBreakdown}
      regions={regions}
      sdkLoading={sdkLoading}
      sdkError={sdkError}
    />
  )
}
