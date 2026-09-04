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
import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Drawer } from '@lumera-hub/ui/src/hub/Drawer'
import {
  Button,
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

/** What each proposal type actually does, since the labels do not say. */
const TYPE_NOTE: Record<string, string> = {
  text: 'A signalling proposal with no on-chain effect',
  parameter: 'Changes a module parameter when it passes',
  community: 'Sends funds from the community pool to an address',
  software: 'Halts and upgrades the chain at a target height',
}

export function ProposeDrawer({
  step,
  proposal,
  requiredDeposit,
  message,
  onInputChange,
  onNext,
  onBack,
  onSubmit,
}: {
  /** 1-based, from useGovernances. */
  step: number
  proposal: Proposal
  requiredDeposit: string
  message?: { type: string; message: string }
  onInputChange: (name: string, value: string) => void
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
}) {
  const hub = useHub()
  if (hub.drawer?.kind !== 'propose') return null

  const index = Math.min(3, Math.max(0, step - 1))
  const errorFor = (field: string) =>
    message?.type === field ? message.message : undefined

  // Both figures are in LUME, matching GOVERNANCE_STATS.depositRequired.
  const minimum = Number(requiredDeposit) || 0
  const entered = Number(proposal.initialDeposit) || 0
  const shortfall = minimum - entered

  return (
    <Drawer
      title="New proposal"
      onClose={hub.closeDrawer}
      footer={
        <>
          {step > 1 ? (
            <Button variant="outline" size="lg" className="flex-none px-5" onClick={onBack}>
              Back
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            full
            onClick={step < 4 ? onNext : onSubmit}
          >
            {step < 4 ? 'Continue' : 'Review submission'}
          </Button>
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
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Proposal type">
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
                  'flex cursor-pointer items-center gap-3 rounded-control border px-3.5 py-3 text-left transition-colors',
                  on
                    ? 'border-line-accent bg-lumera-teal/14'
                    : 'border-line-edge bg-ink-800 hover:border-line-accent',
                )}
              >
                <span
                  className={cx(
                    'flex h-4 w-4 flex-none items-center justify-center rounded-full border-2',
                    on ? 'border-lumera-green' : 'border-line-edge',
                  )}
                >
                  {on ? <span className="h-2 w-2 rounded-full bg-lumera-green" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-medium text-text-primary">
                    {t.label.replace(/ Proposal$/, '')}
                  </span>
                  <span className="text-small text-text-muted">{TYPE_NOTE[t.value] || ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {step === 2 ? (
        <>
          <Field
            label="Title"
            right={`${proposal.title.length} / 140`}
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
            hint="Voters read this before anything else. Say what changes and why."
            error={errorFor('description')}
          >
            <textarea
              value={proposal.description}
              onChange={(e) => onInputChange('description', e.target.value)}
              rows={6}
              className={cx(
                'w-full resize-y rounded-control border bg-ink-800 px-3 py-2.5 text-base leading-[1.6] text-text-primary outline-none placeholder:text-text-disabled focus:border-line-accent',
                errorFor('description') ? 'border-danger-edge' : 'border-line-edge',
              )}
              placeholder="Describe the change and the reasoning behind it."
            />
          </Field>
        </>
      ) : null}

      {step === 3 ? (
        <>
          {proposal.type === 'text' ? (
            <Notice tone="info">
              A text proposal has no on-chain effect. Passing it records that the community agreed
              with what the summary says — nothing else changes.
            </Notice>
          ) : null}

          {proposal.type === 'parameter' ? (
            <>
              <Field label="Module" error={errorFor('module')}>
                <Input
                  value={proposal.module}
                  onChange={(e) => onInputChange('module', e.target.value)}
                  placeholder="staking"
                  invalid={!!errorFor('module')}
                />
              </Field>
              <Field label="Parameter" error={errorFor('key')}>
                <Input
                  mono
                  value={proposal.key}
                  onChange={(e) => onInputChange('key', e.target.value)}
                  placeholder="MaxValidators"
                  invalid={!!errorFor('key')}
                />
              </Field>
              <Field label="New value" error={errorFor('newValue')}>
                <Input
                  mono
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
                  mono
                  value={proposal.recipient}
                  onChange={(e) => onInputChange('recipient', e.target.value)}
                  placeholder="lumera1…"
                  invalid={!!errorFor('recipient')}
                />
              </Field>
              <Field label="Amount" error={errorFor('amount')}>
                <Input
                  mono
                  value={proposal.amount}
                  onChange={(e) => onInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  invalid={!!errorFor('amount')}
                />
              </Field>
            </>
          ) : null}

          {proposal.type === 'software' ? (
            <Field
              label="Upgrade version"
              hint="The chain halts at a target height and restarts on this version."
              error={errorFor('upgradeVersion')}
            >
              <Input
                mono
                value={proposal.upgradeVersion}
                onChange={(e) => onInputChange('upgradeVersion', e.target.value)}
                placeholder="v1.21.0"
                invalid={!!errorFor('upgradeVersion')}
              />
            </Field>
          ) : null}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Field
            label="Initial deposit"
            error={errorFor('initialDeposit')}
            hint={
              errorFor('initialDeposit')
                ? undefined
                : shortfall > 0
                  ? `${shortfall.toLocaleString('en-US', { maximumFractionDigits: 0 })} LUME short of the ${minimum.toLocaleString('en-US')} LUME minimum. Anyone can top it up during the deposit period.`
                  : 'Covers the full minimum. Voting opens as soon as this is submitted.'
            }
          >
            <Input
              mono
              value={proposal.initialDeposit}
              onChange={(e) => onInputChange('initialDeposit', e.target.value)}
              placeholder="0"
              invalid={!!errorFor('initialDeposit')}
            />
          </Field>

          <Notice tone="warn">
            Deposits are returned when voting opens. If the deposit period ends short of the
            minimum, every deposit on the proposal is burned.
          </Notice>
        </>
      ) : null}
    </Drawer>
  )
}
