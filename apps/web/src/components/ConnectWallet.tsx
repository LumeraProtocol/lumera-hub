'use client'

import { useEffect } from 'react';
import {
  Wallet,
  LogOut,
} from 'lucide-react';
import { useChain } from '@interchain-kit/react';
import { InterchainWalletModal, useWalletModal } from '@interchain-kit/react';
import { toast } from 'react-toastify';

import AppButton from '@/components/AppButton';
import { useDispatch } from '@/redux/hooks';
import { formatAddress } from '@/utils/format';
import { CHAIN_NAME } from '@/contants/network';
import { setAddress, setConnected } from '@/redux/wallet.slice';
import useTrackingUser from '@/hooks/useTrackingUser';

export function WalletModalComponent() {
  const dispatch = useDispatch();
  const { address } = useChain(CHAIN_NAME);
  const { close } = useWalletModal();
  const { trackingUser } = useTrackingUser();

  useEffect(() => {
    if (address) {
      close();
      dispatch(setAddress({
        address,
      }));
      dispatch(setConnected({
        status: true,
      }));
      const isNewConnect = sessionStorage.getItem('new_connect');
      if (!isNewConnect) {
        trackingUser({ address });
        sessionStorage.setItem('new_connect', 'true');
      }
    }
  }, [address])

  return (
    <div className='relative z-50'>
      <InterchainWalletModal />
    </div>
  );
}

export function ConnectWallet() {
  const dispatch = useDispatch();
  const { address, disconnect, openView } = useChain(CHAIN_NAME);

  useEffect(() => {
    setTimeout(() => {
      const isNewSession = !sessionStorage.getItem('start_new_session');
      if (isNewSession) {
        handleDesconnect();
        localStorage.removeItem('interchain-kit-store');
        localStorage.removeItem('interchain-ui-store');
        localStorage.removeItem('persist:root');
        sessionStorage.setItem('start_new_session', 'true');
      }
    }, 100)
  }, []);

  const handleDesconnect = () => {
    disconnect();
    dispatch(setAddress({
      address: '',
    }));
    dispatch(setConnected({
      status: false,
    }));
    sessionStorage.removeItem('new_connect');
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    toast('The address has been copied.', {
      position: "bottom-center",
      theme: "dark",
    })
  }

  return (
    <div className='flex gap-2'>
      {!address ?
        <AppButton
          onClick={openView}
        >
          <Wallet className='w-4 h-4' /> <div className="connect-wallet-label">Connect Wallet</div>
        </AppButton> :
        <>
          <span className='btn-address cursor-pointer' onClick={handleCopyAddress}>{formatAddress(address, 5, -4)}</span>
          <button onClick={handleDesconnect} className='btn-logout'><LogOut className='w-4 h-4 ml-2' /></button>
        </>
      }
    </div>
  )
}

interface IConnectWalletButton {
  className?: string;
}

export function ConnectWalletButton({
  className = ''
}: IConnectWalletButton) {
  const { address, openView } = useChain(CHAIN_NAME);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <AppButton
          onClick={openView}
          className={className}
        >
          <Wallet className='w-4 h-4' /> <div>Connect Wallet</div>
        </AppButton> : null
      }
    </div>
  )
}

export function ConnectButton({
  className = ''
}: IConnectWalletButton) {
  const { openView } = useChain(CHAIN_NAME);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={openView}
        className={`bg-lumera-teal hover:bg-lumera-green text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center cursor-pointer ${className}`}
      >
        <Wallet className='w-4 h-4' /> <div className="ml-1">Connect Wallet</div>
      </button>
    </div>
  )
}
