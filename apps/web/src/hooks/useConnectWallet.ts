'use client'

import { useCallback, useState } from 'react';
import { useChainWallet, useWalletManager } from '@interchain-kit/react';

import { useDispatch } from '@/redux/hooks';
import { CHAIN_NAME } from '@/contants/network';
import { setWalletName } from '@/redux/wallet.slice';
import { setWalletConnecting } from '@/redux/wallet-flow.slice';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import {
  getKeplrConnectionIssue,
  KEPLR_WALLET_NAME,
  METAMASK_WALLET_NAME,
} from '@/utils/wallet-selection';

/**
 * Connecting a named wallet, without asking which one.
 *
 * This was the body of the old picker's Connect button. It moved here so the
 * redesign's connect drawer can act on the wallet someone already chose
 * instead of opening a second picker to ask again — two dialogs stacked on
 * each other, both listing Keplr and MetaMask.
 *
 * The Keplr path is the reason this is worth sharing rather than reimplementing:
 * interchain-kit resolves connect() even when the extension rejected, and its
 * store can hold a rehydrated account from an earlier session, so a fresh
 * account read is required before the selection is trusted and a half-open
 * session is rolled back on failure.
 */
const useConnectWallet = () => {
  const dispatch = useDispatch();
  const evmWallet = useEvmWallet();
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const { getAccount, getChainWalletState } = useWalletManager();
  const [connectingWallet, setConnectingWallet] = useState('');
  const [error, setError] = useState('');

  const connectWallet = useCallback(
    async (walletName: string): Promise<boolean> => {
      if (!walletName) return false;

      setConnectingWallet(walletName);
      // Marks the attempt in flight for the runtime synchronizer, which must
      // not tear down a Keplr session the user is in the middle of approving.
      dispatch(setWalletConnecting({ walletName }));
      setError('');

      try {
        if (walletName === METAMASK_WALLET_NAME) {
          if (!evmWallet.provider) throw new Error('MetaMask was not detected.');
          await evmWallet.connect();
        } else {
          if (typeof window === 'undefined' || !window.keplr) {
            throw new Error('Keplr was not detected.');
          }
          await keplrWallet.connect();

          const issue = getKeplrConnectionIssue(
            getChainWalletState(KEPLR_WALLET_NAME, CHAIN_NAME),
          );
          const account = issue ? null : await getAccount(KEPLR_WALLET_NAME, CHAIN_NAME);
          if (issue || !account?.address) {
            // Roll back the half-connected session so a retry starts clean
            // instead of reusing a Connected ghost.
            try {
              await keplrWallet.disconnect();
            } catch {
              // Best effort; the synchronizer reconciles any residue below.
            }
            throw new Error(issue || 'Keplr did not return a connected account.');
          }
        }

        dispatch(setWalletName({ walletName }));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to connect wallet.');
        return false;
      } finally {
        setConnectingWallet('');
        // Released only after the selection dispatches above, so there is no
        // render where the guard is down while the old wallet is still
        // selected. On failure this re-enables the synchronizer.
        dispatch(setWalletConnecting({ walletName: '' }));
      }
    },
    [dispatch, evmWallet, getAccount, getChainWalletState, keplrWallet],
  );

  return { connectWallet, connectingWallet, error, setError };
};

export default useConnectWallet;
