'use client'

import { useEffect } from 'react';
import { Wallet, LogOut } from '@tamagui/lucide-icons';
import { useChain } from '@interchain-kit/react';
import { InterchainWalletModal } from '@interchain-kit/react';
import { toast } from 'react-toastify';

import { useDispatch } from '@/redux/hooks';
import { formatAddress } from '@/utils/format';
import { CHAIN_NAME } from '@/contants/network';
import { setAddress, setConnected } from '@/redux/wallet.slice';

export function WalletModalComponent() {
  const dispatch = useDispatch();
  const { address } = useChain(CHAIN_NAME);

  useEffect(() => {
    if (address) {
      dispatch(setAddress({
        address,
      }));
      dispatch(setConnected({
        status: true,
      }));
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

  const handleDesconnect = () => {
    disconnect();
     dispatch(setAddress({
      address: '',
    }));
    dispatch(setConnected({
      status: false,
    }));
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    toast('The address has been copied.', {
      position: "bottom-center",
      theme: "dark",
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={openView}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
        </button> :
        <>
          <span className='btn-address cursor-pointer' onClick={handleCopyAddress}>{formatAddress(address, 5, -4)}</span>
          <button onClick={handleDesconnect} className='btn-logout'><LogOut /></button>
        </>
      }
    </div>
  )
}

export function ConnectWalletButton() {
  const { address, openView } = useChain(CHAIN_NAME);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={openView}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1">Connect Wallet</div>
        </button> : null
      }
    </div>
  )
}
