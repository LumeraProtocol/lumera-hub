'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  ACTIVE_NETWORK,
  EVM_CHAIN_ID,
  EVM_PROFILE_NAME,
  EVM_RPC_ENDPOINT,
  IS_EVM_NETWORK,
} from '@/contants/network';
import {
  assertEvmProviderMatchesRpc,
  ensureEvmWalletNetwork,
  EvmNetworkMismatchError,
  getEvmAccountForChain,
  getEvmConnectionErrorMessage,
  getMetaMaskProvider,
} from '@/utils/evm';
import type { Eip1193Provider } from '@/types/window';

interface Eip6963ProviderDetail {
  provider?: Eip1193Provider;
}

interface EvmWalletContextValue {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string;
  provider: Eip1193Provider | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  ensureNetwork: () => Promise<void>;
}

const EvmWalletContext = createContext<EvmWalletContextValue | null>(null);

export function EvmWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState('');
  const [isConnecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<Eip1193Provider | null>(
    typeof window === 'undefined' ? null : getMetaMaskProvider(window.ethereum)
  );

  useEffect(() => {
    const detectProvider = () => {
      const detectedProvider = getMetaMaskProvider(window.ethereum);
      setProvider((currentProvider) => detectedProvider || currentProvider);
    };
    const handleProviderAnnouncement = (event: Event) => {
      const announcedProvider = getMetaMaskProvider(
        (event as CustomEvent<Eip6963ProviderDetail>).detail?.provider
      );
      if (announcedProvider) setProvider(announcedProvider);
    };

    detectProvider();
    window.addEventListener('ethereum#initialized', detectProvider, { once: true });
    window.addEventListener('eip6963:announceProvider', handleProviderAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => {
      window.removeEventListener('ethereum#initialized', detectProvider);
      window.removeEventListener('eip6963:announceProvider', handleProviderAnnouncement);
    };
  }, []);

  const ensureConfiguredNetwork = useCallback(async (suggestProfileOnMismatch: boolean) => {
    if (!IS_EVM_NETWORK || !EVM_CHAIN_ID || !EVM_PROFILE_NAME || !EVM_RPC_ENDPOINT) {
      throw new Error('The active network does not support EVM wallets.');
    }
    if (!provider) {
      throw new Error('MetaMask was not detected. Install or enable the MetaMask extension.');
    }

    await ensureEvmWalletNetwork(provider, {
      chainId: EVM_CHAIN_ID,
      chainName: EVM_PROFILE_NAME,
      rpcEndpoint: EVM_RPC_ENDPOINT,
      suggestProfileOnMismatch,
    });
  }, [provider]);

  const ensureNetwork = useCallback(
    () => ensureConfiguredNetwork(false),
    [ensureConfiguredNetwork],
  );

  const connect = useCallback(async () => {
    setError('');
    setConnecting(true);
    try {
      if (!provider) {
        throw new Error('MetaMask was not detected. Install or enable the MetaMask extension.');
      }
      await provider.request<string[]>({ method: 'eth_requestAccounts' });
      await ensureConfiguredNetwork(true);
      if (!EVM_CHAIN_ID) {
        throw new Error('The active network does not define an EVM chain ID.');
      }
      setAddress(await getEvmAccountForChain(provider, EVM_CHAIN_ID));
    } catch (connectError) {
      const message = getEvmConnectionErrorMessage(
        connectError,
        ACTIVE_NETWORK.displayName,
      );
      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [ensureConfiguredNetwork, provider]);

  const disconnect = useCallback(async () => {
    try {
      await provider?.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Some injected wallets do not implement permission revocation.
    }
    setAddress('');
    setError('');
  }, [provider]);

  useEffect(() => {
    if (!IS_EVM_NETWORK || !provider || !EVM_CHAIN_ID) return;
    const expectedChainId = EVM_CHAIN_ID;

    // `accountsChanged` and `chainChanged` can overlap, and each sync awaits
    // several RPC round trips. Without a sequence guard the slowest response
    // wins and can restore state the newer event already superseded.
    let cancelled = false;
    let latestSyncId = 0;

    const syncAccounts = async () => {
      const syncId = latestSyncId + 1;
      latestSyncId = syncId;
      const isStale = () => cancelled || syncId !== latestSyncId;

      let activeAddress: string;
      try {
        activeAddress = await getEvmAccountForChain(provider, expectedChainId);
      } catch (accountError) {
        // The wallet reports no usable account for this chain, so there is
        // genuinely nothing connected.
        if (isStale()) return;
        setAddress('');
        setError(accountError instanceof Error
          ? accountError.message
          : 'Unable to read the MetaMask account.');
        return;
      }

      try {
        await assertEvmProviderMatchesRpc(provider, { rpcEndpoint: EVM_RPC_ENDPOINT || undefined });
      } catch (verifyError) {
        if (isStale()) return;
        if (verifyError instanceof EvmNetworkMismatchError) {
          setAddress('');
          setError(verifyError.message);
          return;
        }
        // Verification could not complete (a transient RPC failure rather than
        // a real mismatch). Keep the connected address so the wallet does not
        // appear to disconnect, and surface why it is unverified. Signing paths
        // re-run this check via `ensureNetwork`, so nothing is signed unverified.
        setAddress(activeAddress);
        setError(verifyError instanceof Error
          ? verifyError.message
          : 'Unable to verify the MetaMask network.');
        return;
      }

      if (isStale()) return;
      setAddress(activeAddress);
      setError('');
    };

    const handleAccountsChanged = () => void syncAccounts();
    const handleChainChanged = () => void syncAccounts();

    void syncAccounts();
    provider.on?.('accountsChanged', handleAccountsChanged);
    provider.on?.('chainChanged', handleChainChanged);

    return () => {
      cancelled = true;
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [provider]);

  const value = useMemo<EvmWalletContextValue>(() => ({
    address,
    isConnected: Boolean(address),
    isConnecting,
    error,
    provider,
    connect,
    disconnect,
    ensureNetwork,
  }), [address, connect, disconnect, ensureNetwork, error, isConnecting, provider]);

  return <EvmWalletContext.Provider value={value}>{children}</EvmWalletContext.Provider>;
}

export const useEvmWallet = () => {
  const context = useContext(EvmWalletContext);
  if (!context) {
    throw new Error('useEvmWallet must be used within EvmWalletProvider.');
  }
  return context;
};
