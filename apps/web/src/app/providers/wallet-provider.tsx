'use client'

import React from 'react'
import { ChainProvider } from '@interchain-kit/react'
import { BaseWallet, WCWallet } from '@interchain-kit/core'
import { keplrWallet } from '@interchain-kit/keplr-extension'
import { leapWallet } from '@interchain-kit/leap-extension'
import { cosmostationWallet } from '@interchain-kit/cosmostation-extension'
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'
import '@interchain-ui/react/styles'

import { CHAIN_NAME } from '@/contants/chain';

// import { assetLists, chains } from 'chain-registry/mainnet'
import { assetLists, chains } from 'chain-registry/testnet'

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  const lumeraChain = chains.find(({chainName}) =>chainName===CHAIN_NAME)
  const lumeraAssets = assetLists.find(({chainName})=>chainName===CHAIN_NAME);

  if (!lumeraChain || !lumeraAssets) {
    throw new Error(`Chain or assets not found for ${CHAIN_NAME}`)
  }

  // Setup WalletConnect with custom metadata
  const walletConnect = new WCWallet(undefined, {
    projectId: 'fd049c1154d0886fda615b1c2e08ee28',
    relayUrl: 'wss://relay.walletconnect.org',
    metadata: {
      name: 'Lumera Hub (testnet)',
      description: 'Lumera Hub (testnet)',
      // url: 'https://hub.testnet.lumera.io',
      url:"http://localhost:3000",
      icons: ['https://portal.testnet.lumera.io/assets/logo-5cb73fc7.png'],
    },
  })

  // All wallets will be automatically available based on browser detection
  const wallets = [
    keplrWallet as BaseWallet,
    leapWallet as BaseWallet,
    cosmostationWallet as BaseWallet,
    walletConnect as BaseWallet,
  ]

  return (
    <ThemeProvider>
      <ChainProvider
        wallets={wallets}
        chains={[lumeraChain]}
        assetLists={[lumeraAssets]}
        signerOptions={{}}
        endpointOptions={{}}
      >
        {children}
        <OverlaysManager />
      </ChainProvider>
    </ThemeProvider>
  )
}
