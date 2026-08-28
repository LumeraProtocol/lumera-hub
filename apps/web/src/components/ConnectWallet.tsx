'use client'

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Wallet, ChevronDown, Copy, LogOut, RefreshCw, TriangleAlert } from 'lucide-react';
import {
  InterchainWalletModal,
  useChain,
  useChainWallet,
  useWalletManager,
  useWalletModal,
} from '@interchain-kit/react';
import { WalletState } from '@interchain-kit/core';
import { toast } from 'react-toastify';

import AppButton from '@/components/AppButton';
import { useDispatch, useSelector } from '@/redux/hooks';
import { CHAIN_NAME, IS_EVM_NETWORK } from '@/contants/network';
import {
  setAddress,
  setConnected,
  setModalOpen,
  setWalletName,
} from '@/redux/wallet.slice';
import { setWalletConnecting } from '@/redux/wallet-flow.slice';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';
import useWalletConnect from '@/hooks/useWalletConnect';
import useTrackingUser from '@/hooks/useTrackingUser';
import {
  clearTrackedConnects,
  isConnectTracked,
  markConnectTracked,
} from '@/utils/wallet-connect-marker';
import {
  getActiveWalletAddress,
  getActiveWalletMode,
  getAlternativeWalletName,
  getKeplrConnectionIssue,
  getPreferredWalletSelection,
  KEPLR_WALLET_NAME,
  METAMASK_WALLET_NAME,
} from '@/utils/wallet-selection';
import styles from './ConnectWallet.module.css';

function WalletChoiceModal() {
  const dispatch = useDispatch();
  const { isModalOpen, preferredWalletName, walletName } = useSelector((state) => state.wallet);
  const evmWallet = useEvmWallet();
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const { getAccount, getChainWalletState } = useWalletManager();
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
      currentSelection: preferredWalletName || walletName,
      isKeplrInstalled: keplrInstalled,
      isMetaMaskInstalled,
    }));
    setWalletError('');
  }, [isMetaMaskInstalled, isModalOpen, preferredWalletName, walletName]);

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
    // Marks the attempt in flight for the runtime synchronizer, which must
    // not tear down a Keplr session the user is in the middle of approving.
    // Scoped to this attempt regardless of how the wallet was selected
    // (clicked or auto-preselected), and never persisted.
    dispatch(setWalletConnecting({ walletName: selectedWallet }));
    setWalletError('');
    try {
      if (selectedWallet === METAMASK_WALLET_NAME) {
        if (!isMetaMaskInstalled) throw new Error('MetaMask was not detected.');
        await evmWallet.connect();
      } else {
        if (!isKeplrInstalled) throw new Error('Keplr was not detected.');
        await keplrWallet.connect();
        // interchain-kit catches extension rejection/account-read failures and
        // resolves connect() after writing Disconnected/Rejected state — and
        // its store can still hold a rehydrated account from a previous
        // session. Judge the stored state, then require a FRESH account read
        // from the extension before selecting Keplr.
        const issue = getKeplrConnectionIssue(
          getChainWalletState(KEPLR_WALLET_NAME, CHAIN_NAME),
        );
        const account = issue
          ? null
          : await getAccount(KEPLR_WALLET_NAME, CHAIN_NAME);
        if (issue || !account?.address) {
          // Roll back the half-connected session so a retry starts clean
          // instead of reusing a Connected ghost.
          try {
            await keplrWallet.disconnect();
          } catch {
            // Best effort; the synchronizer reconciles any residue once the
            // in-flight flag clears below.
          }
          throw new Error(issue || 'Keplr did not return a connected account.');
        }
      }
      dispatch(setWalletName({ walletName: selectedWallet }));
      close();
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Unable to connect wallet.');
    } finally {
      setConnectingWallet('');
      // Released only after the selection dispatches above, so there is no
      // render where the guard is down while the old wallet is still
      // selected. On failure this re-enables the synchronizer, which then
      // cleans up whatever interchain-kit left behind.
      dispatch(setWalletConnecting({ walletName: '' }));
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
        {/* Only failures caused by this dialog's explicit Connect action are
            reported here; passive provider discovery never sets walletError. */}
        {walletError && (
          <p className={styles.error} role="alert">{walletError}</p>
        )}
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
  const { address: cosmosAddress, status: cosmosStatus } = useChain(CHAIN_NAME);
  const { address: evmAddress } = useEvmWallet();
  const { close } = useWalletModal();
  const walletName = useSelector((state) => state.wallet.walletName);
  const walletMode = getActiveWalletMode({ selectedWallet: walletName, isEvmNetwork: IS_EVM_NETWORK });
  const address = getActiveWalletAddress({ mode: walletMode, evmAddress, cosmosAddress });
  const { trackingUser } = useTrackingUser();
  const trackingAddressesRef = useRef(new Set<string>());
  // Cosmos (interchain-kit) can retain a persisted/cached account address while
  // the live session is 'Connecting' or 'Disconnected' (see
  // utils/wallet-selection.ts's disconnectPersistedInterchainWallet), so only
  // `status === 'Connected'` is a trustworthy signal there. EVM has no such
  // persisted-but-not-live state: evm-wallet-provider's own `isConnected` is
  // literally `Boolean(address)`, so that is the correct check for MetaMask.
  const isConnected = walletMode === 'evm'
    ? Boolean(address)
    : cosmosStatus === WalletState.Connected;

  useEffect(() => {
    dispatch(setAddress({ address }));
    dispatch(setConnected({ status: isConnected }));
    if (address) {
      // Closes the Cosmos-side (interchain-kit) wallet modal once a connection
      // succeeds. The EVM picker (WalletChoiceModal) closes itself via
      // setModalOpen, so this is a no-op on EVM profiles.
      close();
      if (
        !isConnectTracked(sessionStorage, address)
        && !trackingAddressesRef.current.has(address)
      ) {
        // Strict Mode replays mount effects in development. Mark the request as
        // in flight synchronously so the replay cannot race the same SQLite
        // first-connect insert, but clear it afterwards so a transient failure
        // can retry normally.
        trackingAddressesRef.current.add(address);
        void trackingUser({ address })
          .then((outcome) => {
            // 'tracked': the server committed this address's connect — record
            // it even if the user already switched accounts, or switching back
            // re-sends the request and double-counts the connect.
            // 'permanent-failure': the server deterministically rejected the
            // payload; re-sending the identical payload can only fail the same
            // way, so stop for this session rather than loop.
            if (outcome !== 'transient-failure') {
              markConnectTracked(sessionStorage, address);
            }
          })
          .finally(() => {
            trackingAddressesRef.current.delete(address);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, dispatch, isConnected]);

  useEffect(() => {
    if (window?.location?.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('referral_code');
      if (referralCode) {
        sessionStorage.setItem('referral_code', referralCode);
      }
    }
  }, []);

  if (IS_EVM_NETWORK) return <WalletChoiceModal />;

  return (
    <div className='relative z-50'>
      <InterchainWalletModal />
    </div>
  );
}

export function ConnectWallet() {
  const dispatch = useDispatch();
  const { disconnect: disconnectCosmos } = useChain(CHAIN_NAME);
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const evmWallet = useEvmWallet();
  const {
    address,
    bech32Address,
    ethAddress,
    openConnectView,
    walletName,
  } = useWalletConnect();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  // Initialized from the live extension probe so the Switch-wallet item is
  // present on the menu's very first paint, not only after the open effect
  // re-runs the probe.
  const [isKeplrInstalled, setKeplrInstalled] = useState(
    () => typeof window !== 'undefined' && Boolean(window.keplr),
  );
  const isMetaMaskInstalled = Boolean(evmWallet.provider);

  useEffect(() => {
    setTimeout(() => {
      const isNewSession = !sessionStorage.getItem('start_new_session');
      if (isNewSession) {
        void handleDisconnect();
        localStorage.removeItem('interchain-kit-store');
        localStorage.removeItem('interchain-ui-store');
        localStorage.removeItem('persist:root');
        sessionStorage.setItem('start_new_session', 'true');
      }
    }, 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    try {
      if (IS_EVM_NETWORK && walletName === METAMASK_WALLET_NAME) {
        await evmWallet.disconnect();
      } else if (IS_EVM_NETWORK && walletName === KEPLR_WALLET_NAME) {
        await keplrWallet.disconnect();
      } else {
        await disconnectCosmos();
      }
    } catch {
      // noop
    }
    dispatch(setWalletName({ walletName: '' }));
    dispatch(setAddress({ address: '' }));
    dispatch(setConnected({ status: false }));
    clearTrackedConnects(sessionStorage);
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
  const addressItems = IS_EVM_NETWORK
    ? [
      { label: 'Bech32 address', value: bech32Address },
      { label: 'ETH hex address', value: ethAddress },
    ]
    : [{ label: 'Bech32 address', value: address }];
  // With no address the account menu (and its error slot) is unreachable, so a
  // wallet problem that cleared the address — e.g. MetaMask switched to a
  // different network — would otherwise read as a silent logout.
  const headerWalletError = !address && IS_EVM_NETWORK ? evmWallet.error : '';

  return (
    <div className={styles.accountControls}>
      {headerWalletError && (
        <p className={styles.walletAlert} role="alert" title={headerWalletError}>
          <TriangleAlert aria-hidden="true" size={15} />
          <span className={styles.walletAlertText}>{headerWalletError}</span>
        </p>
      )}
      {!address ?
        <AppButton onClick={() => openConnectView()}>
          <Wallet className='w-4 h-4' /> <div className="connect-wallet-label">Connect Wallet</div>
        </AppButton> : (
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
                {walletName === METAMASK_WALLET_NAME && evmWallet.error && (
                  <p className={styles.menuError} role="alert">{evmWallet.error}</p>
                )}
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
                        openConnectView(alternativeWallet);
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

interface IConnectWalletButton {
  className?: string;
  onClick?: () => void;
}

export function ConnectWalletButton({
  className = '',
  onClick,
}: IConnectWalletButton = {}) {
  const { address, openConnectView } = useWalletConnect();

  const handleConnect = () => {
    openConnectView();
    if (onClick) {
      onClick();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <AppButton
          onClick={handleConnect}
          className={className}
        >
          <Wallet className='w-4 h-4' /> <div>Connect Wallet</div>
        </AppButton> : null
      }
    </div>
  );
}

export function ConnectButton({
  className = ''
}: IConnectWalletButton) {
  const { openConnectView } = useWalletConnect();

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => openConnectView()}
        className={`bg-lumera-teal hover:bg-lumera-green text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center cursor-pointer ${className}`}
        id="connectWallet"
      >
        <Wallet className='w-4 h-4' /> <div className="ml-1">Connect Wallet</div>
      </button>
    </div>
  )
}
