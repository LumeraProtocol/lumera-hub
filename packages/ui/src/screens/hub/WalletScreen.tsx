'use client'

/*
 * Wallet.
 *
 * Four states. Disconnected is a prompt, but not a wall: under Connect sits an
 * address field that opens any account read-only. A connected wallet that has
 * never held anything gets the empty-wallet card rather than a page of zeros.
 * Watching shows a real position with signing disabled; connected shows the
 * position with Send and Receive.
 *
 * Activity is filterable by kind and by date range — including a custom one —
 * because "find the delegation I made in June" was previously a scroll.
 */

import React, { useMemo, useState } from 'react'
import { Avatar, SegmentBar, Skeleton, cx } from '../../design/primitives'
import { LockIcon, SearchIcon } from '../../design/icons'
import { LUMERA_ADDRESS, useHub } from '../../hub/session'

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
  logo?: string
  amount: string
  started?: string
  completes: string
  remaining: string
  /** Elapsed share of the unbonding period, 0–100. Null when the chain's
   *  unbonding parameter did not load, in which case no bar is drawn. */
  pct: number | null
}

type RangeKey = 'all' | '7' | '30' | '90' | 'custom'
type GroupKey = 'all' | 'transfers' | 'staking' | 'governance'

const GROUPS: Array<{ key: GroupKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'staking', label: 'Staking' },
  { key: 'governance', label: 'Governance' },
]

const RANGES: Array<{ key: RangeKey; label: string; mono?: boolean }> = [
  { key: 'all', label: 'All time' },
  { key: '7', label: '7d', mono: true },
  { key: '30', label: '30d', mono: true },
  { key: '90', label: '90d', mono: true },
  { key: 'custom', label: 'Custom' },
]

/** The breakdown bar's colours, in the design's order. */
const SPLIT = [
  { key: 'liquid', label: 'Liquid', color: 'var(--color-lumera-green)' },
  { key: 'staked', label: 'Staked', color: 'var(--color-lumera-teal)' },
  { key: 'unbonding', label: 'Unbonding', color: 'var(--color-neutral-bar)' },
  { key: 'rewards', label: 'Rewards', color: 'var(--color-warn)' },
] as const

type SplitKey = (typeof SPLIT)[number]['key']

const chip = (on: boolean) =>
  cx(
    'cursor-pointer rounded-inner border border-line-edge px-[11px] py-1.5 text-small leading-none font-medium transition-colors',
    on ? 'bg-ink-600 text-text-primary' : 'bg-transparent text-text-muted hover:text-text-secondary',
  )

export function WalletScreen({
  loading,
  empty,
  totalAmount,
  denom = 'LUME',
  fiat,
  liquid,
  staked,
  unbonding,
  rewards,
  split,
  transactions,
  unbondingRows,
  unbondingTotal,
  wallets = ['Keplr'],
  onSend,
  onReceive,
  onCopyAddress,
}: {
  loading?: boolean
  /** A connected wallet that has been read and holds nothing, with no history. */
  empty?: boolean
  /** Liquid, staked, unbonding and unclaimed rewards together, formatted. */
  totalAmount: string
  denom?: string
  fiat?: string
  liquid: string
  staked: string
  unbonding: string
  rewards: string
  /** The same four in micro-denom, for the breakdown bar's widths. */
  split: Record<SplitKey, number>
  transactions: TxRow[]
  unbondingRows: UnbondingRow[]
  /** "3,000.00 LUME", for the unbonding queue's header. */
  unbondingTotal?: string
  /** The wallets this network can connect, named under the Connect button. */
  wallets?: string[]
  onSend: () => void
  onReceive: () => void
  onCopyAddress: () => void
}) {
  const hub = useHub()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupKey>('all')
  const [range, setRange] = useState<RangeKey>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    let start: number | null = null
    let end: number | null = null
    if (range === 'custom') {
      start = from ? new Date(`${from}T00:00:00`).getTime() : null
      end = to ? new Date(`${to}T23:59:59.999`).getTime() : null
    } else if (range !== 'all') {
      start = Date.now() - Number(range) * 86400000
    }
    return transactions.filter((t) => {
      if (group !== 'all' && t.group !== group) return false
      if (start != null && t.timestamp && t.timestamp < start) return false
      if (end != null && t.timestamp && t.timestamp > end) return false
      if (!q) return true
      return `${t.kind} ${t.detail} ${t.amount} ${t.hash}`.toLowerCase().includes(q)
    })
  }, [from, group, query, range, to, transactions])

  const filtering = !!query.trim() || group !== 'all' || range !== 'all'
  const clear = () => {
    setQuery('')
    setGroup('all')
    setRange('all')
    setFrom('')
    setTo('')
  }

  if (hub.isDisconnected) return <DisconnectedWallet wallets={wallets} />

  if (hub.isConnected && empty) {
    return (
      <div className="animate-fade flex flex-col gap-[18px]">
        <div>
          <span className="mb-3.5 block font-mono text-base leading-none text-text-tertiary [overflow-wrap:anywhere]">
            {hub.address}
          </span>
          <div className="flex items-baseline gap-[11px]">
            <span className="font-mono text-[40px] leading-none font-semibold tracking-[-0.02em] text-text-primary tnum">
              0.00
            </span>
            <span className="font-mono text-[17px] leading-none font-medium text-text-tertiary">
              {denom}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-card border border-line-edge bg-ink-700 px-6 py-[34px] text-center sm:px-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-card border border-line-edge bg-ink-800">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-lumera-green)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <div>
            <h2 className="m-0 mb-2 text-[18px] leading-[1.3] font-semibold text-text-primary">
              This wallet is empty
            </h2>
            <p className="m-0 mx-auto max-w-[400px] text-base leading-[1.65] text-text-tertiary text-pretty">
              Nothing has moved in or out of this address yet. Receive {denom} to start, and every
              transfer, delegation and vote will appear here.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-[9px]">
            <button
              type="button"
              onClick={onReceive}
              className="cursor-pointer rounded-control border-none bg-lumera-green px-5 py-3 text-base leading-none font-semibold text-ink-800 transition-colors hover:bg-lumera-green-bright"
            >
              Receive {denom}
            </button>
            <button
              type="button"
              onClick={onCopyAddress}
              className="cursor-pointer rounded-control border border-line-edge bg-transparent px-5 py-3 text-base leading-none font-medium text-text-secondary transition-colors hover:border-line-accent"
            >
              Copy address
            </button>
          </div>
        </div>
      </div>
    )
  }

  const values: Record<SplitKey, string> = { liquid, staked, unbonding, rewards }
  const splitTotal = SPLIT.reduce((sum, s) => sum + (split[s.key] || 0), 0)

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <div className="mb-2 flex min-w-0 items-center gap-[9px]">
            <span className="truncate font-mono text-base leading-none font-medium text-text-muted">
              {hub.address}
            </span>
            <button
              type="button"
              onClick={onCopyAddress}
              className="flex flex-none cursor-pointer items-center rounded-chip border border-line-edge bg-transparent px-2 py-[5px] text-small leading-none font-medium text-text-muted transition-colors hover:border-line-accent hover:text-lumera-green"
            >
              Copy
            </button>
          </div>
          <h1 className="m-0 font-mono text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-text-primary tnum">
            {loading ? (
              <Skeleton className="inline-block h-8 w-64 align-middle" />
            ) : (
              <>
                {totalAmount}{' '}
                <span className="text-[18px] tracking-normal text-text-tertiary">{denom}</span>
              </>
            )}
          </h1>
          {fiat ? <p className="m-0 mt-[7px] text-base leading-none text-text-muted">{fiat}</p> : null}
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <button
            type="button"
            onClick={onReceive}
            className="cursor-pointer rounded-control border border-line-edge bg-transparent px-[17px] py-[11px] text-base leading-none font-medium text-text-secondary transition-colors hover:border-line-accent"
          >
            Receive
          </button>
          <button
            type="button"
            onClick={onSend}
            className="flex cursor-pointer items-center gap-[7px] rounded-control border-none bg-lumera-green px-[19px] py-[11px] text-base leading-none font-semibold text-ink-800 transition-colors hover:bg-lumera-green-bright"
          >
            {hub.gated ? <LockIcon size={12} className="flex-none" /> : null}
            Send
          </button>
        </div>
      </div>

      <div className="rounded-card border border-line-edge bg-ink-700 p-[18px]">
        <div className="mb-3.5 flex h-3 overflow-hidden rounded-[3px] bg-line-hairline">
          {splitTotal > 0
            ? SPLIT.filter((s) => split[s.key] > 0).map((s) => (
                <div
                  key={s.key}
                  title={`${s.label} ${values[s.key]}`}
                  style={{ width: `${(split[s.key] / splitTotal) * 100}%`, background: s.color }}
                />
              ))
            : null}
        </div>
        <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4">
          {SPLIT.map((s, i) => (
            <div
              key={s.key}
              className={cx(
                'flex flex-col gap-[5px]',
                i === 0 && 'pr-5',
                i === 1 && 'border-l border-line-hairline pl-5 md:pr-5',
                i === 2 && 'pr-5 md:border-l md:border-line-hairline md:pl-5',
                i === 3 && 'border-l border-line-hairline pl-5',
              )}
            >
              <span className="flex items-center gap-[7px] text-small leading-none text-text-muted">
                <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-lg leading-none font-semibold text-text-primary tnum">
                {loading ? <Skeleton className="inline-block h-4 w-24 align-middle" /> : values[s.key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {unbondingRows.length ? (
        <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
          <div className="flex items-center justify-between gap-3 border-b border-line-hairline px-[18px] py-3.5">
            <h3 className="m-0 text-base leading-none font-semibold text-text-primary">
              Unbonding queue
            </h3>
            <span className="font-mono text-small leading-none text-text-muted">
              {unbondingTotal ?? unbondingRows.length} in flight
            </span>
          </div>
          {unbondingRows.map((u) => (
            <div key={u.key} className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-4">
              <div className="flex items-center gap-3.5">
                <Avatar initials={u.initials} src={u.logo} size={28} rounded={7} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-base leading-none font-medium text-text-primary">{u.amount}</span>
                  <span className="truncate text-small leading-none text-text-muted">
                    from {u.validator}
                    {u.started ? ` · started ${u.started}` : ''}
                  </span>
                </div>
                <div className="flex flex-none flex-col gap-1 text-right">
                  <span className="font-mono text-base leading-none font-semibold text-warn">
                    {u.remaining}
                  </span>
                  <span className="font-mono text-small leading-none text-text-muted">{u.completes}</span>
                </div>
              </div>
              {u.pct != null ? (
                <div className="h-[7px] overflow-hidden rounded-full bg-line-hairline">
                  <div
                    className="h-full bg-[linear-gradient(90deg,var(--color-neutral-bar),var(--color-warn))]"
                    style={{ width: `${u.pct}%` }}
                  />
                </div>
              ) : null}
              <span className="text-small leading-[1.5] text-text-muted text-pretty">
                Earning nothing while it unbonds. Returns to your liquid balance on {u.completes}.
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card border border-line-edge bg-ink-700">
        <div className="flex flex-col gap-3 border-b border-line-hairline px-[18px] py-3.5">
          <div className="flex flex-wrap items-center gap-3.5">
            <h3 className="m-0 flex-none text-base leading-none font-semibold text-text-primary">
              Activity
            </h3>
            <div className="relative min-w-[180px] flex-1 sm:max-w-[320px]">
              <SearchIcon
                size={14}
                strokeWidth={2}
                className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hash, validator, amount…"
                aria-label="Search activity"
                className="w-full rounded-control border border-line-edge bg-ink-800 py-[9px] pr-3 pl-8 text-base leading-[normal] text-text-primary outline-none placeholder:text-text-muted focus:border-line-accent"
              />
            </div>
            <span className="ml-auto flex-none font-mono text-small leading-none text-text-muted">
              {filtering
                ? `${hits.length} of ${transactions.length}`
                : `${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-[7px]">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                aria-pressed={group === g.key}
                onClick={() => setGroup(g.key)}
                className={chip(group === g.key)}
              >
                {g.label}
              </button>
            ))}
            <div className="mx-[5px] h-[18px] w-px bg-line-edge" />
            <div className="flex rounded-inner border border-line-edge bg-ink-800 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={range === r.key}
                  onClick={() => setRange(r.key)}
                  className={cx(
                    'cursor-pointer rounded-[5px] border-none px-[9px] py-[5px] text-small leading-none font-medium transition-colors',
                    r.mono && 'font-mono',
                    range === r.key
                      ? 'bg-ink-600 text-text-primary'
                      : 'bg-transparent text-text-muted hover:text-text-secondary',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {filtering ? (
              <button
                type="button"
                onClick={clear}
                className="ml-auto cursor-pointer border-none bg-transparent px-0.5 py-1.5 text-small leading-none font-medium text-lumera-green hover:text-lumera-green-bright"
              >
                Clear
              </button>
            ) : null}
          </div>

          {range === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2.5 rounded-control border border-line-edge bg-ink-800 px-3 py-2.5">
              <span className="font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary">
                FROM
              </span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="From date"
                className="rounded-chip border border-line-edge bg-ink-800 px-[9px] py-[7px] font-mono text-small text-text-primary outline-none [color-scheme:dark] focus:border-line-accent"
              />
              <span className="ml-1 font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary">
                TO
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="To date"
                className="rounded-chip border border-line-edge bg-ink-800 px-[9px] py-[7px] font-mono text-small text-text-primary outline-none [color-scheme:dark] focus:border-line-accent"
              />
              <span className="ml-auto text-small leading-[1.4] text-text-muted">
                Leave either side blank for open-ended.
              </span>
            </div>
          ) : null}
        </div>

        {loading && !transactions.length ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line-hairline px-[18px] py-[13px]">
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
                'grid grid-cols-[1fr_auto] items-center gap-x-3.5 gap-y-2 border-b border-line-hairline px-[18px] py-[13px] transition-colors sm:grid-cols-[1fr_150px_132px_88px_16px]',
                t.onOpen && 'cursor-pointer hover:bg-ink-600',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cx(
                    'flex h-7 w-7 flex-none items-center justify-center rounded-inner border border-line-edge bg-ink-600 text-small leading-none font-semibold',
                    t.direction === 'in' ? 'text-lumera-green' : 'text-text-muted',
                  )}
                >
                  {t.direction === 'in' ? '↓' : t.direction === 'out' ? '↑' : '•'}
                </div>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className="truncate text-base leading-none font-medium text-text-primary">
                    {t.kind}
                  </span>
                  <span className="truncate text-small leading-none text-text-tertiary">
                    {t.detail}
                    <span className="sm:hidden"> · {t.amount}</span>
                  </span>
                </div>
              </div>
              <span className="hidden truncate font-mono text-base leading-none font-medium tnum text-text-secondary sm:block">
                {t.amount}
              </span>
              <span className="hidden truncate font-mono text-small leading-none text-text-muted sm:block">
                {t.hash}
              </span>
              <div className="flex flex-col gap-1 text-right">
                <span
                  className={cx(
                    'text-small leading-none font-medium',
                    t.status.toLowerCase() === 'success' ? 'text-lumera-green' : 'text-warn',
                  )}
                >
                  {t.status}
                </span>
                <span className="text-small leading-none whitespace-nowrap text-text-muted">{t.when}</span>
              </div>
              <span className="hidden text-right text-lg leading-none text-text-muted sm:block">›</span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-[11px] px-5 py-11 text-center">
            <span className="text-base leading-[1.3] font-medium text-text-primary">
              {query.trim()
                ? `Nothing matches “${query.trim()}”`
                : filtering
                  ? 'No transactions in this range'
                  : 'No activity yet'}
            </span>
            <span className="max-w-[320px] text-base leading-[1.5] text-text-muted text-pretty">
              {filtering
                ? 'Search covers the transaction hash, kind, validator or counterparty, and amount.'
                : 'Transfers, delegations and votes from this address will appear here.'}
            </span>
            {filtering ? (
              <button
                type="button"
                onClick={clear}
                className="mt-0.5 cursor-pointer rounded-control border border-line-edge bg-transparent px-[15px] py-[9px] text-small leading-none font-medium text-text-secondary transition-colors hover:border-line-accent"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The disconnected wallet: connect, or inspect any address read-only from the
 * field underneath — the same watch mode the header offers.
 */
function DisconnectedWallet({ wallets }: { wallets: string[] }) {
  const hub = useHub()
  const [value, setValue] = useState('')
  const input = value.trim()
  const valid = LUMERA_ADDRESS.test(input)
  const inspect = () => {
    if (valid) hub.watch(input)
  }

  return (
    <div className="animate-fade flex justify-center pt-[52px] pb-10">
      <div className="w-[560px] max-w-full overflow-hidden rounded-[14px] border border-line-edge bg-ink-700">
        <div className="flex items-center gap-[9px] border-b border-line-hairline bg-ink-800 px-[22px] py-[13px]">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-warn" />
          <span className="font-mono text-small leading-none font-medium tracking-[0.1em] text-warn">
            NO WALLET CONNECTED
          </span>
        </div>

        <div className="flex flex-col items-center gap-5 px-6 pt-[34px] pb-8 text-center sm:px-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] border border-line-edge bg-ink-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lumera-mark.svg" alt="" className="h-[26px] w-[26px]" />
          </div>
          <div>
            <h1 className="m-0 mb-[9px] text-[21px] leading-[1.25] font-semibold tracking-[-0.02em] text-text-primary">
              Connect your wallet to view this page
            </h1>
            <p className="m-0 mx-auto max-w-[400px] text-base leading-[1.65] text-text-tertiary text-pretty">
              Balances, transfers and activity are tied to an address. Connect your wallet to view
              this page and interact with the Lumera ecosystem.
            </p>
          </div>
          <button
            type="button"
            onClick={hub.connect}
            className="flex min-w-[220px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border-none bg-lumera-green px-6 py-[13px] text-base leading-none font-semibold text-ink-800 transition-colors hover:bg-lumera-green-bright"
          >
            Connect wallet
          </button>
          <div className="flex flex-wrap justify-center gap-x-[22px] gap-y-2 pt-1">
            {wallets.map((w) => (
              <span key={w} className="flex items-center gap-[7px] text-small leading-none text-text-muted">
                <span className="h-[5px] w-[5px] flex-none rounded-full bg-lumera-green" />
                {w}
              </span>
            ))}
            <span className="text-small leading-none text-text-muted">Keys never leave your wallet</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-line-hairline bg-ink-800 px-6 pt-[18px] pb-[22px] sm:px-10">
          <span className="text-center text-base leading-[1.5] text-text-tertiary">
            Not ready to connect? Inspect any address read-only.
          </span>
          <div className="flex items-center overflow-hidden rounded-control border border-line-edge bg-ink-800 focus-within:border-line-accent">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') inspect()
              }}
              placeholder="lumera1…"
              aria-label="Address to inspect"
              spellCheck={false}
              className="min-w-0 flex-1 border-none bg-transparent px-3.5 py-3 font-mono text-base leading-[normal] text-text-primary outline-none placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={inspect}
              disabled={!valid}
              className="cursor-pointer self-stretch border-0 border-l border-solid border-line-edge bg-ink-600 px-[18px] text-base leading-none font-medium text-text-muted transition-colors hover:text-lumera-green disabled:cursor-not-allowed disabled:hover:text-text-muted"
            >
              Inspect
            </button>
          </div>
          {input && !valid ? (
            <span className="text-center text-small leading-[1.4] text-danger">
              That is not a Lumera address. It should start with lumera1.
            </span>
          ) : null}
        </div>
      </div>
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
