'use client'
import { useChain } from '@interchain-kit/react'
import { InterchainWalletModal } from '@interchain-kit/react';
import { Wallet, LogOut } from '@tamagui/lucide-icons'

import { CHAIN_NAME } from '@/contants/chain';

const formatAddress = (address: string, length = 20, endLength = -6): string => {
  return `${address.substr(0, length)}...${address.substr(endLength)}`;
};

export function WalletModalComponent() {
  return (
    <div className='relative z-50'>
      <InterchainWalletModal />
    </div>
  );
}

export function ConnectWallet() {
  const {address, connect, disconnect} = useChain(CHAIN_NAME)

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {!address ?
        <button
          onClick={connect}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex cursor-pointer"
        >
          <Wallet size="$1" /> <div className="ml-1 connect-wallet-label">Connect Wallet</div>
        </button> :
        <>
          <span className='btn-address'>{formatAddress(address, 5, -4)}</span>
          <button onClick={() => disconnect()} className='btn-logout'><LogOut /></button>
        </>
      }
    </div>
  )
}
