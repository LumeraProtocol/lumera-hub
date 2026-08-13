'use client'

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Wallet, LogOut } from '@tamagui/lucide-icons';
import { InterchainWalletModal, useChain, useChainWallet } from '@interchain-kit/react';
import { toast } from 'react-toastify';

import { useDispatch, useSelector } from '@/redux/hooks';
import { formatAddress } from '@/utils/format';
import { CHAIN_NAME, IS_EVM_NETWORK } from '@/contants/network';
import {
  setAddress,
  setConnected,
  setModalOpen,
  setWalletName,
} from '@/redux/wallet.slice';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import useWalletConnect from '@/hooks/useWalletConnect';
import {
  getActiveWalletAddress,
  getActiveWalletMode,
  getPreferredWalletSelection,
  KEPLR_WALLET_NAME,
  METAMASK_WALLET_NAME,
} from '@/utils/wallet-selection';
import styles from './ConnectWallet.module.css';

function WalletChoiceModal() {
  const dispatch = useDispatch();
  const { isModalOpen, walletName } = useSelector((state) => state.wallet);
  const evmWallet = useEvmWallet();
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const [isKeplrInstalled, setKeplrInstalled] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [connectingWallet, setConnectingWallet] = useState('');
  const [walletError, setWalletError] = useState('');
  const isMetaMaskInstalled = Boolean(evmWallet.provider);

  useEffect(() => {
    if (!isModalOpen) return;

    const keplrInstalled = Boolean(window.keplr);
    setKeplrInstalled(keplrInstalled);
    setSelectedWallet(getPreferredWalletSelection({
      currentSelection: walletName,
      isKeplrInstalled: keplrInstalled,
      isMetaMaskInstalled,
    }));
    setWalletError('');
  }, [isMetaMaskInstalled, isModalOpen, walletName]);

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !connectingWallet) {
        dispatch(setModalOpen({ status: false }));
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connectingWallet, dispatch, isModalOpen]);

  if (!isModalOpen || typeof document === 'undefined') return null;

  const close = () => dispatch(setModalOpen({ status: false }));

  const connectSelectedWallet = async () => {
    if (!selectedWallet) return;

    setConnectingWallet(selectedWallet);
    setWalletError('');
    try {
      if (selectedWallet === METAMASK_WALLET_NAME) {
        if (!isMetaMaskInstalled) throw new Error('MetaMask was not detected.');
        await evmWallet.connect();
      } else {
        if (!isKeplrInstalled) throw new Error('Keplr was not detected.');
        await keplrWallet.connect();
      }
      dispatch(setWalletName({ walletName: selectedWallet }));
      close();
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Unable to connect wallet.');
    } finally {
      setConnectingWallet('');
    }
  };

  const walletOptions = [
    {
      name: 'Keplr',
      walletName: KEPLR_WALLET_NAME,
      logo: '/keplr.svg',
      installed: isKeplrInstalled,
    },
    {
      name: 'MetaMask',
      walletName: METAMASK_WALLET_NAME,
      logo: '/metamask.svg',
      installed: isMetaMaskInstalled,
    },
  ];

  return createPortal(
    <div
      role="presentation"
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !connectingWallet) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-choice-title"
        className={styles.dialog}
      >
        <h2 id="wallet-choice-title" className={styles.title}>Connect Wallet</h2>
        <button
          type="button"
          aria-label="Close wallet selection"
          className={styles.closeButton}
          disabled={Boolean(connectingWallet)}
          onClick={close}
        >
          ×
        </button>
        <ul className={styles.walletList} aria-label="Available wallets">
          {walletOptions.map((option) => {
            const isSelected = option.walletName === selectedWallet;
            return (
              <li key={option.walletName}>
                <button
                  type="button"
                  className={`${styles.walletOption} ${isSelected ? styles.walletOptionSelected : ''}`}
                  aria-pressed={isSelected}
                  disabled={!option.installed || Boolean(connectingWallet)}
                  onClick={() => {
                    setSelectedWallet(option.walletName);
                    setWalletError('');
                  }}
                >
                  <Image className={styles.walletLogo} src={option.logo} alt="" width={50} height={50} />
                  <span className={styles.walletName}>{option.name}</span>
                  {!option.installed && <span className={styles.walletStatus}>Not detected</span>}
                  {isSelected && option.installed && <span className={styles.selectedMark}>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {walletError && <p className={styles.error} role="alert">{walletError}</p>}
        <button
          type="button"
          className={styles.connectButton}
          disabled={!selectedWallet || Boolean(connectingWallet)}
          onClick={() => void connectSelectedWallet()}
        >
          {connectingWallet ? 'Connecting…' : 'Connect'}
        </button>
      </div>
    </div>,
    document.body
  );
}

export function WalletModalComponent() {
  const dispatch = useDispatch();
  const { address: cosmosAddress } = useChain(CHAIN_NAME);
  const { address: evmAddress } = useEvmWallet();
  const walletName = useSelector((state) => state.wallet.walletName);
  const walletMode = getActiveWalletMode({ selectedWallet: walletName, isEvmNetwork: IS_EVM_NETWORK });
  const address = getActiveWalletAddress({ mode: walletMode, evmAddress, cosmosAddress });

  useEffect(() => {
    dispatch(setAddress({ address }));
    dispatch(setConnected({ status: Boolean(address) }));
  }, [address, dispatch]);

  if (IS_EVM_NETWORK) return <WalletChoiceModal />;

  return (
    <div className='relative z-50'>
      <InterchainWalletModal />
    </div>
  );
}

export function ConnectWallet() {
  const dispatch = useDispatch();
  const { disconnect: disconnectCosmos, openView } = useChain(CHAIN_NAME);
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const { disconnect: disconnectEvm } = useEvmWallet();
  const { address, walletName } = useWalletConnect();

  const handleDisconnect = async () => {
    if (IS_EVM_NETWORK && walletName === METAMASK_WALLET_NAME) {
      await disconnectEvm();
    } else if (IS_EVM_NETWORK && walletName === KEPLR_WALLET_NAME) {
      await keplrWallet.disconnect();
    } else {
      await disconnectCosmos();
    }
    dispatch(setWalletName({ walletName: '' }));
    dispatch(setAddress({ address: '' }));
    dispatch(setConnected({ status: false }));
  };

  const handleConnect = () => {
    if (IS_EVM_NETWORK) {
      dispatch(setModalOpen({ status: true }));
    } else {
      openView();
    }
  };

  const handleCopyAddress = () => {
    void navigator.clipboard.writeText(address);
    toast('The address has been copied.', {
      position: 'bottom-center',
      theme: 'dark',
    });
  };

  const walletLabel = walletName === METAMASK_WALLET_NAME ? 'MetaMask' : 'Keplr';

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={handleConnect}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
        </button> :
        <>
          {IS_EVM_NETWORK && (
            <button
              type="button"
              onClick={handleConnect}
              title="Switch wallet"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {walletLabel}
            </button>
          )}
          <span className='btn-address cursor-pointer' onClick={handleCopyAddress}>{formatAddress(address, 5, -4)}</span>
          <button onClick={() => void handleDisconnect()} className='btn-logout'><LogOut /></button>
        </>
      }
    </div>
  );
}

export function ConnectWalletButton() {
  const dispatch = useDispatch();
  const { openView } = useChain(CHAIN_NAME);
  const { address } = useWalletConnect();

  const handleConnect = () => {
    if (IS_EVM_NETWORK) {
      dispatch(setModalOpen({ status: true }));
    } else {
      openView();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={handleConnect}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1">Connect Wallet</div>
        </button> : null
      }
    </div>
  );
}
