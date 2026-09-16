'use client'

/*
 * Public "scan to retrieve" landing.
 *
 * This is where a Cascade share QR points. It takes an object's action id from
 * the path, reads the object's on-chain receipt straight from the gateway (a
 * public, key-less, CORS-open read), shows what the chain says about it, and
 * offers the bytes. No wallet, no account, no hub chrome — LayoutWrapper serves
 * this route bare so a scanner lands on the object, not the whole app.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'

import { CASCADE_API_URL, cascadeExplorerBlockUrl } from '@/contants/network'

type Receipt = {
  action_id: string
  state: string
  creator: string
  block_height: number
  chain_id: string
  price?: string
  file_size_kbs?: number
  supernodes?: string[]
  artifact?: { name?: string; content_hash?: string; erasure_symbols?: number }
}

const short = (s: string, head = 10, tail = 6) =>
  !s || s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`

const sizeLabel = (kbs?: number) => {
  if (!kbs || kbs <= 0) return '—'
  if (kbs < 1024) return `${kbs} KB`
  return `${(kbs / 1024).toFixed(kbs < 10240 ? 1 : 0)} MB`
}

export default function ObjectPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id ?? '')

  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'pending' | 'missing' | 'error'>(
    'loading',
  )
  // This page's own link — the value the share QR encodes, so a viewer can hand
  // the object to another device. Set on the client to avoid an SSR mismatch.
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    document.title = `Object ${id} · Lumera Cascade`
    if (typeof window !== 'undefined') setShareUrl(`${window.location.origin}/action_id/${id}`)
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${CASCADE_API_URL}/receipt/${encodeURIComponent(id)}`)
        if (cancelled) return
        if (res.status === 404) return setStatus('missing')
        if (!res.ok) return setStatus('error')
        const data = (await res.json()) as Receipt
        if (cancelled) return
        setReceipt(data)
        // A fresh upload is inscribed but not yet retrievable until DONE.
        setStatus(data.state === 'DONE' ? 'ready' : 'pending')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const downloadUrl = `${CASCADE_API_URL}/download/${encodeURIComponent(id)}`
  const name = receipt?.artifact?.name || `Object ${id}`
  // The object exists (retrievable now, or settling) — only then is there
  // something to scan, so the share QR rides alongside the content.
  const hasObject = status === 'ready' || status === 'pending'

  const qrAside =
    hasObject && shareUrl ? (
      <aside className="lg:sticky lg:top-16">
        <div className="flex flex-col items-center gap-4 rounded-card border border-line-edge bg-ink-700 p-6 text-center">
          <span className="font-mono text-micro leading-none font-medium tracking-[0.1em] text-lumera-green uppercase">
            Share this file
          </span>
          <span className="relative rounded-[10px] bg-text-primary p-3.5">
            {/* Level H (30% error correction) leaves room to punch the Lumera
                mark into the centre and still scan cleanly. */}
            <QRCode value={shareUrl} size={200} bgColor="#f5f5fa" fgColor="#000c22" level="H" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex items-center justify-center rounded-[8px] bg-[#f5f5fa] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/lumera-mark.svg" alt="" className="h-11 w-11" />
              </span>
            </span>
          </span>
          <span className="text-small leading-[1.5] text-text-muted text-pretty">
            Scan to open this file on another device — no wallet or account needed.
          </span>
        </div>
      </aside>
    ) : null

  return (
    <div className="min-h-screen bg-ink-800 px-4 py-10 sm:py-16">
      <div
        className={
          hasObject
            ? 'mx-auto grid w-full max-w-[860px] gap-10 lg:grid-cols-[minmax(0,1fr)_296px] lg:items-start'
            : 'mx-auto w-full max-w-[560px]'
        }
      >
        <div className="min-w-0">
          <div className="mb-8 flex items-center gap-[9px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lumera-mark.svg" alt="Lumera" className="h-[26px] w-auto" />
            <span className="font-mono text-micro leading-none font-semibold tracking-[0.14em] text-text-tertiary uppercase">
              Cascade
            </span>
          </div>

          <span className="mb-2 block font-mono text-micro leading-none font-medium tracking-[0.1em] text-lumera-green uppercase">
            Retrieve from Cascade
          </span>

          {status === 'loading' ? (
          <>
            <div className="mb-3 h-8 w-2/3 animate-pulse rounded-chip bg-ink-600" />
            <div className="h-40 w-full animate-pulse rounded-card bg-ink-700" />
          </>
        ) : status === 'missing' ? (
          <>
            <h1 className="m-0 mb-3 text-title font-semibold tracking-[-0.02em] text-text-primary">
              No object here
            </h1>
            <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
              Nothing is inscribed at <span className="font-mono text-text-tertiary">{id}</span>.
              Check the link, or ask whoever shared it for the current one.
            </p>
          </>
        ) : status === 'error' ? (
          <>
            <h1 className="m-0 mb-3 text-title font-semibold tracking-[-0.02em] text-text-primary">
              Could not reach Cascade
            </h1>
            <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
              The gateway did not answer. It may be a moment&apos;s hiccup — reload to try again.
            </p>
          </>
        ) : (
          <>
            <h1 className="m-0 mb-1.5 text-title font-semibold tracking-[-0.02em] text-text-primary [overflow-wrap:anywhere]">
              {name}
            </h1>
            <p className="m-0 mb-6 text-base leading-[1.6] text-text-muted text-pretty">
              {status === 'pending'
                ? 'This object is still being written to the network. It becomes downloadable once it settles — usually a few seconds. Reload shortly.'
                : 'Stored permanently across the Cascade supernode network. No wallet or account needed to pull it.'}
            </p>

            {status === 'ready' ? (
              <a
                href={downloadUrl}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-control bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))] py-[15px] text-base leading-none font-semibold text-ink-800 no-underline transition-[filter] hover:brightness-110"
              >
                Download {sizeLabel(receipt?.file_size_kbs) !== '—' ? `· ${sizeLabel(receipt?.file_size_kbs)}` : ''}
              </a>
            ) : (
              <div className="mb-6 flex w-full items-center justify-center gap-2.5 rounded-control border border-line-edge bg-ink-700 py-[15px]">
                <span
                  className="h-[7px] w-[7px] flex-none rounded-full bg-warn"
                  style={{ animation: 'lmBlink 1s infinite' }}
                />
                <span className="text-base leading-none font-medium text-warn">
                  Finalizing on chain…
                </span>
              </div>
            )}

            <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
              {[
                { k: 'Content id', v: receipt?.action_id ?? id, mono: true },
                { k: 'Size', v: sizeLabel(receipt?.file_size_kbs) },
                { k: 'Anchored in', v: receipt?.block_height ? `block ${receipt.block_height.toLocaleString('en-US')}` : '—' },
                {
                  k: 'Held by',
                  v: receipt?.supernodes?.length
                    ? `${receipt.supernodes.length} supernode${receipt.supernodes.length === 1 ? '' : 's'}`
                    : '—',
                },
                { k: 'Digest', v: short(receipt?.artifact?.content_hash ?? '—', 12, 6), mono: true },
                { k: 'State', v: receipt?.state ?? '—' },
                { k: 'Chain', v: receipt?.chain_id ?? '—', mono: true },
              ].map((r) => (
                <div
                  key={r.k}
                  className="flex items-baseline justify-between gap-4 border-b border-ink-500 px-[18px] py-[13px] last:border-b-0"
                >
                  <span className="flex-none text-base leading-none text-text-tertiary">{r.k}</span>
                  <span
                    className={
                      'text-right text-base leading-[1.4] font-medium text-text-primary [overflow-wrap:anywhere]' +
                      (r.mono ? ' font-mono' : '')
                    }
                  >
                    {r.v}
                  </span>
                </div>
              ))}
            </div>

            {receipt?.block_height ? (
              <a
                href={cascadeExplorerBlockUrl(receipt.block_height)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-small font-medium text-lumera-green"
              >
                View the transaction on the explorer →
              </a>
            ) : null}
          </>
        )}

          <p className="mt-10 text-small leading-[1.6] text-text-disabled text-pretty">
            Powered by Lumera Cascade.
          </p>
        </div>

        {qrAside}
      </div>
    </div>
  )
}
