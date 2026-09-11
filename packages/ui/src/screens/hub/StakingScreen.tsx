'use client'

/*
 * Staking.
 *
 * Two panes: the active set on the left, a delegation calculator on the right.
 *
 * The calculator is live without a wallet. That is the point — the reader can
 * pick a validator, type an amount and see the yield before being asked for
 * anything. Only the final button is gated, and gating carries the amount and
 * validator through the connect step rather than discarding them.
 *
 * The validator list is one grid that reflows: a six-column table above the
 * table breakpoint, stacked label/value rows below it. The old screen hid the
 * thead and drove the stacked layout off `data-label` attributes, which meant
 * the two layouts could drift apart. Here both read the same row data.
 */

import React, { useMemo, useState } from 'react'
import {
  AmountInput,
  Avatar,
  Bar,
  Button,
  Card,
  EmptyState,
  Field,
  Label,
  Notice,
  PageTitle,
  PercentRow,
  Segmented,
  Skeleton,
  StatStrip,
  Well,
  cx,
} from '../../design/primitives'
import { SearchIcon } from '../../design/icons'
import { useHub } from '../../hub/session'

export type ValidatorRow = {
  key: string
  name: string
  initials: string
  logo?: string
  /** Share of bonded stake, 0–100. */
  power: number
  /** Commission as a percentage, 0–100. */
  commission: number
  /** Net APR after commission, or null when the chain has not answered. */
  apr: number | null
  /** Uptime percentage, or null when the signing window is unavailable. */
  uptime: number | null
  /** Micro-denom delegated by the reader to this validator. */
  mine: number
  note: string
}

export type StakingMode = 'delegate' | 'undelegate' | 'redelegate'

const GRID = 'minmax(190px,1fr) 132px 74px 74px 92px 58px'

export function StakingScreen({
  loading,
  validators,
  totalBonded,
  netApr,
  unbondingDays,
  myStake,
  /** Micro-denom the reader can act on, given the current mode. */
  available,
  denom = 'LUME',
  mode,
  onModeChange,
  selected,
  onSelect,
  source,
  onSourceChange,
  amount,
  onAmountChange,
  onSubmit,
  onOpenProfile,
  maxRedelegationEntries,
  minCommissionRate,
  lockDate,
  pairUsed,
}: {
  loading?: boolean
  validators: ValidatorRow[]
  totalBonded: string
  netApr: string
  unbondingDays: string
  myStake: string
  available: number
  denom?: string
  mode: StakingMode
  onModeChange: (m: StakingMode) => void
  selected?: ValidatorRow
  onSelect: (key: string) => void
  source?: ValidatorRow
  onSourceChange: (key: string) => void
  amount: string
  onAmountChange: (v: string) => void
  onSubmit: () => void
  onOpenProfile?: (key: string) => void
  /** staking params max_entries — concurrent redelegations per validator pair. */
  maxRedelegationEntries?: number | null
  /** staking params min_commission_rate, 0–100. */
  minCommissionRate?: number | null
  /** When redelegated stake could next move, i.e. now plus the unbonding period. */
  lockDate?: string | null
  /** Redelegations already open between the chosen pair, when it could be read. */
  pairUsed?: number | null
}) {
  const hub = useHub()
  const [sort, setSort] = useState<'power' | 'apr' | 'commission'>('power')
  const [query, setQuery] = useState('')

  const isRedelegate = mode === 'redelegate'
  const mine = useMemo(() => validators.filter((v) => v.mine > 0), [validators])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? validators.filter((v) => v.name.toLowerCase().includes(q)) : validators
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sort === 'apr') return (b.apr ?? -1) - (a.apr ?? -1)
      if (sort === 'commission') return a.commission - b.commission
      return b.power - a.power
    })
    return sorted
  }, [query, sort, validators])

  const leaderPower = validators[0]?.power || 1
  const amountNumber = parseFloat(amount.replace(/,/g, '')) || 0
  const availableDisplay = available / 1e6
  const overAvailable = hub.hasPosition && amountNumber > availableDisplay
  const availableLabel = availableDisplay.toLocaleString('en-US', { maximumFractionDigits: 2 })

  const apr = selected?.apr ?? 0
  const yearly = amountNumber * (apr / 100)

  // What moving the stake does to its yield: the same amount at the two
  // validators' net rates.
  const delta =
    source && selected ? amountNumber * (((selected.apr ?? 0) - (source.apr ?? 0)) / 100) : 0

  const verb = mode === 'undelegate' ? 'Undelegate' : isRedelegate ? 'Redelegate' : 'Delegate'

  // Redelegation needs an existing position to move; say so rather than
  // rendering an empty picker.
  const redelegateBlocked = isRedelegate && !mine.length

  const max = maxRedelegationEntries ?? null
  const used = pairUsed ?? null
  const slotsLabel =
    max != null && used != null ? `${Math.max(0, max - used)} of ${max} free` : max != null ? `${max} per pair` : '—'
  const slotsTone =
    max != null && used != null
      ? used >= max - 1
        ? 'text-danger'
        : used > 0
          ? 'text-warn'
          : 'text-lumera-green'
      : 'text-text-secondary'

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title="Staking"
        subtitle="Compare validators, model a delegation, then sign when you are ready."
      />

      <StatStrip
        items={[
          { label: 'TOTAL BONDED', value: totalBonded },
          { label: 'NET APR', value: netApr, tone: 'green' },
          { label: 'UNBONDING', value: unbondingDays },
          { label: 'YOUR STAKE', value: hub.hasPosition ? myStake : '—' },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-3.5 xl:grid-cols-2">
        {/* Active set */}
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line-hairline px-[18px] py-[13px]">
            <h3 className="m-0 flex-1 text-base leading-none font-semibold whitespace-nowrap text-text-primary">
              Active set{' '}
              <span className="font-normal text-text-muted">{validators.length || ''}</span>
            </h3>
            <div className="relative min-w-[150px] flex-1 sm:max-w-[190px]">
              <SearchIcon
                size={14}
                strokeWidth={2}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter validators"
                aria-label="Filter validators"
                className="w-full rounded-inner border border-line-hairline bg-ink-800 py-1.5 pr-2.5 pl-[30px] text-small leading-[normal] text-text-primary outline-none placeholder:text-text-muted focus:border-line-accent"
              />
            </div>
            <Segmented
              value={sort}
              onChange={setSort}
              options={[
                { key: 'power', label: 'Voting power' },
                { key: 'apr', label: 'APR' },
                { key: 'commission', label: 'Commission' },
              ]}
            />
            {minCommissionRate != null ? (
              <span className="w-full text-small leading-none text-text-muted">
                Commission floor {minCommissionRate.toFixed(0)}%
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-full lg:min-w-[660px]">
              {/* Column heads only make sense once the grid is a table. */}
              <div
                className="hidden gap-3 border-b border-line-hairline px-[18px] py-[9px] font-mono text-micro leading-none font-medium tracking-[0.08em] text-text-muted lg:grid"
                style={{ gridTemplateColumns: GRID }}
              >
                <span>VALIDATOR</span>
                <span>VOTING POWER</span>
                <span className="text-right">FEE</span>
                <span className="text-right">UPTIME</span>
                <span className="text-right">APR</span>
                <span />
              </div>

              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-line-hairline px-[18px] py-3"
                  >
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))
              ) : rows.length ? (
                rows.map((v) => {
                  const isSelected = selected?.key === v.key
                  return (
                    <div
                      key={v.key}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(v.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelect(v.key)
                        }
                      }}
                      className={cx(
                        'grid cursor-pointer grid-cols-2 items-center gap-x-3 gap-y-2 border-b border-line-hairline px-[18px] py-3 transition-colors hover:bg-ink-600 lg:grid-cols-[var(--cols)]',
                        isSelected && 'bg-lumera-teal/10',
                      )}
                      style={{ ['--cols' as string]: GRID }}
                    >
                      <div className="col-span-2 flex min-w-0 items-center gap-[11px] lg:col-span-1">
                        <Avatar initials={v.initials} src={v.logo} size={28} />
                        <div className="flex min-w-0 flex-col gap-[3px]">
                          <span className="truncate text-base leading-none font-medium text-text-primary">
                            {v.name}
                          </span>
                          <span className="truncate text-small leading-none text-text-tertiary">
                            {v.note}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-[5px]">
                        <span className="font-mono text-small leading-none font-medium tnum text-text-secondary">
                          <span className="text-text-muted lg:hidden">Power </span>
                          {v.power.toFixed(2)}%
                        </span>
                        <Bar pct={`${((v.power / leaderPower) * 100).toFixed(0)}%`} height={7} />
                      </div>

                      <span className="text-right font-mono text-base leading-none tnum text-text-muted">
                        <span className="lg:hidden">Fee </span>
                        {v.commission}%
                      </span>
                      <span className="text-right font-mono text-base leading-none tnum text-text-muted">
                        <span className="lg:hidden">Uptime </span>
                        {v.uptime != null ? `${v.uptime.toFixed(2)}%` : '—'}
                      </span>
                      <span className="text-right font-mono text-base leading-none font-medium tnum text-lumera-green">
                        <span className="text-text-muted lg:hidden">APR </span>
                        {v.apr != null ? `${v.apr.toFixed(1)}%` : '—'}
                      </span>
                      {onOpenProfile ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenProfile(v.key)
                          }}
                          aria-label={`About ${v.name}`}
                          className="col-span-2 cursor-pointer justify-self-start rounded-chip border border-line-edge bg-transparent px-[9px] py-1.5 text-small leading-none font-medium text-text-tertiary transition-colors hover:border-line-accent hover:text-lumera-green lg:col-span-1 lg:justify-self-end"
                        >
                          Info
                        </button>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="p-[18px]">
                  <EmptyState
                    title={query ? `No validator matches “${query.trim()}”` : 'No validators loaded'}
                    body={
                      query
                        ? 'Try part of the moniker.'
                        : 'The chain API did not return an active set. It may be briefly unavailable.'
                    }
                    action={
                      query ? (
                        <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                          Clear filter
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Calculator */}
        <Card className="xl:sticky xl:top-[88px]">
          <div className="mx-3.5 mt-3 flex rounded-control border border-line-hairline bg-ink-800 p-1">
            {(['delegate', 'undelegate', 'redelegate'] as StakingMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                aria-pressed={mode === m}
                className={cx(
                  'flex-1 cursor-pointer rounded-chip border-none py-2 text-small leading-none font-semibold capitalize transition-colors',
                  mode === m
                    ? 'bg-ink-600 text-text-primary'
                    : 'bg-transparent text-text-muted hover:text-text-secondary',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-[13px] px-3.5 py-4">
            {redelegateBlocked ? (
              <div className="flex flex-col gap-[7px]">
                <Label>From validator</Label>
                <div className="flex flex-col items-center gap-[11px] rounded-control border border-dashed border-line-edge bg-ink-800 px-4 py-5 text-center">
                  <span className="text-base leading-[1.4] font-medium text-text-primary">
                    No delegations to move
                  </span>
                  <span className="text-small leading-[1.55] text-text-muted text-pretty">
                    {hub.hasPosition
                      ? 'Redelegation moves stake you already hold. Delegate first, then it can be moved without unbonding.'
                      : 'Redelegation moves stake you already hold. Connect a wallet to see your delegations.'}
                  </span>
                  <button
                    type="button"
                    onClick={hub.gated ? hub.connect : () => onModeChange('delegate')}
                    className="cursor-pointer rounded-inner border border-line-edge bg-transparent px-3.5 py-2 text-small leading-none font-medium text-text-secondary transition-colors hover:border-line-accent hover:text-lumera-green"
                  >
                    {hub.gated ? 'Connect wallet' : 'Delegate instead'}
                  </button>
                </div>
              </div>
            ) : null}

            {isRedelegate && mine.length ? (
              <Field label="From validator">
                <div className="flex flex-col gap-[5px]">
                  {mine.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => onSourceChange(v.key)}
                      aria-pressed={source?.key === v.key}
                      className={cx(
                        'flex cursor-pointer items-center gap-2.5 rounded-control border border-line-edge px-[11px] py-[9px] text-left transition-colors hover:border-line-accent',
                        source?.key === v.key ? 'bg-lumera-teal/14' : 'bg-transparent',
                      )}
                    >
                      <Avatar initials={v.initials} src={v.logo} size={22} rounded={6} />
                      <span className="flex-1 truncate text-base leading-none font-medium text-text-primary">
                        {v.name}
                      </span>
                      <span className="font-mono text-small leading-none tnum text-text-tertiary">
                        {(v.mine / 1e6).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}

            <Field label={isRedelegate ? 'To validator' : 'Validator'}>
              {selected ? (
                <div className="flex items-center gap-2.5 rounded-control border border-line-edge bg-ink-800 px-3 py-2.5">
                  <Avatar initials={selected.initials} src={selected.logo} size={24} rounded={6} />
                  <span className="flex-1 truncate text-base leading-none font-medium text-text-primary">
                    {selected.name}
                  </span>
                  <span className="font-mono text-small leading-none tnum text-text-tertiary">
                    {selected.apr != null ? `${selected.apr.toFixed(1)}% APR` : '—'}
                  </span>
                </div>
              ) : (
                <div className="rounded-control border border-dashed border-line-edge bg-ink-800 px-3 py-2.5 text-small text-text-muted">
                  Pick a validator from the list
                </div>
              )}
            </Field>

            <Field
              label="Amount"
              right={
                hub.hasPosition
                  ? isRedelegate && source
                    ? `At ${source.name} ${availableLabel}`
                    : `Available ${availableLabel}`
                  : 'Enter any amount to model it'
              }
            >
              <AmountInput
                value={amount}
                onChange={onAmountChange}
                denom={denom}
                invalid={overAvailable}
              />
              {hub.hasPosition && available > 0 ? (
                <div className="mt-1.5">
                  <PercentRow
                    onPick={(f) =>
                      onAmountChange((availableDisplay * f).toFixed(f === 1 ? 6 : 2))
                    }
                  />
                </div>
              ) : null}
            </Field>

            {isRedelegate && source && selected ? (
              <>
                <div className="overflow-hidden rounded-control border border-line-hairline bg-ink-800">
                  <div className="grid grid-cols-[1fr_62px_62px] gap-2.5 border-b border-line-hairline px-[13px] py-[9px] font-mono text-micro leading-none font-medium tracking-[0.08em] text-text-muted">
                    <span />
                    <span className="truncate text-right" title={source.name}>
                      {source.name}
                    </span>
                    <span className="truncate text-right" title={selected.name}>
                      {selected.name}
                    </span>
                  </div>
                  {[
                    {
                      k: 'Commission',
                      from: `${source.commission}%`,
                      to: `${selected.commission}%`,
                      better: selected.commission < source.commission,
                      worse: selected.commission > source.commission,
                    },
                    {
                      k: 'Net APR',
                      from: source.apr != null ? `${source.apr.toFixed(1)}%` : '—',
                      to: selected.apr != null ? `${selected.apr.toFixed(1)}%` : '—',
                      better: (selected.apr ?? 0) > (source.apr ?? 0),
                      worse: (selected.apr ?? 0) < (source.apr ?? 0),
                    },
                    {
                      k: 'Uptime',
                      from: source.uptime != null ? `${source.uptime.toFixed(2)}%` : '—',
                      to: selected.uptime != null ? `${selected.uptime.toFixed(2)}%` : '—',
                      better:
                        source.uptime != null &&
                        selected.uptime != null &&
                        selected.uptime >= source.uptime,
                      worse:
                        source.uptime != null &&
                        selected.uptime != null &&
                        selected.uptime < source.uptime,
                    },
                  ].map((r) => (
                    <div
                      key={r.k}
                      className="grid grid-cols-[1fr_62px_62px] gap-2.5 border-b border-ink-500 px-[13px] py-[9px]"
                    >
                      <span className="text-small leading-none text-text-muted">{r.k}</span>
                      <span className="text-right font-mono text-small leading-none tnum text-text-tertiary">
                        {r.from}
                      </span>
                      <span
                        className={cx(
                          'text-right font-mono text-small leading-none font-semibold tnum',
                          r.better ? 'text-lumera-green' : r.worse ? 'text-danger' : 'text-text-secondary',
                        )}
                      >
                        {r.to}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col gap-1.5 px-[13px] py-[11px]">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-small leading-none text-text-muted">Change in yield</span>
                      <span
                        className={cx(
                          'font-mono text-base leading-none font-semibold tnum',
                          delta > 0 ? 'text-lumera-green' : delta < 0 ? 'text-danger' : 'text-text-secondary',
                        )}
                      >
                        {delta >= 0 ? '+' : ''}
                        {delta.toFixed(2)} {denom} / yr
                      </span>
                    </div>
                    <span className="text-small leading-[1.5] text-text-muted text-pretty">
                      {amountNumber > 0
                        ? delta > 0
                          ? 'Moving this stake earns more at the same risk.'
                          : delta < 0
                            ? 'This move costs yield. Worth it only for uptime or decentralisation.'
                            : 'Same net yield at both validators.'
                        : 'Enter an amount to see the difference.'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-[9px] rounded-control border border-line-hairline bg-ink-800 px-[13px] py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-small leading-none text-text-muted">Unbonding</span>
                    <span className="text-base leading-none font-semibold text-lumera-green">
                      None — instant
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-small leading-none text-text-muted">
                      Moved amount locked until
                    </span>
                    <span className="font-mono text-base leading-none font-medium text-warn">
                      {lockDate ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-small leading-none text-text-muted">Slots for this pair</span>
                    <span className={cx('font-mono text-base leading-none font-medium', slotsTone)}>
                      {slotsLabel}
                    </span>
                  </div>
                  <div className="h-px bg-line-hairline" />
                  <span className="text-small leading-[1.5] text-text-muted text-pretty">
                    Rewards keep accruing throughout.{' '}
                    {max != null
                      ? used
                        ? `${used === 1 ? 'One move is' : `${used} moves are`} already open between these two. Each pair allows ${max} at a time.`
                        : `Each validator pair allows ${max} concurrent redelegations.`
                      : ''}
                  </span>
                </div>
              </>
            ) : null}

            <Well className="flex flex-col gap-[9px]">
              <div className="flex items-baseline justify-between">
                <span className="text-small leading-none text-text-muted">Rewards / month</span>
                <span className="font-mono text-base leading-none font-semibold tnum text-lumera-green">
                  {(yearly / 12).toFixed(2)} {denom}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-small leading-none text-text-muted">Rewards / year</span>
                <span className="font-mono text-base leading-none font-medium tnum text-text-secondary">
                  {yearly.toFixed(2)} {denom}
                </span>
              </div>
              <div className="h-px bg-line-hairline" />
              <div className="flex items-baseline justify-between">
                <span className="text-small leading-none text-text-muted">Network fee</span>
                <span className="text-small leading-none text-text-muted">Estimated at signing</span>
              </div>
              {mode === 'undelegate' ? (
                <>
                  <div className="h-px bg-line-hairline" />
                  <span className="text-small leading-[1.5] text-text-muted text-pretty">
                    Unbonding stops earning immediately and the stake stays locked for{' '}
                    {unbondingDays} before it returns to your liquid balance.
                  </span>
                </>
              ) : null}
            </Well>

            {overAvailable ? (
              <Notice tone="danger">
                Exceeds{' '}
                {mode === 'undelegate'
                  ? 'your bonded stake'
                  : isRedelegate
                    ? `your stake at ${source?.name ?? 'that validator'}`
                    : 'your liquid balance'}{' '}
                of {availableLabel} {denom}.
              </Notice>
            ) : null}

            <Button
              variant="primary"
              size="lg"
              full
              locked={hub.gated}
              disabled={overAvailable || !selected || redelegateBlocked}
              onClick={onSubmit}
            >
              {overAvailable
                ? 'Amount too high'
                : hub.isConnected
                  ? `${verb}${amountNumber > 0 ? ` ${amountNumber.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${denom}` : ''}`
                  : `Connect to ${verb.toLowerCase()}`}
            </Button>

            {hub.gated ? (
              <p className="m-0 text-center text-small leading-[1.5] text-text-tertiary text-pretty">
                The calculator is live without a wallet. Your amount and validator carry over when
                you connect.
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
