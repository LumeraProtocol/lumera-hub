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
  const { address, openConnectView } = useWalletConnect()
  const disconnect = useDisconnectWallet()

  return (
    <BaseHubProvider
      connectedAddress={address || undefined}
      onRequestConnect={() => openConnectView()}
      onDisconnect={() => void disconnect()}
    >
      {children}
    </BaseHubProvider>
  )
}
