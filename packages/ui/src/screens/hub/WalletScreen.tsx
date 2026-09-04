'use client'

/*
 * Wallet.
 *
 * Three states, and only one of them is the old app's "connect your wallet"
 * card: disconnected offers watch mode alongside connecting; watching shows a
 * real position with signing disabled; connected shows the position with
 * Send and Receive.
 *
 * Activity is filterable by kind and by date range, because "find the
 * delegation I made in June" was previously a scroll.
 */

import React, { useMemo, useState } from 'react'
import {
  Badge,
  Bar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Label,
  PageTitle,
  SegmentBar,
  Segmented,
  Skeleton,
  Stat,
  cx,
} from '../../design/primitives'
import { CopyIcon, EyeIcon, SearchIcon } from '../../design/icons'
import { useHub, short } from '../../hub/session'

export type TxRow = {
  key: string
  kind: string
  detail: string
  amount: string
  hash: string
  when: string
  timestamp?: number
  status: string
  direction: 'in' | 'out' | 'none'
  group: 'transfers' | 'staking' | 'governance'
  onOpen?: () => void
}

export type UnbondingRow = {
  key: string
  validator: string
  initials: string
  amount: string
  completes: string
  remaining: string
  /** Elapsed share of the unbonding period, 0–100. */
  pct: number
}

type RangeKey = 'all' | '7' | '30' | '90'
type GroupKey = 'all' | 'transfers' | 'staking' | 'governance'

export function WalletScreen({
  loading,
  total,
  fiat,
  liquid,
  staked,
  unbonding,
  rewards,
  transactions,
  unbondingRows,
  onSend,
  onReceive,
  onCopyAddress,
}: {
  loading?: boolean
  total: string
  fiat?: string
  liquid: string
  staked: string
  unbonding: string
  rewards: string
  transactions: TxRow[]
  unbondingRows: UnbondingRow[]
  onSend: () => void
  onReceive: () => void
  onCopyAddress: () => void
}) {
  const hub = useHub()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupKey>('all')
  const [range, setRange] = useState<RangeKey>('all')

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cutoff = range === 'all' ? null : Date.now() - Number(range) * 86400000
    return transactions.filter((t) => {
      if (group !== 'all' && t.group !== group) return false
      if (cutoff && t.timestamp && t.timestamp < cutoff) return false
      if (!q) return true
      return `${t.kind} ${t.detail} ${t.amount} ${t.hash}`.toLowerCase().includes(q)
    })
  }, [group, query, range, transactions])

  const filtering = !!query.trim() || group !== 'all' || range !== 'all'

  if (hub.isDisconnected) {
    return (
      <div className="animate-fade flex flex-col gap-[18px]">
        <PageTitle title="Wallet" subtitle="Balances, transfers and activity for an address." />
        <Card>
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <Badge tone="muted">NO WALLET CONNECTED</Badge>
            <h2 className="m-0 max-w-[420px] text-[20px] leading-tight font-semibold text-text-primary text-pretty">
              Connect a wallet, or inspect any address read-only
            </h2>
            <p className="m-0 max-w-[460px] text-base leading-[1.6] text-text-muted text-pretty">
              Balances and history are tied to an address. Connecting lets you sign; watching shows
              you the same figures without one.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
              <Button variant="solid" onClick={hub.connect}>
                Connect wallet
              </Button>
              <Button variant="outline" onClick={() => hub.openDrawer({ kind: 'connect' })}>
                <EyeIcon size={14} />
                Watch an address
              </Button>
            </div>
            <span className="text-small text-text-disabled">
              Keys never leave your wallet. Lumera never sees them.
            </span>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {hub.isWatching ? <EyeIcon size={14} className="flex-none text-text-muted" /> : null}
            <span className="truncate font-mono text-small font-medium text-text-secondary">
              {short(hub.address, 14, 6)}
            </span>
            <button
              type="button"
              onClick={onCopyAddress}
              aria-label="Copy address"
              className="flex-none cursor-pointer border-none bg-transparent p-0 text-text-muted hover:text-lumera-green"
            >
              <CopyIcon size={13} />
            </button>
          </div>
          <h1 className="m-0 text-title font-semibold tracking-[-0.02em] text-text-primary">
            {loading ? <Skeleton className="inline-block h-7 w-56 align-middle" /> : total}
          </h1>
          {fiat ? <p className="m-0 mt-1 text-base text-text-muted">{fiat}</p> : null}
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <Button variant="outline" onClick={onReceive}>
            Receive
          </Button>
          <Button variant="solid" locked={hub.gated} onClick={onSend}>
            Send
          </Button>
        </div>
      </div>

      {hub.isWatching ? (
        <div className="flex items-center gap-3 rounded-panel border border-dashed border-line-edge bg-ink-700 px-4 py-3">
          <EyeIcon size={16} className="flex-none text-text-muted" />
          <span className="text-small text-text-muted text-pretty">
            Read-only. Connect the wallet that owns this address to send, stake or vote.
          </span>
        </div>
      ) : null}

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { k: 'Liquid', v: liquid, tone: 'primary' as const },
            { k: 'Staked', v: staked, tone: 'primary' as const },
            { k: 'Unbonding', v: unbonding, tone: 'warn' as const },
            { k: 'Rewards', v: rewards, tone: 'green' as const },
          ].map((b, i) => (
            <div
              key={b.k}
              className={cx(
                'flex flex-col gap-2 px-[18px] py-4',
                i < 3 && 'md:border-r md:border-line-hairline',
                i % 2 === 0 && 'border-r border-line-hairline',
                i < 2 && 'border-b border-line-hairline md:border-b-0',
              )}
            >
              <Label>{b.k}</Label>
              <Stat size="md" tone={b.tone}>
                {loading ? <Skeleton className="inline-block h-5 w-24 align-middle" /> : b.v}
              </Stat>
            </div>
          ))}
        </div>
      </Card>

      {unbondingRows.length ? (
        <Card>
          <CardHeader
            title="Unbonding queue"
            action={
              <span className="font-mono text-small text-text-muted">
                {unbondingRows.length} in flight
              </span>
            }
          />
          {unbondingRows.map((u) => (
            <div
              key={u.key}
              className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-3.5 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base font-medium text-text-primary">
                  {u.amount} <span className="text-text-muted">from {u.validator}</span>
                </span>
                <span className="font-mono text-small tnum text-warn">{u.remaining}</span>
              </div>
              <Bar pct={u.pct} tone="warn" height={6} />
              <span className="text-small text-text-muted">
                Earning nothing while it unbonds. Returns to your liquid balance on {u.completes}.
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-[13px]">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="m-0 flex-1 text-base font-semibold whitespace-nowrap text-text-primary">
              Activity
            </h3>
            <div className="relative min-w-[160px] flex-1 sm:max-w-[240px]">
              <SearchIcon
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hash, amount or counterparty"
                aria-label="Search activity"
                className="w-full rounded-inner border border-line-hairline bg-ink-800 py-[7px] pr-2.5 pl-[30px] text-small text-text-primary outline-none placeholder:text-text-disabled focus:border-line-accent"
              />
            </div>
            <span className="font-mono text-small whitespace-nowrap text-text-muted">
              {filtering ? `${hits.length} of ${transactions.length}` : `${transactions.length} transactions`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={group}
              onChange={setGroup}
              options={[
                { key: 'all', label: 'All' },
                { key: 'transfers', label: 'Transfers' },
                { key: 'staking', label: 'Staking' },
                { key: 'governance', label: 'Governance' },
              ]}
            />
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { key: 'all', label: 'All time' },
                { key: '7', label: '7d' },
                { key: '30', label: '30d' },
                { key: '90', label: '90d' },
              ]}
            />
            {filtering ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setGroup('all')
                  setRange('all')
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-hairline px-[18px] py-3">
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))
        ) : hits.length ? (
          hits.map((t) => (
            <div
              key={t.key}
              role={t.onOpen ? 'button' : undefined}
              tabIndex={t.onOpen ? 0 : undefined}
              onClick={t.onOpen}
              onKeyDown={(e) => {
                if (t.onOpen && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  t.onOpen()
                }
              }}
              className={cx(
                'grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b border-line-hairline px-[18px] py-3 transition-colors last:border-b-0 sm:grid-cols-[1fr_150px_132px_100px]',
                t.onOpen && 'cursor-pointer hover:bg-ink-600',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cx(
                    'flex h-7 w-7 flex-none items-center justify-center rounded-chip border border-line-edge bg-ink-600 text-small font-semibold',
                    t.direction === 'in' ? 'text-lumera-green' : 'text-text-muted',
                  )}
                >
                  {t.direction === 'in' ? '↓' : t.direction === 'out' ? '↑' : '•'}
                </div>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className="truncate text-base font-medium text-text-primary">{t.kind}</span>
                  <span className="truncate text-small text-text-muted">{t.detail}</span>
                </div>
              </div>
              <span className="font-mono text-small font-medium tnum text-text-secondary sm:text-right">
                {t.amount}
              </span>
              <span className="truncate font-mono text-small text-text-muted">{t.hash}</span>
              <div className="flex flex-col gap-[3px] sm:text-right">
                <span
                  className={cx(
                    'text-small font-medium',
                    t.status.toLowerCase() === 'success' ? 'text-lumera-green' : 'text-warn',
                  )}
                >
                  {t.status}
                </span>
                <span className="text-small text-text-muted">{t.when}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-[18px]">
            <EmptyState
              title={
                query.trim()
                  ? `Nothing matches “${query.trim()}”`
                  : filtering
                    ? 'No transactions in this range'
                    : 'No activity yet'
              }
              body={
                filtering
                  ? 'Search covers the transaction hash, kind, counterparty and amount.'
                  : 'Transfers, delegations and votes from this address will appear here.'
              }
              action={
                filtering ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      setGroup('all')
                      setRange('all')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}
      </Card>
    </div>
  )
}

/** Bar showing how a balance splits, shown under the totals. */
export function BalanceSplit({
  segments,
}: {
  segments: Array<{ label: string; pct: number; className: string }>
}) {
  return (
    <div className="flex flex-col gap-2">
      <SegmentBar
        segments={segments.map((s) => ({
          width: `${s.pct}%`,
          className: s.className,
          title: `${s.label} ${s.pct.toFixed(1)}%`,
        }))}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-small text-text-muted">
        {segments.map((s) => (
          <span key={s.label}>
            {s.label} {s.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  )
}
