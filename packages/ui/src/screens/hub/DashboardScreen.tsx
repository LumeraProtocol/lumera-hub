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
import { useHub, short } from '../../hub/session'

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

export type FirstRunStep = {
  title: string
  body: string
  cta: string
  onAct: () => void
}

/*
 * What a connected but empty wallet sees instead of a portfolio.
 *
 * Every card on this screen reports a position, so with nothing staked and
 * nothing held they all read as em dashes — technically accurate and no help
 * at all. This replaces them with the three steps that lead to a position, in
 * the order they have to happen: hold LUME, stake it, then use the network.
 */
function FirstRun({ steps }: { steps: FirstRunStep[] }) {
  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-title leading-[1.15] font-semibold tracking-[-0.02em] text-text-primary">
          Welcome to Lumera
        </h1>
        <p className="m-0 text-base leading-[1.5] text-text-muted text-pretty">
          Your wallet is connected and holds nothing yet. Three steps get you to a working
          position.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {steps.map((step, i) => (
          <Card
            key={step.title}
            className={cx(
              'flex flex-col gap-3 p-[18px]',
              // The first step is the one that unblocks the others, so it is
              // the only one that carries the accent.
              i === 0 && 'border-line-accent',
            )}
          >
            <span
              className={cx(
                'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-control font-mono text-base font-semibold',
                i === 0
                  ? 'bg-lumera-teal/[.22] text-lumera-green'
                  : 'bg-ink-600 text-text-tertiary',
              )}
            >
              {i + 1}
            </span>
            <span className="text-base leading-[1.3] font-semibold text-text-primary">
              {step.title}
            </span>
            <p className="m-0 flex-1 text-small leading-[1.6] text-text-muted text-pretty">
              {step.body}
            </p>
            <Button
              variant={i === 0 ? 'accent' : 'outline'}
              onClick={step.onAct}
              className="self-start"
            >
              {step.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

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
  firstRun,
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
  /** Shown in place of the portfolio when a connected wallet is empty. */
  firstRun?: FirstRunStep[]
}) {
  const hub = useHub()

  // Only for a wallet that is actually connected: someone browsing read-only
  // has nothing to onboard into, and watching an empty address is not the same
  // as owning one.
  if (hub.isConnected && !hub.hasPosition && firstRun?.length) {
    return <FirstRun steps={firstRun} />
  }

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
        actions={
          hub.gated ? (
            <>
              <Button variant="outline" locked onClick={onClaim}>
                Claim rewards
              </Button>
              <Button variant="solid" onClick={hub.connect}>
                Connect wallet
              </Button>
            </>
          ) : (
            <Button variant="solid" onClick={onClaim}>
              {claimLabel}
            </Button>
          )
        }
      />

      {hub.isWatching ? (
        <div className="flex items-center gap-3 rounded-panel border border-dashed border-line-edge bg-ink-700 px-4 py-3">
          <EyeIcon size={16} className="flex-none text-text-muted" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base font-medium text-text-primary">
              Watching {short(hub.address)}
            </span>
            <span className="text-small text-text-muted text-pretty">
              Live balances and rewards for this address. Connect the wallet that owns it to act.
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    className="flex items-center gap-3.5 border-b border-line-hairline py-[11px] last:border-b-0"
                  >
                    <Avatar initials={row.initials} src={row.logo} size={26} rounded={6} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-base font-medium text-text-primary">
                          {row.name}
                        </span>
                        <span className="flex-none font-mono text-small font-medium tnum text-text-secondary">
                          {row.amount}
                        </span>
                      </div>
                      <Bar pct={row.pct} />
                    </div>
                    <span className="w-[46px] flex-none text-right font-mono text-small tnum text-text-tertiary">
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
                    <div key={i} className="flex items-center gap-3 py-[11px]">
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
                        'flex items-center gap-3 border-b border-line-hairline py-[11px] last:border-b-0',
                        a.onOpen && 'cursor-pointer',
                      )}
                    >
                      <div
                        className={cx(
                          'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-chip border border-line-edge bg-ink-600 text-small font-semibold',
                          a.direction === 'in' ? 'text-lumera-green' : 'text-text-muted',
                        )}
                      >
                        {a.direction === 'in' ? '↓' : a.direction === 'out' ? '↑' : '•'}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="text-base font-medium text-text-primary">{a.kind}</span>
                        <span className="truncate text-small text-text-muted">{a.detail}</span>
                      </div>
                      <span className="flex-none font-mono text-small font-medium tnum text-text-secondary">
                        {a.amount}
                      </span>
                      <span className="w-[52px] flex-none text-right text-small text-text-muted">
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
                    <span className="text-small text-text-tertiary">{proposal.kind}</span>
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
                  <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-small text-text-muted">
                    <span className="text-lumera-green">Yes {proposal.yes.toFixed(1)}%</span>
                    <span className="text-danger">No {proposal.no.toFixed(1)}%</span>
                    <span>Abstain {proposal.abstain.toFixed(1)}%</span>
                    <span>Veto {proposal.veto.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-line-hairline pt-[13px]">
                  <div className="flex flex-col gap-[3px]">
                    <span className="text-small text-text-tertiary">Quorum</span>
                    <span className="font-mono text-base font-medium tnum text-text-secondary">
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

          {hub.isDisconnected ? (
            <Card>
              <CardHeader title="Browse without connecting" />
              <div className="flex flex-col gap-3 px-[18px] py-4">
                <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
                  Everything on this page is public chain data. Paste any Lumera address to see its
                  balances, delegations and history read-only — no wallet, no signature.
                </p>
                <WatchAddressForm />
              </div>
            </Card>
          ) : null}

          {hub.watched.length ? <WatchedList /> : null}
        </div>
      </div>
    </div>
  )
}

/** Address entry that switches the hub into read-only mode. */
export function WatchAddressForm() {
  const hub = useHub()
  const [value, setValue] = React.useState('')
  const trimmed = value.trim()
  const valid = /^lumera1[a-z0-9]{32,45}$/.test(trimmed)
  const invalid = trimmed.length > 0 && !valid

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) hub.watch(trimmed)
          }}
          placeholder="lumera1…"
          aria-label="Address to watch"
          className={cx(
            'min-w-0 flex-1 rounded-inner border bg-ink-800 px-3 py-2.5 font-mono text-small text-text-primary outline-none placeholder:text-text-disabled',
            invalid ? 'border-danger-edge' : 'border-line-edge focus:border-line-accent',
          )}
        />
        <Button
          variant={valid ? 'solid' : 'outline'}
          disabled={!valid}
          onClick={() => hub.watch(trimmed)}
        >
          Watch
        </Button>
      </div>
      {invalid ? (
        <span className="text-small text-danger">
          Not a valid Lumera address. It should start with lumera1.
        </span>
      ) : null}
    </div>
  )
}

function WatchedList() {
  const hub = useHub()
  return (
    <Card>
      <CardHeader
        title="Watched addresses"
        action={
          <span className="font-mono text-small text-text-muted">
            {hub.watched.length} {hub.watched.length === 1 ? 'address' : 'addresses'}
          </span>
        }
      />
      {hub.watched.map((w) => (
        <div
          key={w.address}
          className="flex items-center gap-3.5 border-b border-line-hairline px-[18px] py-3 last:border-b-0"
        >
          <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-chip border border-dashed border-line-edge bg-ink-600">
            <EyeIcon size={13} className="text-text-muted" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[13px] font-medium text-text-primary">
              {w.label || 'Unlabelled'}
            </span>
            <span className="truncate font-mono text-xs text-text-muted">{short(w.address, 12)}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => hub.watch(w.address)}>
            Open
          </Button>
          <button
            type="button"
            onClick={() => hub.removeWatched(w.address)}
            aria-label={`Stop watching ${w.address}`}
            className="cursor-pointer border-none bg-transparent p-0 text-small text-text-muted hover:text-danger"
          >
            ×
          </button>
        </div>
      ))}
    </Card>
  )
}
