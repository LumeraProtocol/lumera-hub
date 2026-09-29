'use client'

/*
 * Link a Lumera wallet to a Snag profile.
 *
 * SNAG's "Connect wallet to Lumera Hub" quest sends the reader here with their
 * Snag profile's (EVM) address. Linking records which Lumera wallet belongs to
 * that profile, so the hub's on-chain quests — staking, uploads, supernodes —
 * are credited to it. Nothing is linked until the reader presses the button:
 * connecting a wallet alone never does it.
 */

import React from 'react'
import { Button, Card, DataRow, Notice, PageTitle, Skeleton, Well } from '../../design/primitives'
import { CheckIcon, ExternalIcon } from '../../design/icons'
import { short } from '../../hub/session'

export type SnagLinkState =
  /** Reading the current link. */
  | 'loading'
  /** The quest service is not configured on this deployment. */
  | 'unavailable'
  /** Opened without a Snag profile to link (not from the quest). */
  | 'no-profile'
  | 'ready'
  | 'linking'
  | 'linked'

export function SnagLinkScreen({
  state,
  snagAddress,
  walletAddress,
  linkedAddress,
  completed,
  error,
  siteUrl,
  onConnect,
  onLink,
  onOpenSprint,
}: {
  state: SnagLinkState
  /** The Snag profile, from the quest's link. */
  snagAddress: string | null
  /** The reader's connected Lumera wallet, if any. */
  walletAddress: string | null
  /** The Lumera wallet this Snag profile is already linked to, if any. */
  linkedAddress: string | null
  /** SNAG marked the wallet-link quest complete. */
  completed?: boolean
  error?: string | null
  siteUrl?: string
  onConnect: () => void
  onLink: () => void
  onOpenSprint: () => void
}) {
  const linking = state === 'linking'
  const linkedElsewhere = Boolean(linkedAddress && walletAddress && linkedAddress !== walletAddress)
  const linkedHere = Boolean(linkedAddress && (!walletAddress || linkedAddress === walletAddress))

  return (
    <div className="animate-fade flex flex-col gap-[18px]">
      <PageTitle
        title="Link wallet to Snag"
        subtitle="Connect the Lumera wallet you use on the hub to your Snag profile, so your staking, uploads and other on-chain quests count toward your Sprint."
      />

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,560px)]">
        <Card className="p-5">
          <h3 className="m-0 mb-[13px] text-base leading-none font-semibold text-text-primary">Accounts</h3>

          {state === 'loading' ? (
            <div className="flex flex-col gap-3 py-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div className="flex flex-col">
              <DataRow
                label="Snag profile"
                value={snagAddress ? <span title={snagAddress}>{short(snagAddress, 8, 6)}</span> : '—'}
                tone={snagAddress ? 'primary' : 'muted'}
              />
              <DataRow
                label="Lumera wallet"
                value={
                  walletAddress ? <span title={walletAddress}>{short(walletAddress, 12, 6)}</span> : 'Not connected'
                }
                tone={walletAddress ? 'primary' : 'muted'}
              />
              {linkedAddress ? (
                <DataRow
                  label="Linked to"
                  value={<span title={linkedAddress}>{short(linkedAddress, 12, 6)}</span>}
                  tone="green"
                />
              ) : null}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {state === 'unavailable' ? (
              <Notice tone="info">
                Snag is not configured on this deployment, so wallets cannot be linked here yet.
              </Notice>
            ) : state === 'no-profile' ? (
              <Notice tone="warn">
                There is no Snag profile to link. Open this page from the “Connect wallet to Lumera Hub” quest on
                Snag — it adds your profile to the link.
              </Notice>
            ) : state === 'linked' || (linkedHere && state !== 'loading') ? (
              <Well tone="accent" className="flex items-start gap-[9px]">
                <CheckIcon size={14} className="mt-px flex-none text-lumera-green" />
                <span className="text-small leading-[1.5] text-text-secondary text-pretty">
                  {completed === false
                    ? 'Linked. Snag will mark the quest complete once your profile is set up there — this can take a minute.'
                    : 'Linked. Your on-chain quests on the hub now count toward this Snag profile.'}
                </span>
              </Well>
            ) : linkedElsewhere ? (
              <Notice tone="warn">
                This Snag profile is already linked to a different Lumera wallet ({short(linkedAddress ?? '', 12, 6)}).
                Connect that wallet, or use another Snag profile.
              </Notice>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}

            {state === 'ready' || state === 'linking' ? (
              linkedHere || linkedElsewhere ? null : walletAddress ? (
                <Button variant="primary" size="lg" full onClick={onLink} disabled={linking}>
                  {linking ? 'Linking…' : 'Link wallet'}
                </Button>
              ) : (
                <Button variant="primary" size="lg" full onClick={onConnect}>
                  Connect wallet
                </Button>
              )
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onOpenSprint}>
                Go to Sprint
              </Button>
              {siteUrl ? (
                <Button variant="ghost" onClick={() => window.open(siteUrl, '_blank', 'noopener,noreferrer')}>
                  Back to Snag
                  <ExternalIcon size={12} />
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
