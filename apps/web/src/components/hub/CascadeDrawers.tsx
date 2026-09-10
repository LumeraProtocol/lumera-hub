'use client'

/*
 * Cascade's two drawers.
 *
 * File details follows the redesign's drawer: visibility, type and size, a
 * note, the record as the chain holds it, and Download. The prototype's
 * replica count and last-retrieved time have no source on this chain, so the
 * rows carry the block, the price paid and the supernodes that finalised the
 * action instead. Visibility is fixed when a file is registered, so there is
 * no toggle for it; the second button opens the registering transaction.
 *
 * The upload review has no counterpart in the prototype, whose upload starts
 * on click. A real upload is priced per file and signed, so the reader sees the
 * fee and chooses public or private before the wallet is asked for anything.
 */

import React from 'react'
import { Drawer } from '@lumera-hub/ui/src/hub/Drawer'
import { Label, Notice, Segmented, cx } from '@lumera-hub/ui/src/design/primitives'
import { CloseIcon, ExternalIcon } from '@lumera-hub/ui/src/design/icons'

const closeClass =
  'flex-none cursor-pointer rounded-control border border-line-edge bg-transparent px-5 py-[13px] text-base leading-none font-medium text-text-secondary transition-colors hover:border-line-accent'
const primaryClass =
  'flex-1 cursor-pointer rounded-control border-none bg-lumera-green py-[13px] text-base leading-none font-semibold text-ink-800 transition-colors hover:bg-lumera-green-bright disabled:cursor-not-allowed disabled:bg-ink-500 disabled:text-text-disabled'
const smallClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-inner border border-line-edge bg-transparent px-3 py-2 text-small leading-none font-medium text-text-tertiary no-underline transition-colors hover:border-line-accent hover:text-lumera-green'

export type FileDetail = {
  name: string
  size: string
  extension: string
  kind: string
  isPublic: boolean | null
  note: string
  rows: Array<{ k: string; v: string }>
  actionId: string
  explorerUrl?: string
}

export function FileDrawer({
  file,
  retrieving,
  progress,
  canDownload,
  onDownload,
  onCopy,
  onClose,
}: {
  file: FileDetail
  retrieving: boolean
  /** 0–99 while bytes arrive; undefined before the first chunk. */
  progress?: number
  /** False for a file the network has not finished storing. */
  canDownload: boolean
  onDownload: () => void
  onCopy: () => void
  onClose: () => void
}) {
  return (
    <Drawer
      title="File details"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={closeClass}>
            Close
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={retrieving || !canDownload}
            className={primaryClass}
          >
            {retrieving ? 'Retrieving…' : 'Download'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-[11px]">
        <div className="flex items-center gap-[9px]">
          <span
            className={cx(
              'rounded-[4px] border border-line-edge px-[7px] py-1 text-small leading-none font-medium',
              file.isPublic ? 'text-lumera-green' : 'text-text-muted',
            )}
          >
            {file.isPublic ? 'Public' : 'Private'}
          </span>
          <span className="truncate text-small leading-none text-text-muted">
            {file.extension} · {file.kind}
          </span>
          <span className="ml-auto flex-none font-mono text-base leading-none font-medium text-text-secondary">
            {file.size}
          </span>
        </div>
        <span className="text-[15.5px] leading-[1.35] font-semibold text-text-primary [overflow-wrap:anywhere]">
          {file.name}
        </span>
      </div>

      {retrieving ? (
        <div className="flex flex-col gap-2.5 rounded-[9px] border border-line-accent bg-ink-800 p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-small leading-none font-medium text-lumera-green">Retrieving</span>
            <span className="font-mono text-small leading-none font-medium text-text-secondary">
              {progress != null ? `${progress}%` : '…'}
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-line-hairline">
            <div
              className="h-full bg-lumera-green transition-[width] duration-100"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <span className="text-small leading-[1.45] text-text-muted">
            Requested from the network and streamed to this browser.
          </span>
        </div>
      ) : null}

      <div className="flex gap-3 rounded-[9px] border border-line-edge bg-ink-800 p-3.5">
        <div className="w-[3px] flex-none rounded-full bg-[linear-gradient(180deg,var(--color-lumera-teal),var(--color-lumera-green))]" />
        <p className="m-0 text-base leading-[1.65] text-text-secondary text-pretty">{file.note}</p>
      </div>

      <div className="overflow-hidden rounded-[9px] border border-line-hairline bg-ink-800">
        {file.rows.map((r) => (
          <div
            key={r.k}
            className="flex items-baseline justify-between gap-[18px] border-b border-ink-500 px-3.5 py-[11px] last:border-b-0"
          >
            <span className="flex-none text-base leading-[1.4] text-text-tertiary">{r.k}</span>
            <span className="text-right font-mono text-base leading-[1.45] font-medium text-text-primary [overflow-wrap:anywhere]">
              {r.v}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className={smallClass}>
          Copy action ID
        </button>
        {file.explorerUrl ? (
          <a href={file.explorerUrl} target="_blank" rel="noreferrer" className={smallClass}>
            View transaction
            <ExternalIcon size={11} />
          </a>
        ) : null}
      </div>
    </Drawer>
  )
}

export type UploadItem = {
  name: string
  size: string
  fee: string
  isPublic: boolean
  /** Why this file cannot go, e.g. the balance does not cover it. */
  problem?: string
}

export function UploadDrawer({
  items,
  totalSize,
  totalFee,
  balance,
  blocked,
  onVisibility,
  onRemove,
  onCancel,
  onConfirm,
}: {
  items: UploadItem[]
  totalSize: string
  totalFee: string
  balance: string
  /** A file cannot be paid for; signing would fail part-way. */
  blocked: boolean
  onVisibility: (name: string, isPublic: boolean) => void
  onRemove: (name: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Drawer
      title="Upload to Cascade"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className={closeClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!items.length || blocked}
            className={primaryClass}
          >
            {items.length > 1 ? `Sign and upload ${items.length} files` : 'Sign and upload'}
          </button>
        </>
      }
    >
      <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
        Each file is encoded here, registered on chain and paid for once from your liquid balance.
        Public files can be fetched by anyone with the action ID; private ones only by this
        address.
      </p>

      <div className="flex flex-col gap-2">
        {items.map((f) => (
          <div
            key={f.name}
            className={cx(
              'flex flex-col gap-2.5 rounded-[9px] border bg-ink-800 px-3.5 py-[13px]',
              f.problem ? 'border-danger-edge' : 'border-line-edge',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-base leading-none font-medium text-text-primary">
                  {f.name}
                </span>
                <span className="font-mono text-small leading-none text-text-muted">
                  {f.size} · <span className="text-lumera-green">{f.fee}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(f.name)}
                aria-label={`Remove ${f.name}`}
                className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-inner border border-line-edge bg-transparent text-text-muted transition-colors hover:text-text-primary"
              >
                <CloseIcon size={11} />
              </button>
            </div>
            <Segmented
              size="sm"
              value={f.isPublic ? 'public' : 'private'}
              onChange={(v) => onVisibility(f.name, v === 'public')}
              options={[
                { key: 'private', label: 'Private' },
                { key: 'public', label: 'Public' },
              ]}
              className="self-start"
            />
            {f.problem ? (
              <span className="text-small leading-[1.4] text-danger">{f.problem}</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[9px] border border-line-hairline bg-ink-800">
        {[
          { k: items.length === 1 ? 'File' : 'Files', v: String(items.length) },
          { k: 'Total size', v: totalSize },
          { k: 'Upload fee', v: totalFee, green: true },
          { k: 'Liquid balance', v: balance },
        ].map((r) => (
          <div
            key={r.k}
            className="flex items-baseline justify-between gap-4 border-b border-ink-500 px-3.5 py-3 last:border-b-0"
          >
            <span className="flex-none text-base text-text-muted">{r.k}</span>
            <span
              className={cx(
                'text-right font-mono text-base font-medium tnum',
                r.green ? 'text-lumera-green' : 'text-text-secondary',
              )}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>

      {blocked ? (
        <Notice tone="danger">
          The balance does not cover every file. Remove the marked ones, or add LUME and pick them
          again.
        </Notice>
      ) : (
        <Label>The network fee for each registration is added in your wallet</Label>
      )}
    </Drawer>
  )
}
