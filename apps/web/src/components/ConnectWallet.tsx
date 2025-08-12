'use client'
import { useChain } from '@interchain-kit/react'
import { useWalletModal } from '@interchain-kit/react';
import { InterchainWalletModal } from '@interchain-kit/react';

// const CHAIN_NAME = 'lumera'
const CHAIN_NAME = 'lumeratestnet'

export function WalletModalComponent() {
  const { modalIsOpen, open, close } = useWalletModal();

  return (
    <>
      <button onClick={open}>Select Wallet</button>
      <InterchainWalletModal />
    </>
  );
}

export function ConnectWallet() {
  const {address, status, connect, disconnect} = useChain(CHAIN_NAME)

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={connect}
      >
        Connect Wallet - {status}
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
