// apps/web/src/app/snag/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'

import * as instance from '@/utils/api'
import {
  SnagScreen,
  type SnagGroup,
  type SnagPlatform,
  type SnagQuest,
} from '@lumera-hub/ui/src/screens/hub/SnagScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'

// Which SNAG sprint's quests to show. SNAG scopes loyalty rules by sprint, so
// the read (and the admin sync that populates them) are keyed on this id. Set
// NEXT_PUBLIC_SNAG_SPRINT_ID to the active sprint; without it the query returns
// nothing, which is why the page reads empty until it is provided.
const SPRINT_ID = process.env.NEXT_PUBLIC_SNAG_SPRINT_ID?.trim() || ''

type LoyaltyRule = {
  id?: string
  loyaltyRuleId?: string
  name?: string
  description?: string
  amount?: number | string
  type?: string
  endTime?: string
  sprintID?: string
}

/**
 * Snag reads the active Sprint's quests from this app's SNAG-backed routes.
 * Those need a database and SNAG credentials; where they are absent the screen
 * says so rather than inventing a Sprint, so nobody chases a quest that does
 * not exist.
 */

/** Which platform a rule connects, inferred from its type and name. */
const platformOf = (rule: LoyaltyRule): SnagPlatform => {
  const hay = `${rule.type ?? ''} ${rule.name ?? ''}`.toLowerCase()
  if (hay.includes('discord')) return 'discord'
  if (
    hay.includes('twitter') ||
    hay.includes('tweet') ||
    hay.includes('follow') ||
    hay.includes('x(') ||
    hay.includes('x (') ||
    /\bx\b/.test(hay)
  ) {
    return 'x'
  }
  if (hay.includes('wallet')) return 'wallet'
  return 'other'
}

const asDate = (value?: string): string | null => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** The four onboarding quests from the design, shown only as a localhost
 * preview of the Sprint layout while SNAG is off. Never rendered in production
 * (see isLocalhost below), so it cannot invent quests for real users. */
const PREVIEW_QUESTS: Omit<SnagQuest, 'onStart'>[] = [
  {
    id: 'preview-wallet',
    platform: 'wallet',
    title: 'Connect wallet to Lumera Hub',
    note: 'Wallet connect — user signs message linking wallet to Hub profile',
    points: 20,
  },
  {
    id: 'preview-x-connect',
    platform: 'x',
    title: 'Connect Twitter/X to Snag profile',
    note: 'Successful connection persisted to Snag',
    points: 15,
  },
  {
    id: 'preview-discord',
    platform: 'discord',
    title: 'Connect Discord to Snag profile',
    points: 15,
  },
  {
    id: 'preview-x-follow',
    platform: 'x',
    title: 'Follow Lumera on X(Twitter)',
    points: 10,
  },
]

export default function Page() {
  const hub = useHub()
  const [rules, setRules] = useState<LoyaltyRule[]>([])
  const [available, setAvailable] = useState(true)
  const [reason, setReason] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    document.title = 'Snag - Lumera Hub'
    setIsLocalhost(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname))
  }, [])

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      try {
        const sprintParam = SPRINT_ID ? `&sprintID=${encodeURIComponent(SPRINT_ID)}` : ''
        const { data } = await instance.getExternalQuiet(
          `/api/snag/get-loyalty-rules?limit=50${sprintParam}`,
        )
        if (cancelled) return
        const list: LoyaltyRule[] = data?.loyaltyRules || data?.items || []
        setRules(Array.isArray(list) ? list : [])
        setAvailable(true)
      } catch {
        if (cancelled) return
        setAvailable(false)
        setReason(
          'The quest service is not reachable from this deployment, so no Sprint data can be shown. Everything else in the hub is unaffected.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void read()
    return () => {
      cancelled = true
    }
  }, [])

  const groups: SnagGroup[] = useMemo(() => {
    const quests: SnagQuest[] = rules.map((r, i) => ({
      id: String(r.loyaltyRuleId || r.id || i),
      platform: platformOf(r),
      title: r.name || 'Untitled quest',
      note: r.description || undefined,
      points: Number(r.amount) || 0,
      // A placeholder until SNAG's connect flow lands next sprint: disconnected,
      // this prompts a wallet connection; connected, it is a no-op. Kept the same
      // in both states so connecting never disables an available quest.
      onStart: () =>
        hub.gate(
          { title: r.name || 'Start quest', line: 'Quests are credited to your address' },
          () => undefined,
        ),
    }))
    if (!quests.length) return []
    // SNAG does not return a section name with the rules, so the Sprint's quests
    // are shown under one Onboarding section for now; richer grouping can follow
    // the section data once SNAG is wired.
    return [{ id: 'onboarding', label: 'Onboarding', quests }]
  }, [hub, rules])

  const sprintEnds = useMemo(() => asDate(rules.find((r) => r.endTime)?.endTime), [rules])

  // On localhost, when SNAG has returned nothing, render the design preview so
  // the Sprint layout is visible without a live quest backend. Deployed builds
  // (any other host) keep the real behaviour: real quests, or an honest notice.
  const showPreview = isLocalhost && !loading && !available && !groups.length
  const previewGroups: SnagGroup[] = useMemo(
    () => [
      {
        id: 'onboarding',
        label: 'Foundation / Onboarding',
        quests: PREVIEW_QUESTS.map((q) => ({
          ...q,
          onStart: () =>
            hub.gate(
              { title: q.title, line: 'Quests are credited to your address' },
              () => undefined,
            ),
        })),
      },
    ],
    [hub],
  )

  return (
    <>
      <Helmet>
        <title>Snag - Lumera Hub</title>
      </Helmet>
      <SnagScreen
        loading={loading}
        available={showPreview ? true : available}
        unavailableReason={reason}
        sprintLabel={showPreview ? 'Preview' : null}
        sprintEnds={sprintEnds}
        groups={showPreview ? previewGroups : groups}
      />
    </>
  )
}
