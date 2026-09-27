'use client'

/*
 * The drawer shell.
 *
 * The old app shipped ten dialogs that each re-implemented the same three
 * things: a summary of what is about to happen, an Advanced block for fee, gas
 * and memo, and a success screen with a link to the explorer. All of that now
 * lives in `TxFlow` below, and every drawer variant is just a body rendered
 * into this frame.
 */

import React, { useEffect, useRef } from 'react'
import { cx, Label } from '../design/primitives'
import { CloseIcon } from '../design/icons'
import { useHub, type Intent } from './session'

/**
 * The design's drawer footer buttons. The secondary keeps its width and the
 * primary takes the rest; both set their label at line-height 1, which the
 * shared Button sizes do not.
 */
export const drawerButton = {
  secondary:
    'flex-none cursor-pointer rounded-control border border-line-edge bg-transparent px-5 py-[13px] text-base leading-none font-medium text-text-secondary transition-colors hover:border-line-accent',
  secondaryWide:
    'flex-1 cursor-pointer rounded-control border border-line-edge bg-transparent py-[13px] text-base leading-none font-medium text-text-secondary transition-colors hover:border-line-accent',
  primary:
    'flex-1 cursor-pointer rounded-control border-none bg-lumera-green py-[13px] text-base leading-none font-semibold text-ink-800 transition-colors hover:bg-lumera-green-bright disabled:cursor-not-allowed disabled:bg-ink-500 disabled:text-text-disabled',
}

export function Drawer({
  title,
  children,
  footer,
  onClose,
}: {
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)

  // Escape closes; focus moves into the panel so the drawer is reachable from
  // the keyboard the moment it opens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Hold the page still while the drawer is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <>
      <div
        onClick={onClose}
        className="animate-fade fixed inset-0 z-40 bg-[rgba(0,8,20,.62)]"
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Drawer'}
        tabIndex={-1}
        className="animate-drawer fixed top-0 right-0 bottom-0 z-41 flex w-full max-w-[428px] flex-col border-l border-line-edge bg-ink-700 shadow-[-24px_0_60px_rgba(0,6,16,.55)] outline-none"
        style={{ zIndex: 41 }}
      >
        <div className="flex flex-none items-center justify-between gap-3.5 border-b border-line-hairline px-5 py-[18px]">
          <h2 className="m-0 text-lg leading-tight font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-inner border border-line-edge bg-transparent text-text-muted transition-colors hover:text-text-primary"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-[18px]">{children}</div>

        {footer ? (
          <div className="flex flex-none gap-[9px] border-t border-line-hairline px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  )
}

/**
 * The banner at the top of the connect drawer that names the action the reader
 * was in the middle of. Without it, "connect your wallet" is a non-sequitur.
 */
export function IntentBanner({ intent }: { intent: Intent }) {
  return (
    <div className="flex gap-3 rounded-[9px] border border-line-edge bg-ink-800 px-3.5 py-[13px]">
      <div className="w-[3px] flex-none rounded-full bg-[linear-gradient(180deg,var(--color-lumera-teal),var(--color-lumera-green))]" />
      <div className="flex flex-col gap-1">
        <Label>Waiting on you</Label>
        <span className="text-base leading-[1.35] font-medium text-text-primary">
          {intent.title}
        </span>
        <span className="text-small leading-[1.45] text-text-muted">{intent.line}</span>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- tx flow */

export type TxStep = 'review' | 'signing' | 'done'
export type TxOutcome = 'success' | 'rejected' | 'failed'

/**
 * Review → Sign → Receipt. Written once, used by every signing action.
 *
 * The three outcomes are distinct on purpose: declining a signature costs
 * nothing, while a chain rejection has already charged the fee, and the reader
 * needs to know which happened.
 */
export function TxFlow({
  intent,
  step,
  outcome,
  txHash,
  blockHeight,
  gasUsed,
  chargedFee,
  errorDetail,
  explorerUrl,
  chainId,
  fee,
  from,
  gasLimit,
  onGasLimitChange,
  memo,
  onMemoChange,
}: {
  intent: Intent
  step: TxStep
  outcome: TxOutcome
  txHash?: string
  blockHeight?: string
  /** "148,204 / 200,000" once the chain has been read back. */
  gasUsed?: string
  /** The fee actually charged, which is only known after inclusion. */
  chargedFee?: string
  errorDetail?: string
  explorerUrl?: string
  chainId: string
  /** Pre-signing estimate. The charged figure replaces it on the receipt. */
  fee?: string
  from?: string
  gasLimit: string
  onGasLimitChange: (v: string) => void
  memo: string
  onMemoChange: (v: string) => void
}) {
  const [advanced, setAdvanced] = React.useState(false)
  const gasNumber = parseInt(gasLimit.replace(/\D/g, ''), 10) || 0
  const gasTooLow = gasNumber > 0 && gasNumber < 100000

  const stepIndex = step === 'review' ? 0 : step === 'signing' ? 1 : 2
  const stepLabel =
    step === 'review'
      ? 'Step 1 of 3 · Review'
      : step === 'signing'
        ? 'Step 2 of 3 · Sign'
        : outcome === 'rejected'
          ? 'Step 3 of 3 · Declined'
          : outcome === 'failed'
            ? 'Step 3 of 3 · Failed'
            : 'Step 3 of 3 · Confirmed'

  const summary: Array<{ k: string; v: string; tone: string }> = [
    { k: 'Action', v: intent.title, tone: 'text-text-primary' },
    { k: intent.lineLabel || 'Details', v: intent.line, tone: 'text-text-secondary' },
    ...(from ? [{ k: 'From', v: from, tone: 'text-text-secondary' }] : []),
    ...(intent.extra
      ? [
          {
            k: intent.extra.k,
            v: intent.extra.v,
            tone:
              intent.extra.tone === 'green'
                ? 'text-lumera-green'
                : intent.extra.tone === 'warn'
                  ? 'text-warn'
                  : intent.extra.tone === 'danger'
                    ? 'text-danger'
                    : 'text-text-secondary',
          },
        ]
      : []),
    ...(fee ? [{ k: 'Network fee', v: fee, tone: 'text-text-muted' }] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={3}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cx(
              'h-[3px] flex-1 rounded-full transition-colors',
              i > stepIndex
                ? 'bg-line-hairline'
                : i === 2 && outcome === 'failed'
                  ? 'bg-danger'
                  : i === 2 && outcome === 'rejected'
                    ? 'bg-warn'
                    : 'bg-lumera-green',
            )}
          />
        ))}
      </div>
      <Label>{stepLabel}</Label>

      <div className="overflow-hidden rounded-[9px] border border-line-hairline bg-ink-800">
        {summary.map((r, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-4 border-b border-ink-500 px-3.5 py-3 last:border-b-0"
          >
            <span className="flex-none text-base leading-none text-text-muted">{r.k}</span>
            <span className={cx('text-right font-mono text-base leading-none font-medium tnum', r.tone)}>
              {r.v}
            </span>
          </div>
        ))}
      </div>

      {step === 'review' ? (
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="cursor-pointer self-start border-none bg-transparent p-0 text-small leading-none font-medium text-text-muted hover:text-lumera-green"
        >
          {advanced ? '− Advanced' : '+ Advanced · fee, gas, memo'}
        </button>
      ) : null}

      {step === 'review' && advanced ? (
        <div className="flex flex-col gap-2.5 rounded-[9px] border border-line-hairline bg-ink-800 px-3.5 py-[13px]">
          <div className="flex flex-col gap-1.5">
            <Label>Gas limit</Label>
            <input
              value={gasLimit}
              inputMode="numeric"
              onChange={(e) => onGasLimitChange(e.target.value.replace(/[^0-9]/g, ''))}
              className={cx(
                'rounded-inner border bg-ink-800 px-[11px] py-[9px] font-mono text-base text-text-primary outline-none',
                gasTooLow ? 'border-danger-edge' : 'border-line-edge focus:border-line-accent',
              )}
            />
            {gasTooLow ? (
              <span className="text-small leading-[1.4] text-danger">
                Below the 100,000 this message needs — it will run out of gas.
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Memo</Label>
            <input
              value={memo}
              placeholder="Optional"
              maxLength={256}
              onChange={(e) => onMemoChange(e.target.value)}
              className="rounded-inner border border-line-edge bg-ink-800 px-[11px] py-[9px] font-mono text-base text-text-primary outline-none placeholder:text-text-disabled focus:border-line-accent"
            />
          </div>
        </div>
      ) : null}

      {step === 'signing' ? (
        <div className="flex items-center gap-[11px] rounded-[9px] border border-line-edge bg-ink-800 p-3.5">
          <span
            className="h-[7px] w-[7px] flex-none rounded-full bg-warn"
            style={{ animation: 'lmBlink 1.1s infinite' }}
          />
          <span className="text-base leading-[1.5] text-text-muted">
            Waiting for a signature in your wallet, then broadcasting to the network.
          </span>
        </div>
      ) : null}

      {step === 'done' && outcome === 'success' ? (
        <div className="flex flex-col gap-[11px] rounded-[9px] border border-line-accent bg-lumera-teal/10 p-[15px]">
          <span className="text-base leading-none font-semibold text-lumera-green">
            {blockHeight ? `Confirmed in block ${blockHeight}` : 'Broadcast to the network'}
          </span>
          {!blockHeight ? (
            <span className="text-small leading-[1.5] text-text-muted text-pretty">
              The transaction was accepted but has not been indexed yet. It will appear in the
              explorer within a block or two.
            </span>
          ) : null}
          {chargedFee || gasUsed ? (
            <div className="flex flex-col gap-1.5 border-t border-line-accent/40 pt-2.5">
              {chargedFee ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-small text-text-muted">Fee charged</span>
                  <span className="font-mono text-small tnum text-text-secondary">
                    {chargedFee}
                  </span>
                </div>
              ) : null}
              {gasUsed ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-small text-text-muted">Gas used</span>
                  <span className="font-mono text-small tnum text-text-secondary">{gasUsed}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {txHash ? (
            <span className="font-mono text-small break-all text-text-muted">{txHash}</span>
          ) : null}
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-base leading-none font-medium text-lumera-green"
            >
              View in explorer →
            </a>
          ) : null}
        </div>
      ) : null}

      {step === 'done' && outcome === 'rejected' ? (
        <div className="flex flex-col gap-[11px] rounded-[9px] border border-warn-edge bg-warn/8 p-[15px]">
          <div className="flex items-center gap-[9px]">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-warn)"
              strokeWidth="2"
              strokeLinecap="round"
              className="flex-none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16.5v.01" />
            </svg>
            <span className="text-base leading-none font-semibold text-warn">You declined the signature</span>
          </div>
          <p className="m-0 text-base leading-[1.6] text-text-secondary text-pretty">
            Nothing was broadcast and nothing was spent — not even the network fee. Your balances
            are unchanged.
          </p>
          <span className="text-small leading-[1.5] text-text-muted">
            If you did not see a prompt, check that your wallet extension is unlocked and set to{' '}
            {chainId}.
          </span>
        </div>
      ) : null}

      {step === 'done' && outcome === 'failed' ? (
        <div className="flex flex-col gap-[11px] rounded-[9px] border border-danger-edge bg-danger/8 p-[15px]">
          <div className="flex items-center gap-[9px]">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="2"
              strokeLinecap="round"
              className="flex-none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
            <span className="text-base leading-none font-semibold text-danger">Rejected by the chain</span>
          </div>
          <p className="m-0 text-base leading-[1.6] text-text-secondary text-pretty">
            {blockHeight
              ? `The transaction reached block ${blockHeight} but did not complete. The fee was still charged.`
              : 'The transaction was broadcast but did not complete. The fee was still charged.'}
          </p>
          {gasUsed ? (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-small text-text-muted">Gas used</span>
              <span className="font-mono text-small tnum text-text-secondary">{gasUsed}</span>
            </div>
          ) : null}
          {errorDetail ? (
            <div className="rounded-inner border border-line-edge bg-ink-800 px-3 py-[11px]">
              <span className="font-mono text-small leading-[1.4] text-text-muted [overflow-wrap:anywhere]">
                {errorDetail}
              </span>
            </div>
          ) : null}
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-base leading-none font-medium text-lumera-green"
            >
              View failed transaction →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Standard footer for the transaction flow. */
export function TxFooter({
  step,
  outcome,
  onAdvance,
  onCancel,
  ctaLabel,
  disabled,
}: {
  step: TxStep
  outcome: TxOutcome
  onAdvance: () => void
  onCancel: () => void
  ctaLabel?: string
  disabled?: boolean
}) {
  const label =
    ctaLabel ??
    (step === 'review'
      ? 'Sign and broadcast'
      : step === 'signing'
        ? 'Signing…'
        : outcome === 'success'
          ? 'Done'
          : 'Try again')
  const showCancel = step === 'done' && outcome !== 'success'
  return (
    <>
      {showCancel ? (
        <button type="button" onClick={onCancel} className={drawerButton.secondary}>
          Cancel
        </button>
      ) : null}
      <button
        type="button"
        onClick={onAdvance}
        disabled={disabled || step === 'signing'}
        className={drawerButton.primary}
      >
        {label}
      </button>
    </>
  )
}

/* ---------------------------------------------------------------- toasts */

export function ToastStack() {
  const { toasts, dismissToast } = useHub()
  if (!toasts.length) return null
  return (
    <div
      className="pointer-events-none fixed bottom-[26px] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={cx(
            'animate-rise pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-[9px] border bg-ink-600 px-4 py-3 shadow-[0_12px_32px_rgba(0,6,16,.5)]',
            t.tone === 'error'
              ? 'border-danger-edge'
              : t.tone === 'warn'
                ? 'border-warn-edge'
                : 'border-line-accent',
          )}
        >
          <span
            className={cx(
              'h-1.5 w-1.5 flex-none rounded-full',
              t.tone === 'error' ? 'bg-danger' : t.tone === 'warn' ? 'bg-warn' : 'bg-lumera-green',
            )}
          />
          <span className="text-base leading-none font-medium text-text-primary">{t.message}</span>
        </button>
      ))}
    </div>
  )
}
