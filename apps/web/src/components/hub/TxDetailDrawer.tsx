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
import { RATE_VALUE } from '@/contants'
import { DENOM, PORTAL_URL } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import { useHub, copyText, short } from '@lumera-hub/ui/src/hub/session'
import { Drawer } from '@lumera-hub/ui/src/hub/Drawer'
import {
  Badge,
  Button,
  DataRow,
  Label,
  Notice,
  Skeleton,
} from '@lumera-hub/ui/src/design/primitives'
import { ExternalIcon } from '@lumera-hub/ui/src/design/icons'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

const coin = (amount?: string | number | null) =>
  amount == null
    ? '—'
    : `${formatNumber(Number(amount) / RATE_VALUE, { decimalsLength: 2, currency: 'en-US' })} ${TOKEN}`

/** What the message actually did, in the reader's terms. */
const explain = (
  type: string,
  msg: Record<string, unknown>,
  self: string,
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
        headline: `Deposited on proposal #${msg.proposal_id}. Deposits are returned when voting opens, and burned if the period ends short.`,
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

  if (!open || !hash) return null

  const message = (receipt.messages[0] || {}) as Record<string, unknown>
  const type = String(message['@type'] || '')
  const detail = type ? explain(type, message, hub.address) : null
  const failed = receipt.code != null && receipt.code !== 0

  return (
    <Drawer
      title="Transaction details"
      onClose={hub.closeDrawer}
      footer={
        <>
          <Button variant="outline" size="lg" className="flex-none px-5" onClick={hub.closeDrawer}>
            Close
          </Button>
          <a
            href={`${PORTAL_URL}tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-control border border-line-accent bg-ink-600 px-4 py-[13px] text-base font-semibold text-lumera-green no-underline"
          >
            View in explorer
            <ExternalIcon size={13} />
          </a>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={failed ? 'danger' : 'green'}>{failed ? 'FAILED' : 'SUCCESS'}</Badge>
        {type ? (
          <span className="font-mono text-small text-text-tertiary">{type.split('.').pop()}</span>
        ) : null}
      </div>

      {isLoading && !detail ? (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </>
      ) : detail ? (
        <p className="m-0 text-base leading-[1.65] text-text-secondary text-pretty">
          {detail.headline}
        </p>
      ) : null}

      {failed && receipt.rawLog ? (
        <Notice tone="danger">{receipt.rawLog}</Notice>
      ) : null}

      <div className="overflow-hidden rounded-control border border-line-hairline bg-ink-800 px-[13px]">
        {detail?.rows.map(([k, v]) => (
          <DataRow key={k} label={k} value={v} />
        ))}
        <DataRow
          label="Block"
          value={receipt.height ? `#${Number(receipt.height).toLocaleString('en-US')}` : '—'}
        />
        <DataRow
          label="Timestamp"
          value={receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : '—'}
        />
        <DataRow label="Network fee" value={receipt.fee ?? '—'} />
        <DataRow
          label="Gas used"
          value={
            receipt.gasUsed && receipt.gasWanted
              ? `${Number(receipt.gasUsed).toLocaleString('en-US')} / ${Number(receipt.gasWanted).toLocaleString('en-US')}`
              : '—'
          }
        />
        {receipt.memo ? <DataRow label="Memo" value={receipt.memo} mono={false} /> : null}
        {receipt.messages.length > 1 ? (
          <DataRow label="Messages" value={`${receipt.messages.length} in this transaction`} />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Transaction hash</Label>
        <button
          type="button"
          onClick={async () => {
            const ok = await copyText(hash)
            hub.flash(ok ? 'Transaction hash copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
          }}
          className="cursor-pointer rounded-control border border-line-edge bg-ink-800 px-3 py-2.5 text-left font-mono text-small break-all text-text-secondary hover:border-line-accent"
        >
          {hash}
        </button>
      </div>
    </Drawer>
  )
}
