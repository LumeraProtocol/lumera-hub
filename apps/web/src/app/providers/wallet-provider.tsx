'use client'

import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ChainProvider, useWalletManager } from '@interchain-kit/react';
import { WalletState } from '@interchain-kit/core';
import { keplrWallet } from '@interchain-kit/keplr-extension';
import { ThemeProvider, OverlaysManager } from '@interchain-ui/react';
import '@interchain-ui/react/styles';

import {
  CHAIN_NAME,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { getChains } from '@/utils/helpers';
import {
  KEPLR_WALLET_NAME,
  METAMASK_WALLET_NAME,
  suppressPersistedKeplrConnection,
} from '@/utils/wallet-selection';
import { useSelector } from '@/redux/hooks';
import { RegistryProvider } from "./RegistryContext";
import { EvmWalletProvider } from './evm-wallet-provider';
import store, { persistor } from '@/store';

function InterchainWalletModeSynchronizer() {
  const walletName = useSelector((state) => state.wallet.walletName);
  const {
    currentWalletName,
    getChainWalletState,
    setCurrentChainName,
    setCurrentWalletName,
    updateChainWalletState,
  } = useWalletManager();
  const keplrState = getChainWalletState(KEPLR_WALLET_NAME, CHAIN_NAME);

  React.useLayoutEffect(() => {
    if (!IS_EVM_NETWORK || walletName !== METAMASK_WALLET_NAME) return;

    if (
      keplrState
      && (keplrState.walletState !== WalletState.Disconnected || keplrState.account)
    ) {
      updateChainWalletState(KEPLR_WALLET_NAME, CHAIN_NAME, {
        walletState: WalletState.Disconnected,
        account: undefined,
        errorMessage: '',
      });
    }
    if (currentWalletName === KEPLR_WALLET_NAME) {
      setCurrentWalletName('');
      setCurrentChainName('');
    }
  }, [
    currentWalletName,
    keplrState,
    setCurrentChainName,
    setCurrentWalletName,
    updateChainWalletState,
    walletName,
  ]);

  return null;
}

function WalletRuntimeProviders({ children }: { children: React.ReactNode }) {
  const walletName = useSelector((state) => state.wallet.walletName);
  const { chains, assetLists } = getChains();
  const isBrowser = typeof window !== 'undefined';
  // Resolve chain & assets only in the browser to avoid throwing during Next.js prerender/export
  // Use loose typing to avoid importing chain-registry types; runtime values come from the registry data.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chainData, setChainData] = React.useState<{ chain: any; assets: any } | null>(null);
  React.useEffect(() => {
    if (isBrowser && IS_EVM_NETWORK && walletName === METAMASK_WALLET_NAME) {
      suppressPersistedKeplrConnection(window.localStorage);
    }
  }, [isBrowser, walletName]);

  React.useEffect(() => {
    if (!isBrowser || chainData) return;
    const foundChain = chains.find(({ chainName }) => chainName === CHAIN_NAME);
    const foundAssets = assetLists.find(({ chainName }) => chainName === CHAIN_NAME);

    if (!foundChain || !foundAssets) {
      console.warn(
        `Chain or assets not found for ${CHAIN_NAME}. Available chains: ${chains
          .map((c) => c.chainName)
          .join(', ')}`
      );
      return;
    }
    setChainData({ chain: foundChain, assets: foundAssets });
  }, [isBrowser, chains, assetLists, chainData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletAdapters: any = React.useMemo(() => [keplrWallet], []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <RegistryProvider>
          <EvmWalletProvider>
            {isBrowser && chainData ? (
              <ChainProvider wallets={walletAdapters} chains={[chainData.chain]} assetLists={[chainData.assets]}>
                <InterchainWalletModeSynchronizer />
                {children}
                <OverlaysManager />
              </ChainProvider>
            ) : (
              // During SSR or while resolving on client, render app shell without ChainProvider to avoid build-time throws
              <>
                {children}
              </>
            )}
          </EvmWalletProvider>
        </RegistryProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export function WebWalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WalletRuntimeProviders>{children}</WalletRuntimeProviders>
      </PersistGate>
    </Provider>
  );
}
