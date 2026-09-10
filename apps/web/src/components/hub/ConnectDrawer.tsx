'use client'

/*
 * The connect drawer.
 *
 * This is where intent gating pays off: when a gated action opens it, the top
 * of the drawer names the action the reader was in the middle of, and
 * connecting returns them to it with their input intact. Opened on its own it
 * is just a wallet picker.
 *
 * It also offers watch mode, because a good number of people arriving at a
 * chain explorer want to look at an address, not sign with one.
 */

import React, { useState } from 'react'

import useConnectWallet from '@/hooks/useConnectWallet'
import { useHub, LUMERA_ADDRESS } from '@lumera-hub/ui/src/hub/session'
import { Drawer, IntentBanner } from '@lumera-hub/ui/src/hub/Drawer'
import { Button, Field, Input, Label, cx } from '@lumera-hub/ui/src/design/primitives'
import { EyeIcon } from '@lumera-hub/ui/src/design/icons'

const KEPLR_WALLET_NAME = 'keplr-extension'
const METAMASK_WALLET_NAME = 'metamask-extension'

export function ConnectDrawer() {
  const hub = useHub()
  const { connectWallet, connectingWallet, error: connectError } = useConnectWallet()
  const [watchInput, setWatchInput] = useState('')

  if (hub.drawer?.kind !== 'connect') return null

  const trimmed = watchInput.trim()
  const validWatch = LUMERA_ADDRESS.test(trimmed)
  const invalidWatch = trimmed.length > 0 && !validWatch

  const wallets = [
    {
      key: KEPLR_WALLET_NAME,
      initials: 'KP',
      name: 'Keplr',
      note:
        typeof window !== 'undefined' && window.keplr
          ? 'Browser extension · detected'
          : 'Browser extension',
    },
    {
      key: METAMASK_WALLET_NAME,
      initials: 'MM',
      name: 'MetaMask',
      note: 'Browser extension · EVM balances and transfers',
    },
  ]

  return (
    <Drawer
      title={hub.pendingIntent ? 'Connect to continue' : 'Connect a wallet'}
      onClose={hub.closeDrawer}
      footer={
        <span className="flex-1 text-small leading-[1.5] text-text-muted text-pretty">
          Lumera never sees your keys. Signing happens inside your wallet.
        </span>
      }
    >
      {hub.pendingIntent ? <IntentBanner intent={hub.pendingIntent} /> : null}

      <p className="m-0 text-base leading-[1.6] text-text-muted text-pretty">
        {hub.pendingIntent
          ? 'Pick a wallet. Nothing you have entered is lost — you land back on the same action.'
          : 'Lumera Hub reads the chain without a wallet. Connect one only to sign.'}
      </p>

      <div className="flex flex-col gap-2">
        {wallets.map((w) => (
          <button
            key={w.key}
            type="button"
            disabled={Boolean(connectingWallet)}
            onClick={() => {
              /*
               * Connect the wallet that was just picked, rather than handing
               * off to the app's picker — that opened a second dialog listing
               * the same two wallets on top of this one. The hub session
               * notices the address arriving and resumes the intent.
               */
              void connectWallet(w.key).then((ok) => {
                if (ok) hub.closeDrawer()
              })
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[9px] border border-line-edge bg-ink-800 px-3.5 py-[13px] text-left transition-colors hover:border-line-accent hover:bg-ink-600"
          >
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-control border border-line-edge bg-ink-600 font-mono text-small font-semibold text-lumera-green">
              {w.initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-base font-medium text-text-primary">{w.name}</span>
              <span className="text-small text-text-tertiary">{w.note}</span>
            </span>
            <span className="flex-none text-small text-text-muted">
              {connectingWallet === w.key ? 'Connecting…' : '›'}
            </span>
          </button>
        ))}
      </div>

      {connectError ? (
        <span className="text-small leading-[1.5] text-danger text-pretty">{connectError}</span>
      ) : null}

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line-hairline" />
        <Label>or look without signing</Label>
        <span className="h-px flex-1 bg-line-hairline" />
      </div>

      <Field
        label={
          <span className="flex items-center gap-1.5">
            <EyeIcon size={12} />
            Watch an address
          </span>
        }
        error={invalidWatch ? 'Not a valid Lumera address. It should start with lumera1.' : undefined}
        hint={
          invalidWatch
            ? undefined
            : 'Opens balances, delegations and history read-only. No signature, no extension.'
        }
      >
        <div className="flex items-center gap-2">
          <Input
            mono
            value={watchInput}
            onChange={(e) => setWatchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && validWatch) hub.watch(trimmed)
            }}
            placeholder="lumera1…"
            invalid={invalidWatch}
            aria-label="Address to watch"
          />
          <Button
            variant={validWatch ? 'solid' : 'outline'}
            disabled={!validWatch}
            onClick={() => hub.watch(trimmed)}
            className={cx('flex-none')}
          >
            Watch
          </Button>
        </div>
      </Field>
    </Drawer>
  )
}
