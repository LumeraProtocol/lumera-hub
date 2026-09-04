'use client'

/*
 * Governance.
 *
 * Reading is open to everyone — the proposal list, tallies, quorum and
 * thresholds all render without a wallet, because they are public. Only
 * casting a vote is gated, and the gate explains which proposal it will return
 * you to.
 *
 * Each card carries the tally as a bar plus the quorum figure, so a reader can
 * tell "winning but short of quorum" from "winning and counted" without
 * opening the proposal — a distinction the old list did not make.
 */

import React from 'react'
import {
  Badge,
  Bar,
  Button,
  Card,
  DotLabel,
  EmptyState,
  Label,
  PageTitle,
  SegmentBar,
  Segmented,
  Skeleton,
  StatStrip,
  Well,
  cx,
} from '../../design/primitives'
import { ArrowLeft } from '../../design/icons'
import { useHub } from '../../hub/session'

export type ProposalStatus = 'Voting' | 'Deposit' | 'Passed' | 'Rejected' | 'Failed'

export type ProposalSummary = {
  id: string
  numericId: string
  status: ProposalStatus
  kind: string
  title: string
  summary: string
  clock: string
  yes: number
  no: number
  abstain: number
  veto: number
  /** Turnout as a share of bonded stake, 0–100. */
  quorum: number
  /** From the chain's tally params. Null when it did not load. */
  quorumNeeded: number | null
  depositProgress?: { have: string; need: string; pct: number }
  onOpen: () => void
}

const statusTone: Record<ProposalStatus, 'green' | 'warn' | 'muted' | 'danger'> = {
  Voting: 'green',
  Deposit: 'warn',
  Passed: 'muted',
  Rejected: 'danger',
  Failed: 'danger',
}

export function GovernanceListScreen({
  loading,
  proposals,
  filter,
  onFilterChange,
  counts,
  votingWeight,
  turnout,
  treasury,
  onNewProposal,
}: {
  loading?: boolean
  proposals: ProposalSummary[]
  filter: string
  onFilterChange: (f: string) => void
  counts: Record<string, number>
  votingWeight: string
  turnout: string
  treasury: string
  onNewProposal: () => void
}) {
  const hub = useHub()

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title="Governance"
        subtitle="Lumera Improvement Proposals. Reading is open to everyone; voting needs bonded stake."
        actions={
          <Button variant="primary" locked={hub.gated} onClick={onNewProposal}>
            New proposal
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: 'OPEN FOR VOTING', value: String(counts.voting ?? 0), tone: 'green' },
          { label: 'TURNOUT · LATEST', value: turnout },
          { label: 'COMMUNITY POOL', value: treasury },
          {
            label: 'YOUR VOTING WEIGHT',
            value: votingWeight,
            tone: hub.hasPosition ? 'green' : 'muted',
          },
        ]}
      />

      <Segmented
        value={filter}
        onChange={onFilterChange}
        options={[
          { key: 'all', label: `All ${counts.all ?? 0}` },
          { key: 'voting', label: `Voting ${counts.voting ?? 0}` },
          { key: 'deposit', label: `Deposit ${counts.deposit ?? 0}` },
          { key: 'passed', label: `Passed ${counts.passed ?? 0}` },
          { key: 'rejected', label: `Rejected ${counts.rejected ?? 0}` },
        ]}
      />

      <div className="flex flex-col gap-3.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-[18px]">
              <Skeleton className="mb-3 h-3 w-40" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))
        ) : proposals.length ? (
          proposals.map((p) => (
            <Card
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={p.onOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  p.onOpen()
                }
              }}
              className="cursor-pointer transition-colors hover:border-line-accent"
            >
              <div className="flex flex-col gap-3.5 px-[18px] py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{p.id}</Badge>
                  <Badge tone={statusTone[p.status]}>{p.status.toUpperCase()}</Badge>
                  <span className="text-small text-text-tertiary">{p.kind}</span>
                  <span
                    className={cx(
                      'ml-auto text-small font-medium',
                      p.status === 'Voting' ? 'text-warn' : 'text-text-muted',
                    )}
                  >
                    {p.clock}
                  </span>
                </div>

                <div>
                  <h3 className="m-0 mb-1.5 text-lg leading-[1.35] font-semibold text-text-primary text-pretty">
                    {p.title}
                  </h3>
                  <p className="m-0 line-clamp-2 text-base leading-[1.55] text-text-muted text-pretty">
                    {p.summary}
                  </p>
                </div>

                {p.status === 'Deposit' && p.depositProgress ? (
                  <div className="flex flex-col gap-2">
                    <Bar pct={p.depositProgress.pct} tone="warn" />
                    <div className="flex items-baseline justify-between text-small">
                      <span className="text-text-muted">Deposit</span>
                      <span className="font-mono tnum text-text-secondary">
                        {p.depositProgress.have} / {p.depositProgress.need}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SegmentBar
                      segments={[
                        {
                          width: `${p.yes}%`,
                          className:
                            'bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))]',
                          title: `Yes ${p.yes.toFixed(1)}%`,
                        },
                        { width: `${p.no}%`, className: 'bg-danger', title: `No ${p.no.toFixed(1)}%` },
                        {
                          width: `${p.abstain}%`,
                          className: 'bg-neutral-bar',
                          title: `Abstain ${p.abstain.toFixed(1)}%`,
                        },
                        {
                          width: `${p.veto}%`,
                          className: 'bg-danger-deep',
                          title: `Veto ${p.veto.toFixed(1)}%`,
                        },
                      ]}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-small">
                      <span className="flex gap-3.5">
                        <span className="text-lumera-green">Yes {p.yes.toFixed(1)}%</span>
                        <span className="text-danger">No {p.no.toFixed(1)}%</span>
                      </span>
                      <span className="font-mono tnum text-text-muted">
                        Quorum {p.quorum.toFixed(1)}%
                        {p.quorumNeeded != null ? ` / ${p.quorumNeeded.toFixed(1)}%` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-[18px]">
            <EmptyState
              title={`No ${filter === 'all' ? '' : filter} proposals`}
              body={
                filter === 'all'
                  ? 'Nothing has been submitted to this chain yet.'
                  : 'Try another status filter.'
              }
              action={
                filter !== 'all' ? (
                  <Button variant="outline" size="sm" onClick={() => onFilterChange('all')}>
                    Show all
                  </Button>
                ) : undefined
              }
            />
          </Card>
        )}
      </div>
    </div>
  )
}

export type ProposalDetail = ProposalSummary & {
  description: string
  totalVoted: string
  /** From the chain's tally params. Null when it did not load. */
  thresholdNeeded: number | null
  vetoThreshold: number | null
  votingPeriod: string | null
  timeline: Array<{ label: string; when: string; state: 'done' | 'pending' | 'failed' }>
  tally: Array<{ label: string; pct: number; amount: string; className: string }>
}

export function GovernanceDetailScreen({
  loading,
  proposal,
  onBack,
  onVote,
}: {
  loading?: boolean
  proposal: ProposalDetail | null
  onBack: () => void
  onVote: () => void
}) {
  const hub = useHub()

  if (loading || !proposal) {
    return (
      <div className="flex flex-col gap-[18px]">
        <Skeleton className="h-4 w-32" />
        <Card className="p-[18px]">
          <Skeleton className="mb-3 h-6 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </Card>
      </div>
    )
  }

  const isLive = proposal.status === 'Voting'
  // A threshold the chain did not report is unknown, not met.
  const quorumMet = proposal.quorumNeeded != null && proposal.quorum >= proposal.quorumNeeded
  const aboveThreshold =
    proposal.thresholdNeeded != null && proposal.yes > proposal.thresholdNeeded
  const vetoed = proposal.vetoThreshold != null && proposal.veto > proposal.vetoThreshold

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-2 self-start border-none bg-transparent p-0 text-small font-medium text-text-muted hover:text-lumera-green"
      >
        <ArrowLeft size={14} />
        All proposals
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{proposal.id}</Badge>
        <Badge tone={statusTone[proposal.status]}>{proposal.status.toUpperCase()}</Badge>
        <span className="text-small text-text-tertiary">{proposal.kind}</span>
        {isLive ? <DotLabel tone="warn">{proposal.clock}</DotLabel> : null}
      </div>

      <h1 className="m-0 max-w-[820px] text-title leading-[1.2] font-semibold tracking-[-0.02em] text-text-primary text-pretty">
        {proposal.title}
      </h1>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="flex flex-col gap-3.5">
          <Card>
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <Label>Summary</Label>
              <p className="m-0 text-base leading-[1.65] text-text-secondary text-pretty">
                {proposal.summary}
              </p>
              {proposal.description ? (
                <p className="m-0 text-base leading-[1.65] whitespace-pre-wrap text-text-muted text-pretty">
                  {proposal.description}
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-4 px-[18px] py-4">
              <div className="flex items-baseline justify-between">
                <Label>Tally</Label>
                <span className="font-mono text-small tnum text-text-muted">
                  {proposal.totalVoted} voted
                </span>
              </div>
              <SegmentBar
                height={10}
                segments={proposal.tally.map((t) => ({
                  width: `${t.pct}%`,
                  className: t.className,
                  title: `${t.label} ${t.pct.toFixed(1)}%`,
                }))}
              />
              <div className="flex flex-col gap-2">
                {proposal.tally.map((t) => (
                  <div key={t.label} className="flex items-center gap-2.5">
                    <span className={cx('h-2 w-2 flex-none rounded-full', t.className)} />
                    <span className="flex-1 text-small text-text-secondary">{t.label}</span>
                    <span className="font-mono text-small tnum text-text-muted">{t.amount}</span>
                    <span className="w-14 text-right font-mono text-small font-medium tnum text-text-primary">
                      {t.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {proposal.timeline.length ? (
            <Card>
              <div className="flex flex-col gap-0 px-[18px] py-4">
                <Label className="mb-3">Timeline</Label>
                {proposal.timeline.map((s, i) => (
                  <div key={s.label} className="flex gap-3">
                    <div className="flex flex-none flex-col items-center">
                      <span
                        className={cx(
                          'h-2.5 w-2.5 rounded-full border-2',
                          s.state === 'done'
                            ? 'border-lumera-green bg-lumera-green'
                            : s.state === 'failed'
                              ? 'border-danger bg-danger'
                              : 'border-line-edge bg-transparent',
                        )}
                      />
                      {i < proposal.timeline.length - 1 ? (
                        <span className="w-px flex-1 bg-line-edge" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 pb-4">
                      <span
                        className={cx(
                          'text-base font-medium',
                          s.state === 'pending' ? 'text-text-muted' : 'text-text-primary',
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="font-mono text-small text-text-muted">{s.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-3.5 lg:sticky lg:top-[88px]">
          <Card>
            <div className="flex flex-col gap-3.5 px-[18px] py-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-small text-text-muted">Quorum</span>
                  <span className="font-mono text-small font-medium tnum text-text-secondary">
                    {proposal.quorum.toFixed(1)}%
                    {proposal.quorumNeeded != null ? ` of ${proposal.quorumNeeded.toFixed(1)}%` : ''}
                  </span>
                </div>
                <Bar
                  pct={
                    proposal.quorumNeeded
                      ? Math.min(100, (proposal.quorum / proposal.quorumNeeded) * 100)
                      : 0
                  }
                  tone={quorumMet ? 'gradient' : 'warn'}
                  height={7}
                />
                <span className="text-small leading-[1.5] text-text-muted text-pretty">
                  {proposal.quorumNeeded == null
                    ? 'The chain did not report a quorum threshold.'
                    : quorumMet
                      ? isLive
                        ? 'Quorum reached. The tally will be counted.'
                        : 'Quorum was reached, so the tally was counted.'
                      : isLive
                        ? 'Below quorum. If the deadline passes here, the proposal fails regardless of the tally.'
                        : 'Quorum was never reached.'}
                </span>
              </div>

              <div className="h-px bg-line-hairline" />

              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-small text-text-muted">Threshold</span>
                  <span className="font-mono text-small font-medium tnum text-text-secondary">
                    {proposal.yes.toFixed(1)}%
                    {proposal.thresholdNeeded != null
                      ? ` of ${proposal.thresholdNeeded.toFixed(1)}%`
                      : ''}
                  </span>
                </div>
                <Bar
                  pct={
                    proposal.thresholdNeeded
                      ? Math.min(100, (proposal.yes / proposal.thresholdNeeded) * 100)
                      : 0
                  }
                  tone={aboveThreshold ? 'gradient' : 'warn'}
                  height={7}
                />
                <span className="text-small leading-[1.5] text-text-muted text-pretty">
                  {proposal.thresholdNeeded == null
                    ? 'The chain did not report a pass threshold.'
                    : isLive
                      ? aboveThreshold
                        ? 'Above threshold on current votes.'
                        : 'Below the majority needed to pass.'
                      : aboveThreshold
                        ? 'Cleared the majority.'
                        : 'Fell short of the majority.'}
                </span>
              </div>

              {proposal.vetoThreshold != null ? (
                <>
                  <div className="h-px bg-line-hairline" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-small text-text-muted">Veto</span>
                      <span
                        className={cx(
                          'font-mono text-small font-medium tnum',
                          vetoed ? 'text-danger' : 'text-text-secondary',
                        )}
                      >
                        {proposal.veto.toFixed(1)}% of {proposal.vetoThreshold.toFixed(1)}%
                      </span>
                    </div>
                    <Bar
                      pct={Math.min(100, (proposal.veto / proposal.vetoThreshold) * 100)}
                      tone={vetoed ? 'danger' : 'muted'}
                      height={7}
                    />
                    <span className="text-small leading-[1.5] text-text-muted text-pretty">
                      {vetoed
                        ? 'Veto threshold passed. The proposal fails and the deposit is burned.'
                        : 'Below the veto threshold. Reaching it fails the proposal outright and burns the deposit.'}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 px-[18px] py-4">
              <Label>Your voting weight</Label>
              <span
                className={cx(
                  'font-mono text-stat font-semibold tnum',
                  hub.hasPosition ? 'text-lumera-green' : 'text-text-muted',
                )}
              >
                {hub.hasPosition ? 'From bonded stake' : 'None yet'}
              </span>
              <span className="text-small leading-[1.55] text-text-muted text-pretty">
                {hub.isConnected
                  ? 'Weight is your bonded stake when the vote closes, not now. Delegating more before the deadline increases it.'
                  : hub.isWatching
                    ? 'This is the watched address. Connect the wallet that owns it to cast a vote.'
                    : 'Voting weight comes from bonded stake. Delegate first, then vote.'}
              </span>
              <Button
                variant={isLive || proposal.status === 'Deposit' ? 'primary' : 'outline'}
                size="lg"
                full
                locked={hub.gated && (isLive || proposal.status === 'Deposit')}
                disabled={!isLive && proposal.status !== 'Deposit'}
                onClick={onVote}
              >
                {isLive
                  ? hub.isConnected
                    ? 'Cast vote'
                    : 'Connect to vote'
                  : proposal.status === 'Deposit'
                    ? hub.isConnected
                      ? 'Add deposit'
                      : 'Connect to deposit'
                    : `Voting closed · ${proposal.status.toLowerCase()}`}
              </Button>
            </div>
          </Card>

          {proposal.status === 'Deposit' && proposal.depositProgress ? (
            <Well tone="warn" className="flex flex-col gap-2">
              <span className="text-small font-medium text-warn">Deposit period</span>
              <Bar pct={proposal.depositProgress.pct} tone="warn" height={6} />
              <span className="font-mono text-small tnum text-text-secondary">
                {proposal.depositProgress.have} / {proposal.depositProgress.need}
              </span>
              <span className="text-small leading-[1.5] text-text-muted text-pretty">
                Deposits are returned when voting opens. If the period ends short, every deposit is
                burned.
              </span>
            </Well>
          ) : null}
        </div>
      </div>
    </div>
  )
}
