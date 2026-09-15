'use client'

/*
 * Share a file as a QR.
 *
 * Pick a file, it uploads to Cascade through /api/cascade/upload (which holds
 * the operator key), and back comes a permanent action id. The result then
 * mirrors the "try it yourself" proof: two QR codes for the object — scan the
 * first to pull the bytes (they resolve in the browser via the public /d/<id>
 * page), scan the second to see it on the chain explorer — beside a panel of
 * what the object's on-chain receipt actually says. Storage is handled by the
 * gateway, so this works whether or not a wallet is connected here.
 */

import React from 'react'
import QRCode from 'react-qr-code'

import { CASCADE_API_URL, NETWORK_PROFILES } from '@/contants/network'
import { Card, CardHeader, Notice, cx } from '@lumera-hub/ui/src/design/primitives'
import { copyText, useHub } from '@lumera-hub/ui/src/hub/session'

type UploadResult = {
  action_id: string
  filename?: string
  size_bytes?: number
  block_height?: number
}
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
const explorerBlockUrl = (chainId: string, block: number) => {
  const profile = Object.values(NETWORK_PROFILES).find((p) => p.chainId === chainId) || testnet
  return `${profile.portalUrl.replace(/\/+$/, '')}/${chainId}/block/${block}`
}

/** One labelled QR that doubles as a click-through on desktop. */
function QrPanel({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-none flex-col items-center gap-2.5 no-underline"
    >
      <span className="rounded-[9px] bg-text-primary p-3 transition-[filter] hover:brightness-95">
        <QRCode value={href} size={128} bgColor="#f5f5fa" fgColor="#000c22" level="M" />
      </span>
      <span className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-base leading-none font-semibold text-text-primary">{label}</span>
        <span className="text-small leading-none text-text-muted">{hint}</span>
      </span>
    </a>
  )
}

export function QrShare() {
  const hub = useHub()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [configured, setConfigured] = React.useState<boolean | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<UploadResult | null>(null)
  const [receipt, setReceipt] = React.useState<Receipt | null>(null)
  const [writtenAt, setWrittenAt] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch('/api/cascade/upload')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setConfigured(Boolean(j?.configured))
      })
      .catch(() => {
        if (!cancelled) setConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const shareUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/d/${result.action_id}`
    : ''
  const block = receipt?.block_height ?? result?.block_height
  const chainId = receipt?.chain_id ?? testnet.chainId
  const explorerUrl = block
    ? explorerBlockUrl(chainId, block)
    : `${testnet.portalUrl.replace(/\/+$/, '')}/${testnet.chainId}`

  /*
   * Once an object exists, read its receipt for the supernode set and digest
   * (a fresh upload is briefly PENDING, so retry a couple of times), and read
   * the block's timestamp for "Written". Both are best-effort — a row simply
   * stays out rather than showing a guess.
   */
  const enrich = React.useCallback((actionId: string, blockHeight?: number) => {
    let cancelled = false
    let tries = 0
    const pull = async () => {
      try {
        const r = await fetch(`${CASCADE_API_URL}/receipt/${actionId}`)
        if (r.ok) {
          const data = (await r.json()) as Receipt
          if (cancelled) return
          setReceipt(data)
          if (data.state !== 'DONE' && tries < 5) {
            tries += 1
            setTimeout(pull, 3000)
          }
        }
      } catch {
        /* leave the panel with what the upload already gave */
      }
    }
    void pull()

    const h = blockHeight
    if (h) {
      fetch(`${testnet.restEndpoint}/cosmos/base/tendermint/v1beta1/blocks/${h}`)
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
    }
    return () => {
      cancelled = true
    }
  }, [])

  const upload = React.useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      setResult(null)
      setReceipt(null)
      setWrittenAt(null)
      try {
        const body = new FormData()
        body.append('file', file, file.name)
        const res = await fetch('/api/cascade/upload', { method: 'POST', body })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status}).`)
        const r = json as UploadResult
        setResult(r)
        enrich(r.action_id, r.block_height)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The upload could not be completed.')
      } finally {
        setBusy(false)
      }
    },
    [enrich],
  )

  const onPick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void upload(file)
  }

  // Nothing to offer if the gateway key is not configured on this deployment.
  if (configured === false) return null

  const rows: Array<{ k: string; v: string }> = result
    ? [
        { k: 'Object', v: `#${result.action_id}` },
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
        { k: 'Size', v: sizeLabel(result.size_bytes ?? (receipt?.file_size_kbs ?? 0) * 1024) },
      ]
    : []

  return (
    <Card>
      <CardHeader
        title="Share a file"
        action={
          result ? (
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setReceipt(null)
                setWrittenAt(null)
                setError(null)
              }}
              className="cursor-pointer border-none bg-transparent p-0 text-small leading-none font-medium text-lumera-green hover:text-lumera-green-bright"
            >
              Share another
            </button>
          ) : null
        }
      />

      <div className="px-[18px] pt-1.5 pb-5">
        {!result ? (
          <>
            <p className="m-0 mb-3.5 text-base leading-[1.6] text-text-muted text-pretty">
              Upload a file and get a QR anyone can scan to download it — no wallet, no account. It
              is stored permanently across the Cascade network.
            </p>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
            <button
              type="button"
              disabled={busy || configured === null}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                onPick(e.dataTransfer.files)
              }}
              className={cx(
                'flex w-full flex-col items-center gap-2 rounded-card border border-dashed px-6 py-8 text-center transition-colors',
                busy
                  ? 'cursor-wait border-line-edge bg-ink-800'
                  : dragging
                    ? 'cursor-copy border-line-accent bg-lumera-teal/10'
                    : 'cursor-pointer border-line-edge bg-ink-800 hover:border-line-accent',
              )}
            >
              {busy ? (
                <>
                  <span
                    className="h-2 w-2 rounded-full bg-lumera-green"
                    style={{ animation: 'lmBlink 1s infinite' }}
                  />
                  <span className="text-base leading-none font-medium text-text-secondary">
                    Uploading...
                  </span>
                  <span className="text-small leading-none text-text-muted">
                    This lands on chain in a few seconds
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base leading-none font-semibold text-text-primary">
                    Drop a file, or click to choose
                  </span>
                  <span className="text-small leading-none text-text-muted">Up to 100 MB</span>
                </>
              )}
            </button>

            {error ? (
              <div className="mt-3.5">
                <Notice tone="danger">{error}</Notice>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="mb-5 flex min-w-0 flex-col gap-1">
              <span className="truncate text-lg leading-[1.3] font-semibold text-text-primary">
                {result.filename || `Object #${result.action_id}`} is live
              </span>
              <span className="text-base leading-[1.55] text-text-muted text-pretty">
                No wallet, no account, no install. Scan to pull it and watch it resolve in the
                browser, or check the same object on the public explorer.
              </span>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap gap-6">
                <QrPanel href={shareUrl} label="Retrieve the object" hint="resolves in the browser" />
                <QrPanel
                  href={explorerUrl}
                  label="View on the explorer"
                  hint="the same object, on chain"
                />
              </div>

              <div className="w-full max-w-[360px] rounded-panel border border-line-accent bg-ink-800 p-[18px]">
                <span className="mb-3 block font-mono text-micro leading-none font-medium tracking-[0.1em] text-lumera-green uppercase">
                  What you see when it resolves
                </span>
                <div className="flex flex-col">
                  {rows.map((r) => (
                    <div
                      key={r.k}
                      className="flex items-baseline justify-between gap-4 border-b border-ink-500 py-2.5 last:border-b-0"
                    >
                      <span className="flex-none text-base leading-none text-text-tertiary">
                        {r.k}
                      </span>
                      <span className="text-right font-mono text-base leading-[1.4] font-medium text-warn [overflow-wrap:anywhere]">
                        {r.v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5 rounded-control border border-line-edge bg-ink-800 px-[13px] py-[9px]">
              <span className="min-w-0 flex-1 truncate font-mono text-small text-text-secondary">
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
          </>
        )}
      </div>
    </Card>
  )
}
