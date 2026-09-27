'use client'

/*
 * The testnet faucet.
 *
 * Only ever reachable on a non-mainnet build: there is no such thing as free
 * mainnet LUME, and a faucet offered there would be a scam-shaped hole.
 *
 * Sending needs a funded account, which lives in a service outside this app. A
 * deployment without one renders the explanation and the log but not a working
 * request button — an inert Send is worse than an absent one, because someone
 * will press it and believe the tokens are coming.
 */

import React from 'react'
import { EmptyState, Notice, PageTitle, Skeleton, cx } from '../../design/primitives'
import { ExternalIcon } from '../../design/icons'
import { LUMERA_ADDRESS, useHub } from '../../hub/session'

export type Drip = {
  hash: string
  address: string
  amount: string
  when: string
  onOpen?: () => void
}

export type FaucetState = 'idle' | 'sending' | 'done'

export function FaucetScreen({
  available,
  unavailableReason,
  state,
  chainId,
  amountLabel,
  cooldown = '24 hours',
  stats,
  cooldownLabel,
  error,
  drips,
  dripsLoading,
  dripsToday,
  onRequest,
  onReset,
  lastTxUrl,
  rules,
  helpUrl,
  statsLoading,
}: {
  /** False when this deployment has no faucet service behind it. */
  available: boolean
  unavailableReason?: string
  state: FaucetState
  chainId: string
  /** What a single request sends, e.g. "1 test LUME". */
  amountLabel: string
  /** How long an address waits between requests, e.g. "24 hours". */
  cooldown?: string
  /** The strip under the title. Figures with no source read "—". */
  stats: Array<{ label: string; value: string }>
  /** The strip's figures are still being read — shimmer them. */
  statsLoading?: boolean
  /** Set while the caller is in cooldown, e.g. "You can request again in 24h". */
  cooldownLabel?: string | null
  error?: string | null
  drips: Drip[]
  dripsLoading?: boolean
  dripsToday?: string | null
  onRequest: (address: string) => void
  /** Clears a finished request so another address can be sent to. */
  onReset?: () => void
  /** The explorer page of the drip just sent, when the service returned its hash. */
  lastTxUrl?: string
  rules: string[]
  /** Where to ask for a larger allocation. The row is left out without one. */
  helpUrl?: string
}) {
  const hub = useHub()
  const [address, setAddress] = React.useState('')

  const trimmed = address.trim()
  const valid = LUMERA_ADDRESS.test(trimmed)
  const invalid = trimmed.length > 0 && !valid

  const sending = state === 'sending'
  const done = state === 'done'
  const blocked = !available || !valid || sending || done || Boolean(cooldownLabel)
  const cta = sending
    ? 'Sending…'
    : done || cooldownLabel
      ? `Next request in ${cooldown.replace(/ hours?$/, 'h')}`
      : `Request ${amountLabel}`

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title="Faucet"
        subtitle={`Free test LUME for ${chainId}. One request per address every ${cooldown} — enough to cover fees across every flow in the hub.`}
      />

      <div className="grid grid-cols-2 overflow-hidden rounded-panel border border-line-edge bg-ink-700 md:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cx(
              'flex min-w-0 flex-col gap-[7px] px-[18px] py-[15px]',
              i % 2 === 0 && 'border-r border-line-hairline',
              i < stats.length - 1 && 'md:border-r md:border-line-hairline',
              i < 2 && 'border-b border-line-hairline md:border-b-0',
            )}
          >
            <span className="font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary">
              {s.label}
            </span>
            {statsLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span className="truncate font-mono text-lg leading-none font-semibold text-text-primary tnum">
                {s.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {!available ? (
        <Notice tone="info">
          {unavailableReason ||
            'No faucet service is configured on this deployment, so requests cannot be sent from here.'}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_348px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="rounded-card border border-line-edge bg-ink-700 p-5">
            <div className="mb-[13px] flex items-baseline justify-between gap-3">
              <h3 className="m-0 text-base leading-none font-semibold text-text-primary">
                Request tokens
              </h3>
              {available && hub.address && trimmed !== hub.address ? (
                <button
                  type="button"
                  onClick={() => {
                    setAddress(hub.address ?? '')
                    onReset?.()
                  }}
                  className="cursor-pointer border-none bg-transparent p-0 text-small leading-none font-medium text-lumera-green hover:text-lumera-green-bright"
                >
                  Use my address
                </button>
              ) : null}
            </div>

            <div className="mb-3.5 flex flex-col gap-2">
              <span className="font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary">
                DESTINATION ADDRESS
              </span>
              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (done) onReset?.()
                }}
                placeholder="lumera1…"
                spellCheck={false}
                autoComplete="off"
                aria-label="Destination address"
                aria-invalid={invalid}
                disabled={!available}
                className={cx(
                  'w-full rounded-control border bg-ink-800 px-[13px] py-3 font-mono text-small leading-[normal] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-line-accent disabled:cursor-not-allowed disabled:opacity-60',
                  invalid ? 'border-danger-edge' : 'border-line-edge',
                )}
              />
              {invalid ? (
                <span className="text-small leading-[1.45] text-danger">
                  That is not a valid Lumera address. It should start with lumera1.
                </span>
              ) : !trimmed ? (
                <span className="text-small leading-[1.45] text-text-muted">
                  Paste any testnet address — the faucet sends to you, so no signature is needed.
                </span>
              ) : null}
            </div>

            {error ? (
              <div className="mb-3.5">
                <span className="text-small leading-[1.45] text-danger">{error}</span>
              </div>
            ) : null}

            {sending ? (
              <div className="mb-3.5 flex items-center gap-2.5 rounded-control border border-line-edge bg-ink-800 p-[13px]">
                <span
                  className="h-[7px] w-[7px] flex-none rounded-full bg-warn"
                  style={{ animation: 'lmBlink 1s infinite' }}
                />
                <span className="text-small leading-[1.4] font-medium text-warn">
                  Signing and broadcasting from the faucet account…
                </span>
              </div>
            ) : null}

            {done ? (
              <div className="mb-3.5 flex flex-col gap-2.5 rounded-control border border-line-accent bg-lumera-teal/10 p-3.5">
                <span className="text-base leading-none font-semibold text-lumera-green">
                  {amountLabel} sent
                </span>
                <span className="text-small leading-[1.5] text-text-secondary text-pretty">
                  It lands in one block. Your balance updates as soon as the transaction is
                  included.
                </span>
                <div className="flex flex-wrap items-center gap-3.5">
                  {lastTxUrl ? (
                    <a
                      href={lastTxUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-small leading-none font-medium text-lumera-green"
                    >
                      View in explorer →
                    </a>
                  ) : null}
                  {onReset ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAddress('')
                        onReset()
                      }}
                      className="cursor-pointer border-none bg-transparent p-0 text-small leading-none font-medium text-text-muted hover:text-text-secondary"
                    >
                      Send to another address
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {cooldownLabel && !done ? (
              <div className="mb-3.5">
                <span className="text-small leading-[1.45] text-warn">{cooldownLabel}</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => onRequest(trimmed)}
              disabled={blocked}
              className={cx(
                'w-full rounded-control border-none py-[13px] text-base leading-none font-semibold transition-colors',
                blocked
                  ? 'cursor-not-allowed bg-ink-500 text-text-disabled'
                  : 'cursor-pointer bg-lumera-green text-ink-800 hover:bg-lumera-green-bright',
              )}
            >
              {cta}
            </button>

            {helpUrl ? (
              <>
                <div className="mt-[18px] mb-3.5 h-px bg-line-hairline" />
                <div className="flex items-start gap-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 flex-none text-text-muted"
                    aria-hidden="true"
                  >
                    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8c-1.5 3-4.8 4.7-8.1 4.7a9 9 0 0 1-3.8-.9L4 20.5l1.4-4.2a9 9 0 0 1-.9-3.8c0-3.3 1.7-6.6 4.7-8.1A8.4 8.4 0 0 1 13 3.5h.5a8.5 8.5 0 0 1 8 8v0Z" />
                  </svg>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-small leading-[1.6] text-text-secondary text-pretty">
                      Building on Lumera and need more than the faucet allows? Reach out to the team
                      on Discord and we will help you with a larger allocation.
                    </span>
                    <a
                      href={helpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-[7px] self-start rounded-inner border border-line-edge bg-transparent px-3 py-2 text-small leading-none font-medium text-text-secondary no-underline transition-colors hover:border-line-accent hover:text-lumera-green"
                    >
                      Ask on Discord
                      <ExternalIcon size={11} className="flex-none opacity-75" />
                    </a>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="min-w-0 overflow-hidden rounded-card border border-line-edge bg-ink-700">
            <div className="flex items-center justify-between gap-3 border-b border-line-hairline px-[18px] py-[15px]">
              <h3 className="m-0 text-base leading-none font-semibold text-text-primary">
                Recent drips
              </h3>
              {dripsToday ? (
                <span className="font-mono text-small leading-none text-text-muted">
                  {dripsToday}
                </span>
              ) : null}
            </div>
            {dripsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-line-hairline px-[18px] py-3 last:border-b-0">
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))
            ) : drips.length ? (
              <div className="overflow-x-auto">
                {drips.map((d) => (
                  <div
                    key={d.hash}
                    onClick={d.onOpen}
                    className={cx(
                      'grid min-w-[420px] grid-cols-[minmax(0,1fr)_116px_96px_74px] items-center gap-3 border-b border-line-hairline px-[18px] py-3',
                      d.onOpen && 'cursor-pointer transition-colors hover:bg-ink-600',
                    )}
                  >
                    <span className="truncate font-mono text-small leading-none font-medium text-text-secondary">
                      {d.address}
                    </span>
                    <span className="font-mono text-small leading-none font-medium text-text-primary tnum">
                      {d.amount}
                    </span>
                    <span className="font-mono text-small leading-none text-text-muted">
                      {d.hash.length > 12 ? `${d.hash.slice(0, 6)}…${d.hash.slice(-4)}` : d.hash}
                    </span>
                    <span className="text-right text-small leading-none text-text-tertiary">
                      {d.when}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-[18px]">
                <EmptyState
                  title="No drips recorded"
                  body={
                    available
                      ? 'Requests will appear here once the faucet has sent something.'
                      : 'This deployment cannot see a faucet account, so there is nothing to list.'
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-card border border-line-edge bg-ink-700 p-5">
          <h3 className="m-0 mb-[13px] text-base leading-none font-semibold text-text-primary">
            How the faucet works
          </h3>
          <div className="flex flex-col gap-[11px]">
            {rules.map((rule) => (
              <div key={rule} className="flex gap-2.5">
                <span className="mt-1.5 h-[5px] w-[5px] flex-none rounded-full bg-warn" />
                <span className="text-small leading-[1.6] text-text-secondary text-pretty">
                  {rule}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
