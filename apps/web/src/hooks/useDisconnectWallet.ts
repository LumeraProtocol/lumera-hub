import { useCallback } from 'react';
import { useChain, useChainWallet } from '@interchain-kit/react';

import { useDispatch } from '@/redux/hooks';
import { CHAIN_NAME, IS_EVM_NETWORK } from '@/contants/network';
import { setAddress, setConnected, setWalletName } from '@/redux/wallet.slice';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import useWalletConnect from '@/hooks/useWalletConnect';
import { clearTrackedConnects } from '@/utils/wallet-connect-marker';
// The canonical wallet-name keys. Redefining them here had already drifted:
// this file's METAMASK_WALLET_NAME was 'metamask-extension' while the value
// actually stored is 'metamask', so the MetaMask disconnect branch never
// matched and fell through to the Cosmos disconnect.
import { KEPLR_WALLET_NAME, METAMASK_WALLET_NAME } from '@/utils/wallet-selection';

/**
 * Tearing down a connection touches three places — the active wallet adapter,
 * the redux mirror of it, and the per-session connect markers. This used to
 * live inside ConnectWallet, which meant nothing else could disconnect. The
 * shell's wallet chip needs it too, so it is a hook.
 */
const useDisconnectWallet = () => {
  const dispatch = useDispatch();
  const { disconnect: disconnectCosmos } = useChain(CHAIN_NAME);
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const evmWallet = useEvmWallet();
  const { walletName } = useWalletConnect();

  return useCallback(async () => {
    try {
      if (IS_EVM_NETWORK && walletName === METAMASK_WALLET_NAME) {
        await evmWallet.disconnect();
      } else if (IS_EVM_NETWORK && walletName === KEPLR_WALLET_NAME) {
        await keplrWallet.disconnect();
      } else {
        await disconnectCosmos();
      }
    } catch {
      // A wallet that is already gone still needs the local state cleared.
    }
    dispatch(setWalletName({ walletName: '' }));
    dispatch(setAddress({ address: '' }));
    dispatch(setConnected({ status: false }));
    clearTrackedConnects(sessionStorage);
  }, [dispatch, disconnectCosmos, evmWallet, keplrWallet, walletName]);
};

export default useDisconnectWallet;
