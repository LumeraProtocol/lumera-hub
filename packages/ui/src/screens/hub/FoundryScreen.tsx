'use client'

/*
 * Foundry — the quest and rewards season.
 *
 * The quests themselves live in SNAG, reached through this app's own API
 * routes. Those routes need a database and SNAG credentials, so on a
 * deployment without them there is nothing real to show. This screen says that
 * plainly rather than rendering a plausible-looking season: a quest list that
 * is invented is worse than one that is honestly absent, because someone will
 * try to complete it.
 *
 * Everything that does not depend on SNAG — what Foundry is, how points
 * convert, where the rules live — renders either way.
 */

import React from 'react'
import {
  Badge,
  Bar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Label,
  Notice,
  PageTitle,
  Segmented,
  Skeleton,
  StatStrip,
  cx,
} from '../../design/primitives'
import { CheckIcon, ExternalIcon, LockIcon } from '../../design/icons'
import { useHub } from '../../hub/session'

export type Quest = {
  id: string
  title: string
  /** "On-chain", "Social", "Daily" — the grouping SNAG assigns. */
  type: string
  points: number
  /** How the completion is proven. */
  verify: string
  note?: string
  state: 'Completed' | 'In progress' | 'Available'
  progress: number
  of: number
  onStart?: () => void
}

type Tab = 'quests' | 'rewards'

export function FoundryScreen({
  loading,
  available,
  unavailableReason,
  quests,
  seasonLabel,
  seasonEnds,
  pointsIssued,
  participants,
  yourPoints,
  yourTier,
  yourRank,
  tierProgress,
  conversionRate,
  rulesUrl,
}: {
  loading?: boolean
  /** False when the loyalty backend is not reachable from this deployment. */
  available: boolean
  unavailableReason?: string
  quests: Quest[]
  seasonLabel: string | null
  seasonEnds: string | null
  pointsIssued: string | null
  participants: string | null
  yourPoints: string | null
  yourTier: string | null
  yourRank: string | null
  /** Share of the way to the next tier, 0–100. */
  tierProgress: number | null
  conversionRate: string | null
  rulesUrl?: string
}) {
  const hub = useHub()
  const [tab, setTab] = React.useState<Tab>('quests')
  const [group, setGroup] = React.useState<string>('all')

  const groups = React.useMemo(() => {
    const seen = new Set<string>()
    quests.forEach((q) => seen.add(q.type))
    return ['all', ...[...seen].sort()]
  }, [quests])

  const shown = group === 'all' ? quests : quests.filter((q) => q.type === group)

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            Foundry
            {seasonLabel ? <Badge tone="green">{seasonLabel.toUpperCase()}</Badge> : null}
          </span>
        }
        subtitle="Complete quests to earn points, and convert them to LUME when the season closes."
        actions={
          rulesUrl ? (
            <Button
              variant="outline"
              onClick={() => window.open(rulesUrl, '_blank', 'noreferrer')}
            >
              Season rules
              <ExternalIcon size={13} />
            </Button>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          {
            label: hub.hasPosition ? 'YOUR POINTS' : 'POINTS ISSUED',
            value: (hub.hasPosition ? yourPoints : pointsIssued) ?? '—',
            tone: hub.hasPosition ? 'green' : 'primary',
          },
          {
            label: hub.hasPosition ? 'TIER' : 'PARTICIPANTS',
            value: (hub.hasPosition ? yourTier : participants) ?? '—',
          },
          {
            label: hub.hasPosition ? 'RANK' : 'QUESTS LIVE',
            value: (hub.hasPosition ? yourRank : quests.length ? String(quests.length) : null) ?? '—',
          },
          { label: 'SEASON ENDS', value: seasonEnds ?? '—' },
        ]}
      />

      {!available ? (
        <Notice tone="info">
          {unavailableReason ||
            'The quest service is not configured on this deployment, so no season data is available here.'}
        </Notice>
      ) : null}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'quests', label: 'Quests' },
          { key: 'rewards', label: 'Rewards' },
        ]}
      />

      {tab === 'quests' ? (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line-hairline px-[18px] py-[13px]">
            <h3 className="m-0 flex-1 text-base font-semibold whitespace-nowrap text-text-primary">
              Quests {quests.length ? <span className="font-normal text-text-muted">{shown.length}</span> : null}
            </h3>
            {groups.length > 2 ? (
              <Segmented
                value={group}
                onChange={setGroup}
                options={groups.map((g) => ({ key: g, label: g === 'all' ? 'All' : g }))}
              />
            ) : null}
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 border-b border-line-hairline px-[18px] py-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))
          ) : shown.length ? (
            shown.map((q) => (
              <div
                key={q.id}
                className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-4 last:border-b-0 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        q.state === 'Completed'
                          ? 'green'
                          : q.state === 'In progress'
                            ? 'warn'
                            : 'neutral'
                      }
                    >
                      {q.state.toUpperCase()}
                    </Badge>
                    <span className="text-small text-text-tertiary">{q.type}</span>
                  </div>
                  <span className="text-base leading-[1.35] font-medium text-text-primary text-pretty">
                    {q.title}
                  </span>
                  {q.note ? (
                    <span className="text-small leading-[1.5] text-text-muted text-pretty">
                      {q.note}
                    </span>
                  ) : null}
                  {q.of > 1 ? (
                    <div className="flex max-w-[320px] items-center gap-2.5">
                      <Bar pct={(q.progress / q.of) * 100} height={6} className="flex-1" />
                      <span className="flex-none font-mono text-small tnum text-text-muted">
                        {q.progress} of {q.of}
                      </span>
                    </div>
                  ) : null}
                  <span className="text-small text-text-disabled">{q.verify}</span>
                </div>

                <div className="flex flex-none items-center gap-3 sm:flex-col sm:items-end">
                  <span className="font-mono text-base font-semibold tnum text-lumera-green">
                    +{q.points.toLocaleString('en-US')}
                  </span>
                  {q.state === 'Completed' ? (
                    <span className="flex items-center gap-1.5 text-small text-text-muted">
                      <CheckIcon size={12} className="text-lumera-green" />
                      Claimed
                    </span>
                  ) : (
                    <Button
                      variant={hub.gated ? 'outline' : 'accent'}
                      size="sm"
                      onClick={q.onStart}
                      disabled={!q.onStart}
                    >
                      {hub.gated ? <LockIcon size={11} /> : null}
                      {hub.gated ? 'Connect to start' : 'Start'}
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-[18px]">
              <EmptyState
                title={available ? 'No quests in this season yet' : 'Quests unavailable here'}
                body={
                  available
                    ? 'When a season opens, its quests appear here with what each one is worth.'
                    : 'This deployment has no connection to the quest service, so there is nothing to list. The rest of the hub is unaffected.'
                }
              />
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Your tier" />
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <span className="font-mono text-stat-lg font-semibold tnum text-text-primary">
                {hub.hasPosition ? (yourTier ?? '—') : 'Unranked'}
              </span>
              {tierProgress != null ? <Bar pct={tierProgress} height={7} /> : null}
              <span className="text-small leading-[1.55] text-text-muted text-pretty">
                {hub.isConnected
                  ? 'Points accumulate across the season. Tier multipliers reset when it closes; the points themselves do not expire.'
                  : 'Connect a wallet to see your tier and progress.'}
              </span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Conversion" />
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <span className="font-mono text-stat-lg font-semibold tnum text-lumera-green">
                {conversionRate ?? '—'}
              </span>
              <span className="text-small leading-[1.55] text-text-muted text-pretty">
                Conversion opens when the season closes. Until then points are a running total, not
                a balance you can spend.
              </span>
              <Button variant="outline" locked={hub.gated} disabled className="self-start">
                Convert at season close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
