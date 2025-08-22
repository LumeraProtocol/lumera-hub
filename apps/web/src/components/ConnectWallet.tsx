'use client'
import { useChain } from '@interchain-kit/react'
import { useWalletModal } from '@interchain-kit/react';
import { InterchainWalletModal } from '@interchain-kit/react';
import { Wallet } from '@tamagui/lucide-icons'

// const CHAIN_NAME = 'lumera'
const CHAIN_NAME = 'lumeratestnet'

export function WalletModalComponent() {
  const { modalIsOpen, open, close } = useWalletModal();

  return (
    <>
      {/* <button onClick={open}>Select Wallet</button> */}
      <div className='relative z-50'>
        <InterchainWalletModal />
      </div>
    </>
  );
}

export function ConnectWallet() {
  const {address, status, connect, disconnect} = useChain(CHAIN_NAME)

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={connect}
        className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex"
      >
        <Wallet size="$1" /> <div className="ml-1">Connect Wallet</div>
      </button>
      {address && (
        <>
          <span>{address}</span>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      )}
    </div>
  )
}
