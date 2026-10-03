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
import * as instance from '@/utils/api'
import {
  KEPLR_KEYSTORE_CHANGE,
  KEPLR_REMOVE_CHAIN_PATH,
  addLumeraEvmToKeplr,
  canAddLumeraEvmToKeplr,
  evmAddressOf,
  judgeProfileSwitch,
  keplrChainState,
  keplrMigrationStatus,
  type FetchJson,
  type KeplrEvmResult,
} from '@/utils/keplr-evm'
import { EVM_CHAIN_ID, IS_EVM_NETWORK, NETWORK_LABEL } from '@/contants/network'
// Canonical wallet keys — the drawer must pass the same values useConnectWallet
// branches on, or "MetaMask" falls through to the Keplr path.
import { KEPLR_WALLET_NAME, METAMASK_WALLET_NAME } from '@/utils/wallet-selection'
import { useHub, LUMERA_ADDRESS, short } from '@lumera-hub/ui/src/hub/session'
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
  // What the last Keplr EVM setup found, shown under the button.
  const [keplrEvm, setKeplrEvm] = useState<KeplrEvmResult | null>(null)
  // Keplr kept its existing (pre-migration) settings: wait for the reader to
  // remove the chain there, then add it back with the EVM settings.
  const [waitingForRemoval, setWaitingForRemoval] = useState(false)
  // While waiting for the re-imported profile: the active profile, when it is
  // neither the old one nor the migrated one.
  const [otherProfile, setOtherProfile] = useState<string | null>(null)

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
  const fetchJson: FetchJson = (path) => instance.getQuiet(path).then((res: { data: unknown }) => res.data)

  const addKeplrEvm = useCallback(async () => {
    setAddingKeplrEvm(true)
    try {
      const result = await addLumeraEvmToKeplr(keplr(), fetchJson)
      setKeplrEvm(result)
      setWaitingForRemoval(result.kind === 'kept-existing' || result.kind === 'needs-evm-settings')
      if (result.kind === 'ready') {
        hub.flash(`Keplr shows your migrated address ${short(result.keplrAddress)}`, 'ok')
        // Reconnect so the hub picks up the address Keplr now reports.
        const ok = await connectWallet(KEPLR_WALLET_NAME)
        if (ok) hub.closeDrawer()
      }
    } catch (e) {
      setWaitingForRemoval(false)
      hub.flash(e instanceof Error ? e.message : 'Could not set up Keplr', 'error')
    } finally {
      setAddingKeplrEvm(false)
    }
    // fetchJson and keplr read fixed module state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // After "re-import your recovery phrase", wait for the reader to switch Keplr
  // to the new profile: Keplr fires keplr_keystorechange on every switch (focus
  // and a slow timer cover a missed event). Once the active profile shows the
  // migrated address, reconnect with it. Gives up after thirty minutes.
  const reimportTarget = keplrEvm?.kind === 'reimport' ? keplrEvm.migration : null
  const connectRef = useRef(connectWallet)
  connectRef.current = connectWallet
  const hubRef = useRef(hub)
  hubRef.current = hub
  useEffect(() => {
    if (!reimportTarget) return
    let busy = false
    let stopped = false
    const check = async () => {
      if (busy || stopped) return
      busy = true
      const status = await keplrMigrationStatus(keplr(), fetchJson).catch(() => null)
      busy = false
      if (stopped) return
      const verdict = judgeProfileSwitch(reimportTarget, status)
      if (verdict === 'done') {
        stop()
        setKeplrEvm(null)
        setOtherProfile(null)
        hubRef.current.flash(`Keplr is on your migrated account ${short(reimportTarget.newAddress)}`, 'ok')
        if (await connectRef.current(KEPLR_WALLET_NAME)) hubRef.current.closeDrawer()
      } else {
        setOtherProfile(verdict === 'other-profile' && status ? status.keplrAddress : null)
      }
    }
    const onSwitch = () => void check()
    window.addEventListener(KEPLR_KEYSTORE_CHANGE, onSwitch)
    window.addEventListener('focus', onSwitch)
    const timer = window.setInterval(onSwitch, 4000)
    const giveUp = window.setTimeout(() => stop(), 30 * 60 * 1000)
    function stop() {
      stopped = true
      window.removeEventListener(KEPLR_KEYSTORE_CHANGE, onSwitch)
      window.removeEventListener('focus', onSwitch)
      window.clearInterval(timer)
      window.clearTimeout(giveUp)
    }
    return stop
    // keplr/fetchJson read fixed module state; the target object is per result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reimportTarget])

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
          Keplr still has Lumera {NETWORK_LABEL} with its older settings and does not let sites change them. In Keplr,
          open {KEPLR_REMOVE_CHAIN_PATH} and delete Lumera {NETWORK_LABEL} — the hub notices and adds it back with EVM
          settings straight away; approve Keplr&apos;s prompt. Your funds and recovery phrase are not affected.{' '}
          <button
            type="button"
            onClick={() => setWaitingForRemoval(false)}
            className="cursor-pointer border-none bg-transparent p-0 text-small font-medium text-text-secondary underline hover:text-text-primary"
          >
            Stop waiting
          </button>
        </Notice>
      ) : null}

      {keplrEvm?.kind === 'reimport' ? (
        <Notice tone="warn">
          <span className="flex flex-col gap-2">
            <span>
              Keplr has the EVM settings, but this Keplr profile still holds your pre-migration key, so it shows{' '}
              <span className="font-mono">{short(keplrEvm.keplrAddress)}</span> — an address nothing was moved to.
              Your account was migrated to <span className="font-mono">{short(keplrEvm.migration.newAddress)}</span>{' '}
              (<span className="font-mono">{short(evmAddressOf(keplrEvm.migration.newAddress), 6, 4)}</span> in an EVM
              wallet).
            </span>
            <span>
              To use it, in Keplr click your wallet name → + → Import existing wallet, enter the same recovery phrase
              and switch to the new profile — the hub notices the switch and connects it. Or connect the EVM wallet you
              migrated with (e.g. MetaMask).
            </span>
            {otherProfile ? (
              <span className="text-text-secondary">
                Keplr&apos;s active profile shows <span className="font-mono">{short(otherProfile)}</span>, which is not
                your migrated account. Switch to the profile you imported from the same recovery phrase.
              </span>
            ) : (
              <span className="text-text-tertiary">Waiting for you to switch Keplr profiles…</span>
            )}
            <button
              type="button"
              onClick={() => hub.watch(keplrEvm.migration.newAddress)}
              className="cursor-pointer self-start border-none bg-transparent p-0 text-small font-medium text-lumera-green hover:text-lumera-green-bright"
            >
              View the migrated account →
            </button>
          </span>
        </Notice>
      ) : null}

      {keplrEvm?.kind === 'not-migrated' ? (
        <Notice tone="info">
          This Keplr account (<span className="font-mono">{short(keplrEvm.legacyAddress)}</span>) was not migrated to
          an EVM key, so there is nothing to switch and Keplr was left as it is.
          {keplrEvm.keplrAddress !== keplrEvm.legacyAddress ? (
            <>
              {' '}
              Keplr is showing it as <span className="font-mono">{short(keplrEvm.keplrAddress)}</span>; to see{' '}
              <span className="font-mono">{short(keplrEvm.legacyAddress)}</span> again, delete Lumera {NETWORK_LABEL}{' '}
              in Keplr ({KEPLR_REMOVE_CHAIN_PATH}) and connect again.
            </>
          ) : null}
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
