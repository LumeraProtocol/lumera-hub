import { useChain } from '@interchain-kit/react';
import { SigningStargateClient } from '@cosmjs/stargate';

import { useSelector } from '@/redux/hooks';
import {
  RPC_ENDPOINT,
  CHAIN_NAME,
  COSMOS_EIP712_ENABLED,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import { canWalletSignCosmosTransactions } from '@/utils/cosmos-transactions';
import { getActiveWalletAddress, getActiveWalletMode } from '@/utils/wallet-selection';

const useWalletConnect = () => {
  const { chain, wallet, address: cosmosAddress } = useChain(CHAIN_NAME);
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
  const isConnected = Boolean(address);
  // Phase 2 will source this from the MetaMask Cosmos signer once it is implemented.
  const hasEvmCosmosSigner = false;
  const canSignCosmosTransactions = canWalletSignCosmosTransactions({
    isEvmNetwork: walletMode === 'evm',
    chainEip712Enabled: COSMOS_EIP712_ENABLED,
    hasEvmCosmosSigner,
  });

  const getClient = async () => {
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
  }

  const getOfflineSigner = async () => {
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
  }

  return {
    isModalOpen,
    isConnected,
    address,
    walletName,
    walletMode,
    canSignCosmosTransactions,
    isEvm: walletMode === 'evm',
    evmProvider: evmWallet.provider,
    ensureEvmNetwork: evmWallet.ensureNetwork,
    getClient,
    getOfflineSigner,
  }
}

export default useWalletConnect;
