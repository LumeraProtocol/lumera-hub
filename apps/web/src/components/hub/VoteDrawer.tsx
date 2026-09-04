'use client'

/*
 * Vote.
 *
 * Four options, each with a one-line explanation of what it actually does —
 * "No with veto" in particular is not self-explanatory, and the old radio list
 * offered no help. The current tally sits beside each option so the reader can
 * see where their weight would land.
 *
 * Confirming hands off to the shared TxFlow like every other signing action.
 */

import React, { useState } from 'react'

import { useHub } from '@lumera-hub/ui/src/hub/session'
import { Drawer } from '@lumera-hub/ui/src/hub/Drawer'
import { Button, Label, Well, cx } from '@lumera-hub/ui/src/design/primitives'

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
  onConfirm,
}: {
  proposalTitle: string
  /** Current share for each option, so the reader sees where the vote stands. */
  tally?: Partial<Record<VoteChoice, number>>
  onConfirm: (choice: VoteChoice) => void
}) {
  const hub = useHub()
  const [choice, setChoice] = useState<VoteChoice>('yes')

  if (hub.drawer?.kind !== 'vote') return null
  const proposalId = hub.drawer.proposalId

  return (
    <Drawer
      title="Cast your vote"
      onClose={hub.closeDrawer}
      footer={
        <Button variant="solid" size="lg" full onClick={() => onConfirm(choice)}>
          Review vote
        </Button>
      }
    >
      <div className="flex flex-col gap-1">
        <Label>Proposal {proposalId}</Label>
        <span className="text-base leading-[1.4] font-medium text-text-primary text-pretty">
          {proposalTitle}
        </span>
      </div>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Vote option">
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
                <span className="text-base font-medium text-text-primary">{o.label}</span>
                <span className="text-small text-text-muted">{o.note}</span>
              </span>
              {tally?.[o.key] != null ? (
                <span className="flex-none font-mono text-small tnum text-text-tertiary">
                  {tally[o.key]!.toFixed(1)}%
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <Well className="flex flex-col gap-1.5">
        <span className="text-small text-text-muted text-pretty">
          Your weight is the stake you have bonded when voting closes. Voting again before the
          deadline replaces this vote rather than adding to it.
        </span>
      </Well>
    </Drawer>
  )
}
