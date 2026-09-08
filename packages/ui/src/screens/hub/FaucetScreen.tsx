'use client'

/*
 * The testnet faucet.
 *
 * Only ever reachable on a non-mainnet build: there is no such thing as free
 * mainnet LUME, and a faucet offered there would be a scam-shaped hole.
 *
 * Sending needs a funded account, which lives in a service outside this app. A
 * deployment without one renders the explanation and the log but not a request
 * button — an inert Send is worse than an absent one, because someone will
 * press it and believe the tokens are coming.
 */

import React from 'react'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Notice,
  PageTitle,
  Skeleton,
  cx,
} from '../../design/primitives'
import { CheckIcon, ExternalIcon } from '../../design/icons'
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
  amountLabel,
  cooldownLabel,
  error,
  drips,
  dripsLoading,
  dripsToday,
  onRequest,
  rules,
}: {
  /** False when this deployment has no faucet service behind it. */
  available: boolean
  unavailableReason?: string
  state: FaucetState
  /** What a single request sends, e.g. "1.00 test LUME". */
  amountLabel: string
  /** Set while the caller is in cooldown, e.g. "You can request again in 24h". */
  cooldownLabel?: string | null
  error?: string | null
  drips: Drip[]
  dripsLoading?: boolean
  dripsToday?: string | null
  onRequest: (address: string) => void
  rules: string[]
}) {
  const hub = useHub()
  const [address, setAddress] = React.useState('')
  const [touched, setTouched] = React.useState(false)

  const trimmed = address.trim()
  const valid = LUMERA_ADDRESS.test(trimmed)
  const invalid = touched && trimmed.length > 0 && !valid

  const sending = state === 'sending'
  const blocked = !available || !valid || sending || Boolean(cooldownLabel)

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title="Faucet"
        subtitle="Test tokens for this network. They carry no value and the chain resets periodically."
      />

      {!available ? (
        <Notice tone="info">
          {unavailableReason ||
            'No faucet service is configured on this deployment, so requests cannot be sent from here.'}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
        <div className="flex flex-col gap-3.5">
          <Card>
            <CardHeader
              title="Request tokens"
              action={
                hub.address ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddress(hub.address ?? '')
                      setTouched(true)
                    }}
                    className="cursor-pointer border-none bg-transparent p-0 text-small font-medium text-lumera-green"
                  >
                    Use my address
                  </button>
                ) : undefined
              }
            />

            <div className="flex flex-col gap-3.5 px-[18px] py-4">
              <Field label="Destination address">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="lumera1…"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={invalid}
                  disabled={!available}
                  className={cx('font-mono', invalid && 'border-danger')}
                />
              </Field>

              {invalid ? (
                <span className="text-small leading-[1.45] text-danger">
                  That is not a Lumera address. It should begin with “lumera1”.
                </span>
              ) : (
                <span className="text-small leading-[1.45] text-text-muted">
                  {amountLabel} goes to this address. It lands in one block.
                </span>
              )}

              {error ? (
                <span className="text-small leading-[1.45] text-danger">{error}</span>
              ) : null}

              {state === 'done' ? (
                <div className="flex items-start gap-2.5 rounded-inner border border-line-accent bg-lumera-teal/[.12] px-3.5 py-3">
                  <CheckIcon size={14} className="mt-0.5 flex-none text-lumera-green" />
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-medium text-text-primary">
                      {amountLabel} sent
                    </span>
                    <span className="text-small leading-[1.5] text-text-muted">
                      Your balance updates as soon as the transaction is included.
                    </span>
                  </div>
                </div>
              ) : null}

              {cooldownLabel ? (
                <span className="text-small leading-[1.45] text-warn">{cooldownLabel}</span>
              ) : null}

              <Button
                variant="accent"
                onClick={() => onRequest(trimmed)}
                disabled={blocked}
                className="self-start"
              >
                {sending ? 'Sending…' : `Send ${amountLabel}`}
              </Button>

              {sending ? (
                <span className="text-small text-text-muted">
                  Signing and broadcasting from the faucet account…
                </span>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent drips"
              action={
                dripsToday ? (
                  <span className="text-small text-text-muted">{dripsToday}</span>
                ) : undefined
              }
            />
            {dripsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-line-hairline px-[18px] py-3 last:border-b-0">
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))
            ) : drips.length ? (
              drips.map((d) => (
                <div
                  key={d.hash}
                  onClick={d.onOpen}
                  className={cx(
                    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line-hairline px-[18px] py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_110px_92px]',
                    d.onOpen && 'cursor-pointer hover:bg-ink-600',
                  )}
                >
                  <span className="truncate font-mono text-small text-text-secondary">
                    {d.address}
                  </span>
                  <span className="font-mono text-small tnum text-text-primary sm:text-right">
                    {d.amount}
                  </span>
                  <span className="font-mono text-small text-text-muted sm:text-right">
                    {d.when}
                  </span>
                </div>
              ))
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
          </Card>
        </div>

        <Card>
          <CardHeader title="How the faucet works" />
          <div className="flex flex-col gap-3 px-[18px] py-4">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-2.5">
                <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-lumera-green" />
                <span className="text-small leading-[1.6] text-text-muted text-pretty">{rule}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
