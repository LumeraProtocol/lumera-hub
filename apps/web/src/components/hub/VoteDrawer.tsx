'use client'

/*
 * Vote.
 *
 * Four options, each with a one-line explanation of what it actually does —
 * "No with veto" in particular is not self-explanatory, and the old radio list
 * offered no help. The current tally sits beside each option so the reader can
 * see where their weight would land, and the weight itself is shown under them.
 *
 * Confirming hands off to the shared TxFlow like every other signing action.
 */

import React, { useState } from 'react'

import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Drawer, IntentBanner, drawerButton } from '@lumera-hub/ui/src/hub/Drawer'
import { cx } from '@lumera-hub/ui/src/design/primitives'

export type VoteChoice = 'yes' | 'no' | 'abstain' | 'veto'

const OPTIONS: Array<{ key: VoteChoice; label: string; note: string }> = [
  { key: 'yes', label: 'Yes', note: 'Adopt the change as written' },
  { key: 'no', label: 'No', note: 'Keep things as they are' },
  { key: 'abstain', label: 'Abstain', note: 'Counts toward quorum only' },
  { key: 'veto', label: 'No with veto', note: 'Reject and burn the deposit' },
]

export function VoteDrawer({
  proposalTitle,
  tally,
  weight,
  onConfirm,
}: {
  proposalTitle: string
  /** Current share for each option, so the reader sees where the vote stands. */
  tally?: Partial<Record<VoteChoice, number>>
  /** The voter's bonded stake, formatted, or "None yet". */
  weight?: string
  onConfirm: (choice: VoteChoice) => void
}) {
  const hub = useHub()
  const [choice, setChoice] = useState<VoteChoice>('yes')

  if (hub.drawer?.kind !== 'vote') return null
  const proposalId = hub.drawer.proposalId
  const picked = OPTIONS.find((o) => o.key === choice) ?? OPTIONS[0]
  const weighted = !!weight && weight !== 'None yet'

  return (
    <Drawer
      title="Cast your vote"
      onClose={hub.closeDrawer}
      footer={
        <button type="button" onClick={() => onConfirm(choice)} className={drawerButton.primary}>
          Vote {picked.label}
        </button>
      }
    >
      <IntentBanner intent={{ title: `Vote on ${proposalId}`, line: proposalTitle }} />

      <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
        One vote per address. Voting again before the deadline replaces your previous choice.
        Percentages show where the tally stands now.
      </p>

      <div className="flex flex-col gap-3.5" role="radiogroup" aria-label="Vote option">
        {OPTIONS.map((o) => {
          const on = o.key === choice
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChoice(o.key)}
              className={cx(
                'flex cursor-pointer items-center gap-[13px] rounded-[9px] border px-3.5 py-[13px] text-left transition-colors',
                on
                  ? 'border-line-accent bg-lumera-teal/14'
                  : 'border-line-edge bg-ink-800 hover:border-line-accent',
              )}
            >
              <span
                className={cx(
                  'h-[15px] w-[15px] flex-none rounded-full border-2',
                  on
                    ? 'border-lumera-green bg-lumera-green shadow-[inset_0_0_0_2px_var(--color-ink-700)]'
                    : 'border-line-edge bg-transparent',
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-base leading-none font-semibold text-text-primary">{o.label}</span>
                <span className="text-small leading-[1.35] text-text-muted">{o.note}</span>
              </span>
              {tally?.[o.key] != null ? (
                <span className="flex-none font-mono text-small leading-none font-medium tnum text-text-tertiary">
                  {tally[o.key]!.toFixed(1)}%
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-[9px] border border-line-hairline bg-ink-800 px-3.5 py-[13px]">
        <span className="text-base leading-none text-text-muted">Your weight</span>
        <span
          className={cx(
            'font-mono text-base leading-none font-semibold tnum',
            weighted ? 'text-lumera-green' : 'text-text-muted',
          )}
        >
          {weight ?? '—'}
        </span>
      </div>
    </Drawer>
  )
}
