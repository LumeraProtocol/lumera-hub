// apps/web/src/app/foundry/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'

import * as instance from '@/utils/api'
import { FoundryScreen, type Quest } from '@lumera-hub/ui/src/screens/hub/FoundryScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'

type LoyaltyRule = {
  id?: string
  loyaltyRuleId?: string
  name?: string
  description?: string
  amount?: number | string
  type?: string
  endTime?: string
}

/**
 * Foundry reads the season from this app's SNAG-backed routes. Those need a
 * database and SNAG credentials; where they are absent the screen says so
 * rather than inventing a season, so nobody chases a quest that does not exist.
 */
export default function Page() {
  const hub = useHub()
  const [rules, setRules] = useState<LoyaltyRule[]>([])
  const [available, setAvailable] = useState(true)
  const [reason, setReason] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Foundry - Lumera Hub'
  }, [])

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      try {
        const { data } = await instance.getExternalQuiet('/api/snag/get-loyalty-rules?limit=50')
        if (cancelled) return
        const list: LoyaltyRule[] = data?.loyaltyRules || data?.items || []
        setRules(Array.isArray(list) ? list : [])
        setAvailable(true)
      } catch {
        if (cancelled) return
        setAvailable(false)
        setReason(
          'The quest service is not reachable from this deployment, so no season data can be shown. Everything else in the hub is unaffected.',
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

  const quests: Quest[] = useMemo(
    () =>
      rules.map((r, i) => ({
        id: String(r.loyaltyRuleId || r.id || i),
        title: r.name || 'Untitled quest',
        type: r.type || 'Quest',
        points: Number(r.amount) || 0,
        verify: 'Verified by SNAG',
        note: r.description || undefined,
        state: 'Available' as const,
        progress: 0,
        of: 1,
        onStart: hub.gated
          ? () =>
              hub.gate(
                { title: r.name || 'Start quest', line: 'Quests are credited to your address' },
                () => undefined,
              )
          : undefined,
      })),
    [hub, rules],
  )

  return (
    <>
      <Helmet>
        <title>Foundry - Lumera Hub</title>
      </Helmet>
      <FoundryScreen
        loading={loading}
        available={available}
        unavailableReason={reason}
        quests={quests}
        seasonLabel={null}
        seasonEnds={null}
        pointsIssued={null}
        participants={null}
        yourPoints={null}
        yourTier={null}
        yourRank={null}
        tierProgress={null}
        conversionRate={null}
      />
    </>
  )
}
