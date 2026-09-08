'use client'

/*
 * Cascade.
 *
 * Network figures sit above the drive, and the drive is only asked for once
 * there is an address to key it to. Without a wallet the reader still sees how
 * much the network holds, how many supernodes carry it and where they are —
 * all public — instead of an empty page.
 *
 * The file list keeps its type filters, but a filter that would match nothing
 * says so with its count rather than silently returning an empty table.
 */

import React from 'react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Label,
  Notice,
  PageTitle,
  SegmentBar,
  Segmented,
  Skeleton,
  StatStrip,
  Well,
  cx,
} from '../../design/primitives'
import { FileIcon, UploadIcon, DownloadIcon } from '../../design/icons'
import { useHub } from '../../hub/session'

export type CascadeFile = {
  key: string
  name: string
  size: string
  extension: string
  kind: string
  isPublic: boolean | null
  state: string
  selected: boolean
  onToggle: () => void
  onDownload: () => void
}

export function CascadeScreen({
  loading,
  networkStored,
  networkUsedPercent,
  networkCapacity,
  supernodes,
  storedObjects,
  myStored,
  files,
  fileCounts,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
  onUpload,
  isUploading,
  selectedCount,
  onDownloadSelected,
  isDownloading,
  storageBreakdown,
  regions,
  sdkLoading,
  sdkError,
}: {
  loading?: boolean
  networkStored: string
  /** Share of network capacity in use, 0–100. */
  networkUsedPercent?: number
  networkCapacity: string
  supernodes: string
  /** Completed Cascade actions — files the network is holding. */
  storedObjects: string
  myStored: string
  files: CascadeFile[]
  fileCounts: Record<string, number>
  typeFilter: string
  onTypeFilterChange: (t: string) => void
  search: string
  onSearchChange: (s: string) => void
  onUpload: () => void
  isUploading?: boolean
  selectedCount: number
  onDownloadSelected: () => void
  isDownloading?: boolean
  storageBreakdown: Array<{ label: string; bytes: number; className: string }>
  regions: Array<{ name: string; count: number }>
  /** The storage client is downloading. Only blocks upload and download. */
  sdkLoading?: boolean
  sdkError?: string | null
}) {
  const hub = useHub()

  const totalBytes = storageBreakdown.reduce((s, b) => s + b.bytes, 0)
  const topRegion = regions[0]?.count || 1

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title="Cascade"
        subtitle="Permanent storage across the supernode network. Every file is chunked, encrypted and held by multiple nodes."
        actions={
          <Button
            variant="primary"
            locked={hub.gated}
            onClick={onUpload}
            disabled={isUploading || !!sdkError}
          >
            <UploadIcon size={14} />
            {isUploading ? 'Uploading…' : sdkLoading ? 'Preparing…' : 'Upload file'}
          </Button>
        }
      />

      <StatStrip
        items={[
          {
            label: 'NETWORK STORED',
            value: networkStored,
          },
          { label: 'OBJECTS STORED', value: storedObjects },
          {
            label: 'CAPACITY USED',
            value: networkUsedPercent ? `${networkUsedPercent.toFixed(1)}%` : '—',
          },
          { label: 'SUPERNODES', value: supernodes },
        ]}
      />

      {regions.length ? (
        <Card>
          <CardHeader
            title="Supernodes worldwide"
            action={
              // Says what this panel counts, so it does not read as
              // contradicting the registered total above it: only nodes the
              // metrics indexer reached and whose host resolved to a place
              // can be put on a map.
              <span className="text-small text-text-muted">
                {regions.reduce((sum, r) => sum + r.count, 0)} located of {supernodes} registered
              </span>
            }
          />
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 px-[18px] py-4 sm:grid-cols-2">
            {regions.map((r) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="w-32 flex-none truncate text-small text-text-secondary">
                  {r.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-hairline">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))]"
                    style={{ width: `${(r.count / topRegion) * 100}%` }}
                  />
                </div>
                <span className="w-8 flex-none text-right font-mono text-small tnum text-text-muted">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {sdkError ? (
        <Notice tone="danger">
          The storage client could not be loaded, so uploads and downloads are
          unavailable on this page. The network figures above are unaffected. ({sdkError})
        </Notice>
      ) : null}

      {hub.isDisconnected ? (
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <Badge tone="muted">NO WALLET CONNECTED</Badge>
            <h2 className="m-0 max-w-[420px] text-[20px] leading-tight font-semibold text-text-primary text-pretty">
              Connect your wallet to open your drive
            </h2>
            <p className="m-0 max-w-[460px] text-base leading-[1.6] text-text-muted text-pretty">
              Files on Cascade are keyed to an address. The network figures above are public and
              stay visible either way.
            </p>
            <Button variant="solid" onClick={hub.connect}>
              Connect wallet
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {totalBytes > 0 ? (
            <Card>
              <div className="flex flex-col gap-3 px-[18px] py-4">
                <div className="flex items-baseline justify-between">
                  <Label>Your storage</Label>
                  <span className="font-mono text-small tnum text-text-muted">{myStored}</span>
                </div>
                <SegmentBar
                  height={10}
                  segments={storageBreakdown
                    .filter((b) => b.bytes > 0)
                    .map((b) => ({
                      width: `${(b.bytes / totalBytes) * 100}%`,
                      className: b.className,
                      title: b.label,
                    }))}
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {storageBreakdown
                    .filter((b) => b.bytes > 0)
                    .map((b) => (
                      <span key={b.label} className="flex items-center gap-1.5 text-small text-text-muted">
                        <span className={cx('h-2 w-2 rounded-full', b.className)} />
                        {b.label}
                      </span>
                    ))}
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-[13px]">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="m-0 flex-1 text-base font-semibold whitespace-nowrap text-text-primary">
                  Your drive
                </h3>
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search files"
                  aria-label="Search files"
                  className="min-w-[160px] flex-1 rounded-inner border border-line-hairline bg-ink-800 px-3 py-[7px] text-small text-text-primary outline-none placeholder:text-text-disabled focus:border-line-accent sm:max-w-[240px]"
                />
                {selectedCount > 0 ? (
                  <Button variant="accent" size="sm" onClick={onDownloadSelected} disabled={isDownloading}>
                    <DownloadIcon size={13} />
                    {isDownloading ? 'Preparing…' : `Download ${selectedCount}`}
                  </Button>
                ) : null}
              </div>
              <Segmented
                value={typeFilter}
                onChange={onTypeFilterChange}
                options={[
                  { key: 'all', label: `All ${fileCounts.all ?? 0}` },
                  { key: 'image', label: `Images ${fileCounts.image ?? 0}` },
                  { key: 'video', label: `Videos ${fileCounts.video ?? 0}` },
                  { key: 'document', label: `Documents ${fileCounts.document ?? 0}` },
                  { key: 'archive', label: `Archives ${fileCounts.archive ?? 0}` },
                  { key: 'other', label: `Other ${fileCounts.other ?? 0}` },
                ]}
              />
            </div>

            <div
              className="hidden gap-3 border-b border-line-hairline px-[18px] py-[9px] font-mono text-micro font-medium tracking-[0.08em] text-text-muted sm:grid"
              style={{ gridTemplateColumns: '1fr 96px 92px 108px 44px' }}
            >
              <span>FILE</span>
              <span className="text-right">SIZE</span>
              <span className="text-right">FORMAT</span>
              <span className="text-right">VISIBILITY</span>
              <span />
            </div>

            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line-hairline px-[18px] py-3">
                  <Skeleton className="h-7 w-7" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : files.length ? (
              files.map((f) => (
                <div
                  key={f.key}
                  className="grid grid-cols-1 items-center gap-x-3 gap-y-2 border-b border-line-hairline px-[18px] py-3 transition-colors last:border-b-0 hover:bg-ink-600 sm:grid-cols-[1fr_96px_92px_108px_44px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={f.selected}
                      onChange={f.onToggle}
                      aria-label={`Select ${f.name}`}
                      className="h-3.5 w-3.5 flex-none accent-[var(--color-lumera-green)]"
                    />
                    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-chip border border-line-edge bg-ink-600 text-text-muted">
                      <FileIcon size={13} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate text-base font-medium text-text-primary">
                        {f.name}
                      </span>
                      <span className="truncate text-small text-text-muted">{f.kind}</span>
                    </div>
                  </div>
                  <span className="font-mono text-small tnum text-text-secondary sm:text-right">
                    {f.size}
                  </span>
                  <span className="font-mono text-small text-text-muted sm:text-right">
                    {f.extension}
                  </span>
                  <span className="sm:text-right">
                    <Badge tone={f.isPublic ? 'green' : 'muted'}>
                      {f.isPublic ? 'PUBLIC' : 'PRIVATE'}
                    </Badge>
                  </span>
                  <span className="sm:justify-self-end">
                    <Button variant="outline" size="sm" onClick={f.onDownload}>
                      <DownloadIcon size={12} />
                    </Button>
                  </span>
                </div>
              ))
            ) : (
              <div className="p-[18px]">
                <EmptyState
                  title={
                    search.trim()
                      ? `No file matches “${search.trim()}”`
                      : typeFilter !== 'all'
                        ? 'Nothing of that type yet'
                        : 'Nothing stored yet'
                  }
                  body={
                    search.trim() || typeFilter !== 'all'
                      ? 'Try another filter, or clear the search.'
                      : 'Your first upload is chunked, encrypted and replicated across supernodes before it is confirmed.'
                  }
                  action={
                    search.trim() || typeFilter !== 'all' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSearchChange('')
                          onTypeFilterChange('all')
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Button variant="accent" size="sm" locked={hub.gated} onClick={onUpload}>
                        Upload a file
                      </Button>
                    )
                  }
                />
              </div>
            )}
          </Card>

          <Well className="flex flex-col gap-1.5">
            <span className="text-small leading-[1.55] text-text-muted text-pretty">
              Uploads are paid for from your liquid balance and priced by size. Public files can be
              fetched by anyone holding the content ID; private files stay encrypted to this
              address.
              {sdkLoading
                ? ' The storage client is still downloading; uploads and downloads become available when it finishes.'
                : ''}
            </span>
          </Well>
        </>
      )}
    </div>
  )
}
