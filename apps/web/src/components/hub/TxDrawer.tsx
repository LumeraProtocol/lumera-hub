'use client'

/*
 * The one signing drawer.
 *
 * Every action that broadcasts — delegate, undelegate, redelegate, claim,
 * send, vote, deposit, submit proposal — mounts this with its own broadcast
 * function. It owns the review, sign and receipt sequence, the Advanced block,
 * and the three distinct endings, so none of that is written twice.
 *
 * Outcome comes from the chain, not from the presence of a hash. A hash only
 * means the transaction was broadcast; it can still be included in a block and
 * fail there, which charges the fee. useTxReceipt reads the transaction back to
 * get the real code, height, gas and fee.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { CHAIN_ID, DENOM } from '@/contants/network'
import { GAS_LIMIT, FEE_RATIO, RATE_VALUE } from '@/contants'
import useTxReceipt from '@/hooks/useTxReceipt'
import { explorerTxUrl } from '@/utils/explorer'
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Drawer, TxFlow, TxFooter, type TxOutcome, type TxStep } from '@lumera-hub/ui/src/hub/Drawer'

const TOKEN = DENOM.replace(/^u/, '').toUpperCase()

const REJECTION_PATTERNS = /request rejected|user rejected|rejected by user|declined|denied|user denied/i

/**
 * What the fee will be at the app's default gas limit and gas price. The real
 * figure is only known once the wallet has simulated the message, so this is
 * shown as an estimate and replaced by the charged amount on the receipt.
 */
const estimatedFee = () => {
  const micro = Math.ceil(Number(GAS_LIMIT) * FEE_RATIO)
  return `~${(micro / RATE_VALUE).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${TOKEN}`
}

export function TxDrawer({
  onBroadcast,
  error,
  transactionHash,
  onDone,
  memo: memoProp,
  onMemoChange,
  gasLimit: gasLimitProp,
  onGasLimitChange,
}: {
  /** Broadcasts the transaction. Should resolve once the wallet has answered. */
  onBroadcast: () => Promise<void> | void
  /** Error string from the owning hook, if the attempt never reached a block. */
  error?: string
  /** Hash from the owning hook, set once the transaction is broadcast. */
  transactionHash?: string
  onDone?: () => void
  /**
   * Advanced-block memo and gas, bound to the owning hook when provided, so an
   * edit here actually reaches the broadcast (and a memo the hook already holds,
   * e.g. "Stake for X", is shown). Unbound, the drawer keeps its own copy — the
   * old behaviour, where the edits went nowhere.
   */
  memo?: string
  onMemoChange?: (value: string) => void
  gasLimit?: string
  onGasLimitChange?: (value: string) => void
}) {
  const hub = useHub()
  const [step, setStep] = useState<TxStep>('review')
  const [localOutcome, setLocalOutcome] = useState<TxOutcome | null>(null)
  // Fallback state for the flows that do not bind the Advanced block to a hook.
  const [localGasLimit, setLocalGasLimit] = useState(GAS_LIMIT)
  const [localMemo, setLocalMemo] = useState('')
  const gasLimit = gasLimitProp ?? localGasLimit
  const memo = memoProp ?? localMemo
  const setGasLimit = onGasLimitChange ?? setLocalGasLimit
  const setMemo = onMemoChange ?? setLocalMemo
  const [hash, setHash] = useState<string | undefined>(undefined)
  const broadcasting = useRef(false)
  const settled = useRef(false)
  // The hook's hash at the moment this broadcast started, so a hash left over
  // from a previous send is not mistaken for this one's result.
  const priorHash = useRef<string | undefined>(undefined)

  const drawer = hub.drawer
  const open = drawer?.kind === 'tx'
  const intent = drawer?.kind === 'tx' ? drawer.intent : null

  const { receipt, isLoading: isReceiptLoading } = useTxReceipt(hash)

  // Reset whenever the drawer opens for a new action. Only the local fallback
  // memo/gas are cleared — a bound hook owns its own copy (and may already hold
  // a memo like "Stake for X"), so clearing that here would wipe it.
  useEffect(() => {
    if (open) {
      setStep('review')
      setLocalOutcome(null)
      setHash(undefined)
      setLocalGasLimit(GAS_LIMIT)
      setLocalMemo('')
      broadcasting.current = false
      settled.current = false
      priorHash.current = undefined
    }
  }, [open])

  // A hash means broadcast, not success — hold at "signing" until the chain
  // has been read back.
  useEffect(() => {
    if (!open || !broadcasting.current) return
    // Adopt only a hash produced by THIS broadcast. The owning hook may still be
    // holding the previous send's hash, and reading that tx back would report an
    // earlier, unrelated success (or failure) as this attempt's outcome.
    if (transactionHash && transactionHash !== priorHash.current && transactionHash !== hash) {
      setHash(transactionHash)
      return
    }
    // No new hash and the hook reported an error: the attempt never reached a
    // block (a rejected signature, a failed simulate). The stale-hash guard
    // means "no new hash" covers both an empty hash and the leftover one.
    if (error && (!transactionHash || transactionHash === priorHash.current)) {
      broadcasting.current = false
      settled.current = true
      setLocalOutcome(REJECTION_PATTERNS.test(error) ? 'rejected' : 'failed')
      setStep('done')
    }
  }, [error, hash, open, transactionHash])

  // Settle once the receipt resolves, or once the lookup gives up.
  useEffect(() => {
    if (!open || !hash || settled.current) return
    if (receipt.code != null) {
      broadcasting.current = false
      settled.current = true
      setLocalOutcome(receipt.code === 0 ? 'success' : 'failed')
      setStep('done')
      if (receipt.code === 0) onDone?.()
    } else if (!isReceiptLoading) {
      // Broadcast succeeded but the index never answered. Report it as sent
      // rather than claiming a confirmation we did not see.
      broadcasting.current = false
      settled.current = true
      setLocalOutcome('success')
      setStep('done')
      onDone?.()
    }
  }, [hash, isReceiptLoading, onDone, open, receipt.code])

  const outcome: TxOutcome = localOutcome ?? 'success'

  const errorDetail = useMemo(() => {
    if (outcome !== 'failed') return undefined
    if (receipt.rawLog) return receipt.rawLog
    return error
  }, [error, outcome, receipt.rawLog])

  if (!open || !intent) return null

  const advance = async () => {
    if (step === 'review') {
      setStep('signing')
      broadcasting.current = true
      settled.current = false
      // Snapshot the hook's current hash so the effect can distinguish a hash
      // this broadcast produces from one it was already holding.
      priorHash.current = transactionHash
      try {
        await onBroadcast()
      } catch (e) {
        broadcasting.current = false
        settled.current = true
        setLocalOutcome(REJECTION_PATTERNS.test(String(e)) ? 'rejected' : 'failed')
        setStep('done')
      }
      return
    }
    if (step === 'done' && outcome !== 'success') {
      setStep('review')
      setLocalOutcome(null)
      setHash(undefined)
      settled.current = false
      return
    }
    if (step === 'done') {
      hub.closeDrawer()
      hub.flash(
        receipt.height
          ? `Confirmed in block #${Number(receipt.height).toLocaleString('en-US')}`
          : 'Transaction sent',
      )
    }
  }

  return (
    <Drawer
      title="Review transaction"
      onClose={hub.closeDrawer}
      footer={
        <TxFooter
          step={step}
          outcome={outcome}
          onAdvance={() => void advance()}
          onCancel={hub.closeDrawer}
        />
      }
    >
      <TxFlow
        intent={intent}
        step={step}
        outcome={outcome}
        txHash={hash}
        blockHeight={
          receipt.height ? `#${Number(receipt.height).toLocaleString('en-US')}` : undefined
        }
        gasUsed={
          receipt.gasUsed && receipt.gasWanted
            ? `${Number(receipt.gasUsed).toLocaleString('en-US')} / ${Number(
                receipt.gasWanted,
              ).toLocaleString('en-US')}`
            : undefined
        }
        chargedFee={receipt.fee ?? undefined}
        errorDetail={errorDetail}
        explorerUrl={hash ? explorerTxUrl(hash) : undefined}
        chainId={CHAIN_ID}
        fee={estimatedFee()}
        from={hub.address}
        gasLimit={gasLimit}
        onGasLimitChange={setGasLimit}
        memo={memo}
        onMemoChange={setMemo}
      />
    </Drawer>
  )
}
