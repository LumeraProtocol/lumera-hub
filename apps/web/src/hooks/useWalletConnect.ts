import { useCallback } from 'react';
import { useChain } from '@interchain-kit/react';
import { SigningStargateClient } from '@cosmjs/stargate';

import { useDispatch, useSelector } from '@/redux/hooks';
import { setModalOpen } from '@/redux/wallet.slice';
import {
  RPC_ENDPOINT,
  RPC_ENDPOINTS,
  CHAIN_NAME,
  COSMOS_EIP712_ENABLED,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import { canWalletSignCosmosTransactions } from '@/utils/cosmos-transactions';
import { getActiveWalletAddress, getActiveWalletMode } from '@/utils/wallet-selection';
import { getEvmAddressFormats } from '@/utils/evm';
import { resolveOfflineSigner } from '@/utils/offline-signer';
import { REQUEST_CONNECT_EVENT } from '@lumera-hub/ui/src/hub/session';

const useWalletConnect = () => {
  const dispatch = useDispatch();
  const { chain, wallet, address: cosmosAddress, openView: openCosmosView } = useChain(CHAIN_NAME);
  const evmWallet = useEvmWallet();
  const { walletName, isModalOpen } = useSelector((state) => state.wallet);
  const walletMode = getActiveWalletMode({
    selectedWallet: walletName,
    isEvmNetwork: IS_EVM_NETWORK,
  });
  const address = getActiveWalletAddress({
    mode: walletMode,
    evmAddress: evmWallet.address,
    cosmosAddress,
  });
  const { bech32Address, ethAddress } = getEvmAddressFormats(address, IS_EVM_NETWORK);
  const isConnected = Boolean(address);
  // Phase 2 will source this from the MetaMask Cosmos signer once it is implemented.
  const hasEvmCosmosSigner = false;
  const canSignCosmosTransactions = canWalletSignCosmosTransactions({
    isEvmNetwork: walletMode === 'evm',
    chainEip712Enabled: COSMOS_EIP712_ENABLED,
    hasEvmCosmosSigner,
  });

  // The single connect entry point. On EVM profiles the interchain-kit modal
  // is not mounted (WalletModalComponent renders WalletChoiceModal instead),
  // so interchain-kit's openView() would toggle a store nothing listens to.
  const openConnectView = useCallback((preferredWalletName?: string) => {
    /*
     * Ask the hub for its connect drawer rather than opening one of the old
     * pickers. Every caller — the header, a gated action, an upload that
     * needs a signature — now lands in the same single dialog, which connects
     * the chosen wallet directly.
     */
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(REQUEST_CONNECT_EVENT, { detail: { preferredWalletName } }),
      );
      return;
    }
    if (IS_EVM_NETWORK) {
      dispatch(setModalOpen({ status: true, preferredWalletName }));
      return;
    }
    openCosmosView();
  }, [dispatch, openCosmosView]);

  const getClient = useCallback(async () => {
    if (walletMode === 'none') {
      throw new Error('Please connect wallet before using');
    }
    if (walletMode === 'evm') {
      if (!canSignCosmosTransactions) {
        throw new Error('Cosmos transactions are temporarily unavailable with MetaMask on this network.');
      }
      throw new Error('Cosmos signing is unavailable while using an EVM network profile.');
    }
    // A chain with no id cannot be signed for; the registry entry is broken.
    if (!wallet || !chain?.chainId) {
      throw new Error('Please connect wallet before using');
    }
    const offlineSigner = await resolveOfflineSigner({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wallet: wallet as any,
      chainId: chain.chainId,
      address,
      walletName,
    });
    // Try the configured primary, then the community fallbacks, so a dead
    // primary does not block every Cosmos transaction — the same failover the
    // read client already uses. RPC_ENDPOINTS leads with RPC_ENDPOINT.
    const hosts = RPC_ENDPOINTS?.length ? RPC_ENDPOINTS : [RPC_ENDPOINT];
    let lastError: unknown;
    for (const host of hosts) {
      try {
        return await SigningStargateClient.connectWithSigner(
          host,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          offlineSigner as any,
        );
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('No RPC host answered for signing.');
  }, [address, canSignCosmosTransactions, chain, wallet, walletMode, walletName]);

  const getOfflineSigner = useCallback(async () => {
    if (walletMode === 'none') {
      throw new Error('Please connect wallet before using');
    }
    if (walletMode === 'evm') {
      throw new Error('Cosmos signing is unavailable while using MetaMask.');
    }
    if (!wallet || !chain?.chainId) {
      throw new Error('Please connect wallet before using');
    }
    return resolveOfflineSigner({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wallet: wallet as any,
      chainId: chain.chainId,
      address,
      walletName,
    });
  }, [address, chain, wallet, walletMode, walletName]);

  return {
    isModalOpen,
    isConnected,
    address,
    bech32Address,
    ethAddress,
    walletName,
    walletMode,
    canSignCosmosTransactions,
    isEvm: walletMode === 'evm',
    evmProvider: evmWallet.provider,
    ensureEvmNetwork: evmWallet.ensureNetwork,
    getClient,
    getOfflineSigner,
    openConnectView,
  }
}

export default useWalletConnect;
