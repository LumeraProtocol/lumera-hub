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
import { resolveOfflineSigner, signsWithEthKey } from '@/utils/offline-signer';
import { REQUEST_CONNECT_EVENT } from '@lumera-hub/ui/src/hub/session';

/** Extra simulated gas for an Ethereum-style key not yet on chain: its 21,000 verify cost less the 1,000 CosmJS simulates. */
export const ETH_KEY_GAS_PAD = 20_000;

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
    // An Ethereum-style key costs the chain 21,000 gas to verify. Once the key is
    // on chain the simulation charges that itself, but before then CosmJS
    // simulates with a plain secp256k1 key (1,000), the estimate comes up short
    // and the transaction runs out of gas — after it has been charged. So pad an
    // estimate for an account the chain has no key for yet, checked per call so
    // the second step of a two-step flow sees the key the first one stored.
    const ethKey = await signsWithEthKey(offlineSigner, address);
    for (const host of hosts) {
      try {
        const client = await SigningStargateClient.connectWithSigner(
          host,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          offlineSigner as any,
        );
        if (ethKey) {
          const simulate = client.simulate.bind(client);
          client.simulate = async (...args: Parameters<typeof simulate>) => {
            const gas = await simulate(...args);
            // A failed lookup pads: a little extra fee beats running out of gas.
            const account = await client.getAccount(args[0]).catch(() => null);
            return account?.pubkey ? gas : gas + ETH_KEY_GAS_PAD;
          };
        }
        return client;
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
