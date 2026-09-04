'use client'

/*
 * Send and Receive.
 *
 * Both were separate modals with their own layout. They are now variants of
 * the one drawer, and Send hands off to the shared TxFlow rather than carrying
 * its own copy of the review and success screens.
 *
 * Send validates while you type: an address that is malformed, or is this
 * wallet, is caught before the review step rather than by the chain.
 */

import React, { useState } from 'react'
import QRCode from 'react-qr-code'

import { CHAIN_ID, DENOM } from '@/contants/network'
import { RATE_VALUE, GAS_LIMIT, FEE_RATIO } from '@/contants'
import { formatNumber } from '@/utils/format'
import { useHub, short, copyText, LUMERA_ADDRESS } from '@lumera-hub/ui/src/hub/session'
import { Drawer } from '@lumera-hub/ui/src/hub/Drawer'
import {
  AmountInput,
  Button,
  Field,
  Input,
  Notice,
  PercentRow,
  Well,
} from '@lumera-hub/ui/src/design/primitives'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

/*
 * Headroom left behind by MAX so the transfer can still pay for itself,
 * computed from the app's own gas configuration rather than a guessed figure.
 * The true fee depends on the wallet's gas simulation, so this is deliberately
 * the default-limit estimate.
 */
const FEE_HEADROOM = Math.ceil(Number(GAS_LIMIT) * FEE_RATIO) / RATE_VALUE
const FEE_LABEL = `~${FEE_HEADROOM.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${TOKEN}`

export function SendDrawer({
  availableMicro,
  onReview,
}: {
  availableMicro: number
  /** Called with the validated values once the reader confirms the form. */
  onReview: (values: { to: string; amount: string; memo: string }) => void
}) {
  const hub = useHub()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  if (hub.drawer?.kind !== 'send') return null

  const available = availableMicro / RATE_VALUE
  const trimmed = to.trim()
  const validAddress = LUMERA_ADDRESS.test(trimmed)
  const isSelf = validAddress && trimmed === hub.address
  const amountNumber = parseFloat(amount.replace(/,/g, '')) || 0
  const over = amountNumber > available
  const ready = validAddress && !isSelf && amountNumber > 0 && !over

  const after = Math.max(0, available - amountNumber - FEE_HEADROOM)

  return (
    <Drawer
      title={`Send ${TOKEN}`}
      onClose={hub.closeDrawer}
      footer={
        <>
          <Button variant="outline" size="lg" className="flex-none px-5" onClick={hub.closeDrawer}>
            Cancel
          </Button>
          <Button
            variant="solid"
            size="lg"
            full
            disabled={!ready}
            onClick={() => onReview({ to: trimmed, amount: String(amountNumber), memo })}
          >
            {ready
              ? `Review ${formatNumber(amountNumber, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN}`
              : 'Review transfer'}
          </Button>
        </>
      }
    >
      <Field
        label="Recipient"
        error={
          !trimmed
            ? undefined
            : !validAddress
              ? 'Not a valid Lumera address. It should start with lumera1.'
              : isSelf
                ? 'That is this wallet. Pick a different recipient.'
                : undefined
        }
        ok={validAddress && !isSelf ? `Valid address on ${CHAIN_ID}` : undefined}
      >
        <Input
          mono
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="lumera1…"
          invalid={!!trimmed && (!validAddress || isSelf)}
          aria-label="Recipient address"
        />
      </Field>

      <Field
        label="Amount"
        right={`Available ${formatNumber(available, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN}`}
        error={
          over
            ? `Exceeds your liquid balance of ${formatNumber(available, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN}.`
            : undefined
        }
      >
        <AmountInput value={amount} onChange={setAmount} denom={TOKEN} invalid={over} />
        {available > 0 ? (
          <div className="mt-1.5">
            <PercentRow
              onPick={(f) =>
                setAmount(
                  (f === 1 ? Math.max(0, available - FEE_HEADROOM) : available * f).toFixed(2),
                )
              }
            />
          </div>
        ) : null}
      </Field>

      <Field label="Memo" right={`${memo.length} / 64`} hint="Optional. Visible on chain.">
        <Input
          value={memo}
          onChange={(e) => setMemo(e.target.value.slice(0, 64))}
          placeholder="Optional"
          aria-label="Memo"
        />
      </Field>

      <Well className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-small text-text-muted">Network fee</span>
          <span className="font-mono text-base tnum text-text-muted">{FEE_LABEL}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-small text-text-muted">Balance after</span>
          <span className="font-mono text-base font-medium tnum text-text-secondary">
            {formatNumber(after, { decimalsLength: 2, currency: 'en-US' })} {TOKEN}
          </span>
        </div>
      </Well>

      <Notice tone="info">
        Transfers settle in a single block and cannot be reversed. Check the recipient before you
        sign.
      </Notice>
    </Drawer>
  )
}

export function ReceiveDrawer() {
  const hub = useHub()
  if (hub.drawer?.kind !== 'receive') return null

  const isTestnet = !CHAIN_ID.includes('mainnet')

  return (
    <Drawer
      title={`Receive ${TOKEN}`}
      onClose={hub.closeDrawer}
      footer={
        <>
          <Button variant="outline" size="lg" className="flex-none px-5" onClick={hub.closeDrawer}>
            Close
          </Button>
          <Button
            variant="solid"
            size="lg"
            full
            onClick={async () => {
              const ok = await copyText(hub.address)
              hub.flash(ok ? 'Address copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
            }}
          >
            Copy address
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-card bg-white p-4">
          <QRCode value={hub.address} size={168} level="M" />
        </div>
        <div className="flex w-full flex-col gap-1.5 text-center">
          <span className="font-mono text-small break-all text-text-secondary">{hub.address}</span>
          <span className="font-mono text-small text-text-muted">{CHAIN_ID}</span>
        </div>
      </div>

      <Notice tone={isTestnet ? 'warn' : 'info'}>
        {isTestnet
          ? `Testnet only. Never send mainnet ${TOKEN} to this address.`
          : `Only send ${TOKEN} and Lumera-native assets. Tokens bridged from other chains without a Lumera route will be lost.`}
      </Notice>
    </Drawer>
  )
}

/** Address chip with copy, used in a few places on the wallet screen. */
export function AddressChip({ address }: { address: string }) {
  const hub = useHub()
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(address)
        hub.flash(ok ? 'Address copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
      }}
      className="cursor-pointer rounded-chip border border-line-edge bg-ink-800 px-2.5 py-1.5 font-mono text-small text-text-secondary hover:border-line-accent"
    >
      {short(address, 12, 6)}
    </button>
  )
}
