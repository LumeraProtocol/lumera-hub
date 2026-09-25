// apps/web/src/app/wallet/page.tsx
'use client'
import { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

import useAccountInfo from '@/hooks/useAccountInfo'
import useTransaction from '@/hooks/useTransaction'
import useSend from '@/hooks/useSend'
import useChainParams from '@/hooks/useChainParams'
import useLoadSettled from '@/hooks/useLoadSettled'
import { RATE_VALUE } from '@/contants'
import { DENOM, EVM_CHAIN_ID } from '@/contants/network'
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`

/** "2h ago" within the week, a date after that — the design's time column. */
const whenOf = (ms?: number) => {
  if (!ms) return ''
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000))
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const d = new Date(ms)
  return `${dayMonth(d)} ${d.getFullYear()}`
}

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

const readableKind = (msgType: string, direction: TxRow['direction']) => {
  if (/MsgSend$/.test(msgType) && direction === 'in') return 'Receive'
  const bare = msgType.split('.').pop()?.replace(/^Msg/, '') || 'Transaction'
  return bare
    .replace(/BeginRedelegate/, 'Redelegate')
    .replace(/WithdrawDelegatorReward/, 'Claim rewards')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
}

/*
 * The amount a message moved, where the message itself carries one: a send's
 * coin list, a delegation's single coin, an IBC transfer's token. Claims and
 * votes carry none — a claim's amount only exists in the events — so those
 * rows show a dash rather than something that is not an amount.
 */
const coinOf = (msg: Record<string, unknown>): { amount?: string; denom?: string } | undefined => {
  const raw = msg.amount ?? msg.token
  if (Array.isArray(raw)) {
    const coins = raw as Array<{ amount?: string; denom?: string }>
    return coins.find((c) => c?.denom === DENOM) ?? coins[0]
  }
  if (raw && typeof raw === 'object') return raw as { amount?: string; denom?: string }
  return undefined
}

export default function Page() {
  const hub = useHub()
  // Watch mode reads a different address than the connected wallet, so both
  // the balances and the history follow the hub's current subject.
  const account = useAccountInfo(hub.isWatching ? { address: hub.address } : {})
  const { accountInfo, loading, fetchData } = account
  const settled = useLoadSettled(loading, hub.address)

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
        const direction = directionOf(msgType, hub.address, message)
        const validator = message.validator_address || message.validator_dst_address
        const counterparty = direction === 'in' ? message.from_address : message.to_address
        const target = validator
          ? short(String(validator), 14, 6)
          : counterparty
            ? short(String(counterparty), 12, 4)
            : null
        const coin = coinOf(message)
        const micro = !coin?.denom || coin.denom === DENOM ? Number(coin?.amount) || 0 : 0
        return {
          key: tx.txhash,
          kind: readableKind(msgType, direction),
          detail: target
            ? `${direction === 'in' ? '←' : '→'} ${target}`
            : `Block #${Number(tx.height).toLocaleString('en-US')}`,
          amount: micro ? `${lume(micro)} ${TOKEN}` : '—',
          hash: short(tx.txhash, 6, 4),
          when: whenOf(timestamp),
          timestamp,
          status: tx.code === 0 ? 'Success' : 'Failed',
          direction,
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
          // it did not load there is no honest denominator, so no bar — and
          // no start date either, since that is the same subtraction.
          const periodMs = chainParams.unbondingSeconds
            ? chainParams.unbondingSeconds * 1000
            : null
          const pct = periodMs
            ? Math.min(100, Math.max(0, ((periodMs - msLeft) / periodMs) * 100))
            : null
          const started = completes && periodMs ? new Date(completes.getTime() - periodMs) : null
          return {
            key: `${u.validator_address}-${i}`,
            validator: short(u.validator_address, 14, 6),
            initials: initialsOf(u.validator_address.replace('lumeravaloper', '')),
            amount: `${lume(Number(entry.balance) || 0)} ${TOKEN}`,
            started: started ? dayMonth(started) : undefined,
            completes: completes ? dayMonth(completes) : '—',
            remaining: completes ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : '—',
            pct,
          }
        }),
      ),
    [accountInfo?.unbonding, chainParams.unbondingSeconds],
  )

  // The last few addresses this wallet sent to, for Send's recent list.
  const recents = useMemo(() => {
    const seen = new Set<string>()
    const list: Array<{ address: string; note: string }> = []
    for (const tx of transactions || []) {
      const message = (tx.tx?.body?.messages?.[0] || {}) as Record<string, unknown>
      if (!/MsgSend$/.test(String(message['@type'] || ''))) continue
      const to = String(message.to_address || '')
      if (!to || to === hub.address || seen.has(to)) continue
      seen.add(to)
      const when = whenOf(tx.timestamp ? Date.parse(tx.timestamp) : undefined)
      list.push({ address: to, note: when ? `Sent ${when === 'Just now' ? 'just now' : when}` : 'Sent before' })
      if (list.length === 3) break
    }
    return list
  }, [hub.address, transactions])

  // Only a finished read can say the wallet holds nothing and never has.
  const empty =
    hub.isConnected &&
    settled &&
    !isTxLoading &&
    !liquid &&
    !staked &&
    !rewards &&
    !unbonding &&
    !(transactions || []).length

  return (
    <>
      <Helmet>
        <title>Wallet - Lumera Hub</title>
      </Helmet>

      <WalletScreen
        loading={loading || isTxLoading}
        empty={empty}
        // Everything the address owns, so the total and the bar under it
        // describe the same thing.
        totalAmount={lume(liquid + staked + unbonding + rewards)}
        denom={TOKEN}
        liquid={lume(liquid)}
        staked={lume(staked)}
        unbonding={lume(unbonding)}
        rewards={lume(rewards)}
        split={{ liquid, staked, unbonding, rewards }}
        transactions={rows}
        unbondingRows={unbondingRows}
        unbondingTotal={unbonding ? `${lume(unbonding)} ${TOKEN}` : undefined}
        wallets={EVM_CHAIN_ID ? ['Keplr', 'MetaMask'] : ['Keplr']}
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
        recents={recents}
        onReview={({ to, amount, memo }) => {
          send.handleInputChange('recipient', to)
          send.handleInputChange('amount', amount)
          // Always set the memo, even to empty: useSend only clears it on a
          // successful send, so a cancelled send that carried a memo would
          // otherwise leak it into the next, memo-less send.
          send.handleInputChange('memo', memo)
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
        memo={send.optionsAdvanced.memo}
        onMemoChange={(v) => send.handleInputChange('memo', v)}
        gasLimit={send.optionsAdvanced.gas}
        onGasLimitChange={(v) => send.handleInputChange('gas', v)}
        onDone={() => void fetchData()}
      />
    </>
  )
}
