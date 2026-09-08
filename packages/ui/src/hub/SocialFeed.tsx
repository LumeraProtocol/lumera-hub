'use client'

/*
 * Protocol updates from X.
 *
 * The design shows a feed of Lumera posts with their engagement counts, and
 * that is what this renders — the real timeline, in the hub's own type and
 * colour rather than inside X's iframe. Nothing here is authored: the card
 * shows what the account actually posted, or says it could not load them.
 *
 * The posts come from /api/x-feed, which reads the same unauthenticated
 * endpoint X's own embed widget calls. No developer app, no key, no bill.
 * Neither of the obvious routes would have worked: the paid API charges per
 * post returned, and the embed widget no longer renders for logged-out
 * visitors — its iframe stays zero-height, because X walls timelines behind a
 * login now.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardHeader, Skeleton } from '../design/primitives'
import { ExternalIcon } from '../design/icons'

export type XPost = {
  id: string
  text: string
  createdAt: string
  replies: number
  reposts: number
  likes: number
  url: string
}

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

type Mode = 'loading' | 'posts' | 'failed'

export function SocialFeed({
  handle = 'lumera',
  name = 'Lumera',
  avatarSrc,
}: {
  handle?: string
  name?: string
  avatarSrc?: string
}) {
  const [mode, setMode] = useState<Mode>('loading')
  const [posts, setPosts] = useState<XPost[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const res = await fetch('/api/x-feed')
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (cancelled) return
        const items: XPost[] = Array.isArray(json?.posts) ? json.posts : []
        setPosts(items)
        setMode(items.length ? 'posts' : 'failed')
      } catch {
        if (!cancelled) setMode('failed')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

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
                className="group flex flex-col gap-2 border-b border-line-hairline py-[13px] no-underline last:border-b-0"
              >
                <p className="m-0 text-base leading-[1.55] whitespace-pre-line text-text-secondary transition-colors group-hover:text-text-primary text-pretty">
                  {p.text}
                </p>
                <div className="flex flex-wrap items-center gap-4">
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
              The timeline could not be loaded right now.
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
      </div>

      {mode === 'posts' ? (
        <div className="border-t border-line-hairline px-[18px] py-3">
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-small font-medium text-lumera-green no-underline"
          >
            More from @{handle} on X
            <ExternalIcon size={12} />
          </a>
        </div>
      ) : null}
    </Card>
  )
}
