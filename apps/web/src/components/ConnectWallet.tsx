'use client'
import { useChain } from '@cosmos-kit/react'

const CHAIN_NAME = 'lumera'

export function ConnectWallet() {
  const { openView, disconnect, address } = useChain(CHAIN_NAME)
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => openView()}>Connect Wallet</button>
      {address && (
        <>
          <span>{address}</span>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      )}
    </div>
  )
}
