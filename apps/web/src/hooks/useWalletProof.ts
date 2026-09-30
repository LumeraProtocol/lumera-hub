'use client'

import { useCallback } from 'react'
import { useChain } from '@interchain-kit/react'
import { CosmosWallet } from '@interchain-kit/core'

import useWalletConnect from '@/hooks/useWalletConnect'
import { CHAIN_ID, CHAIN_NAME } from '@/contants/network'

type Proof = { signature: string; pubkey?: string }

/** Keplr/Leap-style extensions expose signArbitrary directly too. */
type ArbitrarySigner = {
  getAccount?: (chainId: string) => Promise<{ address?: string }>
  getKey?: (chainId: string) => Promise<{ bech32Address?: string }>
  signArbitrary?: (
    chainId: string,
    signer: string,
    data: string,
  ) => Promise<{ signature: string; pub_key: { value: string } }>
}

const shortAddress = (a: string) => (a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a)

const utf8Hex = (text: string) =>
  `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('')}`

/**
 * The wallet the reader's Snag quests run for, and a way to prove they hold it
 * by signing a message (checked by @/lib/wallet-proof on the server).
 *
 * MetaMask signs with personal_sign under its 0x address; a Cosmos wallet
 * (Keplr, Leap) signs with signArbitrary (ADR-36) under its lumera1 address.
 */
const useWalletProof = () => {
  const { walletMode, address, bech32Address, evmProvider } = useWalletConnect()
  const { wallet, chain } = useChain(CHAIN_NAME)

  const snagWallet = walletMode === 'evm' ? address : walletMode === 'cosmos' ? bech32Address : ''

  const sign = useCallback(
    async (message: string): Promise<Proof> => {
      if (walletMode === 'evm') {
        if (!evmProvider) throw new Error('MetaMask is not available.')
        const signature = (await evmProvider.request({
          method: 'personal_sign',
          params: [utf8Hex(message), address],
        })) as string
        return { signature }
      }
      if (walletMode === 'cosmos') {
        const chainId = chain?.chainId || CHAIN_ID
        const cosmos = (wallet?.getWalletOfType?.(CosmosWallet) as ArbitrarySigner | undefined) ??
          ((window as unknown as { keplr?: ArbitrarySigner }).keplr)
        if (!cosmos?.signArbitrary) throw new Error('This wallet cannot sign messages.')
        // The extension signs only with its active account. If the reader switched
        // accounts since connecting, say so rather than surface "Signer mismatched".
        const active =
          (await cosmos.getAccount?.(chainId).catch(() => undefined))?.address ||
          (await cosmos.getKey?.(chainId).catch(() => undefined))?.bech32Address
        if (active && active !== bech32Address) {
          throw new Error(
            `Your wallet's active account is ${shortAddress(active)}, but the hub is connected as ${shortAddress(bech32Address)}. ` +
              'Switch back to that account in your wallet, or disconnect and reconnect to use the new one.',
          )
        }
        const res = await cosmos.signArbitrary(chainId, bech32Address, message)
        return { signature: res.signature, pubkey: res.pub_key.value }
      }
      throw new Error('Connect a wallet first.')
    },
    [address, bech32Address, chain?.chainId, evmProvider, wallet, walletMode],
  )

  return { snagWallet, sign }
}

export default useWalletProof
