// apps/web/src/app/governance/page.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Helmet } from 'react-helmet-async'

import useGovernances from '@/hooks/useGovernances'
import useStaking from '@/hooks/useStaking'
import useAccountInfo from '@/hooks/useAccountInfo'
import useStats from '@/hooks/useStats'
import { RATE_VALUE } from '@/contants'
import { formatNumber } from '@/utils/format'
import { getDelegations } from '@/utils/portfolio'
import { toSummary, turnoutPct, tallyShares } from '@/utils/governance-view'
import { GovernanceListScreen } from '@lumera-hub/ui/src/screens/hub/GovernanceScreen'
import { useHub } from '@lumera-hub/ui/src/hub/session'

const compact = (micro: number) => {
  const n = micro / RATE_VALUE
  if (!Number.isFinite(n) || n === 0) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B LUME`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M LUME`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K LUME`
  return `${n.toFixed(0)} LUME`
}

export default function Page() {
  const router = useRouter()
  const hub = useHub()
  const [filter, setFilter] = useState('all')

  const { isLoading, governances, requiredDeposit } = useGovernances()
  const { bondedTokens } = useStaking()
  const { accountInfo } = useAccountInfo(hub.isWatching ? { address: hub.address } : {})
  const { stats } = useStats()

  useEffect(() => {
    document.title = 'Governance - Lumera Hub'
  }, [])

  const bonded = Number(bondedTokens) || 0
  const requiredDepositMicro = Number(requiredDeposit) || 0

  const summaries = useMemo(
    () =>
      (governances || []).map((p) =>
        toSummary(p, bonded, requiredDepositMicro, () => router.push(`/governance/${p.id}`)),
      ),
    [bonded, governances, requiredDepositMicro, router],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: summaries.length,
      voting: 0,
      deposit: 0,
      passed: 0,
      rejected: 0,
    }
    summaries.forEach((s) => {
      const key = s.status.toLowerCase()
      if (key in c) c[key] += 1
    })
    return c
  }, [summaries])

  const shown = useMemo(
    () => (filter === 'all' ? summaries : summaries.filter((s) => s.status.toLowerCase() === filter)),
    [filter, summaries],
  )

  // Turnout on the most recently decided proposal is a more honest headline
  // than an average across proposals with wildly different bonded totals.
  const latestTurnout = useMemo(() => {
    const decided = (governances || []).find((p) =>
      ['PROPOSAL_STATUS_PASSED', 'PROPOSAL_STATUS_REJECTED'].includes(p.status),
    )
    if (!decided || !bonded) return '—'
    return `${turnoutPct(tallyShares(decided).total, bonded).toFixed(1)}%`
  }, [bonded, governances])

  const myStake = getDelegations(accountInfo)

  return (
    <>
      <Helmet>
        <title>Governance - Lumera Hub</title>
      </Helmet>
      <GovernanceListScreen
        loading={isLoading}
        proposals={shown}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        turnout={latestTurnout}
        treasury={compact(Number(stats.communityPool) || 0)}
        votingWeight={
          hub.hasPosition && myStake
            ? `${formatNumber(myStake / RATE_VALUE, { decimalsLength: 0, currency: 'en-US' })} LUME`
            : 'None yet'
        }
        onNewProposal={() =>
          hub.gate(
            {
              title: 'Create a proposal',
              line: requiredDepositMicro
                ? `Submitting requires a ${compact(requiredDepositMicro)} deposit`
                : 'Submitting requires a deposit',
            },
            // The five-step wizard is unchanged for now; gating just makes sure
            // a wallet is present before the reader starts filling it in.
            () => router.push('/governance?compose=1'),
          )
        }
      />
    </>
  )
}
