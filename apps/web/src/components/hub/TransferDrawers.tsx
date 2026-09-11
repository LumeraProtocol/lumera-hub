'use client'

/*
 * Send and Receive.
 *
 * Both were separate modals with their own layout. They are now variants of
 * the one drawer, and Send hands off to the shared TxFlow rather than carrying
 * its own copy of the review and success screens.
 *
 * Send validates while you type: an address that is malformed, or is this
 * wallet, is caught before the review step rather than by the chain. Recent
 * recipients come from the address's own transfers, so picking one is a real
 * shortcut rather than a suggestion list.
 */

import React, { useState } from 'react'
import QRCode from 'react-qr-code'

import { CHAIN_ID, DENOM } from '@/contants/network'
import { RATE_VALUE, GAS_LIMIT, FEE_RATIO } from '@/contants'
import { formatNumber } from '@/utils/format'
import { useHub, short, copyText, LUMERA_ADDRESS } from '@lumera-hub/ui/src/hub/session'
import { Drawer, drawerButton } from '@lumera-hub/ui/src/hub/Drawer'
import {
  AmountInput,
  Field,
  Input,
  Label,
  Notice,
  PercentRow,
  cx,
} from '@lumera-hub/ui/src/design/primitives'
import { CheckIcon } from '@lumera-hub/ui/src/design/icons'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

/*
 * Headroom left behind by MAX so the transfer can still pay for itself,
 * computed from the app's own gas configuration rather than a guessed figure.
 * The true fee depends on the wallet's gas simulation, so this is deliberately
 * the default-limit estimate.
 */
const FEE_HEADROOM = Math.ceil(Number(GAS_LIMIT) * FEE_RATIO) / RATE_VALUE
const FEE_LABEL = `~${FEE_HEADROOM.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${TOKEN}`

const fmt = (n: number) => formatNumber(n, { decimalsLength: 2, currency: 'en-US' })

export type RecentRecipient = { address: string; note: string }

export function SendDrawer({
  availableMicro,
  recents = [],
  onReview,
}: {
  availableMicro: number
  /** Addresses this wallet has sent to, most recent first. */
  recents?: RecentRecipient[]
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
          <button type="button" onClick={hub.closeDrawer} className={drawerButton.secondary}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onReview({ to: trimmed, amount: String(amountNumber), memo })}
            className={drawerButton.primary}
          >
            {ready ? `Review ${fmt(amountNumber)} ${TOKEN}` : 'Review transfer'}
          </button>
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
      >
        <Input
          mono
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="lumera1…"
          invalid={!!trimmed && (!validAddress || isSelf)}
          aria-label="Recipient address"
          spellCheck={false}
        />
        {validAddress && !isSelf ? (
          <span className="flex items-center gap-1.5 text-small leading-[1.45] text-lumera-green">
            <CheckIcon size={12} className="flex-none" />
            Valid address on {CHAIN_ID}
          </span>
        ) : null}
      </Field>

      {recents.length ? (
        <div className="flex flex-col gap-2">
          <Label>Recent</Label>
          {recents.map((r) => (
            <button
              key={r.address}
              type="button"
              onClick={() => setTo(r.address)}
              className="flex cursor-pointer items-center gap-[11px] rounded-control border border-line-edge bg-ink-800 px-3 py-2.5 text-left transition-colors hover:border-line-accent"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-small leading-none font-medium text-text-secondary">
                {short(r.address, 12, 6)}
              </span>
              <span className="flex-none text-small leading-none text-text-muted">{r.note}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Field
        label="Amount"
        right={`Available ${fmt(available)} ${TOKEN}`}
        error={over ? `Exceeds your liquid balance of ${fmt(available)} ${TOKEN}.` : undefined}
      >
        <AmountInput value={amount} onChange={setAmount} denom={TOKEN} invalid={over} />
        {available > 0 ? (
          <PercentRow
            steps={[
              ['50%', 0.5],
              ['MAX', 1],
            ]}
            onPick={(f) =>
              setAmount((f === 1 ? Math.max(0, available - FEE_HEADROOM) : available * f).toFixed(2))
            }
          />
        ) : null}
      </Field>

      <Field label="Memo · optional" right={`${memo.length} / 64`}>
        <Input
          value={memo}
          onChange={(e) => setMemo(e.target.value.slice(0, 64))}
          placeholder="Visible on chain to anyone"
          aria-label="Memo"
          className="py-[11px] text-small"
        />
      </Field>

      <div className="overflow-hidden rounded-control border border-line-edge bg-ink-800">
        <div className="flex items-baseline justify-between gap-3 border-b border-line-hairline px-[13px] py-[11px]">
          <span className="text-small leading-none text-text-muted">Network fee</span>
          <span className="font-mono text-small leading-none font-medium tnum text-text-secondary">
            {FEE_LABEL}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-[13px] py-[11px]">
          <span className="text-small leading-none text-text-muted">Balance after</span>
          <span className="font-mono text-small leading-none font-medium tnum text-text-primary">
            {fmt(after)} {TOKEN}
          </span>
        </div>
      </div>

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
          <button type="button" onClick={hub.closeDrawer} className={drawerButton.secondary}>
            Close
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyText(hub.address)
              hub.flash(ok ? 'Address copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
            }}
            className={drawerButton.primary}
          >
            Copy address
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-[10px] bg-text-primary p-3.5">
          <QRCode value={hub.address} size={168} level="M" bgColor="#f5f5fa" fgColor="#001432" />
        </div>

        <div className="flex w-full flex-col gap-[9px]">
          <div className="flex items-baseline justify-between gap-3">
            <Label>Your address</Label>
            <span className="font-mono text-small leading-none text-text-muted">{CHAIN_ID}</span>
          </div>
          <div className="rounded-control border border-line-edge bg-ink-800 p-[13px]">
            <span className="font-mono text-[13px] leading-[1.7] tracking-[0.02em] text-text-primary [overflow-wrap:anywhere]">
              {hub.address}
            </span>
          </div>
        </div>

        <div
          className={cx(
            'flex w-full gap-[11px] rounded-control border bg-ink-800 p-[13px]',
            isTestnet ? 'border-warn-edge' : 'border-line-edge',
          )}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isTestnet ? 'var(--color-warn)' : 'var(--color-text-muted)'}
            strokeWidth="2"
            strokeLinecap="round"
            className="mt-px flex-none"
            aria-hidden="true"
          >
            <path d="M12 9v4" />
            <path d="M12 17v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <span
            className={cx(
              'text-small leading-[1.55] text-pretty',
              isTestnet ? 'text-warn' : 'text-text-muted',
            )}
          >
            {isTestnet
              ? `Testnet only. Never send mainnet ${TOKEN} to this address.`
              : `Only send ${TOKEN} and Lumera-native assets. Tokens bridged from other chains without a Lumera route will be lost.`}
          </span>
        </div>
      </div>
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
