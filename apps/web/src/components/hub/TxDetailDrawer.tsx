'use client'

/*
 * Transaction detail.
 *
 * The transaction is read back from the chain by hash, so everything shown —
 * height, timestamp, fee, gas, messages and the raw log on a failure — is what
 * the chain recorded, not what the app hoped it broadcast.
 *
 * The plain-English line above the table is derived from the message type. A
 * Cosmos message name tells a reader nothing on its own; what it did to their
 * balance is the part they came for.
 */

import React from 'react'

import useTxReceipt from '@/hooks/useTxReceipt'
import useChainParams from '@/hooks/useChainParams'
import { RATE_VALUE } from '@/contants'
import { DENOM } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import { explorerTxUrl } from '@/utils/explorer'
import { depositRules } from '@/utils/governance-view'
import { useHub, copyText, short } from '@lumera-hub/ui/src/hub/session'
import { Drawer, drawerButton } from '@lumera-hub/ui/src/hub/Drawer'
import { Label, Notice, Skeleton, cx } from '@lumera-hub/ui/src/design/primitives'
import { ExternalIcon } from '@lumera-hub/ui/src/design/icons'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

const coin = (amount?: string | number | null) =>
  amount == null
    ? '—'
    : `${formatNumber(Number(amount) / RATE_VALUE, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN}`

/** "MsgBeginRedelegate" → "Redelegate", the way the wallet's list names it. */
const readable = (type: string) =>
  (type.split('.').pop() || 'Transaction')
    .replace(/^Msg/, '')
    .replace(/BeginRedelegate/, 'Redelegate')
    .replace(/WithdrawDelegatorReward/, 'Claim rewards')
    .replace(/([a-z])([A-Z])/g, '$1 $2')

/** The amount a message moved, where it carries one. Claims and votes do not. */
const amountOf = (msg: Record<string, unknown>): string | null => {
  const raw = msg.amount ?? msg.token
  const first = Array.isArray(raw) ? (raw as Array<{ amount?: string }>)[0] : (raw as { amount?: string } | undefined)
  return first?.amount != null ? coin(first.amount) : null
}

/** What the message actually did, in the reader's terms. */
const explain = (
  type: string,
  msg: Record<string, unknown>,
  self: string,
  /** When a deposit comes back, from the chain's own burn switches. */
  refundRule: string | null,
): { headline: string; rows: Array<[string, string]> } => {
  const bare = type.split('.').pop() || ''
  const amount = (msg.amount as { amount?: string } | undefined)?.amount

  switch (bare) {
    case 'MsgDelegate':
      return {
        headline: `Bonded ${coin(amount)} to ${short(String(msg.validator_address || ''), 14, 6)}. It started earning from the next block, and withdrawing it later means waiting out the unbonding period.`,
        rows: [
          ['Validator', String(msg.validator_address || '—')],
          ['Bonded amount', coin(amount)],
        ],
      }
    case 'MsgUndelegate':
      return {
        headline: `Started unbonding ${coin(amount)}. It stopped earning immediately and stays locked until the unbonding period ends.`,
        rows: [
          ['Validator', String(msg.validator_address || '—')],
          ['Amount unbonding', coin(amount)],
          ['Rewards accruing', 'No — stopped at request'],
        ],
      }
    case 'MsgBeginRedelegate':
      return {
        headline: `Moved ${coin(amount)} between validators. Redelegation is instant and skips unbonding, so rewards kept accruing throughout.`,
        rows: [
          ['From validator', String(msg.validator_src_address || '—')],
          ['To validator', String(msg.validator_dst_address || '—')],
          ['Amount moved', coin(amount)],
          ['Rewards interrupted', 'No'],
        ],
      }
    case 'MsgWithdrawDelegatorReward':
      return {
        headline:
          'Withdrew accumulated staking rewards into the liquid balance. Bonded stake was not touched, so nothing stopped earning.',
        rows: [['Claimed from', String(msg.validator_address || '—')]],
      }
    case 'MsgSend': {
      const sent = (msg.amount as Array<{ amount: string; denom: string }> | undefined)?.[0]
      const incoming = msg.to_address === self
      return {
        headline: incoming
          ? `${short(String(msg.from_address || ''), 12, 6)} sent ${coin(sent?.amount)}. The sender paid the fee, so the full amount arrived.`
          : `Sent ${coin(sent?.amount)} to ${short(String(msg.to_address || ''), 12, 6)}. Transfers settle in a single block and cannot be reversed.`,
        rows: [
          ['From', String(msg.from_address || '—')],
          ['To', String(msg.to_address || '—')],
          [incoming ? 'Amount received' : 'Amount sent', coin(sent?.amount)],
        ],
      }
    }
    case 'MsgVote':
      return {
        headline: `Voted on proposal #${msg.proposal_id}. Voting again before the deadline would replace this vote rather than add to it.`,
        rows: [
          ['Proposal', `#${msg.proposal_id}`],
          ['Choice', String(msg.option || '—').replace('VOTE_OPTION_', '').replace(/_/g, ' ')],
        ],
      }
    case 'MsgDeposit':
      return {
        headline: `Deposited on proposal #${msg.proposal_id}. ${refundRule ?? 'The chain holds deposits until the proposal is decided.'}`,
        rows: [['Proposal', `#${msg.proposal_id}`]],
      }
    default:
      return {
        headline: `${bare.replace(/^Msg/, '').replace(/([a-z])([A-Z])/g, '$1 $2')} executed on chain.`,
        rows: [],
      }
  }
}

export function TxDetailDrawer() {
  const hub = useHub()
  const open = hub.drawer?.kind === 'txdetail'
  const hash = hub.drawer?.kind === 'txdetail' ? hub.drawer.hash : undefined

  // The receipt read already returns the decoded body, so the messages come
  // from the same request rather than a second one.
  const { receipt, isLoading } = useTxReceipt(hash, 3)
  // Cached for the session; only a deposit's sentence reads it.
  const { params } = useChainParams()

  if (!open || !hash) return null

  const message = (receipt.messages[0] || {}) as Record<string, unknown>
  const type = String(message['@type'] || '')
  const detail = type
    ? explain(type, message, hub.address, depositRules(params, 'the minimum').refund)
    : null
  const failed = receipt.code != null && receipt.code !== 0
  const amount = type ? amountOf(message) : null
  const incoming =
    /MsgWithdrawDelegatorReward/.test(type) || (/MsgSend$/.test(type) && message.to_address === hub.address)

  const rows: Array<[string, string]> = [
    ...(detail?.rows ?? []),
    ['Block', receipt.height ? `#${Number(receipt.height).toLocaleString('en-US')}` : '—'],
    ['Timestamp', receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : '—'],
    ['Network fee', receipt.fee ?? '—'],
    [
      'Gas used',
      receipt.gasUsed && receipt.gasWanted
        ? `${Number(receipt.gasUsed).toLocaleString('en-US')} / ${Number(receipt.gasWanted).toLocaleString('en-US')}`
        : '—',
    ],
    ...(receipt.memo ? [['Memo', receipt.memo] as [string, string]] : []),
    ...(receipt.messages.length > 1
      ? [['Messages', `${receipt.messages.length} in this transaction`] as [string, string]]
      : []),
  ]

  return (
    <Drawer
      title="Transaction details"
      onClose={hub.closeDrawer}
      footer={
        <>
          <button type="button" onClick={hub.closeDrawer} className={drawerButton.secondaryWide}>
            Close
          </button>
          <a
            href={explorerTxUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-control border border-line-accent bg-ink-600 py-[13px] text-base leading-none font-semibold text-lumera-green no-underline"
          >
            View in explorer
            <ExternalIcon size={13} />
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-[11px]">
        <div className="flex flex-wrap items-center gap-[9px]">
          <span
            className={cx(
              'rounded-[4px] border px-[7px] py-1 text-small leading-none font-medium',
              failed ? 'border-warn-edge text-warn' : 'border-line-edge text-lumera-green',
            )}
          >
            {failed ? 'Failed' : 'Success'}
          </span>
          {type ? (
            <span className="font-mono text-small leading-none text-text-muted">{type.split('.').pop()}</span>
          ) : null}
        </div>
        <div className="flex items-baseline justify-between gap-3.5">
          <span className="text-[17px] leading-[1.2] font-semibold text-text-primary">
            {type ? readable(type) : 'Transaction'}
          </span>
          {amount ? (
            <span
              className={cx(
                'font-mono text-[17px] leading-[1.2] font-semibold tnum',
                incoming ? 'text-lumera-green' : 'text-text-primary',
              )}
            >
              {amount}
            </span>
          ) : null}
        </div>
      </div>

      {isLoading && !detail ? (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </>
      ) : detail ? (
        <div className="flex gap-3 rounded-[9px] border border-line-edge bg-ink-800 p-3.5">
          <div className="w-[3px] flex-none rounded-full bg-[linear-gradient(180deg,var(--color-lumera-teal),var(--color-lumera-green))]" />
          <p className="m-0 text-base leading-[1.65] text-text-secondary text-pretty">{detail.headline}</p>
        </div>
      ) : null}

      {failed && receipt.rawLog ? <Notice tone="danger">{receipt.rawLog}</Notice> : null}

      <div className="overflow-hidden rounded-[9px] border border-line-hairline bg-ink-800">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-[18px] border-b border-ink-500 px-3.5 py-[11px] last:border-b-0"
          >
            <span className="flex-none text-base leading-[1.4] text-text-tertiary">{k}</span>
            <span className="text-right font-mono text-base leading-[1.45] font-medium tnum text-text-primary [overflow-wrap:anywhere]">
              {v}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-[7px]">
        <Label>Transaction hash</Label>
        <div className="flex items-center gap-2.5 rounded-control border border-line-edge bg-ink-800 px-[13px] py-[11px]">
          <span className="min-w-0 flex-1 truncate font-mono text-base leading-none text-text-secondary">
            {hash}
          </span>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyText(hash)
              hub.flash(ok ? 'Transaction hash copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
            }}
            className="flex-none cursor-pointer rounded-chip border border-line-edge bg-transparent px-[9px] py-[5px] text-small leading-none font-medium text-text-tertiary transition-colors hover:border-line-accent hover:text-lumera-green"
          >
            Copy
          </button>
        </div>
      </div>
    </Drawer>
  )
}
