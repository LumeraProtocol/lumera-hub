// apps/web/src/app/snag/page.tsx
'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Helmet } from 'react-helmet-async'

import * as instance from '@/utils/api'
import useWalletProof from '@/hooks/useWalletProof'
import { questFlow, questStyle, type SprintGroup, type SprintQuest } from '@/utils/snag-sprint'
import { proofMessage } from '@/utils/wallet-proof-message'
import { SnagScreen, type SnagGroup, type SnagStep } from '@lumera-hub/ui/src/screens/hub/SnagScreen'
import { short, useHub } from '@lumera-hub/ui/src/hub/session'

const POPUP_NAME = 'lumera-snag'
/** Where /snag/connected announces that a sign-in window came back. */
const CHANNEL = 'lumera-snag'
const CHECK_EVERY_MS = 3000
const CHECK_FOR_MS = 45_000
/** A failure SNAG reports this soon after asking is still the previous attempt's. */
const FAILURE_GRACE_MS = 8000

/**
 * A small window over the hub, opened straight away (inside the click, so it is
 * not blocked) and pointed at its page once that is known. X and Discord refuse
 * to be framed, so their sign-in has to run in a window of its own.
 */
const openPopup = () => {
  const w = 480
  const h = 760
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2)
  const popup = window.open('', POPUP_NAME, `popup=yes,width=${w},height=${h},left=${left},top=${top}`)
  if (popup) popup.opener = null
  return popup
}

const watchClose = (popup: Window, onClose: () => void) => {
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
  progress?: { linked: boolean; completed: string[]; pending: string[]; failed?: Record<string, string> }
}

type Work = { phase: 'busy' | 'checking' | 'idle'; since?: number; status?: { tone: 'info' | 'danger'; text: string } }

const errorText = (err: unknown, fallback: string) => {
  const e = err as { message?: string; code?: number }
  if (e?.code === 4001 || /reject|denied|cancel/i.test(e?.message ?? '')) return 'You declined the signature. Nothing was sent.'
  return e?.message || fallback
}

/**
 * Snag: the live SNAG season, read through this app's /api/snag/sprint (which
 * holds the API key). The quests the hub can run itself open in place, step by
 * step, for the reader's connected wallet (see /api/snag/quest); hub-verified
 * quests open their /loyalty pages, and anything else opens the SNAG site in a
 * small window.
 */
export default function Page() {
  const hub = useHub()
  const router = useRouter()
  const { snagWallet, sign } = useWalletProof()
  const [data, setData] = useState<SprintResponse | null>(null)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [work, setWork] = useState<Record<string, Work>>({})
  const [followed, setFollowed] = useState<Record<string, boolean>>({})
  const [returned, setReturned] = useState<Record<string, boolean>>({})

  useEffect(() => {
    document.title = 'Snag - Lumera Hub'
  }, [])

  // Progress follows the connected wallet, else whatever address the hub shows.
  const wallet = snagWallet || hub.address || ''

  // The latest read wins, so a slow earlier one cannot overwrite a newer one.
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

  const setQuestWork = (id: string, next: Work | null) =>
    setWork((all) => {
      const copy = { ...all }
      if (next) copy[id] = next
      else delete copy[id]
      return copy
    })

  const post = useCallback(
    (action: string, questId: string, extra: object = {}) =>
      instance
        .postExternalQuiet('/api/snag/quest', { action, questId, wallet: snagWallet, ...extra })
        .then(({ data: body }: { data: { url?: string } }) => body),
    [snagWallet],
  )

  const startChecking = useCallback(
    (id: string) => {
      setQuestWork(id, { phase: 'checking', since: Date.now(), status: { tone: 'info', text: 'Checking with Snag…' } })
      load(true)
    },
    [load],
  )

  const verify = useCallback(
    (id: string) => {
      if (!snagWallet) return
      setQuestWork(id, { phase: 'busy' })
      post('verify', id)
        .then(() => startChecking(id))
        .catch((err) =>
          setQuestWork(id, {
            phase: 'idle',
            status: { tone: 'danger', text: errorText(err, 'Snag could not be reached. Try again.') },
          }),
        )
    },
    [post, snagWallet, startChecking],
  )

  const connect = useCallback(
    (id: string) => {
      if (!snagWallet) return
      const popup = openPopup()
      setQuestWork(id, { phase: 'busy' })
      post('connect', id, { popup: Boolean(popup) })
        .then(({ url }) => {
          if (!url) throw new Error('Snag did not return a sign-in link.')
          if (!popup) {
            // Popups blocked: sign in in this tab; /snag/connected brings the reader back.
            window.location.href = url
            return
          }
          popup.location.href = url
          popup.focus()
          setQuestWork(id, {
            phase: 'idle',
            status: { tone: 'info', text: 'Finish signing in in the window that opened.' },
          })
          watchClose(popup, () => load(true))
        })
        .catch((err) => {
          popup?.close()
          setQuestWork(id, {
            phase: 'idle',
            status: { tone: 'danger', text: errorText(err, 'Could not start the sign-in. Try again.') },
          })
        })
    },
    [load, post, snagWallet],
  )

  const follow = useCallback((id: string, url: string) => {
    const popup = openPopup()
    if (popup) popup.location.href = url
    else window.open(url, '_blank', 'noopener,noreferrer')
    setFollowed((all) => ({ ...all, [id]: true }))
  }, [])

  const link = useCallback(
    (id: string) => {
      if (!snagWallet) return
      setQuestWork(id, { phase: 'busy' })
      const message = proofMessage(snagWallet, new Date().toISOString())
      sign(message)
        .then((proof) => post('link', id, { message, ...proof }))
        .then(() => startChecking(id))
        .catch((err) =>
          setQuestWork(id, {
            phase: 'idle',
            status: { tone: 'danger', text: errorText(err, 'Could not link the wallet. Try again.') },
          }),
        )
    },
    [post, sign, snagWallet, startChecking],
  )

  // A sign-in window came back (announced by /snag/connected): have SNAG confirm it.
  const onReturned = useCallback(
    (id: string) => {
      setReturned((all) => ({ ...all, [id]: true }))
      setOpenId(id)
      verify(id)
    },
    [verify],
  )
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (event) => {
      if (event.data?.type === 'snag-returned' && event.data.quest) onReturned(String(event.data.quest))
    }
    return () => channel.close()
  }, [onReturned])

  // …or came back in this tab, when popups were blocked.
  const handledReturn = useRef(false)
  useEffect(() => {
    if (handledReturn.current || !snagWallet) return
    const quest = new URLSearchParams(window.location.search).get('returned')
    if (!quest) return
    handledReturn.current = true
    router.replace('/snag')
    onReturned(quest)
  }, [onReturned, router, snagWallet])

  const progress = data?.progress
  const completed = useMemo(() => new Set(progress?.completed ?? []), [progress])
  const pending = useMemo(() => new Set(progress?.pending ?? []), [progress])

  // While SNAG is checking a quest, re-read progress until it settles.
  const checkingIds = Object.keys(work).filter((id) => work[id].phase === 'checking')
  const checkingKey = checkingIds.join(',')
  useEffect(() => {
    if (!checkingKey) return
    const timer = window.setInterval(() => load(true), CHECK_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [checkingKey, load])

  useEffect(() => {
    if (!checkingKey) return
    const now = Date.now()
    for (const id of checkingKey.split(',')) {
      const age = now - (work[id]?.since ?? now)
      const failure = progress?.failed?.[id]
      if (completed.has(id)) {
        setQuestWork(id, null)
        setOpenId((open) => (open === id ? null : open))
      } else if (failure !== undefined && !pending.has(id) && age > FAILURE_GRACE_MS) {
        setQuestWork(id, {
          phase: 'idle',
          status: { tone: 'danger', text: failure || 'Snag could not confirm it. Check the step above and try again.' },
        })
      } else if (age > CHECK_FOR_MS) {
        setQuestWork(id, {
          phase: 'idle',
          status: { tone: 'info', text: 'Snag has not confirmed it yet — it can take a minute. Check again shortly.' },
        })
      }
    }
    // Settles checks on each progress read, not on every change to `work`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, completed, pending, checkingKey])

  const siteUrl = data?.siteUrl || ''
  const allQuests = useMemo(() => (data?.groups ?? []).flatMap((g) => g.quests), [data?.groups])
  const xConnected = allQuests.some((q) => q.type === 'connected_twitter' && completed.has(q.id))

  const walletStep = useCallback(
    (): SnagStep => ({
      title: snagWallet ? 'Wallet connected' : 'Connect your wallet',
      hint: snagWallet ? short(snagWallet, 10, 6) : 'MetaMask or Keplr — the account your points go to.',
      done: Boolean(snagWallet),
      action: { label: 'Connect wallet', onClick: hub.connect },
    }),
    [hub.connect, snagWallet],
  )

  const stepsFor = useCallback(
    (quest: SprintQuest): SnagStep[] | undefined => {
      const flow = questFlow(quest, siteUrl)
      const w = work[quest.id]
      const busy = w?.phase === 'busy'
      const inFlight = w?.phase === 'checking'
      const noWallet = !snagWallet

      if (flow.kind === 'wallet-link') {
        return [
          walletStep(),
          {
            title: 'Sign to link it to Snag',
            hint: 'A signature only — no transaction, no fee.',
            action: { label: 'Sign & link', onClick: () => link(quest.id), busy: busy || inFlight, disabled: noWallet },
          },
        ]
      }
      if (flow.kind === 'connect') {
        const name = flow.provider === 'twitter' ? 'X' : 'Discord'
        return [
          walletStep(),
          {
            title: `Sign in with ${name}`,
            hint: 'Opens a small window and brings you straight back.',
            done: Boolean(returned[quest.id]),
            action: { label: `Connect ${name}`, onClick: () => connect(quest.id), busy, disabled: noWallet, external: true },
          },
          {
            title: 'Snag confirms the connection',
            hint: 'Checked automatically when you come back.',
            action: { label: 'Check', onClick: () => verify(quest.id), busy: inFlight, disabled: noWallet, secondary: true },
          },
        ]
      }
      if (flow.kind === 'follow') {
        return [
          walletStep(),
          {
            title: `Follow @${flow.handle} on X`,
            hint: 'Opens X in a small window.',
            done: Boolean(followed[quest.id]),
            action: { label: 'Follow', onClick: () => follow(quest.id, flow.url), disabled: noWallet, external: true },
          },
          {
            title: 'Verify the follow',
            hint: xConnected
              ? 'Snag checks that your connected X account follows it.'
              : 'Needs your X account connected to Snag — do “Connect Twitter/X” first.',
            action: { label: 'Verify', onClick: () => verify(quest.id), busy: busy || inFlight, disabled: noWallet },
          },
        ]
      }
      return undefined
    },
    [connect, follow, followed, link, returned, siteUrl, snagWallet, verify, walletStep, work, xConnected],
  )

  const openSnag = useCallback(
    (url: string) => {
      const popup = openPopup()
      if (!popup) {
        window.open(url, '_blank', 'noopener,noreferrer')
        return
      }
      popup.location.href = url
      watchClose(popup, () => load(true))
    },
    [load],
  )

  const groups: SnagGroup[] = useMemo(
    () =>
      (data?.groups ?? []).map((group) => ({
        id: group.id,
        label: group.name,
        subtitle: group.subtitle,
        quests: group.quests.map((quest) => {
          const style = questStyle(quest)
          const flow = questFlow(quest, siteUrl)
          const steps = stepsFor(quest)
          return {
            id: quest.id,
            platform: style.platform,
            kicker: style.kicker,
            ctaLabel: style.cta,
            title: quest.name,
            note: quest.description,
            points: quest.points,
            completed: completed.has(quest.id),
            pending: pending.has(quest.id),
            steps,
            open: openId === quest.id,
            onToggle: steps ? () => setOpenId((open) => (open === quest.id ? null : quest.id)) : undefined,
            status: work[quest.id]?.status ?? null,
            external: flow.kind === 'snag',
            onStart:
              flow.kind === 'hub'
                ? () =>
                    hub.gate({ title: quest.name, line: 'Quests are credited to your address' }, () =>
                      router.push(flow.path),
                    )
                : flow.kind === 'snag' && flow.url
                  ? () => openSnag(flow.url)
                  : undefined,
          }
        }),
      })),
    [completed, data?.groups, hub, openId, openSnag, pending, router, siteUrl, stepsFor, work],
  )

  const total = groups.reduce((n, g) => n + g.quests.length, 0)
  const done = groups.reduce((n, g) => n + g.quests.filter((q) => q.completed).length, 0)
  const summary = progress?.linked && total ? `${done} of ${total} quests completed this Sprint.` : null

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
        groups={groups}
        siteUrl={siteUrl || undefined}
        onOpenSite={siteUrl ? () => openSnag(siteUrl) : undefined}
      />
    </>
  )
}
