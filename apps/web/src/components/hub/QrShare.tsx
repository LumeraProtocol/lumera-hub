'use client'

/*
 * The share result for a stored Cascade object.
 *
 * Given an on-chain action id, this renders the "your file is live" card: a QR
 * that a phone scans to pull the bytes (they resolve in the browser via the
 * public /action_id/<id> page), beside a panel of what the object's on-chain
 * receipt actually says, plus a link to the same object on the explorer and a
 * copy-able share link.
 *
 * It is driven by a completed wallet upload — the uploader picks the action id
 * once the object finalizes on chain and hands it here. Only public objects can
 * be shared this way (the gateway serves their bytes key-lessly); a private one
 * shows its receipt but no scan-to-download, since no one else can fetch it.
 */

import React from 'react'
import QRCode from 'react-qr-code'

import {
  CASCADE_API_URL,
  CASCADE_EXPLORER_URL,
  cascadeExplorerBlockUrl,
  NETWORK_PROFILES,
} from '@/contants/network'
import { Card, CardHeader } from '@lumera-hub/ui/src/design/primitives'
import { copyText, useHub } from '@lumera-hub/ui/src/hub/session'

type Receipt = {
  state?: string
  block_height?: number
  chain_id?: string
  file_size_kbs?: number
  supernodes?: string[]
  artifact?: { content_hash?: string }
}

const MB = 1024 * 1024
const sizeLabel = (bytes?: number) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`
}
const short = (s: string, head = 10, tail = 6) =>
  !s || s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`

const testnet = NETWORK_PROFILES.testnet

/** One labelled QR that doubles as a click-through on desktop. */
function QrPanel({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-none flex-col items-center gap-2.5 no-underline"
    >
      <span className="relative mb-[5px] rounded-[10px] bg-text-primary p-3.5 transition-[filter] hover:brightness-95">
        {/* Level H (30% error correction) leaves room to punch the Lumera mark
            into the centre and still scan cleanly. */}
        <QRCode value={href} size={230} bgColor="#f5f5fa" fgColor="#000c22" level="H" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex items-center justify-center rounded-[8px] bg-[#f5f5fa] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lumera-mark.svg" alt="" className="h-12 w-12" />
          </span>
        </span>
      </span>
      <span className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-base leading-none font-semibold text-text-primary">{label}</span>
        {hint ? <span className="text-small leading-none text-text-muted">{hint}</span> : null}
      </span>
    </a>
  )
}

export function ShareResult({
  actionId,
  filename,
  isPublic = true,
  onDone,
}: {
  /** The object's on-chain action id — what the share page resolves. Absent
   *  while the just-uploaded object is still settling on chain. */
  actionId?: string
  filename?: string
  /** Public objects get the scan-to-download QR; private ones can't be shared. */
  isPublic?: boolean
  /** Rendered as a "Done" affordance in the header when given. */
  onDone?: () => void
}) {
  const hub = useHub()
  const [receipt, setReceipt] = React.useState<Receipt | null>(null)
  const [writtenAt, setWrittenAt] = React.useState<string | null>(null)

  /*
   * Read the object's receipt for the supernode set and digest (a fresh object
   * is briefly PENDING, so retry a few times). Best-effort — a row stays out
   * rather than showing a guess.
   */
  React.useEffect(() => {
    setReceipt(null)
    setWrittenAt(null)
    if (!actionId) return
    let cancelled = false
    let tries = 0
    const pull = async () => {
      try {
        const r = await fetch(`${CASCADE_API_URL}/receipt/${actionId}`)
        if (r.ok) {
          const data = (await r.json()) as Receipt
          if (cancelled) return
          setReceipt(data)
          if (data.state !== 'DONE' && tries < 8) {
            tries += 1
            setTimeout(pull, 3000)
          }
        }
      } catch {
        /* leave the panel with whatever it already has */
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [actionId])

  const block = receipt?.block_height

  // The block's timestamp gives "Written".
  React.useEffect(() => {
    if (!block) return
    let cancelled = false
    fetch(`${testnet.restEndpoint}/cosmos/base/tendermint/v1beta1/blocks/${block}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        const t = b?.block?.header?.time
        if (!cancelled && t) {
          setWrittenAt(
            new Date(t).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
          )
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [block])

  const pending = !actionId
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/action_id/${actionId}`
  const explorerUrl = block ? cascadeExplorerBlockUrl(block) : CASCADE_EXPLORER_URL

  const rows: Array<{ k: string; v: string }> = [
    { k: 'Object', v: `#${actionId}` },
    ...(writtenAt ? [{ k: 'Written', v: writtenAt }] : []),
    { k: 'Anchored in', v: block ? `block ${block.toLocaleString('en-US')}` : '—' },
    ...(receipt?.supernodes?.length
      ? [
          {
            k: 'Held by',
            v: `${receipt.supernodes.length} supernode${receipt.supernodes.length === 1 ? '' : 's'}`,
          },
        ]
      : []),
    ...(receipt?.artifact?.content_hash
      ? [{ k: 'Digest', v: short(receipt.artifact.content_hash, 10, 6) }]
      : []),
    ...(receipt?.file_size_kbs ? [{ k: 'Size', v: sizeLabel(receipt.file_size_kbs * 1024) }] : []),
  ]

  const infoPanel = (
    <div className="flex w-full flex-none flex-col rounded-panel border border-line-accent bg-ink-800 p-[18px] lg:w-[430px]">
      <span className="mb-3 block font-mono text-micro leading-none font-medium tracking-[0.1em] text-lumera-green uppercase">
        What you see when it resolves
      </span>
      <div className="flex flex-col">
        {rows.map((r) => (
          <div
            key={r.k}
            className="flex items-baseline justify-between gap-4 border-b border-ink-500 py-2.5 last:border-b-0"
          >
            <span className="flex-none text-base leading-none text-text-tertiary">{r.k}</span>
            <span className="text-right font-mono text-base leading-[1.4] font-medium text-warn [overflow-wrap:anywhere]">
              {r.v}
            </span>
          </div>
        ))}
      </div>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-auto flex items-center gap-1.5 self-start pt-4 text-base font-semibold text-lumera-green transition-colors hover:text-lumera-green-bright"
      >
        View on the explorer
        <span aria-hidden>↗</span>
      </a>
    </div>
  )

  return (
    <Card>
      <CardHeader
        title="Share a file"
        action={
          onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="inline-flex flex-none cursor-pointer items-center justify-center gap-[7px] rounded-control border border-line-edge bg-ink-800 px-[17px] py-[11px] text-base leading-none font-semibold whitespace-nowrap text-text-secondary transition-colors hover:border-line-accent hover:text-lumera-green"
            >
              Upload another
            </button>
          ) : null
        }
      />

      <div className="px-[18px] pt-1.5 pb-5">
        <div className="flex w-full flex-col">
          <div className="mb-5 flex min-w-0 items-start gap-2.5">
            <span
              className="mt-[7px] h-2 w-2 flex-none rounded-full bg-lumera-green"
              aria-hidden
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-lg leading-[1.3] font-semibold text-text-primary">
                {filename ? `${filename} is live` : 'Your file is live'}
              </span>
              <span className="text-base leading-[1.55] text-text-muted text-pretty">
                {isPublic
                  ? 'Scan to pull it and watch it resolve in the browser, or check the same object on the public explorer.'
                  : 'Stored privately — only your address can retrieve it, so there is no public link. Here is what the network recorded.'}
              </span>
            </div>
          </div>

          {pending ? (
            <div className="px-16">
              <div className="flex items-center gap-3 rounded-panel border border-line-edge bg-ink-800 px-[18px] py-[22px]">
                <span
                  className="h-2 w-2 flex-none rounded-full bg-warn"
                  style={{ animation: 'lmBlink 1s infinite' }}
                  aria-hidden
                />
                <span className="text-base leading-[1.5] text-warn text-pretty">
                  {isPublic
                    ? 'Finalizing on chain — your scan-to-download QR and share link appear here as soon as the object settles.'
                    : 'Finalizing on chain — the on-chain record appears here as soon as the object settles.'}
                </span>
              </div>
            </div>
          ) : isPublic ? (
            <div className="flex flex-col px-16">
              <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:justify-between lg:gap-8">
                <div className="flex w-full flex-none flex-col items-center justify-center py-2 lg:w-auto">
                  <QrPanel href={shareUrl} label="Scan to download" hint="resolves in the browser" />
                </div>
                {infoPanel}
              </div>

              <div className="mt-4 inline-flex max-w-full items-center gap-2.5 self-start rounded-control border border-line-edge bg-ink-800 px-[13px] py-[9px]">
                <span className="min-w-0 truncate font-mono text-small text-text-secondary">
                  {shareUrl}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyText(shareUrl)
                    hub.flash(ok ? 'Link copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
                  }}
                  className="flex-none cursor-pointer rounded-chip border border-line-edge bg-transparent px-[9px] py-[5px] text-small leading-none font-medium text-text-tertiary transition-colors hover:border-line-accent hover:text-lumera-green"
                >
                  Copy link
                </button>
              </div>
            </div>
          ) : (
            <div className="px-16">{infoPanel}</div>
          )}
        </div>
      </div>
    </Card>
  )
}
