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

const getConfiguredChainData = () => {
  const { chains, assetLists } = getChains();
  const chain = chains.find(({ chainName }) => chainName === CHAIN_NAME);
  const assets = assetLists.find(({ chainName }) => chainName === CHAIN_NAME);

  // Every app surface calls interchain-kit hooks, including EVM-only screens.
  // Rendering children before ChainProvider exists throws synchronously from
  // useWalletManager, so resolve the static profile data during render instead
  // of installing the provider one effect later.
  if (!chain || !assets) {
    throw new Error(
      `Chain or assets not found for ${CHAIN_NAME}. Available chains: ${chains
        .map((item) => item.chainName)
        .join(', ')}`
    );
  }
  // The handcrafted devnet entry is structurally compatible at runtime, but
  // chain-registry's generated type requires metadata fields it does not use.
  // Keep the cast at this single provider boundary.
  return { chain, assets } as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assets: any;
  };
};

export function WalletRuntimeProviders({ children }: { children: React.ReactNode }) {
  const walletName = useSelector((state) => state.wallet.walletName);
  const chainData = getConfiguredChainData();
  const isBrowser = typeof window !== 'undefined';
  React.useEffect(() => {
    if (isBrowser && IS_EVM_NETWORK && walletName === METAMASK_WALLET_NAME) {
      suppressPersistedKeplrConnection(window.localStorage);
    }
  }, [isBrowser, walletName]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletAdapters: any = React.useMemo(() => [keplrWallet], []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        <RegistryProvider>
          <EvmWalletProvider>
            <ChainProvider wallets={walletAdapters} chains={[chainData.chain]} assetLists={[chainData.assets]}>
              <InterchainWalletModeSynchronizer />
              {children}
              <OverlaysManager />
            </ChainProvider>
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
