'use client'

/*
 * Binds the redesign's session model to the wallet the app actually has.
 *
 * `HubProvider` in packages/ui knows about connected / watching / disconnected
 * and about intent gating, but nothing about interchain-kit or MetaMask. This
 * adapter supplies the signing address and the connect and disconnect actions,
 * so the UI package stays free of wallet plumbing.
 */

import React from 'react'

import useWalletConnect from '@/hooks/useWalletConnect'
import useDisconnectWallet from '@/hooks/useDisconnectWallet'
import { HubProvider as BaseHubProvider } from '@lumera-hub/ui/src/hub/session'

export default function HubProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWalletConnect()
  const disconnect = useDisconnectWallet()

  /*
   * No onRequestConnect: the session opens its own connect drawer instead.
   *
   * Wiring it to the app's picker meant every "Connect wallet" opened that
   * modal, and a gated action opened the drawer, so the two could stand on top
   * of each other — both listing Keplr and MetaMask. The drawer connects the
   * chosen wallet directly now, so it is the whole flow.
   */
  return (
    <BaseHubProvider
      connectedAddress={address || undefined}
      onDisconnect={() => void disconnect()}
    >
      {children}
    </BaseHubProvider>
  )
}
