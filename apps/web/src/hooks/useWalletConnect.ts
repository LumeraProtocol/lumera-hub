import { useChain } from '@interchain-kit/react';
import { SigningStargateClient } from '@cosmjs/stargate';

import { useSelector } from '@/redux/hooks';
import {
  RPC_ENDPOINT,
  CHAIN_NAME,
  IS_EVM_NETWORK,
} from '@/contants/network';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';

const useWalletConnect = () => {
  const { chain, wallet, address: cosmosAddress } = useChain(CHAIN_NAME);
  const evmWallet = useEvmWallet();
  const { walletName, isModalOpen } = useSelector((state) => state.wallet);
  const address = IS_EVM_NETWORK ? evmWallet.address : cosmosAddress || '';
  const isConnected = Boolean(address);

  const getClient = async () => {
    if (IS_EVM_NETWORK) {
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
    if (IS_EVM_NETWORK) {
      throw new Error('Cosmos signing is unavailable while using an EVM network profile.');
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
    isEvm: IS_EVM_NETWORK,
    evmProvider: evmWallet.provider,
    ensureEvmNetwork: evmWallet.ensureNetwork,
    getClient,
    getOfflineSigner,
  }
}

export default useWalletConnect;
