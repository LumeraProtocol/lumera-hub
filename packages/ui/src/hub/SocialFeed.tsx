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
import {
  ExternalIcon,
  HeartIcon,
  ReplyIcon,
  RepostIcon,
  VerifiedIcon,
  XIcon,
} from '../design/icons'

export type XAuthor = {
  name: string
  handle: string
  avatar?: string
  verified: boolean
}

export type XPost = {
  id: string
  author?: XAuthor
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

/** The author's picture, falling back to a monogram if it will not load. */
function AuthorAvatar({ author, size }: { author?: XAuthor; size: number }) {
  const [failed, setFailed] = React.useState(false)
  const src = author?.avatar
  React.useEffect(() => setFailed(false), [src])

  return (
    <span
      className="relative flex flex-none items-center justify-center overflow-hidden rounded-full border border-line-edge bg-ink-800"
      style={{ width: size, height: size }}
    >
      <span className="font-mono text-small font-semibold text-lumera-green">
        {(author?.name ?? 'L').charAt(0).toUpperCase()}
      </span>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  )
}

/** One engagement count. The number is what matters, so the icon stays quiet. */
function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number
  label: string
}) {
  return (
    <span
      className="flex items-center gap-1.5 text-small text-text-muted transition-colors group-hover:text-text-tertiary"
      title={`${value.toLocaleString('en-US')} ${label}`}
    >
      <span className="flex-none text-text-disabled transition-colors group-hover:text-text-muted">
        {icon}
      </span>
      <span className="font-mono tnum">{value.toLocaleString('en-US')}</span>
    </span>
  )
}

type Mode = 'loading' | 'posts' | 'failed'

export function SocialFeed({ handle = 'lumera', name = 'Lumera' }: {
  handle?: string
  name?: string
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

  // Every post carries the same author; take it from the first one so the
  // header shows the real picture and badge rather than a placeholder.
  const author = posts[0]?.author
  const profileUrl = `https://x.com/${author?.handle ?? handle}`

  return (
    <Card>
      <CardHeader
        title={
          <div className="flex min-w-0 items-center gap-2.5">
            <AuthorAvatar author={author} size={38} />
            <div className="flex min-w-0 flex-col gap-[3px]">
              <span className="flex items-center gap-1 text-base leading-none font-semibold text-text-primary">
                <span className="truncate">{author?.name ?? name}</span>
                {author?.verified ? <VerifiedIcon size={14} className="flex-none" /> : null}
              </span>
              <span className="font-mono text-small leading-none text-text-muted">
                @{author?.handle ?? handle}
              </span>
            </div>
          </div>
        }
        action={
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Follow @${author?.handle ?? handle} on X`}
            className="flex flex-none items-center gap-1.5 rounded-full bg-text-primary px-3.5 py-[7px] no-underline transition-opacity hover:opacity-85"
          >
            {/* globals.css colours every anchor green; the label carries its
                own colour so this reads as X's white pill. */}
            <span className="flex items-center gap-1.5 text-small font-semibold text-ink-900">
              <XIcon size={11} />
              Follow
            </span>
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
                className="group -mx-[18px] flex gap-3 border-b border-line-hairline px-[18px] py-3.5 no-underline transition-colors last:border-b-0 hover:bg-ink-800/45"
              >
                <AuthorAvatar author={p.author} size={36} />

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* Name, badge, handle and age on one line, the way X sets it. */}
                  <div className="flex min-w-0 items-center gap-1 text-small leading-none">
                    <span className="truncate font-semibold text-text-primary">
                      {p.author?.name ?? name}
                    </span>
                    {p.author?.verified ? <VerifiedIcon size={13} className="flex-none" /> : null}
                    <span className="truncate font-mono text-text-muted">
                      @{p.author?.handle ?? handle}
                    </span>
                    <span className="flex-none text-text-disabled">·</span>
                    <span className="flex-none font-mono tnum text-text-muted">
                      {age(p.createdAt)}
                    </span>
                  </div>

                  <p className="m-0 line-clamp-4 text-base leading-[1.5] whitespace-pre-line text-text-secondary text-pretty">
                    {p.text}
                  </p>

                  <div className="mt-1 flex items-center gap-6">
                    <Metric icon={<ReplyIcon size={13} />} value={p.replies} label="replies" />
                    <Metric icon={<RepostIcon size={13} />} value={p.reposts} label="reposts" />
                    <Metric icon={<HeartIcon size={13} />} value={p.likes} label="likes" />
                  </div>
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
