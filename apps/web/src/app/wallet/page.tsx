// apps/web/src/app/wallet/page.tsx
'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Helmet } from 'react-helmet-async'

import useAccountInfo from '@/hooks/useAccountInfo'
import useTransaction from '@/hooks/useTransaction'
import useSend from '@/hooks/useSend'
import useChainParams from '@/hooks/useChainParams'
import { RATE_VALUE } from '@/contants'
import { DENOM } from '@/contants/network'
import { formatNumber } from '@/utils/format'
import {
  getAvailableBalances,
  getDelegations,
  getRewards,
  getUnbonding,
} from '@/utils/portfolio'
import { WalletScreen, type TxRow, type UnbondingRow } from '@lumera-hub/ui/src/screens/hub/WalletScreen'
import { useHub, copyText, short } from '@lumera-hub/ui/src/hub/session'
import { TxDrawer } from '@/components/hub/TxDrawer'
import { SendDrawer, ReceiveDrawer } from '@/components/hub/TransferDrawers'
import { TxDetailDrawer } from '@/components/hub/TxDetailDrawer'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

const lume = (micro: number, digits = 2) =>
  formatNumber(micro / RATE_VALUE, { decimalsLength: digits, currency: 'en-US' })

const initialsOf = (name: string) =>
  String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '··'

/** Cosmos message types map onto the three filter groups the reader sees. */
const groupOf = (msgType: string): TxRow['group'] => {
  if (/MsgSend|MsgMultiSend|Transfer/.test(msgType)) return 'transfers'
  if (/MsgVote|MsgDeposit|MsgSubmitProposal/.test(msgType)) return 'governance'
  return 'staking'
}

const directionOf = (msgType: string, mine: string, msg: Record<string, unknown>): TxRow['direction'] => {
  if (/MsgWithdrawDelegatorReward|MsgWithdrawValidatorCommission/.test(msgType)) return 'in'
  if (/MsgSend/.test(msgType)) {
    if (msg.to_address === mine) return 'in'
    return 'out'
  }
  if (/MsgVote|MsgSubmitProposal/.test(msgType)) return 'none'
  return 'out'
}

const readableKind = (msgType: string) => {
  const bare = msgType.split('.').pop()?.replace(/^Msg/, '') || 'Transaction'
  return bare
    .replace(/BeginRedelegate/, 'Redelegate')
    .replace(/WithdrawDelegatorReward/, 'Claim rewards')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
}

export default function Page() {
  const router = useRouter()
  const hub = useHub()
  // Watch mode reads a different address than the connected wallet, so both
  // the balances and the history follow the hub's current subject.
  const account = useAccountInfo(hub.isWatching ? { address: hub.address } : {})
  const { accountInfo, loading, fetchData } = account

  // Watch mode reads a different address than the connected one, so the
  // history query follows the hub's current subject rather than the wallet.
  const { transactions, isLoading: isTxLoading } = useTransaction(
    hub.isWatching ? { address: hub.address } : {},
  )

  const { params: chainParams } = useChainParams()

  const send = useSend({
    callback: () => {
      void fetchData()
    },
    customMemo: '',
  })

  useEffect(() => {
    document.title = 'Wallet - Lumera Hub'
  }, [])

  const liquid = getAvailableBalances(accountInfo)
  const staked = getDelegations(accountInfo)
  const rewards = getRewards(accountInfo)
  const unbonding = getUnbonding(accountInfo)

  const rows: TxRow[] = useMemo(
    () =>
      (transactions || []).map((tx) => {
        const message = (tx.tx?.body?.messages?.[0] || {}) as Record<string, unknown>
        const msgType = String(message['@type'] || '')
        const timestamp = tx.timestamp ? Date.parse(tx.timestamp) : undefined
        const validator = message.validator_address || message.validator_dst_address
        const counterparty = message.to_address || message.from_address
        return {
          key: tx.txhash,
          kind: readableKind(msgType),
          detail: validator
            ? short(String(validator), 14, 6)
            : counterparty
              ? short(String(counterparty), 12, 4)
              : `Block #${Number(tx.height).toLocaleString('en-US')}`,
          amount: `#${Number(tx.height).toLocaleString('en-US')}`,
          hash: short(tx.txhash, 6, 4),
          when: timestamp ? new Date(timestamp).toLocaleDateString() : '',
          timestamp,
          status: tx.code === 0 ? 'Success' : 'Failed',
          direction: directionOf(msgType, hub.address, message),
          group: groupOf(msgType),
          onOpen: () => hub.openDrawer({ kind: 'txdetail', hash: tx.txhash }),
        }
      }),
    [hub, transactions],
  )

  const unbondingRows: UnbondingRow[] = useMemo(
    () =>
      (accountInfo?.unbonding || []).flatMap((u) =>
        u.entries.map((entry, i) => {
          const completes = entry.completion_time ? new Date(entry.completion_time) : null
          const msLeft = completes ? Math.max(0, completes.getTime() - Date.now()) : 0
          const daysLeft = completes ? Math.ceil(msLeft / 86400000) : 0
          // Progress is measured against the chain's own unbonding period. If
          // it did not load there is no honest denominator, so no bar.
          const periodMs = chainParams.unbondingSeconds
            ? chainParams.unbondingSeconds * 1000
            : null
          const pct = periodMs
            ? Math.min(100, Math.max(0, ((periodMs - msLeft) / periodMs) * 100))
            : null
          return {
            key: `${u.validator_address}-${i}`,
            validator: short(u.validator_address, 14, 6),
            initials: initialsOf(u.validator_address.replace('lumeravaloper', '')),
            amount: `${lume(Number(entry.balance) || 0)} ${TOKEN}`,
            completes: completes ? completes.toLocaleDateString() : '—',
            remaining: completes ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : '—',
            pct,
          }
        }),
      ),
    [accountInfo?.unbonding, chainParams.unbondingSeconds],
  )

  return (
    <>
      <Helmet>
        <title>Wallet - Lumera Hub</title>
      </Helmet>

      <WalletScreen
        loading={loading || isTxLoading}
        total={`${lume(liquid + staked)} ${TOKEN}`}
        liquid={lume(liquid)}
        staked={lume(staked)}
        unbonding={lume(unbonding)}
        rewards={lume(rewards)}
        transactions={rows}
        unbondingRows={unbondingRows}
        onSend={() =>
          hub.gate(
            { title: `Send ${TOKEN}`, line: 'Transfers require a signature from this address' },
            () => hub.openDrawer({ kind: 'send' }),
          )
        }
        onReceive={() => hub.openDrawer({ kind: 'receive' })}
        onCopyAddress={async () => {
          const ok = await copyText(hub.address)
          hub.flash(ok ? 'Address copied' : 'Press ⌘C to copy', ok ? 'ok' : 'warn')
        }}
      />

      <SendDrawer
        availableMicro={liquid}
        onReview={({ to, amount, memo }) => {
          send.handleInputChange('recipient', to)
          send.handleInputChange('amount', amount)
          if (memo) send.handleInputChange('memo', memo)
          hub.openDrawer({
            kind: 'tx',
            intent: {
              title: `Send ${formatNumber(Number(amount), { decimalsLength: 2, currency: 'en-US' })} ${TOKEN}`,
              lineLabel: 'Recipient',
              line: short(to),
              ...(memo ? { extra: { k: 'Memo', v: memo } } : {}),
            },
          })
        }}
      />
      <ReceiveDrawer />
      <TxDetailDrawer />

      <TxDrawer
        onBroadcast={send.handleSendClick}
        error={send.error}
        transactionHash={send.transactionHash}
        onDone={() => void fetchData()}
      />
    </>
  )
}
