'use client'

import { useEffect } from 'react';
import { Wallet, LogOut } from '@tamagui/lucide-icons';
import { useChain } from '@interchain-kit/react';
import { InterchainWalletModal } from '@interchain-kit/react';
import { toast } from 'react-toastify';

import { useDispatch } from '@/redux/hooks';
import { formatAddress } from '@/utils/format';
import { CHAIN_NAME, IS_EVM_NETWORK } from '@/contants/network';
import { setAddress, setConnected } from '@/redux/wallet.slice';
import { useEvmWallet } from '@/app/providers/evm-wallet-provider';

export function WalletModalComponent() {
  const dispatch = useDispatch();
  const { address: cosmosAddress } = useChain(CHAIN_NAME);
  const { address: evmAddress } = useEvmWallet();
  const address = IS_EVM_NETWORK ? evmAddress : cosmosAddress;

  useEffect(() => {
    dispatch(setAddress({ address: address || '' }));
    dispatch(setConnected({ status: Boolean(address) }));
  }, [address, dispatch])

  if (IS_EVM_NETWORK) return null;

  return (
    <div className='relative z-50'>
      <InterchainWalletModal />
    </div>
  );
}

export function ConnectWallet() {
  const dispatch = useDispatch();
  const {
    address: cosmosAddress,
    disconnect: disconnectCosmos,
    openView,
  } = useChain(CHAIN_NAME);
  const {
    address: evmAddress,
    connect: connectEvm,
    disconnect: disconnectEvm,
    isConnecting,
  } = useEvmWallet();
  const address = IS_EVM_NETWORK ? evmAddress : cosmosAddress;

  const handleDisconnect = async () => {
    if (IS_EVM_NETWORK) {
      await disconnectEvm();
    } else {
      disconnectCosmos();
    }
    dispatch(setAddress({ address: '' }));
    dispatch(setConnected({ status: false }));
  }

  const handleConnect = async () => {
    if (!IS_EVM_NETWORK) {
      openView();
      return;
    }
    try {
      await connectEvm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to connect EVM wallet.', {
        position: 'bottom-center',
        theme: 'dark',
      });
    }
  }

  const handleCopyAddress = () => {
    void navigator.clipboard.writeText(address);
    toast('The address has been copied.', {
      position: "bottom-center",
      theme: "dark",
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</div>
        </button> :
        <>
          <span className='btn-address cursor-pointer' onClick={handleCopyAddress}>{formatAddress(address, 5, -4)}</span>
          <button onClick={handleDisconnect} className='btn-logout'><LogOut /></button>
        </>
      }
    </div>
  )
}

export function ConnectWalletButton() {
  const { address: cosmosAddress, openView } = useChain(CHAIN_NAME);
  const { address: evmAddress, connect, isConnecting } = useEvmWallet();
  const address = IS_EVM_NETWORK ? evmAddress : cosmosAddress;

  const handleConnect = async () => {
    if (!IS_EVM_NETWORK) {
      openView();
      return;
    }
    try {
      await connect();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to connect EVM wallet.', {
        position: 'bottom-center',
        theme: 'dark',
      });
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</div>
        </button> : null
      }
    </div>
  )
}
