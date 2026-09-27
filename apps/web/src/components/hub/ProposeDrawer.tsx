'use client'

/*
 * Create a proposal.
 *
 * The old CreateProposalModal was 514 lines carrying its own layout, its own
 * step chrome and its own success screen. The state machine behind it is
 * sound, so this drives the same `useGovernances` wizard — type, details,
 * specifics, deposit — from the shared drawer, and hands the final submission
 * to the shared TxFlow like every other signing action.
 */

import React from 'react'

import { proposalTypes } from '@/hooks/useGovernances'
import useChainParams, { formatDuration } from '@/hooks/useChainParams'
import { depositRules } from '@/utils/governance-view'
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Drawer, drawerButton } from '@lumera-hub/ui/src/hub/Drawer'
import {
  AmountInput,
  Field,
  Input,
  Label,
  Notice,
  cx,
} from '@lumera-hub/ui/src/design/primitives'

type Proposal = {
  type: string
  title: string
  description: string
  recipient: string
  amount: string
  module: string
  key: string
  newValue: string
  upgradeVersion: string
  initialDeposit: string
}

const STEP_LABEL = [
  'Step 1 of 4 · Type',
  'Step 2 of 4 · Details',
  'Step 3 of 4 · Specifics',
  'Step 4 of 4 · Deposit',
]

/** What each proposal type is called and does, since the hook's labels do not say. */
const TYPES: Record<string, { label: string; note: string }> = {
  text: { label: 'Text', note: 'A signalling proposal with no on-chain effect' },
  parameter: { label: 'Parameter change', note: 'Change a module parameter when it passes' },
  community: { label: 'Community pool spend', note: 'Send funds from the pool to an address' },
  software: { label: 'Software upgrade', note: 'Halt and upgrade at a target block height' },
}

/** "Parameter change" — shared with the signing intent so both name it alike. */
export const proposalTypeLabel = (type: string) =>
  TYPES[type]?.label ||
  (proposalTypes.find((t) => t.value === type)?.label || 'Text').replace(/ Proposal$/, '')

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

const has = (value?: string) => !!value?.trim()

export function ProposeDrawer({
  step,
  proposal,
  requiredDeposit,
  message,
  communityPool,
  onInputChange,
  onNext,
  onBack,
  onSubmit,
}: {
  /** 1-based, from useGovernances. */
  step: number
  proposal: Proposal
  /** The minimum deposit, in LUME. */
  requiredDeposit: string
  message?: { type: string; message: string }
  /** What the community pool holds, formatted, for the spend step's hint. */
  communityPool?: string
  onInputChange: (name: string, value: string) => void
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
}) {
  const hub = useHub()
  // Shared and cached, so the deposit period and burn rules cost no request
  // once any screen has read the chain's parameters.
  const { params } = useChainParams()
  if (hub.drawer?.kind !== 'propose') return null

  const index = Math.min(3, Math.max(0, step - 1))
  const errorFor = (field: string) =>
    message?.type === field ? message.message : undefined

  const minimum = Number(requiredDeposit) || 0
  const entered = Number(proposal.initialDeposit) || 0
  const minimumLabel = `${fmt(minimum)} LUME`
  const period = formatDuration(params.maxDepositPeriodSeconds)
  // "3 days" → "3-day", for "the 3-day deposit period".
  const periodAdjective = period?.replace(/^(\d+) (day|hour)s?$/, '$1-$2')
  const rules = depositRules(params, minimumLabel)
  const note = [rules.refund, rules.short].filter(Boolean).join(' ')

  /*
   * Whether this step has what it needs. It only sets the button's colour: the
   * click still runs the hook's validation, so a gap gets named under its field
   * instead of the button going quiet.
   */
  const filled =
    step === 1
      ? true
      : step === 2
        ? has(proposal.title) && has(proposal.description)
        : step === 3
          ? proposal.type === 'parameter'
            ? has(proposal.module) && has(proposal.key) && has(proposal.newValue)
            : proposal.type === 'community'
              ? has(proposal.recipient) && has(proposal.amount)
              : proposal.type === 'software'
                ? has(proposal.upgradeVersion)
                : true
          : entered > 0

  // With nothing entered, Next asks the hook to name the gap under the field.
  const onCta = step < 4 ? onNext : entered > 0 ? onSubmit : onNext

  const depositHint = !minimum
    ? undefined
    : entered >= minimum
      ? `Covers the full ${minimumLabel} minimum. Voting opens as soon as the proposal is submitted.`
      : entered > 0
        ? `${fmt(minimum - entered)} LUME short of the minimum. Anyone can top it up during the ${periodAdjective ? `${periodAdjective} ` : ''}deposit period.`
        : `A proposal needs ${minimumLabel} deposited before voting opens. You can start it off and let others top it up.`

  return (
    <Drawer
      title="New proposal"
      onClose={hub.closeDrawer}
      footer={
        <>
          {step > 1 ? (
            <button type="button" onClick={onBack} className={drawerButton.secondary}>
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCta}
            className={cx(
              'flex-1 cursor-pointer rounded-control border-none py-[13px] text-base leading-none font-semibold transition-colors',
              filled
                ? 'bg-[linear-gradient(90deg,var(--color-lumera-teal),var(--color-lumera-green))] text-ink-800'
                : 'bg-ink-600 text-text-muted',
            )}
          >
            {step < 4 ? 'Continue' : 'Review submission'}
          </button>
        </>
      }
    >
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cx(
              'h-[3px] flex-1 rounded-full transition-colors',
              i <= index ? 'bg-lumera-green' : 'bg-line-hairline',
            )}
          />
        ))}
      </div>
      <Label>{STEP_LABEL[index]}</Label>

      {message?.type === 'error' ? <Notice tone="danger">{message.message}</Notice> : null}

      {step === 1 ? (
        <div className="flex flex-col gap-[9px]" role="radiogroup" aria-label="Proposal type">
          <p className="m-0 mb-0.5 text-base leading-[1.6] text-text-muted text-pretty">
            What kind of proposal is this? The type decides what the chain does when it passes.
          </p>
          {proposalTypes.map((t) => {
            const on = proposal.type === t.value
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onInputChange('type', t.value)}
                className={cx(
                  'flex w-full cursor-pointer items-center gap-[13px] rounded-[9px] border px-3.5 py-[13px] text-left transition-colors',
                  on
                    ? 'border-line-accent bg-lumera-teal/14'
                    : 'border-line-edge bg-ink-800 hover:border-line-accent',
                )}
              >
                <span
                  className={cx(
                    'h-[15px] w-[15px] flex-none rounded-full border-2',
                    on ? 'border-lumera-green bg-lumera-green' : 'border-line-edge bg-transparent',
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-base leading-none font-semibold text-text-primary">
                    {proposalTypeLabel(t.value)}
                  </span>
                  {TYPES[t.value] ? (
                    <span className="text-small leading-[1.35] text-text-muted">
                      {TYPES[t.value].note}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-[15px]">
          <Field
            label="Title"
            right={
              <span className="font-mono leading-none text-text-muted">
                {proposal.title.length} / 140
              </span>
            }
            error={errorFor('title')}
          >
            <Input
              value={proposal.title}
              onChange={(e) => onInputChange('title', e.target.value.slice(0, 140))}
              placeholder="What this proposal does, in one line"
              invalid={!!errorFor('title')}
            />
          </Field>
          <Field
            label="Summary"
            hint="Voters read this before anything else. Lead with the change itself."
            error={errorFor('description')}
          >
            <textarea
              value={proposal.description}
              onChange={(e) => onInputChange('description', e.target.value)}
              rows={6}
              className={cx(
                'w-full resize-y rounded-control border bg-ink-800 px-[13px] py-3 text-base leading-[1.6] text-text-primary outline-none placeholder:text-text-muted focus:border-line-accent',
                errorFor('description') ? 'border-danger-edge' : 'border-line-edge',
              )}
              placeholder="What changes, why now, and what happens if it does not pass."
            />
          </Field>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-[15px]">
          {proposal.type === 'text' ? (
            <div className="flex gap-3 rounded-[9px] border border-line-edge bg-ink-800 p-3.5">
              <div className="w-[3px] flex-none rounded-full bg-[linear-gradient(180deg,var(--color-lumera-teal),var(--color-lumera-green))]" />
              <p className="m-0 text-base leading-[1.65] text-text-secondary text-pretty">
                A text proposal has nothing to configure. It records the community&apos;s position
                on chain; any implementation follows in a separate proposal.
              </p>
            </div>
          ) : null}

          {/* The wizard's code fields are 14px mono, a size up from the app's
              other mono inputs, so they take the font rather than `mono`. */}
          {proposal.type === 'parameter' ? (
            <>
              <Field label="Module" error={errorFor('module')}>
                <Input
                  className="font-mono"
                  value={proposal.module}
                  onChange={(e) => onInputChange('module', e.target.value)}
                  placeholder="staking"
                  invalid={!!errorFor('module')}
                />
              </Field>
              <Field label="Parameter key" error={errorFor('key')}>
                <Input
                  className="font-mono"
                  value={proposal.key}
                  onChange={(e) => onInputChange('key', e.target.value)}
                  placeholder="MaxValidators"
                  invalid={!!errorFor('key')}
                />
              </Field>
              <Field
                label="New value"
                hint="Takes effect when the proposal passes."
                error={errorFor('newValue')}
              >
                <Input
                  className="font-mono"
                  value={proposal.newValue}
                  onChange={(e) => onInputChange('newValue', e.target.value)}
                  placeholder="65"
                  invalid={!!errorFor('newValue')}
                />
              </Field>
            </>
          ) : null}

          {proposal.type === 'community' ? (
            <>
              <Field label="Recipient" error={errorFor('recipient')}>
                <Input
                  className="font-mono"
                  value={proposal.recipient}
                  onChange={(e) => onInputChange('recipient', e.target.value)}
                  placeholder="lumera1…"
                  invalid={!!errorFor('recipient')}
                />
              </Field>
              <Field
                label="Amount"
                error={errorFor('amount')}
                hint={
                  communityPool && communityPool !== '—'
                    ? `Community pool holds ${communityPool}.`
                    : undefined
                }
              >
                <AmountInput
                  size="sm"
                  value={proposal.amount}
                  onChange={(v) => onInputChange('amount', v)}
                  denom="LUME"
                  invalid={!!errorFor('amount')}
                />
              </Field>
            </>
          ) : null}

          {proposal.type === 'software' ? (
            <Field
              label="Upgrade name"
              hint="The chain halts at a target height and restarts on this version."
              error={errorFor('upgradeVersion')}
            >
              <Input
                className="font-mono"
                value={proposal.upgradeVersion}
                onChange={(e) => onInputChange('upgradeVersion', e.target.value)}
                placeholder="v1.21.0"
                invalid={!!errorFor('upgradeVersion')}
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col gap-[15px]">
          <Field
            label="Initial deposit"
            right={
              minimum > 0 ? (
                <button
                  type="button"
                  onClick={() => onInputChange('initialDeposit', String(minimum))}
                  className="cursor-pointer border-none bg-transparent p-0 text-small leading-none font-medium text-lumera-green hover:text-lumera-green-bright"
                >
                  Fund the full {fmt(minimum)}
                </button>
              ) : undefined
            }
            error={errorFor('initialDeposit')}
            hint={depositHint}
          >
            <AmountInput
              size="md"
              value={proposal.initialDeposit}
              onChange={(v) => onInputChange('initialDeposit', v)}
              denom="LUME"
              invalid={!!errorFor('initialDeposit')}
            />
          </Field>

          <div className="overflow-hidden rounded-[9px] border border-line-hairline bg-ink-800">
            {[
              { k: 'Type', v: proposalTypeLabel(proposal.type), wrap: false },
              { k: 'Title', v: proposal.title.trim() || 'Untitled proposal', wrap: true },
              { k: 'Deposit period', v: period || '—', wrap: false },
            ].map((r) => (
              <div
                key={r.k}
                className="flex items-baseline justify-between gap-4 border-b border-ink-500 px-3.5 py-[11px] last:border-b-0"
              >
                <span className="flex-none text-base leading-none text-text-tertiary">{r.k}</span>
                <span
                  className={cx(
                    'text-right font-mono text-base font-medium text-text-primary',
                    r.wrap ? 'leading-[1.45] [overflow-wrap:anywhere]' : 'leading-none',
                  )}
                >
                  {r.v}
                </span>
              </div>
            ))}
          </div>

          {/* What happens to the deposit, built from the chain's own burn
              switches rather than asserted. */}
          {note ? (
            <div className="flex gap-[11px] rounded-[9px] border border-warn-edge bg-warn/8 px-3.5 py-[13px]">
              <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-warn" />
              <p className="m-0 text-small leading-[1.6] text-[#e4c98c] text-pretty">{note}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  )
}
