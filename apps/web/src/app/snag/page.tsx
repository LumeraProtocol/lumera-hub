// apps/web/src/app/snag/page.tsx
'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Helmet } from 'react-helmet-async'

import * as instance from '@/utils/api'
import { questStyle, questTarget, type SprintGroup } from '@/utils/snag-sprint'
import { SnagScreen, type SnagGroup } from '@lumera-hub/ui/src/screens/hub/SnagScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'

/*
 * SNAG-native quests are completed on the SNAG site, which cannot be embedded
 * here: its frame-ancestors allow-list does not include this hub, and X's
 * sign-in refuses to be framed anywhere. So instead of sending the reader off
 * in a new tab, the quest opens in a small popup window over the hub, and the
 * reader's progress is re-read the moment it closes. A blocked popup falls back
 * to a tab.
 */
const openInPopup = (url: string, onClose: () => void) => {
  const w = 480
  const h = 760
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2)
  // Open blank first so the opener can be severed while it is still same-origin,
  // keeping a handle to notice when the reader closes it.
  const popup = window.open('', 'lumera-snag', `popup=yes,width=${w},height=${h},left=${left},top=${top}`)
  if (!popup) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  popup.opener = null
  popup.location.href = url
  popup.focus()
  const timer = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(timer)
      onClose()
    }
  }, 700)
}

type SprintResponse = {
  configured?: boolean
  error?: string
  siteUrl?: string
  groups?: SprintGroup[]
  progress?: { linked: boolean; completed: string[]; pending: string[] }
}

/**
 * Snag: the live SNAG season, read through this app's /api/snag/sprint (which
 * holds the API key). Quests the hub verifies open its /loyalty pages; the rest
 * are completed on the SNAG quest site, in a new tab, with the reader's SNAG
 * account. The reader's progress shows once their wallet is linked to that
 * account — MetaMask wallets are the account itself; Keplr wallets link through
 * the "Connect wallet to Lumera Hub" quest.
 */
export default function Page() {
  const hub = useHub()
  const router = useRouter()
  const [data, setData] = useState<SprintResponse | null>(null)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Snag - Lumera Hub'
  }, [])

  // Progress follows whichever address the hub is showing (own or watched).
  const wallet = hub.address || ''

  // The latest read wins, so a refresh after a popup closes cannot be
  // overwritten by an older, slower one.
  const requestId = useRef(0)
  const load = useCallback(
    (quiet = false) => {
      const id = ++requestId.current
      if (!quiet) setLoading(true)
      const query = wallet ? `?wallet=${encodeURIComponent(wallet)}` : ''
      instance
        .getExternalQuiet(`/api/snag/sprint${query}`)
        .then(({ data: body }: { data: SprintResponse }) => {
          if (id !== requestId.current) return
          setData(body)
          setAvailable(Boolean(body?.configured) && !body?.error)
        })
        .catch(() => {
          if (id === requestId.current && !quiet) setAvailable(false)
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false)
        })
    },
    [wallet],
  )

  useEffect(() => {
    load()
  }, [load])

  // Coming back to the hub (e.g. from a SNAG tab) re-reads progress quietly.
  useEffect(() => {
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const siteUrl = data?.siteUrl || ''
  const progress = data?.progress

  const groups: SnagGroup[] = useMemo(() => {
    const completed = new Set(progress?.completed ?? [])
    const pending = new Set(progress?.pending ?? [])
    return (data?.groups ?? []).map((group) => ({
      id: group.id,
      label: group.name,
      subtitle: group.subtitle,
      quests: group.quests.map((quest) => {
        const style = questStyle(quest)
        const target = questTarget(quest, siteUrl)
        return {
          id: quest.id,
          platform: style.platform,
          kicker: style.kicker,
          ctaLabel: style.cta,
          title: quest.name,
          note: quest.description,
          points: quest.points,
          external: target.kind === 'external',
          completed: completed.has(quest.id),
          pending: pending.has(quest.id),
          onStart:
            target.kind === 'hub'
              ? () =>
                  hub.gate({ title: quest.name, line: 'Quests are credited to your address' }, () =>
                    router.push(target.path),
                  )
              : target.url
                ? () => openInPopup(target.url, () => load(true))
                : undefined,
        }
      }),
    }))
  }, [data?.groups, hub, load, progress, router, siteUrl])

  const total = groups.reduce((n, g) => n + g.quests.length, 0)
  const done = groups.reduce((n, g) => n + g.quests.filter((q) => q.completed).length, 0)
  const summary = progress?.linked ? `${done} of ${total} quests completed this Sprint.` : null

  const notice =
    hub.isConnected && progress && !progress.linked && siteUrl ? (
      <>
        To track your progress here, link this wallet to your Snag profile: on{' '}
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-lumera-green underline">
          Snag
        </a>
        , complete “Connect wallet to Lumera Hub”.
      </>
    ) : null

  return (
    <>
      <Helmet>
        <title>Snag - Lumera Hub</title>
      </Helmet>
      <SnagScreen
        loading={loading}
        available={available}
        unavailableReason={
          data?.error
            ? 'Snag could not be reached just now, so the Sprint cannot be shown. Try again in a moment.'
            : undefined
        }
        sprintLabel={null}
        summary={summary}
        notice={notice}
        groups={groups}
        siteUrl={siteUrl || undefined}
        onOpenSite={siteUrl ? () => openInPopup(siteUrl, () => load(true)) : undefined}
      />
    </>
  )
}
