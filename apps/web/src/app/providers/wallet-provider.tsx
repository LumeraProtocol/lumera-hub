'use client'

import React from 'react'
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
// import { BaseWallet, WCWallet } from '@interchain-kit/core';
import { PersistGate } from 'redux-persist/integration/react';
import { ChainProvider } from '@interchain-kit/react';
import { keplrWallet } from '@interchain-kit/keplr-extension';
import { leapWallet } from '@interchain-kit/leap-extension';
import { cosmostationWallet } from '@interchain-kit/cosmostation-extension';
import { assetLists, chains } from 'chain-registry/testnet';
import '@interchain-ui/react/styles'
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react'

import { CHAIN_NAME } from '@/contants/network';
import { RegistryProvider } from "./RegistryContext";
import store, { persistor } from '@/store';

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  const lumeraChain = chains.find(({chainName}) =>chainName === CHAIN_NAME)
  const lumeraAssets = assetLists.find(({chainName})=>chainName === CHAIN_NAME);

  if (!lumeraChain || !lumeraAssets) {
    throw new Error(`Chain or assets not found for ${CHAIN_NAME}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletAdapters: any = [keplrWallet, leapWallet, cosmostationWallet];

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <HelmetProvider>
          <ThemeProvider>
            <ChainProvider
              wallets={walletAdapters}
              chains={[lumeraChain]}
              assetLists={[lumeraAssets]}
            >
              <RegistryProvider>
                {children}
                <OverlaysManager />
              </RegistryProvider>
            </ChainProvider>
          </ThemeProvider>
        </HelmetProvider>
      </PersistGate>
    </Provider>
  )
}
