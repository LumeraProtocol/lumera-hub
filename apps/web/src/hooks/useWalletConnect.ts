import { useChain } from '@interchain-kit/react';
import { SigningStargateClient } from '@cosmjs/stargate';

import { useSelector } from '@/redux/hooks';
import {
  RPC_ENDPOINT,
  CHAIN_NAME,
} from '@/contants/network';

const useWalletConnect = () => {
  const { chain, wallet } = useChain(CHAIN_NAME);
  const { isConnected, address, walletName, isModalOpen } = useSelector((state) => state.wallet);

  const getClient = async () => {
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
    getClient,
    getOfflineSigner,
  }
}

export default useWalletConnect;
