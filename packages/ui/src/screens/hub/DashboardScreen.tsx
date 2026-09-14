'use client'

/*
 * Dashboard.
 *
 * The previous version showed a single centred "connect your wallet" card to
 * anyone without a wallet, which is most first-time visitors — even though
 * bonded stake, the validator set, block time and every open proposal are
 * public. This screen always has something to say:
 *
 *   disconnected  network figures, the active set, and any live proposal
 *   watching      the watched address's position, read-only
 *   connected     the reader's own position, with actions
 *
 * The four figures at the top swap meaning with the mode rather than blanking
 * out, so the layout never collapses.
 */

import React from 'react'
import {
  Bar,
  Button,
  Card,
  CardAction,
  CardHeader,
  DotLabel,
  EmptyState,
  Badge,
  PageTitle,
  SegmentBar,
  Skeleton,
  StatCard,
  Avatar,
  cx,
} from '../../design/primitives'
import { EyeIcon } from '../../design/icons'
import { SocialFeed } from '../../hub/SocialFeed'
import { LUMERA_ADDRESS, useHub, short } from '../../hub/session'

export type DashboardStat = {
  label: string
  value: string
  delta?: string
  deltaTone?: 'up' | 'down' | 'flat'
  foot?: string
  tone?: 'primary' | 'green'
}

export type AllocationRow = {
  key: string
  name: string
  initials: string
  logo?: string
  /** Right-aligned figure: an amount when it is a delegation, a share otherwise. */
  amount: string
  /** Bar fill, 0–100 as a percentage string. */
  pct: string
  /** The small trailing figure — APR for delegations, commission for the set. */
  side: string
  onMove?: () => void
}

export type ActivityRow = {
  key: string
  kind: string
  detail: string
  amount: string
  when: string
  direction: 'in' | 'out' | 'none'
  onOpen?: () => void
}

export type OpenProposal = {
  id: string
  kind: string
  title: string
  clock: string
  yes: number
  no: number
  abstain: number
  veto: number
  quorum: number
  /** From the chain's tally params. Null when it did not load. */
  quorumNeeded: number | null
  onOpen: () => void
  onVote: () => void
}

/** What a watched address holds, read from the chain. */
export type WatchedTotal = { total: string; sub: string }

export function DashboardScreen({
  loading,
  stats,
  allocationTitle,
  allocationLink,
  allocations,
  onAllocationLink,
  activity,
  proposal,
  onClaim,
  claimLabel,
  onSeeActivity,
  watchedTotals,
}: {
  loading?: boolean
  stats: DashboardStat[]
  allocationTitle: string
  allocationLink: string
  allocations: AllocationRow[]
  onAllocationLink: () => void
  activity: ActivityRow[]
  proposal?: OpenProposal | null
  onClaim: () => void
  claimLabel: string
  onSeeActivity: () => void
  /** Totals for the watched addresses, keyed by address. */
  watchedTotals?: Record<string, WatchedTotal | undefined>
}) {
  const hub = useHub()

  const title = hub.isConnected
    ? 'Your portfolio'
    : hub.isWatching
      ? 'Watched portfolio'
      : 'Lumera network'

  const subtitle = hub.isConnected
    ? 'Positions, rewards and pending actions across the Lumera protocol.'
    : hub.isWatching
      ? 'A read-only view of this address. Signing is disabled until a wallet is connected.'
      : 'The state of the chain right now.'

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title={title}
        subtitle={subtitle}
        subtitleClassName="max-w-[600px]"
        actions={
          /*
           * No Connect wallet here. The header carries one at all times, and a
           * second copy a few centimetres below it competed with the claim
           * action for the same corner. Claim is still gated, so someone
           * without a wallet is prompted to connect by pressing it.
           */
          hub.gated ? (
            <Button variant="outline" locked onClick={onClaim}>
              Claim rewards
            </Button>
          ) : (
            <Button variant="solid" onClick={onClaim}>
              {claimLabel}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-[9px] rounded-panel border border-line-edge bg-ink-700 px-[17px] py-4"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          : stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                delta={s.delta}
                deltaTone={s.deltaTone}
                foot={s.foot}
                tone={s.tone}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <Card>
            <CardHeader
              title={allocationTitle}
              action={<CardAction onClick={onAllocationLink}>{allocationLink}</CardAction>}
            />
            <div className="px-[18px] pt-1.5 pb-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3.5 py-[11px]">
                    <Skeleton className="h-[26px] w-[26px]" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-full" rounded="rounded-full" />
                    </div>
                  </div>
                ))
              ) : allocations.length ? (
                allocations.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center gap-3.5 border-b border-line-hairline py-[11px]"
                  >
                    <Avatar initials={row.initials} src={row.logo} size={26} rounded={6} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-base leading-none font-medium text-text-primary">
                          {row.name}
                        </span>
                        <span className="flex-none font-mono text-small leading-none font-medium tnum text-text-secondary">
                          {row.amount}
                        </span>
                      </div>
                      <Bar pct={row.pct} />
                    </div>
                    <span className="w-[46px] flex-none text-right font-mono text-small leading-none whitespace-nowrap tnum text-text-tertiary">
                      {row.side}
                    </span>
                    {row.onMove ? (
                      <Button variant="outline" size="sm" onClick={row.onMove}>
                        Move
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Nothing delegated yet"
                  body="Staking earns rewards from the next block. Your stake stays yours and can be moved between validators without unbonding."
                  action={
                    <Button variant="accent" size="sm" onClick={onAllocationLink}>
                      Compare validators
                    </Button>
                  }
                />
              )}
            </div>
          </Card>

          {hub.hasPosition ? (
            <Card>
              <CardHeader
                title="Recent activity"
                action={<CardAction onClick={onSeeActivity}>See all</CardAction>}
              />
              <div className="px-[18px] pt-1 pb-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-[13px] py-[11px]">
                      <Skeleton className="h-[26px] w-[26px]" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))
                ) : activity.length ? (
                  activity.map((a) => (
                    <div
                      key={a.key}
                      onClick={a.onOpen}
                      className={cx(
                        'flex items-center gap-[13px] border-b border-line-hairline py-[11px]',
                        a.onOpen && 'cursor-pointer',
                      )}
                    >
                      <div
                        className={cx(
                          'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-chip border border-line-edge bg-ink-600 text-small leading-none font-semibold',
                          a.direction === 'in' ? 'text-lumera-green' : 'text-text-muted',
                        )}
                      >
                        {a.direction === 'in' ? '↓' : a.direction === 'out' ? '↑' : '•'}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="text-base leading-none font-medium text-text-primary">
                          {a.kind}
                        </span>
                        <span className="truncate text-small leading-none text-text-muted">
                          {a.detail}
                        </span>
                      </div>
                      <span className="flex-none font-mono text-small leading-none font-medium tnum text-text-secondary">
                        {a.amount}
                      </span>
                      <span className="w-[52px] flex-none text-right text-small leading-none text-text-muted">
                        {a.when}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No activity yet"
                    body="Transfers, delegations and votes from this address will appear here."
                  />
                )}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-3.5">
          {proposal ? (
            <Card>
              <CardHeader
                title="Open proposal"
                action={<DotLabel tone="warn">{proposal.clock}</DotLabel>}
              />
              <div className="flex flex-col gap-3.5 px-[18px] py-4">
                <div>
                  <div className="mb-[7px] flex items-center gap-2">
                    <Badge>{proposal.id}</Badge>
                    <span className="text-small leading-none text-text-tertiary">{proposal.kind}</span>
                  </div>
                  <p
                    onClick={proposal.onOpen}
                    className="m-0 cursor-pointer text-lg leading-[1.4] font-medium text-text-primary text-pretty hover:text-lumera-green"
                  >
                    {proposal.title}
                  </p>
                </div>

                <div className="flex flex-col gap-[7px]">
                  <SegmentBar
                    segments={[
                      {
                        width: `${proposal.yes}%`,
                        className:
                          'bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))]',
                        title: `Yes ${proposal.yes.toFixed(1)}%`,
                      },
                      { width: `${proposal.no}%`, className: 'bg-danger', title: `No ${proposal.no.toFixed(1)}%` },
                      {
                        width: `${proposal.abstain}%`,
                        className: 'bg-neutral-bar',
                        title: `Abstain ${proposal.abstain.toFixed(1)}%`,
                      },
                      {
                        width: `${proposal.veto}%`,
                        className: 'bg-danger-deep',
                        title: `Veto ${proposal.veto.toFixed(1)}%`,
                      },
                    ]}
                  />
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-small leading-none text-text-muted">
                    <span className="text-lumera-green">Yes {proposal.yes.toFixed(1)}%</span>
                    <span className="text-danger">No {proposal.no.toFixed(1)}%</span>
                    <span>Abstain {proposal.abstain.toFixed(1)}%</span>
                    <span>Veto {proposal.veto.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line-hairline pt-[13px]">
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-small leading-none text-text-tertiary">Quorum</span>
                    <span className="font-mono text-base leading-none font-medium tnum text-text-secondary">
                      {proposal.quorum.toFixed(1)}%{' '}
                      {proposal.quorumNeeded != null ? (
                        <span className="text-text-muted">
                          / {proposal.quorumNeeded.toFixed(1)}% needed
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <Button variant="accent" locked={hub.gated} onClick={proposal.onVote}>
                    {hub.isConnected ? 'Cast vote' : 'Vote'}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <SocialFeed />

          {hub.watched.length ? <WatchedList totals={watchedTotals ?? {}} /> : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Saved addresses, each with what it holds. Opening one switches the hub into
 * read-only mode on it; the row at the foot adds another to the list.
 */
function WatchedList({ totals }: { totals: Record<string, WatchedTotal | undefined> }) {
  const hub = useHub()
  const [value, setValue] = React.useState('')
  const input = value.trim()
  const valid = LUMERA_ADDRESS.test(input)
  const dupe = valid && hub.watched.some((w) => w.address === input)
  const ok = valid && !dupe
  const problem = !input ? '' : !valid ? 'Not a valid Lumera address.' : dupe ? 'Already on your list.' : ''

  const add = () => {
    if (!ok) return
    hub.addWatched(input)
    setValue('')
  }

  return (
    <Card>
      <CardHeader
        title="Watched addresses"
        action={
          <span className="font-mono text-small leading-none text-text-muted">
            {hub.watched.length} {hub.watched.length === 1 ? 'address' : 'addresses'}
          </span>
        }
      />
      {hub.watched.map((w) => {
        const total = totals[w.address]
        return (
          <div
            key={w.address}
            role="button"
            tabIndex={0}
            onClick={() => hub.watch(w.address)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                hub.watch(w.address)
              }
            }}
            className="flex cursor-pointer items-center gap-3.5 border-b border-line-hairline px-[18px] py-3 transition-colors hover:bg-ink-600"
          >
            <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-chip border border-dashed border-line-edge bg-ink-600">
              <EyeIcon size={13} className="text-text-muted" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                className={cx(
                  'text-[13px] leading-none font-medium',
                  w.label ? 'text-text-primary' : 'text-text-muted',
                )}
              >
                {w.label || 'Unlabelled'}
              </span>
              <span className="truncate font-mono text-xs leading-none text-text-muted">
                {w.address.slice(0, 12)}…{w.address.slice(-4)}
              </span>
            </div>
            <div className="flex flex-none flex-col gap-1 text-right">
              <span className="font-mono text-[13px] leading-none font-medium text-text-primary tnum">
                {total?.total ?? '—'}
              </span>
              <span className="text-[11.5px] leading-none text-text-muted">{total?.sub ?? ''}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                hub.removeWatched(w.address)
              }}
              aria-label={`Stop watching ${w.address}`}
              className="flex-none cursor-pointer border-none bg-transparent p-0 text-base leading-none text-text-disabled transition-colors hover:text-danger"
            >
              ×
            </button>
            <span className="flex-none text-base leading-none text-text-muted">›</span>
          </div>
        )
      })}
      <div className="flex items-center gap-[9px] px-[18px] py-[13px]">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder="Add an address to watch…"
          aria-label="Add an address to watch"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-inner border border-line-edge bg-ink-800 px-3 py-2.5 font-mono text-small leading-[normal] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-line-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={!ok}
          className={cx(
            'flex-none rounded-inner border-none px-[15px] py-2.5 text-small leading-none font-semibold transition-colors',
            ok
              ? 'cursor-pointer bg-lumera-green text-ink-800 hover:bg-lumera-green-bright'
              : 'cursor-not-allowed bg-ink-500 text-text-disabled',
          )}
        >
          Watch
        </button>
      </div>
      {problem ? (
        <div className="px-[18px] pb-[13px]">
          <span className="text-small leading-[1.4] text-danger">{problem}</span>
        </div>
      ) : null}
    </Card>
  )
}
