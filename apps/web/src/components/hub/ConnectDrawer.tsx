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

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import useConnectWallet from '@/hooks/useConnectWallet'
import { addLumeraToMetaMask, resolveMetaMaskProvider } from '@/utils/evm'
import { addLumeraEvmToKeplr, canAddLumeraEvmToKeplr, keplrChainState } from '@/utils/keplr-evm'
import { EVM_CHAIN_ID, IS_EVM_NETWORK, NETWORK_LABEL } from '@/contants/network'
// Canonical wallet keys — the drawer must pass the same values useConnectWallet
// branches on, or "MetaMask" falls through to the Keplr path.
import { KEPLR_WALLET_NAME, METAMASK_WALLET_NAME } from '@/utils/wallet-selection'
import { useHub, LUMERA_ADDRESS } from '@lumera-hub/ui/src/hub/session'
import { Drawer, IntentBanner } from '@lumera-hub/ui/src/hub/Drawer'
import { Button, Field, Input, Notice, cx } from '@lumera-hub/ui/src/design/primitives'
import { EyeIcon } from '@lumera-hub/ui/src/design/icons'

export function ConnectDrawer() {
  const hub = useHub()
  const { connectWallet, connectingWallet, error: connectError } = useConnectWallet()
  const [watchInput, setWatchInput] = useState('')
  const [addingChain, setAddingChain] = useState(false)
  // Detect the real MetaMask (EIP-6963), not any wallet claiming isMetaMask, so
  // the add-chain button shows only when there is genuinely a MetaMask to add to.
  const [hasMetaMask, setHasMetaMask] = useState(false)
  const [addingKeplrEvm, setAddingKeplrEvm] = useState(false)
  // Keplr kept its existing (pre-migration) settings: wait for the reader to
  // remove the chain there, then add it back with the EVM settings.
  const [waitingForRemoval, setWaitingForRemoval] = useState(false)

  useEffect(() => {
    let cancelled = false
    void resolveMetaMaskProvider().then((p) => {
      if (!cancelled) setHasMetaMask(Boolean(p))
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Migrated (EVM-key) accounts only appear in Keplr once it has the chain with
  // EVM settings; offer that wherever the network has an EVM chain.
  const canAddKeplrEvm = typeof window !== 'undefined' && canAddLumeraEvmToKeplr(window as { keplr?: unknown })

  const keplr = () => (typeof window !== 'undefined' ? window.keplr : undefined) as Parameters<typeof addLumeraEvmToKeplr>[0]

  const addKeplrEvm = useCallback(async () => {
    setAddingKeplrEvm(true)
    try {
      const result = await addLumeraEvmToKeplr(keplr())
      if (result.status === 'kept-existing') {
        setWaitingForRemoval(true)
        return
      }
      setWaitingForRemoval(false)
      hub.flash(`Keplr now uses your EVM address ${result.address.slice(0, 10)}…${result.address.slice(-4)}`, 'ok')
      // Reconnect so the hub picks up the address Keplr now reports.
      const ok = await connectWallet(KEPLR_WALLET_NAME)
      if (ok) hub.closeDrawer()
    } catch (e) {
      setWaitingForRemoval(false)
      hub.flash(e instanceof Error ? e.message : 'Could not set up Keplr', 'error')
    } finally {
      setAddingKeplrEvm(false)
    }
  }, [connectWallet, hub])

  // While waiting, check Keplr every few seconds and whenever the reader comes
  // back to the page; once the chain is gone, add it back straight away (Keplr
  // shows its own approval). Gives up after ten minutes.
  const addRef = useRef(addKeplrEvm)
  addRef.current = addKeplrEvm
  useEffect(() => {
    if (!waitingForRemoval) return
    let busy = false
    const check = async () => {
      if (busy) return
      busy = true
      const state = await keplrChainState(keplr())
      busy = false
      if (state === 'removed' || state === 'evm') {
        stop()
        void addRef.current()
      }
    }
    const timer = window.setInterval(check, 2500)
    const giveUp = window.setTimeout(() => setWaitingForRemoval(false), 10 * 60 * 1000)
    window.addEventListener('focus', check)
    function stop() {
      window.clearInterval(timer)
      window.clearTimeout(giveUp)
      window.removeEventListener('focus', check)
    }
    return stop
  }, [waitingForRemoval])

  // Hooks above run while the drawer is closed too, so a wait in progress
  // survives the reader closing it to go to Keplr.
  if (hub.drawer?.kind !== 'connect') return null

  // Offer the one-click chain add only where there is an EVM chain to add (the
  // testnet/devnet profiles) and a real MetaMask present to receive it.
  const canAddChain = Boolean(EVM_CHAIN_ID) && hasMetaMask

  const handleAddChain = async () => {
    setAddingChain(true)
    try {
      const ok = await addLumeraToMetaMask()
      hub.flash(ok ? `Lumera ${NETWORK_LABEL} added to MetaMask` : 'This network has no EVM chain to add', ok ? 'ok' : 'warn')
    } catch (e) {
      hub.flash(e instanceof Error ? e.message : 'Could not add the chain to MetaMask', 'error')
    } finally {
      setAddingChain(false)
    }
  }

  const trimmed = watchInput.trim()
  const validWatch = LUMERA_ADDRESS.test(trimmed)
  const invalidWatch = trimmed.length > 0 && !validWatch

  const wallets = [
    {
      key: KEPLR_WALLET_NAME,
      logo: '/keplr.svg',
      name: 'Keplr',
      note:
        typeof window !== 'undefined' && window.keplr
          ? 'Browser extension · detected'
          : 'Browser extension',
    },
    // MetaMask is EVM-only. Offer it solely on networks that have a Lumera EVM
    // chain (testnet/devnet); mainnet has no EVM yet, so it must not appear.
    ...(IS_EVM_NETWORK
      ? [
          {
            key: METAMASK_WALLET_NAME,
            logo: '/metamask.png',
            name: 'MetaMask',
            note: 'Browser extension · EVM balances and transfers',
          },
        ]
      : []),
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
            className="flex w-full cursor-pointer items-center gap-[13px] rounded-[9px] border border-line-edge bg-ink-800 px-3.5 py-[13px] text-left transition-colors hover:border-line-accent hover:bg-ink-600"
          >
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center overflow-hidden rounded-control border border-line-edge bg-ink-600">
              <Image src={w.logo} alt="" width={18} height={18} className="object-contain" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-base leading-none font-medium text-text-primary">{w.name}</span>
              <span className="text-small leading-none text-text-tertiary">{w.note}</span>
            </span>
            <span
              className={cx(
                'flex-none leading-none text-text-muted',
                connectingWallet === w.key ? 'text-small' : 'text-lg',
              )}
            >
              {connectingWallet === w.key ? 'Connecting…' : '›'}
            </span>
          </button>
        ))}
      </div>

      {canAddChain ? (
        <button
          type="button"
          onClick={handleAddChain}
          disabled={addingChain}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-line-edge bg-transparent px-3.5 py-[11px] text-small leading-none font-medium text-text-secondary transition-colors hover:border-line-accent hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {addingChain ? 'Opening MetaMask…' : `Add Lumera ${NETWORK_LABEL} to MetaMask`}
        </button>
      ) : null}

      {canAddKeplrEvm ? (
        <button
          type="button"
          onClick={() => void addKeplrEvm()}
          disabled={addingKeplrEvm || waitingForRemoval}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-line-edge bg-transparent px-3.5 py-[11px] text-small leading-none font-medium text-text-secondary transition-colors hover:border-line-accent hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {addingKeplrEvm
            ? 'Opening Keplr…'
            : waitingForRemoval
              ? 'Waiting for Keplr…'
              : `Add Lumera ${NETWORK_LABEL} (EVM) to Keplr`}
        </button>
      ) : null}

      {waitingForRemoval ? (
        <Notice tone="warn">
          Keplr still has Lumera {NETWORK_LABEL} with its older settings, so it shows your pre-migration address, and
          it does not let sites change that. In Keplr, open Settings → General → Manage Non-Native Chains and remove
          Lumera {NETWORK_LABEL} — the hub notices and adds it back with EVM settings straight away; just approve
          Keplr&apos;s prompt. Your funds and recovery phrase are not affected.{' '}
          <button
            type="button"
            onClick={() => setWaitingForRemoval(false)}
            className="cursor-pointer border-none bg-transparent p-0 text-small font-medium text-text-secondary underline hover:text-text-primary"
          >
            Stop waiting
          </button>
        </Notice>
      ) : null}

      {connectError ? (
        <span className="text-small leading-[1.5] text-danger text-pretty">{connectError}</span>
      ) : null}

      <div className="flex items-center gap-3 py-0.5">
        <span className="h-px flex-1 bg-line-hairline" />
        <span className="text-small leading-none text-text-muted">or keep browsing</span>
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
