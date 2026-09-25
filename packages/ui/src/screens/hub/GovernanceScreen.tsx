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
  Avatar,
  Button,
  EmptyState,
  Label,
  PageTitle,
  Skeleton,
  StatStrip,
  cx,
} from '../../design/primitives'
import { LockIcon } from '../../design/icons'
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
  depositProgress?: { have: string; need: string; pct: number; short?: string }
  onOpen: () => void
}

/** The design's status pills: a coloured label in a hairline border. */
const STATUS_STYLE: Record<ProposalStatus, string> = {
  Voting: 'border-line-edge text-lumera-green',
  Deposit: 'border-warn-edge text-warn',
  Passed: 'border-line-edge text-text-tertiary',
  Rejected: 'border-danger-edge text-danger',
  Failed: 'border-danger-edge text-danger',
}

function StatusPill({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={cx(
        'flex-none rounded-[4px] border px-[7px] py-1 text-small leading-none font-medium whitespace-nowrap',
        STATUS_STYLE[status],
      )}
    >
      {status}
    </span>
  )
}

function IdTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex-none rounded-[4px] border border-line-edge px-1.5 py-1 font-mono text-micro leading-none font-medium tracking-[0.08em] whitespace-nowrap text-text-tertiary">
      {children}
    </span>
  )
}

const GRADIENT = 'linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))'

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
        subtitle="Lumera Improvement Proposals. Reading is open to everyone; voting weight comes from bonded stake."
        actions={
          <button
            type="button"
            onClick={onNewProposal}
            className="flex flex-none cursor-pointer items-center gap-[7px] rounded-control border border-line-edge bg-transparent px-[15px] py-2.5 text-base leading-none font-medium whitespace-nowrap text-text-secondary transition-colors hover:border-line-accent"
          >
            {hub.gated ? <LockIcon size={12} className="flex-none" /> : null}
            New proposal
          </button>
        }
      />

      <StatStrip
        loading={loading}
        items={[
          { label: 'OPEN FOR VOTING', value: String(counts.voting ?? 0) },
          { label: 'TURNOUT · LATEST', value: turnout },
          { label: 'COMMUNITY POOL', value: treasury },
          {
            label: 'YOUR VOTING WEIGHT',
            value: votingWeight,
            tone: hub.hasPosition ? 'green' : 'muted',
          },
        ]}
      />

      <div className="flex flex-wrap gap-[7px]">
        {[
          { key: 'all', label: 'All' },
          { key: 'voting', label: 'Voting' },
          { key: 'deposit', label: 'Deposit' },
          { key: 'passed', label: 'Passed' },
          { key: 'rejected', label: 'Rejected' },
        ].map((f) => {
          const on = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => onFilterChange(f.key)}
              className={cx(
                'cursor-pointer rounded-control border border-line-edge px-[13px] py-2 text-small leading-none font-medium transition-colors',
                on ? 'bg-ink-600 text-text-primary' : 'bg-transparent text-text-muted hover:text-text-secondary',
              )}
            >
              {f.label} {counts[f.key] ?? 0}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-[11px]">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border border-line-edge bg-ink-700 px-5 py-[18px]">
              <Skeleton className="mb-3 h-3 w-40" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : proposals.length ? (
          proposals.map((p) => {
            const deposit = p.status === 'Deposit'
            return (
              <div
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
                className="flex cursor-pointer flex-col gap-4 rounded-card border border-line-edge bg-ink-700 px-5 py-[18px] md:flex-row md:gap-[26px]"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-[9px]">
                    <IdTag>{p.id}</IdTag>
                    <StatusPill status={p.status} />
                    <span className="flex-none text-small leading-none whitespace-nowrap text-text-muted">
                      {p.kind}
                    </span>
                    {p.clock ? (
                      <span
                        className={cx(
                          'ml-1 flex-none text-small leading-none whitespace-nowrap',
                          p.status === 'Voting' ? 'text-warn' : 'text-text-muted',
                        )}
                      >
                        {p.clock}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="m-0 text-[15.5px] leading-[1.35] font-semibold text-text-primary text-pretty">
                    {p.title}
                  </h3>
                  <p className="m-0 line-clamp-2 max-w-[620px] text-base leading-[1.55] text-text-muted text-pretty">
                    {p.summary}
                  </p>
                </div>

                <div className="flex w-full flex-none flex-col justify-center gap-[9px] md:w-[236px]">
                  <div className="flex h-[9px] overflow-hidden rounded-[3px] bg-line-hairline">
                    <div style={{ width: `${p.yes}%`, background: GRADIENT }} />
                    <div style={{ width: `${p.no}%`, background: 'var(--color-danger)' }} />
                    <div
                      style={{ width: `${p.abstain + p.veto}%`, background: 'var(--color-neutral-bar)' }}
                    />
                  </div>
                  <div className="flex justify-between text-small leading-none">
                    <span className="text-lumera-green">Yes {deposit ? '—' : `${p.yes.toFixed(1)}%`}</span>
                    <span className="text-danger">No {deposit ? '—' : `${p.no.toFixed(1)}%`}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-line-hairline pt-1">
                    <span className="text-small leading-none text-text-muted">
                      {deposit ? 'Deposit' : 'Quorum'}
                    </span>
                    <span className="font-mono text-small leading-none font-medium tnum text-text-secondary">
                      {deposit
                        ? p.depositProgress
                          ? `${p.depositProgress.have} / ${p.depositProgress.need}`
                          : '—'
                        : `${p.quorum.toFixed(1)}%${p.quorumNeeded != null ? ` / ${p.quorumNeeded.toFixed(1)}%` : ''}`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-card border border-line-edge bg-ink-700 p-[18px]">
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
          </div>
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
  /** Who has voted, heaviest first. Empty until any vote is recorded. */
  voters: Array<{
    address: string
    name: string
    logo?: string
    /** As cast. A split vote reads "Yes 75%, Abstain 25%", so it is free text. */
    vote: string
    /** Colours the row; a split vote takes its heaviest side. */
    tone: 'yes' | 'no' | 'abstain' | 'veto' | null
    /** Share of bonded stake this voter carries, 0–100. */
    weight: number
    onOpen?: () => void
  }>
}

/** "Silk Nodes" -> "SN", so a validator with no logo still reads as itself. */
const initialsOf = (name: string): string =>
  name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?'

/**
 * A share bar with a marker where the chain's requirement sits, so "how far
 * along" and "how far it needs to go" read off the same line.
 */
function ThresholdBar({
  pct,
  mark,
  fill = GRADIENT,
}: {
  pct: number
  mark: number | null
  fill?: string
}) {
  return (
    <div className="relative mb-2 h-[9px] overflow-hidden rounded-full bg-line-hairline">
      <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: fill }} />
      {mark != null ? (
        <div
          className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-text-primary"
          style={{ left: `${Math.min(100, Math.max(0, mark))}%` }}
        />
      ) : null}
    </div>
  )
}

export function GovernanceDetailScreen({
  loading,
  proposal,
  votingWeight,
  onBack,
  onVote,
}: {
  loading?: boolean
  proposal: ProposalDetail | null
  /** The reader's bonded stake, formatted, or "None yet". */
  votingWeight?: string
  onBack: () => void
  onVote: () => void
}) {
  const hub = useHub()

  if (loading || !proposal) {
    return (
      <div className="flex flex-col gap-[18px]">
        <Skeleton className="h-4 w-32" />
        <div className="rounded-card border border-line-edge bg-ink-700 p-5">
          <Skeleton className="mb-3 h-6 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    )
  }

  const isLive = proposal.status === 'Voting'
  const isDeposit = proposal.status === 'Deposit'
  const hasTally = !isDeposit
  // A threshold the chain did not report is unknown, not met.
  const quorumMet = proposal.quorumNeeded != null && proposal.quorum >= proposal.quorumNeeded
  const aboveThreshold =
    proposal.thresholdNeeded != null && proposal.yes > proposal.thresholdNeeded
  const vetoed = proposal.vetoThreshold != null && proposal.veto > proposal.vetoThreshold

  const paragraphs = [proposal.summary, proposal.description]
    .filter(Boolean)
    .flatMap((text) => text.split(/\n\s*\n/))
    .map((text) => text.trim())
    .filter(Boolean)

  const weighted = hub.hasPosition && !!votingWeight && votingWeight !== 'None yet'

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-[7px] self-start border-none bg-transparent p-0 text-base leading-none font-medium text-text-muted transition-colors hover:text-lumera-green"
      >
        ← All proposals
      </button>

      <div className="flex flex-col gap-[11px]">
        <div className="flex flex-wrap items-center gap-[9px]">
          <IdTag>{proposal.id}</IdTag>
          <StatusPill status={proposal.status} />
          <span className="text-small leading-none text-text-muted">{proposal.kind}</span>
          {isLive || isDeposit ? (
            <span className="ml-1 text-small leading-none text-warn">{proposal.clock}</span>
          ) : null}
        </div>
        <h1 className="m-0 max-w-[760px] text-title leading-[1.25] font-semibold tracking-[-0.02em] text-text-primary text-pretty">
          {proposal.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-card border border-line-edge bg-ink-700 p-5">
            <h3 className="m-0 mb-3 text-base leading-none font-semibold text-text-primary">Summary</h3>
            {paragraphs.map((text, i) => (
              <p
                key={i}
                className={cx(
                  'm-0 text-base leading-[1.7] whitespace-pre-line text-text-secondary text-pretty [overflow-wrap:anywhere]',
                  i < paragraphs.length - 1 && 'mb-[13px]',
                )}
              >
                {text}
              </p>
            ))}
          </div>

          {proposal.depositProgress ? (
            <div className="rounded-card border border-line-edge bg-ink-700 p-5">
              <div className="mb-3.5 flex items-baseline justify-between gap-3">
                <h3 className="m-0 text-base leading-none font-semibold text-text-primary">
                  Deposit progress
                </h3>
                {proposal.depositProgress.short ? (
                  <span className="text-small leading-none text-warn">
                    {proposal.depositProgress.short}
                  </span>
                ) : null}
              </div>
              <div className="mb-3 flex flex-wrap items-baseline gap-[9px]">
                <span className="font-mono text-[26px] leading-none font-semibold tnum text-text-primary">
                  {proposal.depositProgress.have}
                </span>
                <span className="font-mono text-base leading-none text-text-muted">
                  of {proposal.depositProgress.need}
                </span>
              </div>
              <div className="mb-3 h-3 overflow-hidden rounded-full bg-line-hairline">
                <div
                  className="h-full"
                  style={{ width: `${proposal.depositProgress.pct}%`, background: GRADIENT }}
                />
              </div>
              <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
                A proposal only reaches a vote once the minimum deposit is met. Anyone may
                contribute, and deposits are returned unless the proposal is vetoed.
              </p>
            </div>
          ) : null}

          {hasTally ? (
            <div className="rounded-card border border-line-edge bg-ink-700 p-5">
              <div className="mb-3.5 flex items-baseline justify-between gap-3">
                <h3 className="m-0 text-base leading-none font-semibold text-text-primary">Tally</h3>
                <span className="text-small leading-none text-text-muted">
                  {proposal.totalVoted} voted
                </span>
              </div>
              <div className="mb-4 flex h-3 overflow-hidden rounded-[3px] bg-line-hairline">
                {proposal.tally.map((t) => (
                  <div
                    key={t.label}
                    className={t.className}
                    style={{ width: `${t.pct}%` }}
                    title={`${t.label} ${t.pct.toFixed(1)}%`}
                  />
                ))}
              </div>
              {proposal.tally.map((t) => (
                <div
                  key={t.label}
                  className="grid grid-cols-[20px_1fr_90px_74px] items-center gap-3 border-b border-line-hairline py-[9px]"
                >
                  <span className={cx('h-[9px] w-[9px] rounded-full', t.className)} />
                  <span className="text-base leading-none font-medium text-text-primary">{t.label}</span>
                  <span className="text-right font-mono text-base leading-none tnum text-text-muted">
                    {t.amount}
                  </span>
                  <span className="text-right font-mono text-base leading-none font-medium tnum text-text-secondary">
                    {t.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {hasTally && proposal.voters.length ? (
            <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
              <div className="flex items-center justify-between gap-3 border-b border-line-hairline px-[18px] py-[15px]">
                <h3 className="m-0 text-base leading-none font-semibold text-text-primary">Voters</h3>
                <span className="text-small leading-none text-text-muted">
                  Top {proposal.voters.length} validators by weight
                </span>
              </div>
              {proposal.voters.map((v) => (
                <div
                  key={v.address}
                  onClick={v.onOpen}
                  role={v.onOpen ? 'button' : undefined}
                  tabIndex={v.onOpen ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (v.onOpen && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      v.onOpen()
                    }
                  }}
                  className={cx(
                    'grid grid-cols-[minmax(0,1fr)_110px_110px] items-center gap-3 border-b border-line-hairline px-[18px] py-3',
                    v.onOpen && 'cursor-pointer transition-colors hover:bg-ink-600',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-[11px]">
                    <Avatar src={v.logo} initials={initialsOf(v.name)} alt="" size={26} rounded={6} />
                    <span className="truncate text-base leading-none font-medium text-text-primary">
                      {v.name}
                    </span>
                  </div>
                  <span
                    className={cx(
                      'truncate text-right text-small leading-none font-medium',
                      v.tone === 'yes'
                        ? 'text-lumera-green'
                        : v.tone === 'no'
                          ? 'text-danger'
                          : v.tone === 'veto'
                            ? 'text-warn'
                            : 'text-text-muted',
                    )}
                    title={v.vote}
                  >
                    {v.vote}
                  </span>
                  <span className="text-right font-mono text-base leading-none tnum text-text-muted">
                    {v.weight.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3.5 lg:sticky lg:top-[88px]">
          {hasTally ? (
            <div className="rounded-card border border-line-edge bg-ink-700 p-[18px]">
              <div className="mb-[9px] flex items-baseline justify-between gap-3">
                <Label>Quorum</Label>
                <span className="font-mono text-base leading-none font-medium tnum text-text-secondary">
                  {proposal.quorum.toFixed(1)}%
                  {proposal.quorumNeeded != null ? ` of ${proposal.quorumNeeded.toFixed(1)}%` : ''}
                </span>
              </div>
              <ThresholdBar pct={proposal.quorum} mark={proposal.quorumNeeded} />
              <p className="m-0 mb-4 text-small leading-[1.5] text-text-muted text-pretty">
                {proposal.quorumNeeded == null
                  ? 'The chain did not report a quorum threshold.'
                  : quorumMet
                    ? isLive
                      ? 'Quorum reached. The tally will be counted.'
                      : 'Quorum was reached, so the tally was counted.'
                    : isLive
                      ? 'Below quorum. If the deadline passes here, the proposal fails regardless of the tally.'
                      : 'Quorum was never reached.'}
              </p>

              <div className="mb-[9px] flex items-baseline justify-between gap-3">
                <Label>Yes threshold</Label>
                <span className="font-mono text-base leading-none font-medium tnum text-text-secondary">
                  {proposal.yes.toFixed(1)}%
                  {proposal.thresholdNeeded != null
                    ? ` of ${proposal.thresholdNeeded.toFixed(1)}%`
                    : ''}
                </span>
              </div>
              <ThresholdBar pct={proposal.yes} mark={proposal.thresholdNeeded} />
              <p className="m-0 text-small leading-[1.5] text-text-muted text-pretty">
                {proposal.thresholdNeeded == null
                  ? 'The chain did not report a pass threshold.'
                  : isLive
                    ? aboveThreshold
                      ? 'Above threshold on current votes.'
                      : 'Below the majority needed to pass.'
                    : aboveThreshold
                      ? 'Cleared the majority.'
                      : 'Fell short of the majority.'}
              </p>

              {proposal.vetoThreshold != null ? (
                <>
                  <div className="mt-4 mb-[9px] flex items-baseline justify-between gap-3">
                    <Label>Veto</Label>
                    <span
                      className={cx(
                        'font-mono text-base leading-none font-medium tnum',
                        vetoed ? 'text-danger' : 'text-text-secondary',
                      )}
                    >
                      {proposal.veto.toFixed(1)}% of {proposal.vetoThreshold.toFixed(1)}%
                    </span>
                  </div>
                  <ThresholdBar
                    pct={proposal.veto}
                    mark={proposal.vetoThreshold}
                    fill={vetoed ? 'var(--color-danger)' : 'var(--color-neutral-bar)'}
                  />
                  <p className="m-0 text-small leading-[1.5] text-text-muted text-pretty">
                    {vetoed
                      ? 'Veto threshold passed. The proposal fails and the deposit is burned.'
                      : 'Below the veto threshold. Reaching it fails the proposal outright and burns the deposit.'}
                  </p>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-[13px] rounded-card border border-line-edge bg-ink-700 p-[18px]">
            <Label>Your voting weight</Label>
            <span
              className={cx(
                'font-mono text-[22px] leading-none font-semibold tnum',
                weighted ? 'text-lumera-green' : 'text-text-muted',
              )}
            >
              {votingWeight ?? (hub.hasPosition ? '—' : 'None yet')}
            </span>
            <p className="m-0 text-small leading-[1.55] text-text-muted text-pretty">
              {hub.isConnected
                ? 'Weight is your bonded stake at the moment the vote closes, not now. Delegating more before the deadline increases it.'
                : hub.isWatching
                  ? 'This is the watched address’s weight. Connect the wallet that owns it to cast a vote.'
                  : 'Voting weight comes from bonded stake. Delegate first, then vote.'}
            </p>
            {isLive || isDeposit ? (
              <Button variant="primary" size="lg" full locked={hub.gated} onClick={onVote}>
                {isLive
                  ? hub.isConnected
                    ? 'Cast vote'
                    : 'Connect to vote'
                  : hub.isConnected
                    ? 'Add deposit'
                    : 'Connect to deposit'}
              </Button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-default rounded-control border-none bg-ink-600 py-[13px] text-base leading-none font-semibold text-text-muted"
              >
                Voting closed · {proposal.status.toLowerCase()}
              </button>
            )}
          </div>

          {proposal.timeline.length ? (
            <div className="rounded-card border border-line-edge bg-ink-700 p-[18px]">
              <h3 className="m-0 mb-3.5 text-base leading-none font-semibold text-text-primary">
                Timeline
              </h3>
              {proposal.timeline.map((s, i) => (
                <div key={s.label} className="flex gap-3">
                  <div className="flex w-2.5 flex-none flex-col items-center">
                    <span
                      className={cx(
                        'mt-[3px] h-[9px] w-[9px] flex-none rounded-full',
                        s.state === 'done'
                          ? 'bg-lumera-green'
                          : s.state === 'failed'
                            ? 'bg-danger'
                            : 'bg-line-edge',
                      )}
                    />
                    <span
                      className={cx(
                        'min-h-[26px] w-px flex-1',
                        i < proposal.timeline.length - 1 ? 'bg-line-edge' : 'bg-transparent',
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-[3px] pb-3.5">
                    <span
                      className={cx(
                        'text-base leading-[1.2] font-medium',
                        s.state === 'pending' ? 'text-text-muted' : 'text-text-primary',
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="font-mono text-small leading-[1.2] text-text-muted">{s.when}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
