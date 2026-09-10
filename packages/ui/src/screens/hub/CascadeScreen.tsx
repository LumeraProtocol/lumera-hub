'use client'

/*
 * Cascade.
 *
 * Laid out as the redesign draws it: network figures, the supernode map, then
 * either the wallet prompt or the drive — drop zone, storage summary, an
 * upload in flight, and the file list. A row opens the file drawer; download
 * lives there rather than on the row.
 *
 * The design's figures are placeholders, and a few of them have no source on
 * this chain. Those slots carry the nearest real figure instead of an invented
 * one: objects stored where the prototype has median retrieval, what the drive
 * cost to store where it has a monthly bill (uploads are paid for once), and
 * how many supernodes could be placed where it promises three regions.
 */

import React from 'react'
import { Notice, Skeleton, StatStrip, cx } from '../../design/primitives'
import { LockIcon, SearchIcon } from '../../design/icons'
import { useHub } from '../../hub/session'
import { SupernodeMap, type MapNode } from '../../hub/SupernodeMap'

export type CascadeFile = {
  key: string
  name: string
  size: string
  extension: string
  /** "Archive", or "Archive · Processing" while the network is still storing it. */
  kind: string
  isPublic: boolean | null
  onOpen: () => void
}

export type DriveGroup = 'all' | 'models' | 'media' | 'documents' | 'archives'

export const DRIVE_GROUPS: Array<{ key: DriveGroup; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'models', label: 'Models' },
  { key: 'media', label: 'Media' },
  { key: 'documents', label: 'Documents' },
  { key: 'archives', label: 'Archives' },
]

/** The four steps an upload goes through, in the order the SDK takes them. */
export const UPLOAD_PHASES = ['Encoding', 'Signing', 'Registering', 'Storing']

export type UploadProgress = {
  name: string
  size: string
  /** Index into UPLOAD_PHASES. */
  phase: number
  /** 1-based position in a multi-file upload. */
  fileIndex: number
  fileCount: number
}

export type StorageSummary = {
  used: string
  paid: string
  segments: Array<{ key: string; label: string; size: string; width: string; color: string }>
}

export function CascadeScreen({
  loading,
  networkStored,
  networkCapacity,
  supernodes,
  storedObjects,
  mapNodes,
  regions,
  liveSites,
  located,
  onUpload,
  onDropFiles,
  isPreparing,
  upload,
  storage,
  files,
  fileCountLabel,
  group,
  onGroupChange,
  query,
  onQueryChange,
  filtering,
  onClearFilters,
  driveEmpty,
  sdkError,
  uploadError,
}: {
  loading?: boolean
  networkStored: string
  networkCapacity: string
  supernodes: string
  /** Completed Cascade actions — files the network is holding. */
  storedObjects: string
  /** Located supernodes, for the map. Empty until any host resolves. */
  mapNodes?: MapNode[]
  /** Located supernodes by region, largest first. */
  regions: Array<{ name: string; count: number }>
  /** Places with at least one active supernode; null until nodes are located. */
  liveSites: number | null
  /** Supernodes that could be put on the map. */
  located: number
  onUpload: () => void
  onDropFiles: (files: File[]) => void
  /** Fees are being worked out for picked files. */
  isPreparing?: boolean
  upload: UploadProgress | null
  storage: StorageSummary | null
  files: CascadeFile[]
  fileCountLabel: string
  group: DriveGroup
  onGroupChange: (g: DriveGroup) => void
  query: string
  onQueryChange: (q: string) => void
  filtering: boolean
  onClearFilters: () => void
  /** The address has nothing stored at all. */
  driveEmpty: boolean
  /** The storage client could not be loaded. Only blocks upload and download. */
  sdkError?: string | null
  uploadError?: string | null
}) {
  const hub = useHub()
  const [dragging, setDragging] = React.useState(false)
  const known = supernodes !== '—'

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <h1 className="m-0 mb-[5px] text-title font-semibold tracking-[-0.02em] text-text-primary">
            Cascade
          </h1>
          <p className="m-0 text-base text-text-muted text-pretty">
            Permanent storage across {known ? `${supernodes} supernodes` : 'the supernode network'}.
            Every file is chunked, erasure-coded and held across the network — public or private,
            your choice.
          </p>
        </div>
        {/* The design's button is a touch larger than the shared md size, so
            it is drawn here rather than fought through Button's padding. */}
        <button
          type="button"
          onClick={onUpload}
          disabled={!!sdkError || !!upload}
          className={cx(
            'inline-flex flex-none items-center justify-center gap-[7px] self-start rounded-control border-none px-[17px] py-[11px] text-base leading-none font-semibold whitespace-nowrap transition-colors sm:self-auto',
            sdkError || upload
              ? 'cursor-not-allowed bg-ink-500 text-text-disabled'
              : 'cursor-pointer bg-lumera-green text-ink-800 hover:bg-lumera-green-bright',
          )}
        >
          {hub.gated ? <LockIcon size={12} className="flex-none" /> : null}
          Upload file
        </button>
      </div>

      <StatStrip
        items={[
          { label: 'NETWORK STORED', value: networkStored },
          { label: 'NETWORK CAPACITY', value: networkCapacity, tone: 'green' },
          { label: 'SUPERNODES', value: supernodes },
          { label: 'OBJECTS STORED', value: storedObjects },
        ]}
      />

      <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-hairline px-[18px] py-3.5">
          <h3 className="m-0 text-base leading-none font-semibold text-text-primary">
            Supernodes worldwide
          </h3>
          {liveSites != null ? (
            // Counted from nodes the chain lists as active, not every pin: on
            // testnet most registered nodes are postponed, and they replicate
            // nothing while they are.
            <span className="flex items-center gap-[7px] text-small leading-none text-text-muted">
              <span
                className="h-1.5 w-1.5 flex-none rounded-full bg-lumera-green"
                style={{ animation: 'lmBlink 1.6s infinite' }}
              />
              Live replication across {liveSites} {liveSites === 1 ? 'site' : 'sites'}
            </span>
          ) : null}
        </div>
        <div className="h-[340px] bg-[#021a34]">
          <SupernodeMap nodes={mapNodes ?? []} height={340} />
        </div>
        <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2.5 border-t border-line-hairline px-[18px] py-[13px]">
          {regions.length ? (
            regions.map((r) => (
              <div key={r.name} className="flex items-baseline gap-2">
                <span className="text-small leading-none text-text-tertiary">{r.name}</span>
                <span className="font-mono text-small leading-none font-semibold text-text-primary tnum">
                  {r.count}
                </span>
              </div>
            ))
          ) : (
            <span className="text-small leading-none text-text-muted">Locating supernodes…</span>
          )}
          {located > 0 && known ? (
            <span className="ml-auto text-small leading-none text-text-muted">
              {located} of {supernodes} supernodes located
            </span>
          ) : null}
        </div>
      </div>

      {sdkError ? (
        <Notice tone="danger">
          The storage client could not be loaded, so uploads and downloads are unavailable on this
          page. The network figures above are unaffected. ({sdkError})
        </Notice>
      ) : null}

      {hub.isDisconnected ? (
        <div className="overflow-hidden rounded-[14px] border border-line-edge bg-ink-700">
          <div className="flex items-center gap-[9px] border-b border-line-hairline bg-ink-800 px-[22px] py-[13px]">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-warn" />
            <span className="font-mono text-small leading-none font-medium tracking-[0.1em] text-warn">
              NO WALLET CONNECTED
            </span>
          </div>
          <div className="flex flex-col items-center gap-5 px-6 py-[34px] text-center sm:px-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-[14px] border border-line-edge bg-ink-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lumera-mark.svg" alt="" className="h-[26px] w-[26px]" />
            </div>
            <div>
              <h2 className="m-0 mb-[9px] text-[19px] leading-[1.3] font-semibold tracking-[-0.02em] text-text-primary">
                Connect your wallet to open your drive
              </h2>
              <p className="m-0 mx-auto max-w-[400px] text-base leading-[1.65] text-text-tertiary text-pretty">
                Files on Cascade are keyed to an address. Network statistics are public, but your
                drive, uploads and file visibility need a wallet.
              </p>
            </div>
            <button
              type="button"
              onClick={hub.connect}
              className="min-w-[220px] cursor-pointer rounded-[9px] border-none bg-lumera-green px-6 py-[13px] text-base leading-none font-semibold text-ink-800 transition-colors hover:bg-lumera-green-bright"
            >
              Connect wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload files to Cascade"
            onClick={onUpload}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onUpload()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!dragging) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const dropped = Array.from(e.dataTransfer.files || [])
              if (dropped.length) onDropFiles(dropped)
            }}
            className={cx(
              'flex cursor-pointer flex-wrap items-center gap-x-3.5 gap-y-2 rounded-card border border-dashed px-5 py-[15px] transition-colors sm:flex-nowrap',
              dragging
                ? 'border-line-accent bg-ink-700'
                : 'border-line-edge bg-ink-800 hover:border-line-accent hover:bg-ink-700',
            )}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-lumera-green)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-none"
              aria-hidden="true"
            >
              <path d="M18 16.5a4 4 0 0 0-1.2-7.8A6 6 0 0 0 5.2 10 3.75 3.75 0 0 0 6 17.5" />
              <path d="M12 19v-8" />
              <path d="m9 14 3-3 3 3" />
            </svg>
            <span className="flex-none text-base leading-none font-semibold text-text-primary">
              {dragging ? 'Release to store' : 'Drop files to store'}
            </span>
            <span className="order-last w-full text-small leading-[1.4] text-text-muted sm:order-none sm:w-auto">
              Encoded in your browser, registered on chain, then handed to the supernodes.
            </span>
            <span className="ml-auto flex-none text-small leading-none font-medium text-lumera-green">
              {isPreparing ? 'Pricing…' : 'Browse'}
            </span>
          </div>

          {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}

          {storage ? (
            <div className="rounded-card border border-line-edge bg-ink-700 p-5">
              <div className="mb-[13px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div className="flex items-baseline gap-[9px]">
                  <span className="font-mono text-[22px] leading-none font-semibold text-text-primary tnum">
                    {storage.used}
                  </span>
                  <span className="text-base leading-none text-text-tertiary">stored</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-small leading-none text-text-tertiary">Paid</span>
                  <span className="font-mono text-base leading-none font-medium text-lumera-green tnum">
                    {storage.paid}
                  </span>
                </div>
              </div>
              <div className="mb-3.5 flex h-3 overflow-hidden rounded-[3px] bg-line-hairline">
                {storage.segments.map((s) => (
                  <div
                    key={s.key}
                    title={`${s.label} ${s.size}`}
                    style={{ width: s.width, background: s.color }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {storage.segments.map((s) => (
                    <span
                      key={s.key}
                      className="flex items-center gap-[7px] text-small leading-none text-text-tertiary"
                    >
                      <span
                        className="h-[7px] w-[7px] flex-none rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.label} {s.size}
                    </span>
                  ))}
                </div>
                <span className="text-small leading-none text-text-muted">
                  No quota — each file is paid for once, at upload
                </span>
              </div>
            </div>
          ) : null}

          {upload ? (
            <div
              className="flex flex-col gap-[11px] rounded-card border border-line-accent bg-ink-700 px-5 py-[18px]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-baseline justify-between gap-3.5">
                <span className="truncate text-base leading-none font-medium text-text-primary">
                  {upload.name}
                </span>
                <span className="flex-none font-mono text-small leading-none text-text-tertiary">
                  {upload.size}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line-hairline">
                <div
                  className="h-full bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))] transition-[width] duration-500"
                  style={{ width: `${((upload.phase + 0.5) / UPLOAD_PHASES.length) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-base leading-none font-medium text-lumera-green">
                  <span
                    className="h-1.5 w-1.5 flex-none rounded-full bg-lumera-green"
                    style={{ animation: 'lmBlink 1s infinite' }}
                  />
                  {UPLOAD_PHASES[upload.phase]}
                </span>
                <span className="font-mono text-small leading-none text-text-muted">
                  {upload.fileCount > 1 ? `File ${upload.fileIndex} of ${upload.fileCount} · ` : ''}
                  Step {upload.phase + 1} of {UPLOAD_PHASES.length}
                </span>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
            <div className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-3.5">
              <div className="flex flex-wrap items-center gap-3.5">
                <h3 className="m-0 flex-none text-base leading-none font-semibold text-text-primary">
                  Your drive
                </h3>
                <div className="relative min-w-[180px] flex-1 sm:max-w-[280px]">
                  <SearchIcon
                    size={14}
                    strokeWidth={2}
                    className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-text-muted"
                  />
                  <input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search name, ID or supernode…"
                    aria-label="Search files"
                    className="w-full rounded-control border border-line-edge bg-ink-800 py-[9px] pr-3 pl-8 text-base leading-[normal] text-text-primary outline-none placeholder:text-text-muted focus:border-line-accent"
                  />
                </div>
                <span className="ml-auto flex-none font-mono text-small leading-none text-text-muted">
                  {fileCountLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-[7px]">
                {DRIVE_GROUPS.map((g) => {
                  const on = g.key === group
                  return (
                    <button
                      key={g.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onGroupChange(g.key)}
                      className={cx(
                        'cursor-pointer rounded-inner border border-line-edge px-[11px] py-1.5 text-small leading-none font-medium transition-colors',
                        on
                          ? 'bg-ink-600 text-text-primary'
                          : 'bg-transparent text-text-muted hover:text-text-secondary',
                      )}
                    >
                      {g.label}
                    </button>
                  )
                })}
                {filtering ? (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="ml-auto cursor-pointer border-none bg-transparent px-0.5 py-1.5 text-small leading-none font-medium text-lumera-green hover:text-lumera-green-bright"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="hidden grid-cols-[1fr_88px_92px_108px_16px] gap-3 border-b border-line-hairline px-[18px] py-[9px] font-mono text-micro leading-none font-medium tracking-[0.08em] text-text-muted sm:grid">
              <span>FILE</span>
              <span className="text-right">SIZE</span>
              <span className="text-right">FORMAT</span>
              <span className="text-right">VISIBILITY</span>
              <span />
            </div>

            {loading && !files.length ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-line-hairline px-[18px] py-3 last:border-b-0"
                >
                  <Skeleton className="h-[26px] w-[26px]" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : files.length ? (
              files.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.onOpen}
                  className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-3 border-0 border-b border-solid border-line-hairline bg-transparent px-[18px] py-3 text-left transition-colors hover:bg-ink-600 sm:grid-cols-[1fr_88px_92px_108px_16px]"
                >
                  <div className="flex min-w-0 items-center gap-[11px]">
                    <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-chip border border-line-edge bg-ink-600">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-lumera-green)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                        <path d="M14 3v5h5" />
                      </svg>
                    </div>
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate text-base leading-none font-medium text-text-primary">
                        {f.name}
                      </span>
                      <span className="truncate text-small leading-none text-text-muted">
                        {f.kind}
                        <span className="sm:hidden"> · {f.size}</span>
                      </span>
                    </div>
                  </div>
                  <span className="hidden text-right font-mono text-base leading-none text-text-secondary tnum sm:block">
                    {f.size}
                  </span>
                  <span className="hidden truncate text-right font-mono text-small leading-none text-text-tertiary sm:block">
                    {f.extension}
                  </span>
                  <span
                    className={cx(
                      'justify-self-end rounded-[4px] border border-line-edge px-[7px] py-1 text-small leading-none font-medium',
                      f.isPublic ? 'text-lumera-green' : 'text-text-muted',
                    )}
                  >
                    {f.isPublic ? 'Public' : 'Private'}
                  </span>
                  <span className="hidden text-right text-lg leading-none text-text-muted sm:block">
                    ›
                  </span>
                </button>
              ))
            ) : driveEmpty ? (
              <div className="flex flex-col items-center gap-2.5 px-5 py-[52px] text-center">
                <span className="text-base leading-[1.3] font-medium text-text-primary">
                  Nothing stored yet
                </span>
                <span className="max-w-[340px] text-base leading-[1.55] text-text-muted text-pretty">
                  Your first upload is encoded in your browser and stored across supernodes. It is
                  paid for once, from your liquid balance.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-[11px] px-5 py-11 text-center">
                <span className="text-base leading-[1.3] font-medium text-text-primary">
                  No files match
                </span>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="cursor-pointer rounded-control border border-line-edge bg-transparent px-[15px] py-[9px] text-small leading-none font-medium text-text-secondary transition-colors hover:border-line-accent"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
