import { useCallback } from 'react';
import { useChain } from '@interchain-kit/react';
import { SigningStargateClient } from '@cosmjs/stargate';

import { useDispatch, useSelector } from '@/redux/hooks';
import { setModalOpen } from '@/redux/wallet.slice';
import {
  RPC_ENDPOINT,
  CHAIN_NAME,
  COSMOS_EIP712_ENABLED,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import { canWalletSignCosmosTransactions } from '@/utils/cosmos-transactions';
import { getActiveWalletAddress, getActiveWalletMode } from '@/utils/wallet-selection';
import { getEvmAddressFormats } from '@/utils/evm';

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
    if (!wallet || !chain) {
      throw new Error('Please connect wallet before using');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offlineSigner: any = await wallet.getOfflineSigner(chain.chainId);
    if (!offlineSigner) {
      throw new Error('Please connect wallet before using');
    }
    return SigningStargateClient.connectWithSigner(
      RPC_ENDPOINT,
      offlineSigner
    );
  }, [canSignCosmosTransactions, chain, wallet, walletMode]);

  const getOfflineSigner = useCallback(async () => {
    if (walletMode === 'none') {
      throw new Error('Please connect wallet before using');
    }
    if (walletMode === 'evm') {
      throw new Error('Cosmos signing is unavailable while using MetaMask.');
    }
    if (!wallet || !chain) {
      throw new Error('Please connect wallet before using');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const offlineSigner: any = await wallet?.getOfflineSigner(chain.chainId);
    if (!offlineSigner) {
      throw new Error('Please connect wallet before using');
    }

    return offlineSigner;
  }, [chain, wallet, walletMode]);

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
