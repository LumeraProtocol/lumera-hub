'use client'

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Wallet } from '@tamagui/lucide-icons';
import { InterchainWalletModal, useChain, useChainWallet } from '@interchain-kit/react';
import { ChevronDown, Copy, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

import { useDispatch, useSelector } from '@/redux/hooks';
import { CHAIN_NAME, IS_EVM_NETWORK } from '@/contants/network';
import {
  setAddress,
  setConnected,
  setModalOpen,
  setWalletName,
} from '@/redux/wallet.slice';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import useWalletConnect from '@/hooks/useWalletConnect';
import { evmAddressToCosmosAddress } from '@/utils/evm';
import {
  getActiveWalletAddress,
  getActiveWalletMode,
  getAlternativeWalletName,
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
      logo: '/metamask.png',
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
  const evmWallet = useEvmWallet();
  const { address, walletName } = useWalletConnect();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isKeplrInstalled, setKeplrInstalled] = useState(false);
  const isMetaMaskInstalled = Boolean(evmWallet.provider);

  useEffect(() => {
    if (!isMenuOpen) return;

    setKeplrInstalled(Boolean(window.keplr));
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!address) setMenuOpen(false);
  }, [address]);

  const handleDisconnect = async () => {
    setMenuOpen(false);
    if (IS_EVM_NETWORK && walletName === METAMASK_WALLET_NAME) {
      await evmWallet.disconnect();
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

  const handleCopyAddress = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied.`, {
        position: 'bottom-center',
        theme: 'dark',
      });
    } catch {
      toast.error('Unable to copy the address.', {
        position: 'bottom-center',
        theme: 'dark',
      });
    }
  };

  const walletLabel = walletName === METAMASK_WALLET_NAME ? 'MetaMask' : 'Keplr';
  const alternativeWallet = IS_EVM_NETWORK ? getAlternativeWalletName({
    currentWallet: walletName,
    isKeplrInstalled,
    isMetaMaskInstalled,
  }) : '';
  const metaMaskCosmosAddress = walletName === METAMASK_WALLET_NAME && evmWallet.address
    ? evmAddressToCosmosAddress(evmWallet.address)
    : '';
  const addressItems = walletName === METAMASK_WALLET_NAME
    ? [
      { label: 'Cosmos-style EVM address', value: metaMaskCosmosAddress },
      { label: 'ETH hex address', value: evmWallet.address },
    ]
    : [{ label: 'Lumera address', value: address }];

  return (
    <div className={styles.accountControls}>
      {!address ?
        <button
          type="button"
          onClick={handleConnect}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
        </button> : (
          <div className={styles.accountMenuRoot} ref={menuRef}>
            <button
              type="button"
              className={styles.accountMenuTrigger}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span>{walletLabel}</span>
              <ChevronDown
                aria-hidden="true"
                className={`${styles.triggerChevron} ${isMenuOpen ? styles.triggerChevronOpen : ''}`}
                size={17}
              />
            </button>

            {isMenuOpen && (
              <div className={styles.accountMenu} role="menu" aria-label={`${walletLabel} wallet menu`}>
                <div className={styles.accountMenuHeading}>{walletLabel} wallet</div>
                <div className={styles.addressList}>
                  {addressItems.filter((item) => item.value).map((item) => (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.addressItem}
                      aria-label={`Copy ${item.label}`}
                      key={item.label}
                      onClick={() => void handleCopyAddress(item.value, item.label)}
                    >
                      <span className={styles.addressContent}>
                        <span className={styles.addressLabel}>{item.label}</span>
                        <span className={styles.fullAddress}>{item.value}</span>
                      </span>
                      <Copy className={styles.menuIcon} aria-hidden="true" size={17} />
                    </button>
                  ))}
                </div>

                <div className={styles.menuActions}>
                  {alternativeWallet && (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.menuAction}
                      onClick={() => {
                        setMenuOpen(false);
                        handleConnect();
                      }}
                    >
                      <RefreshCw aria-hidden="true" size={18} />
                      <span>Switch wallet</span>
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.menuAction} ${styles.disconnectAction}`}
                    onClick={() => void handleDisconnect()}
                  >
                    <LogOut aria-hidden="true" size={18} />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )
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
