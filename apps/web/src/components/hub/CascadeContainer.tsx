'use client'

/*
 * Cascade needs the Lumera WASM SDK, which only exists in the browser. The
 * page dynamically imports this container with `ssr: false`; everything that
 * touches the SDK lives below that boundary.
 *
 * The SDK is a multi-megabyte download, so the wait is given a real loading
 * state rather than an empty screen.
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
  const { module, isLoaded, error } = useLumeraClientWrapper()

  useEffect(() => {
    document.title = 'Cascade - Lumera Hub'
  }, [])

  if (error) {
    return (
      <div className="flex flex-col gap-[18px]">
        <PageTitle title="Cascade" subtitle="Permanent storage across the supernode network." />
        <Notice tone="danger">
          The Lumera SDK could not be loaded, so the drive is unavailable on this page. Network
          figures and uploads both depend on it. ({error})
        </Notice>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col gap-[18px]">
        <PageTitle title="Cascade" subtitle="Permanent storage across the supernode network." />
        <Card>
          <div className="flex flex-col gap-4 px-[18px] py-5">
            <span className="text-base text-text-muted">Downloading the Lumera SDK…</span>
            <Skeleton className="h-2 w-full" rounded="rounded-full" />
          </div>
        </Card>
      </div>
    )
  }

  return <CascadeBody client={module} />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CascadeBody({ client }: { client: any }) {
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
        onDownload: () => void handleDownloadFile(f),
      })),
    [filteredFiles, handleDownloadFile, handleSelectFile, selectedFiles],
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
          () => handleUploadCascade(),
        )
      }
      isUploading={isUploading}
      selectedCount={(selectedFiles || []).length}
      onDownloadSelected={() => void handleDownloadAllFile()}
      isDownloading={isAllDownloading}
      storageBreakdown={storageBreakdown}
      regions={regions}
    />
  )
}
