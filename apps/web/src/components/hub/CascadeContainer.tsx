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
 * starts an upload or a download. Work that needs it — pricing picked files,
 * a download — is parked until it arrives rather than run against a client
 * that is not there yet.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import useCascade, { type IMarker, type IMyFile } from '@/hooks/useCascade'
import useNetworkStats, { TIB } from '@/hooks/useNetworkStats'
import { useLumeraClientWrapper } from '@/hooks/useLumeraClientWrapper'
import {
  ARCHIVE_EXT,
  DOCUMENT_EXT,
  IMAGE_EXT,
  PROGRAM_EXT,
  RATE_VALUE,
  UPLOAD_MAX_FILES,
  VIDEO_EXT,
} from '@/contants'
import { formatNumber } from '@/utils/format'
import { explorerTxUrl } from '@/utils/explorer'
import {
  CascadeScreen,
  type CascadeFile,
  type DriveGroup,
  type StorageSummary,
  type UploadProgress,
} from '@lumera-hub/ui/src/screens/hub/CascadeScreen'
import { copyText, short, useHub } from '@lumera-hub/ui/src/hub/session'
import { useNetwork } from '@/app/providers/network-provider'
import { FileDrawer, UploadDrawer, type FileDetail } from './CascadeDrawers'
import { QrShare } from './QrShare'

/*
 * The design sorts a drive into models, media, documents and archives. The
 * app's own type list predates that and has no models, so the grouping is
 * done here from the extension. Anything that fits none of the four is still
 * listed under All and counted in the storage bar as Other.
 */
const MODEL_EXT = ['safetensors', 'ckpt', 'pt', 'pth', 'onnx', 'gguf', 'ggml', 'h5', 'keras', 'tflite', 'mlmodel']
const DATA_EXT = ['csv', 'tsv', 'parquet', 'json', 'jsonl', 'arrow', 'feather', 'avro', 'orc']
const AUDIO_EXT = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac']
const MORE_ARCHIVE_EXT = ['tar', 'gz', 'tgz', 'bz2', 'xz', 'zst']

type Group = Exclude<DriveGroup, 'all'> | 'other'

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')

const classify = (name: string): { group: Group; kind: string } => {
  const ext = extOf(name)
  if (MODEL_EXT.includes(ext)) return { group: 'models', kind: 'Model weights' }
  if (IMAGE_EXT.includes(ext)) return { group: 'media', kind: 'Image' }
  if (VIDEO_EXT.includes(ext)) return { group: 'media', kind: 'Video' }
  if (AUDIO_EXT.includes(ext)) return { group: 'media', kind: 'Audio' }
  if (DATA_EXT.includes(ext)) return { group: 'documents', kind: 'Dataset' }
  if (DOCUMENT_EXT.includes(ext)) return { group: 'documents', kind: 'Document' }
  if (ARCHIVE_EXT.includes(ext) || MORE_ARCHIVE_EXT.includes(ext)) return { group: 'archives', kind: 'Archive' }
  if (PROGRAM_EXT.includes(ext)) return { group: 'other', kind: 'Program' }
  return { group: 'other', kind: 'File' }
}

/** The storage bar's colours, as the design assigns them. */
const SEGMENTS: Array<{ key: Group; label: string; color: string }> = [
  { key: 'models', label: 'Models', color: '#47c78a' },
  { key: 'media', label: 'Media', color: '#078a8a' },
  { key: 'documents', label: 'Documents', color: '#2e8f7e' },
  { key: 'archives', label: 'Archives', color: '#2a5580' },
  { key: 'other', label: 'Other', color: '#5c7794' },
]

/** "1.94 GB", "320.7 MB" — the design's size format, in binary units. */
const sizeLabel = (bytes: number) => {
  if (!bytes) return '—'
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

// "27 Jun 2026", as the design writes dates. en-GB now renders September as
// "Sept", so the month names are spelled out here rather than left to Intl.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Small amounts keep their precision: storage fees are fractions of a LUME. */
const lume = (value: number) =>
  `${value.toLocaleString('en-US', {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  })} LUME`

const isDone = (state: string) => /DONE|APPROVED/.test(state)
const isLocalPending = (f: IMyFile) => f.state === 'In progress'

const stateNote = (state: string) =>
  isDone(state) ? '' : state === 'In progress' ? 'Processing' : state.replace('ACTION_STATE_', '').toLowerCase()

/*
 * Regions as the design names them. Geolocation reports continents, so the
 * Middle East is picked out by country and Asia and Oceania share a label.
 */
const MIDDLE_EAST = new Set(['AE', 'SA', 'IL', 'QA', 'BH', 'KW', 'OM', 'JO', 'LB', 'IQ', 'IR', 'SY', 'YE', 'PS', 'TR'])
const regionOf = (m: IMarker) => {
  if (MIDDLE_EAST.has((m.country_code || '').toUpperCase())) return 'Middle East'
  const c = (m.continent || '').trim()
  if (c === 'Asia' || c === 'Oceania') return 'Asia-Pacific'
  return c || 'Other'
}

const placeOf = (m: IMarker) =>
  m.city?.trim() || m.name?.split(',')[0]?.trim() || m.country?.trim() || 'Unknown'

const UPLOAD_INTENT = { title: 'Upload to Cascade', line: 'Storage is paid for from your liquid balance' }
const MAX_FILES = Number(UPLOAD_MAX_FILES) || 15

export default function CascadeContainer() {
  const hub = useHub()
  // Connected readers are the ones who can actually act, so start the download
  // for them in the background. Everyone else pays nothing.
  const { module, isLoading, error, load } = useLumeraClientWrapper(hub.isConnected)

  useEffect(() => {
    document.title = 'Cascade - Lumera Hub'
  }, [])

  return (
    <CascadeBody client={module} sdkLoading={isLoading} sdkError={error} ensureSdk={load} />
  )
}

function CascadeBody({
  client,
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
  // A watched address has a drive too; it is public on chain.
  const cascade = useCascade({ sdkjsReact: memoizedClient, readAddress: hub.address || undefined })
  // The chain knows how many SuperNodes are registered and how many Cascade
  // actions completed; the metrics indexer only knows the nodes that answered.
  const { stats: net, isLoading: netLoading } = useNetworkStats()
  // The gateway inscribes on testnet, so QR file-sharing is offered on testnet
  // only for now — it stays hidden on mainnet.
  const { isTestnet } = useNetwork()

  const {
    markers,
    filteredFiles,
    isMyFilesLoading,
    isUploading,
    uploadPhase,
    uploadCascadeInfo,
    selectedModal,
    selectedFileDownload,
    downloadProgress,
    totalBalance,
    openActionFeeModal,
    closeActionFeeModal,
    handleUploadCascade,
    handlePublicFile,
    handleRemoveUploadFile,
    handleCloseUploadCascadeSuccessModal,
    handleDownloadFile,
  } = cascade

  const [group, setGroup] = useState<DriveGroup>('all')
  const [query, setQuery] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  // Work parked until the SDK has arrived.
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [pendingDownload, setPendingDownload] = useState<string | null>(null)

  /* ------------------------------------------------------------- network */

  const places = useMemo(() => {
    const byAccount = new Map<string, string>()
    ;(markers || []).forEach((m) => {
      if (m.supernodeAccount) byAccount.set(m.supernodeAccount, placeOf(m))
    })
    return byAccount
  }, [markers])

  const regions = useMemo(() => {
    const byRegion = new Map<string, number>()
    ;(markers || []).forEach((m) => {
      const r = regionOf(m)
      byRegion.set(r, (byRegion.get(r) || 0) + 1)
    })
    return [...byRegion.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [markers])

  const liveSites = useMemo(() => {
    if (!markers?.length) return null
    const live = new Set<string>()
    markers.forEach((m) => {
      if (m.state === 'SUPERNODE_STATE_ACTIVE') live.add(placeOf(m))
    })
    return live.size
  }, [markers])

  /*
   * Nodes in one city collapse to a single pin carrying the count, which is
   * what makes a dot's size mean something.
   */
  const mapNodes = useMemo(() => {
    const byPlace = new Map<string, { name: string; lat: number; lon: number; count: number }>()
    ;(markers || []).forEach((m) => {
      const [lat, lon] = m.latLng || []
      if (typeof lat !== 'number' || typeof lon !== 'number') return
      // A place seen twice keeps its first coordinates; hosts in one city
      // resolve to slightly different points and would otherwise jitter.
      const name = placeOf(m)
      const seen = byPlace.get(name)
      if (seen) seen.count += 1
      else byPlace.set(name, { name, lat, lon, count: 1 })
    })
    return [...byPlace.values()]
  }, [markers])

  /* --------------------------------------------------------------- drive */

  const all = useMemo(() => filteredFiles || [], [filteredFiles])

  const nodesOf = useCallback(
    (f: IMyFile) => (f.superNodes || []).map((a) => places.get(a) || short(a, 10, 4)),
    [places],
  )

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((f) => {
      const { group: g, kind } = classify(f.name)
      if (group !== 'all' && g !== group) return false
      if (!q) return true
      const haystack = [f.name, kind, f.actionID, f.datahash, f.isPublic ? 'public' : 'private', ...(f.superNodes || []), ...nodesOf(f)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [all, group, nodesOf, query])

  const totalBytes = useMemo(() => all.reduce((s, f) => s + (f.size || 0), 0), [all])
  const filtering = !!query.trim() || group !== 'all'

  const files: CascadeFile[] = useMemo(
    () =>
      hits.map((f) => {
        const { kind } = classify(f.name)
        const note = stateNote(f.state)
        return {
          key: f.actionID || f.txId || f.name,
          name: f.name,
          size: sizeLabel(f.size),
          extension: extOf(f.name) ? `.${extOf(f.name)}` : '—',
          kind: note ? `${kind} · ${note[0].toUpperCase()}${note.slice(1)}` : kind,
          isPublic: f.isPublic,
          onOpen: () => hub.openDrawer({ kind: 'file', cid: f.actionID }),
        }
      }),
    [hits, hub],
  )

  const storage: StorageSummary | null = useMemo(() => {
    if (!totalBytes) return null
    const bytes = new Map<Group, number>()
    all.forEach((f) => {
      const g = classify(f.name).group
      bytes.set(g, (bytes.get(g) || 0) + (f.size || 0))
    })
    const paid = all.reduce((s, f) => s + (f.priceMicro || 0), 0) / RATE_VALUE
    return {
      used: sizeLabel(totalBytes),
      paid: lume(paid),
      segments: SEGMENTS.filter((s) => (bytes.get(s.key) || 0) > 0).map((s) => ({
        key: s.key,
        label: s.label,
        size: sizeLabel(bytes.get(s.key) || 0),
        width: `${((bytes.get(s.key) || 0) / totalBytes) * 100}%`,
        color: s.color,
      })),
    }
  }, [all, totalBytes])

  /* -------------------------------------------------------------- upload */

  const started = uploadCascadeInfo.some((f) => !!f.status)
  const inFlight = uploadCascadeInfo.findIndex((f) => f.status === 'in-process')

  const upload: UploadProgress | null =
    isUploading && started && inFlight >= 0
      ? {
          name: uploadCascadeInfo[inFlight].fileName,
          size: sizeLabel(uploadCascadeInfo[inFlight].fileSize),
          phase: Math.min(3, Math.max(0, uploadPhase)),
          fileIndex: inFlight + 1,
          fileCount: uploadCascadeInfo.length,
        }
      : null

  const takeFiles = useCallback(
    (picked: File[]) => {
      if (!picked.length) return
      if (picked.length > MAX_FILES) {
        hub.flash(`Up to ${MAX_FILES} files at a time — the first ${MAX_FILES} were kept`, 'warn')
      }
      setPendingFiles(picked.slice(0, MAX_FILES))
      void ensureSdk()
    },
    [ensureSdk, hub],
  )

  // Pricing needs the SDK; picked files wait here until it is loaded.
  useEffect(() => {
    if (!pendingFiles || !memoizedClient) return
    setPendingFiles(null)
    void openActionFeeModal(pendingFiles)
  }, [memoizedClient, openActionFeeModal, pendingFiles])

  // Priced files open the review. Only into an empty slot: a connect drawer
  // the reader is looking at is not replaced.
  const reviewing = selectedModal === 'upload-cascade' && !isUploading && uploadCascadeInfo.length > 0
  useEffect(() => {
    if (reviewing && !hub.drawer) hub.openDrawer({ kind: 'upload' })
  }, [hub, reviewing])

  const cancelReview = useCallback(() => {
    closeActionFeeModal()
    hub.closeDrawer()
  }, [closeActionFeeModal, hub])

  // The last file removed from the review ends it.
  useEffect(() => {
    if (hub.drawer?.kind === 'upload' && !uploadCascadeInfo.length && !isUploading) cancelReview()
  }, [cancelReview, hub.drawer, isUploading, uploadCascadeInfo.length])

  // A finished batch reports what happened and refreshes the drive.
  useEffect(() => {
    if (selectedModal !== 'upload-cascade-success') return
    const stored = uploadCascadeInfo.filter((f) => f.status === 'done')
    const failed = uploadCascadeInfo.filter((f) => f.status === 'error')
    if (stored.length) {
      hub.flash(
        stored.length === 1
          ? `${stored[0].fileName} handed to the supernodes`
          : `${stored.length} files handed to the supernodes`,
      )
    }
    if (failed.length) {
      hub.flash(
        failed.length === 1
          ? `${failed[0].fileName}: ${failed[0].message || 'upload failed'}`
          : `${failed.length} files could not be uploaded`,
        'error',
      )
    }
    handleCloseUploadCascadeSuccessModal()
  }, [handleCloseUploadCascadeSuccessModal, hub, selectedModal, uploadCascadeInfo])

  const feeOf = (s: string) => parseFloat((s || '').replace(/,/g, '')) || 0

  /* ------------------------------------------------------------ download */

  useEffect(() => {
    if (!pendingDownload || !memoizedClient) return
    const file = all.find((f) => f.actionID === pendingDownload)
    setPendingDownload(null)
    if (file) void handleDownloadFile(file)
  }, [all, handleDownloadFile, memoizedClient, pendingDownload])

  const openFile =
    hub.drawer?.kind === 'file' ? all.find((f) => f.actionID === (hub.drawer as { cid: string }).cid) : undefined

  const detail: FileDetail | null = useMemo(() => {
    if (!openFile) return null
    const { kind } = classify(openFile.name)
    const pending = isLocalPending(openFile)
    const nodes = nodesOf(openFile)
    const since = openFile.lastModified ? new Date(openFile.lastModified) : null
    const sinceLabel =
      since && !Number.isNaN(since.getTime())
        ? `${since.getDate()} ${MONTHS[since.getMonth()]} ${since.getFullYear()}`
        : ''
    const visibility = openFile.isPublic
      ? 'Public, so anyone holding the action ID can fetch it.'
      : 'Private, so only this address can retrieve it.'
    const lead = pending
      ? 'Uploaded from this session; the supernodes are still storing it.'
      : isDone(openFile.state)
        ? `Stored on Cascade${sinceLabel ? ` since ${sinceLabel}` : ''}.`
        : `The network reports this action as ${stateNote(openFile.state)}.`
    return {
      name: openFile.name,
      size: sizeLabel(openFile.size),
      extension: extOf(openFile.name) ? `.${extOf(openFile.name)}` : '—',
      kind,
      isPublic: openFile.isPublic,
      note: `${lead} ${visibility}`,
      actionId: pending ? '' : openFile.actionID,
      explorerUrl: openFile.txId ? explorerTxUrl(openFile.txId) : undefined,
      rows: [
        { k: 'Action ID', v: pending ? '—' : openFile.actionID },
        { k: 'Visibility', v: openFile.isPublic ? 'Public' : 'Private' },
        { k: 'File type', v: `${extOf(openFile.name) ? `.${extOf(openFile.name)}` : '—'} · ${kind}` },
        { k: nodes.length === 1 ? 'Supernode' : 'Supernodes', v: nodes.length ? nodes.join(', ') : '—' },
        { k: 'Stored since', v: sinceLabel || '—' },
        { k: 'Block', v: openFile.height ? `#${Number(openFile.height).toLocaleString('en-US')}` : '—' },
        { k: 'Price paid', v: openFile.priceMicro ? lume(openFile.priceMicro / RATE_VALUE) : '—' },
        { k: 'Size', v: sizeLabel(openFile.size) },
      ],
    }
  }, [nodesOf, openFile])

  const retrieving =
    !!openFile &&
    (selectedFileDownload.includes(openFile.actionID) || pendingDownload === openFile.actionID)

  return (
    <>
      <CascadeScreen
        loading={isMyFilesLoading}
        statsLoading={netLoading}
        shareSlot={isTestnet ? <QrShare /> : null}
        networkStored={
          net.storageUsedBytes != null && net.storageUsedBytes > 0
            ? `${(net.storageUsedBytes / TIB).toFixed(1)} TB`
            : '—'
        }
        networkCapacity={
          net.storageTotalBytes ? `${(net.storageTotalBytes / TIB).toFixed(1)} TB` : '—'
        }
        supernodes={net.supernodes != null ? String(net.supernodes) : '—'}
        storedObjects={net.storedObjects != null ? net.storedObjects.toLocaleString('en-US') : '—'}
        mapNodes={mapNodes}
        regions={regions}
        liveSites={liveSites}
        onUpload={() => hub.gate(UPLOAD_INTENT, () => picker.current?.click())}
        onDropFiles={(dropped) => hub.gate(UPLOAD_INTENT, () => takeFiles(dropped))}
        isPreparing={(isUploading && !started) || !!pendingFiles}
        upload={upload}
        storage={storage}
        files={files}
        fileCountLabel={
          filtering
            ? `${hits.length} of ${all.length} files`
            : `${all.length} ${all.length === 1 ? 'file' : 'files'}${totalBytes ? ` · ${sizeLabel(totalBytes)}` : ''}`
        }
        group={group}
        onGroupChange={setGroup}
        query={query}
        onQueryChange={setQuery}
        filtering={filtering}
        onClearFilters={() => {
          setQuery('')
          setGroup('all')
        }}
        driveEmpty={!all.length}
        sdkError={sdkError}
        uploadError={cascade.error || null}
      />

      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files || [])
          // Cleared so picking the same file again still fires a change.
          e.target.value = ''
          takeFiles(picked)
        }}
      />

      {hub.drawer?.kind === 'file' && detail && openFile ? (
        <FileDrawer
          file={detail}
          retrieving={retrieving}
          progress={openFile ? downloadProgress[openFile.actionID] : undefined}
          canDownload={isDone(openFile.state) && !sdkError}
          onClose={hub.closeDrawer}
          onCopy={async () => {
            const ok = await copyText(openFile.actionID)
            hub.flash(ok ? 'Action ID copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
          }}
          onDownload={() =>
            hub.gate({ title: 'Download from Cascade', line: openFile.name }, () => {
              setPendingDownload(openFile.actionID)
              void ensureSdk()
            })
          }
        />
      ) : null}

      {hub.drawer?.kind === 'upload' && uploadCascadeInfo.length ? (
        <UploadDrawer
          items={uploadCascadeInfo.map((f) => ({
            name: f.fileName,
            size: sizeLabel(f.fileSize),
            fee: f.uploadFee,
            isPublic: !!f.isPublic,
            problem: f.message || undefined,
          }))}
          totalSize={sizeLabel(uploadCascadeInfo.reduce((s, f) => s + f.fileSize, 0))}
          totalFee={lume(uploadCascadeInfo.reduce((s, f) => s + feeOf(f.uploadFee), 0))}
          balance={`${formatNumber(totalBalance / RATE_VALUE, { decimalsLength: 2, currency: 'en-US' })} LUME`}
          blocked={uploadCascadeInfo.some((f) => !!f.message)}
          onVisibility={handlePublicFile}
          onRemove={(name) => {
            const item = uploadCascadeInfo.find((f) => f.fileName === name)
            if (item) handleRemoveUploadFile(item)
          }}
          onCancel={cancelReview}
          onConfirm={() => {
            hub.closeDrawer()
            handleUploadCascade()
          }}
        />
      ) : null}
    </>
  )
}
