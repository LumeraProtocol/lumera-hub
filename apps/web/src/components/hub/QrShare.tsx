'use client'

/*
 * Share a file as a QR.
 *
 * Pick a file, it uploads to Cascade through /api/cascade/upload (which holds
 * the operator key), and back comes a permanent action id. The card then shows
 * a real QR pointing at the public /d/<id> page — scan it and the file
 * downloads, no wallet or account needed. Storage is handled by the gateway, so
 * this works whether or not a wallet is connected here.
 */

import React from 'react'
import QRCode from 'react-qr-code'

import { CASCADE_API_URL } from '@/contants/network'
import { Card, CardHeader, Notice, cx } from '@lumera-hub/ui/src/design/primitives'
import { copyText, useHub } from '@lumera-hub/ui/src/hub/session'
import { ExternalIcon } from '@lumera-hub/ui/src/design/icons'

type UploadResult = { action_id: string; filename?: string; size_bytes?: number }

const MB = 1024 * 1024
const sizeLabel = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`
}

export function QrShare() {
  const hub = useHub()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [configured, setConfigured] = React.useState<boolean | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<UploadResult | null>(null)

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

  // The share link the QR encodes: this deployment's public retrieval page.
  const shareUrl = result
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/d/${result.action_id}`
    : ''
  const downloadUrl = result ? `${CASCADE_API_URL}/download/${result.action_id}` : ''

  const upload = React.useCallback(async (file: File) => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const body = new FormData()
      body.append('file', file, file.name)
      const res = await fetch('/api/cascade/upload', { method: 'POST', body })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status}).`)
      setResult(json as UploadResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The upload could not be completed.')
    } finally {
      setBusy(false)
    }
  }, [])

  const onPick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void upload(file)
  }

  // Nothing to offer if the gateway key is not configured on this deployment.
  if (configured === false) return null

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
                    Uploading and inscribing…
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
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex-none rounded-[11px] bg-text-primary p-3">
              <QRCode value={shareUrl} size={132} bgColor="#f5f5fa" fgColor="#000c22" level="M" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-base leading-none font-semibold text-text-primary">
                  {result.filename || `Object ${result.action_id}`}
                </span>
                <span className="font-mono text-small leading-none text-text-muted">
                  #{result.action_id}
                  {sizeLabel(result.size_bytes) ? ` · ${sizeLabel(result.size_bytes)}` : ''}
                </span>
              </div>

              <p className="m-0 text-small leading-[1.55] text-text-muted text-pretty">
                Scan the code, or share the link. It opens a page that downloads the file — no wallet
                needed.
              </p>

              <div className="flex items-center gap-2.5 rounded-control border border-line-edge bg-ink-800 px-[13px] py-[9px]">
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
                  Copy
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3.5">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-small leading-none font-medium text-lumera-green"
                >
                  Open the page
                  <ExternalIcon size={12} />
                </a>
                <a
                  href={downloadUrl}
                  className="flex items-center gap-1.5 text-small leading-none font-medium text-text-muted hover:text-text-secondary"
                >
                  Direct download
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
