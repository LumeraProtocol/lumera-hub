'use client'

/*
 * The one signing drawer.
 *
 * Every action that broadcasts — delegate, undelegate, redelegate, claim,
 * send, vote, deposit, submit proposal — mounts this with its own broadcast
 * function. It owns the review → sign → receipt sequence, the Advanced block,
 * and the three distinct endings, so none of that is written twice.
 *
 * Outcome is derived from what the underlying hook reports: a transaction hash
 * means confirmed, an error string means it did not land. Wallet rejections are
 * told apart from chain failures because the two have different consequences —
 * a declined signature costs nothing, a failed broadcast has already spent the
 * fee.
 */

import React, { useEffect, useRef, useState } from 'react'

import { PORTAL_URL, CHAIN_ID } from '@/contants/network'
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Drawer, TxFlow, TxFooter, type TxOutcome, type TxStep } from '@lumera-hub/ui/src/hub/Drawer'

const REJECTION_PATTERNS = /request rejected|user rejected|rejected by user|declined|denied/i

export function TxDrawer({
  onBroadcast,
  error,
  transactionHash,
  blockHeight,
  onDone,
}: {
  /** Broadcasts the transaction. Should resolve once the wallet has answered. */
  onBroadcast: () => Promise<void> | void
  /** Error string from the owning hook, if the attempt failed. */
  error?: string
  /** Hash from the owning hook, set once the transaction lands. */
  transactionHash?: string
  blockHeight?: string
  onDone?: () => void
}) {
  const hub = useHub()
  const [step, setStep] = useState<TxStep>('review')
  const [outcome, setOutcome] = useState<TxOutcome>('success')
  const [gasLimit, setGasLimit] = useState('200000')
  const [memo, setMemo] = useState('')
  const broadcasting = useRef(false)

  const drawer = hub.drawer
  const open = drawer?.kind === 'tx'
  const intent = drawer?.kind === 'tx' ? drawer.intent : null

  // Reset whenever the drawer opens for a new action.
  useEffect(() => {
    if (open) {
      setStep('review')
      setOutcome('success')
      broadcasting.current = false
    }
  }, [open])

  // Resolve the outcome once the hook reports back.
  useEffect(() => {
    if (!open || !broadcasting.current) return
    if (transactionHash) {
      broadcasting.current = false
      setOutcome('success')
      setStep('done')
      onDone?.()
    } else if (error) {
      broadcasting.current = false
      setOutcome(REJECTION_PATTERNS.test(error) ? 'rejected' : 'failed')
      setStep('done')
    }
  }, [error, onDone, open, transactionHash])

  if (!open || !intent) return null

  const advance = async () => {
    if (step === 'review') {
      setStep('signing')
      broadcasting.current = true
      try {
        await onBroadcast()
      } catch (e) {
        broadcasting.current = false
        setOutcome(REJECTION_PATTERNS.test(String(e)) ? 'rejected' : 'failed')
        setStep('done')
      }
      return
    }
    if (step === 'done' && outcome !== 'success') {
      setStep('review')
      return
    }
    if (step === 'done') {
      hub.closeDrawer()
      hub.flash('Transaction confirmed')
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
        txHash={transactionHash}
        blockHeight={blockHeight}
        errorDetail={outcome === 'failed' ? error : undefined}
        explorerUrl={transactionHash ? `${PORTAL_URL}tx/${transactionHash}` : undefined}
        chainId={CHAIN_ID}
        from={hub.address}
        gasLimit={gasLimit}
        onGasLimitChange={setGasLimit}
        memo={memo}
        onMemoChange={setMemo}
      />
    </Drawer>
  )
}
