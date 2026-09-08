'use client'

/*
 * Protocol updates from X.
 *
 * The design shows a feed of Lumera posts. Those posts have to be real, so
 * nothing here is authored: the card either shows what the account actually
 * posted, or says it could not load them.
 *
 * There are three tiers, because no single source works for everyone:
 *
 *   1. Our own /api/x-feed. Reads the X API server-side, so the bearer token
 *      stays private and ad blockers cannot intercept it, and the posts render
 *      in the hub's own type and colour — which is what the design asks for.
 *      Needs X_BEARER_TOKEN; X's free tier cannot read timelines.
 *   2. X's embed widget. Free and official, but it draws the posts itself in an
 *      iframe, and a good share of visitors run an extension that blocks it.
 *   3. A link to the profile.
 *
 * X's public syndication endpoint is deliberately not used: it now answers 200
 * with an empty body for any token, so anything built on it would be broken.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardHeader, Skeleton } from '../design/primitives'
import { ExternalIcon } from '../design/icons'

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        createTimeline?: (
          source: { sourceType: string; screenName: string },
          target: HTMLElement,
          options?: Record<string, unknown>,
        ) => Promise<HTMLElement | undefined>
      }
    }
  }
}

export type XPost = {
  id: string
  text: string
  createdAt: string
  replies: number
  reposts: number
  likes: number
  url: string
}

const WIDGET_SRC = 'https://platform.twitter.com/widgets.js'
const SCRIPT_TIMEOUT_MS = 6000
/*
 * createTimeline can hang forever rather than rejecting — observed with the
 * script loaded and window.twttr present, the call simply never settled. Every
 * step is therefore raced against a deadline, or the card sits on a skeleton
 * indefinitely.
 */
const RENDER_TIMEOUT_MS = 6000

const withTimeout = <T,>(work: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    work,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('timed out')), ms)),
  ])

let scriptPromise: Promise<void> | null = null

/** Loads X's widget script once per page, whoever asks first. */
const loadWidgets = () =>
  (scriptPromise ??= new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'))
    if (window.twttr?.widgets?.createTimeline) return resolve()

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('blocked')), { once: true })
    if (!existing) {
      script.src = WIDGET_SRC
      script.async = true
      document.head.appendChild(script)
    }
    // A blocked script often hangs rather than firing error, so bound the wait.
    window.setTimeout(() => reject(new Error('timed out')), SCRIPT_TIMEOUT_MS)
  }))

/** "2h", "3d" — matching how the design labels post age. */
const age = (iso: string) => {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return days < 30 ? `${days}d` : `${Math.round(days / 30)}mo`
}

type Mode = 'loading' | 'posts' | 'widget' | 'failed'

export function SocialFeed({
  handle = 'LumeraProtocol',
  name = 'Lumera',
  avatarSrc,
  height = 380,
}: {
  handle?: string
  name?: string
  avatarSrc?: string
  height?: number
}) {
  const slot = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('loading')
  const [posts, setPosts] = useState<XPost[]>([])

  const renderWidget = useCallback(async () => {
    try {
      await loadWidgets()
      if (!slot.current) return false
      // widgets.js sets window.twttr early as a stub, so wait for the function
      // itself rather than for the namespace.
      const create = window.twttr?.widgets?.createTimeline
      if (typeof create !== 'function') return false
      slot.current.innerHTML = ''
      const el = await withTimeout(
        create({ sourceType: 'profile', screenName: handle }, slot.current, {
        // Strip X's own header, footer, borders and background so only the
        // posts land on our card.
          chrome: 'noheader nofooter noborders transparent',
          theme: 'dark',
          height,
          dnt: true,
        }),
        RENDER_TIMEOUT_MS,
      )
      // createTimeline resolves undefined when the widget cannot render, which
      // is a failure even though nothing threw.
      return !!el
    } catch {
      return false
    }
  }, [handle, height])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      // Tier 1: our own route, rendered in the hub's styling.
      try {
        const res = await fetch('/api/x-feed')
        if (res.ok) {
          const json = await res.json()
          if (cancelled) return
          if (Array.isArray(json?.posts) && json.posts.length) {
            setPosts(json.posts)
            setMode('posts')
            return
          }
        }
      } catch {
        // Fall through; the widget may still work.
      }
      if (cancelled) return

      // Tier 2: X's widget.
      const rendered = await renderWidget()
      if (cancelled) return
      setMode(rendered ? 'widget' : 'failed')
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [renderWidget])

  const profileUrl = `https://x.com/${handle}`

  return (
    <Card>
      <CardHeader
        title={
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-control border border-line-edge bg-ink-800">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-mono text-small font-semibold text-lumera-green">L</span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base leading-none font-semibold text-text-primary">{name}</span>
              <span className="font-mono text-small leading-none text-text-muted">@{handle}</span>
            </div>
          </div>
        }
        action={
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-none rounded-inner border border-line-edge px-3 py-[7px] text-small font-medium text-text-secondary no-underline transition-colors hover:border-line-accent hover:text-lumera-green"
          >
            Follow
          </a>
        }
      />

      <div className="px-[18px]">
        {mode === 'loading' ? (
          <div className="flex flex-col gap-3 py-4" aria-hidden="true">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : null}

        {mode === 'posts'
          ? posts.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-2 border-b border-line-hairline py-[13px] no-underline last:border-b-0"
              >
                <p className="m-0 text-base leading-[1.55] text-text-secondary text-pretty">
                  {p.text}
                </p>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-small text-text-muted">{age(p.createdAt)}</span>
                  <span className="text-small text-text-muted">
                    {p.reposts.toLocaleString('en-US')} reposts
                  </span>
                  <span className="text-small text-text-muted">
                    {p.likes.toLocaleString('en-US')} likes
                  </span>
                </div>
              </a>
            ))
          : null}

        {mode === 'failed' ? (
          <div className="flex flex-col items-start gap-3 py-5">
            <span className="text-base leading-[1.6] text-text-muted text-pretty">
              The X timeline could not be loaded here — a browser extension or network policy
              usually blocks it.
            </span>
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-base font-medium text-lumera-green"
            >
              Read @{handle} on X
              <ExternalIcon size={13} />
            </a>
          </div>
        ) : null}

        {/* Kept mounted so the widget always has somewhere to render. */}
        <div ref={slot} className={mode === 'widget' ? 'block py-1' : 'hidden'} />
      </div>
    </Card>
  )
}
