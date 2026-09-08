'use client'

/*
 * Protocol updates.
 *
 * The design shows a feed of Lumera posts. Those posts have to be real, so
 * nothing here is authored: the card shows what Lumera actually published, or
 * says it could not load anything.
 *
 * It is not an X timeline, and that is not for want of trying. Every route to
 * one is now closed:
 *
 *   - The API bills per resource returned. At the refresh rate a live card
 *     wants, that runs to more per month than the flat tier it replaced.
 *   - The embed from X's own publish tool no longer renders. Its script loads
 *     and it builds its iframe, but the iframe stays zero-height indefinitely
 *     — measured out to twenty seconds — because X now walls timelines behind
 *     a login, embeds included.
 *   - The unauthenticated syndication endpoint answers 429 to everyone, and
 *     oEmbed only hands back the same dead embed snippet.
 *
 * So the card reads Lumera's Medium feed instead, which needs no key, has no
 * quota, and returns structured items the hub renders in its own type and
 * colour. The account itself stays linked, since that is where the posts are.
 */

import React, { useEffect, useState } from 'react'
import { Card, CardHeader, Skeleton } from '../design/primitives'
import { ExternalIcon } from '../design/icons'

/** A published article, from the Medium feed. */
export type Update = {
  id: string
  title: string
  url: string
  publishedAt: string
  excerpt: string
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

type Mode = 'loading' | 'updates' | 'failed'

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
  const [updates, setUpdates] = useState<Update[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const res = await fetch('/api/updates')
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (cancelled) return
        const items: Update[] = Array.isArray(json?.updates) ? json.updates : []
        setUpdates(items)
        setMode(items.length ? 'updates' : 'failed')
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

        {mode === 'updates'
          ? updates.map((u) => (
              <a
                key={u.id}
                href={u.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col gap-1.5 border-b border-line-hairline py-[13px] no-underline last:border-b-0"
              >
                <span className="text-base leading-[1.35] font-semibold text-text-primary transition-colors group-hover:text-lumera-green text-pretty">
                  {u.title}
                </span>
                <p className="m-0 line-clamp-2 text-base leading-[1.55] text-text-secondary text-pretty">
                  {u.excerpt}
                </p>
                <span className="font-mono text-small text-text-muted">{age(u.publishedAt)}</span>
              </a>
            ))
          : null}

        {mode === 'failed' ? (
          <div className="flex flex-col items-start gap-3 py-5">
            <span className="text-base leading-[1.6] text-text-muted text-pretty">
              Lumera&rsquo;s updates could not be loaded right now.
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

      {mode === 'updates' ? (
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
