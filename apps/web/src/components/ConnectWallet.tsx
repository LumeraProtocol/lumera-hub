'use client'

import { useEffect, useState } from 'react';
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
  KEPLR_WALLET_NAME,
  METAMASK_WALLET_NAME,
} from '@/utils/wallet-selection';

const showWalletError = (error: unknown, fallback: string) => {
  toast.error(error instanceof Error ? error.message : fallback, {
    position: 'bottom-center',
    theme: 'dark',
  });
};

function WalletChoiceModal() {
  const dispatch = useDispatch();
  const isModalOpen = useSelector((state) => state.wallet.isModalOpen);
  const evmWallet = useEvmWallet();
  const keplrWallet = useChainWallet(CHAIN_NAME, KEPLR_WALLET_NAME);
  const [isKeplrInstalled, setKeplrInstalled] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState('');

  useEffect(() => {
    if (isModalOpen) setKeplrInstalled(Boolean(window.keplr));
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const close = () => dispatch(setModalOpen({ status: false }));

  const connectMetaMask = async () => {
    setConnectingWallet(METAMASK_WALLET_NAME);
    try {
      await evmWallet.connect();
      dispatch(setWalletName({ walletName: METAMASK_WALLET_NAME }));
      close();
    } catch (error) {
      showWalletError(error, 'Unable to connect MetaMask.');
    } finally {
      setConnectingWallet('');
    }
  };

  const connectKeplr = async () => {
    setConnectingWallet(KEPLR_WALLET_NAME);
    try {
      await keplrWallet.connect();
      dispatch(setWalletName({ walletName: KEPLR_WALLET_NAME }));
      close();
    } catch (error) {
      showWalletError(error, 'Unable to connect Keplr.');
    } finally {
      setConnectingWallet('');
    }
  };

  const walletButton = (
    name: string,
    description: string,
    installed: boolean,
    onClick: () => Promise<void>,
    walletName: string
  ) => (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={!installed || Boolean(connectingWallet)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: 16,
        borderRadius: 12,
        border: '1px solid #353b55',
        background: '#171b2d',
        color: '#fff',
        cursor: installed && !connectingWallet ? 'pointer' : 'not-allowed',
        opacity: installed ? 1 : 0.55,
        textAlign: 'left',
      }}
    >
      <span>
        <strong style={{ display: 'block', fontSize: 16 }}>{name}</strong>
        <span style={{ display: 'block', marginTop: 4, color: '#aeb5ca', fontSize: 13 }}>
          {description}
        </span>
      </span>
      <span style={{ color: installed ? '#8b9cff' : '#aeb5ca', fontSize: 12, whiteSpace: 'nowrap' }}>
        {connectingWallet === walletName ? 'Connecting...' : installed ? 'Installed' : 'Not detected'}
      </span>
    </button>
  );

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(5, 7, 15, 0.72)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-choice-title"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          borderRadius: 16,
          border: '1px solid #353b55',
          background: '#101322',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="wallet-choice-title" style={{ margin: 0, color: '#fff', fontSize: 20 }}>
              Choose wallet
            </h2>
            <p style={{ margin: '6px 0 0', color: '#aeb5ca', fontSize: 14 }}>
              Select how you want to use Lumera Hub.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close wallet selection"
            onClick={close}
            style={{ border: 0, background: 'transparent', color: '#aeb5ca', cursor: 'pointer', fontSize: 24 }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {walletButton(
            'MetaMask',
            'EVM address and native LUME transfers',
            Boolean(evmWallet.provider),
            connectMetaMask,
            METAMASK_WALLET_NAME
          )}
          {walletButton(
            'Keplr',
            'Cosmos transfers, staking, and governance',
            isKeplrInstalled,
            connectKeplr,
            KEPLR_WALLET_NAME
          )}
        </div>
      </div>
    </div>
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
