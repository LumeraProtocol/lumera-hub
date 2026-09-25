'use client'

/*
 * Runtime network selection.
 *
 * The hub serves mainnet and testnet from one deployment. This provider holds
 * the active profile and flips it in place: `switchNetwork` recomputes the
 * network constants (setNetworkProfile updates the live bindings and clears the
 * module-level caches), tears down any connected wallet, and re-keys the wallet
 * subtree so interchain-kit and every data hook re-initialize against the new
 * chain — no page reload, no second domain.
 */

import React from 'react'

import {
  AVAILABLE_NETWORKS,
  NETWORK_SWITCH_ENABLED,
  getNetworkProfile,
  setNetworkProfile,
  type NetworkProfile,
} from '@/contants/network'
import store from '@/store'
import { setAddress, setConnected, setWalletName } from '@/redux/wallet.slice'

type NetworkContextValue = {
  profile: NetworkProfile
  isMainnet: boolean
  isTestnet: boolean
  /** Whether the in-app switch is offered (off for env-locked builds). */
  canSwitch: boolean
  networks: NetworkProfile[]
  switchNetwork: (profile: NetworkProfile) => void
}

const NetworkContext = React.createContext<NetworkContextValue | null>(null)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  // Seed from the module, which has already read the stored choice on the
  // client, so the first render matches the active bindings.
  const [profile, setProfile] = React.useState<NetworkProfile>(getNetworkProfile)

  const switchNetwork = React.useCallback((next: NetworkProfile) => {
    // setNetworkProfile is the authority: it refuses a locked build, an unknown
    // profile or a no-op, and only then have the bindings actually moved.
    if (!setNetworkProfile(next)) return

    // A connection belongs to one chain. Drop it so the header does not show a
    // mainnet address while the app now reads testnet; the remount below gives
    // interchain-kit a clean WalletManager for the new chain.
    store.dispatch(setWalletName({ walletName: '' }))
    store.dispatch(setAddress({ address: '' }))
    store.dispatch(setConnected({ status: false }))

    setProfile(next)
  }, [])

  const value = React.useMemo<NetworkContextValue>(
    () => ({
      profile,
      isMainnet: profile === 'mainnet',
      isTestnet: profile !== 'mainnet',
      canSwitch: NETWORK_SWITCH_ENABLED,
      networks: AVAILABLE_NETWORKS,
      switchNetwork,
    }),
    [profile, switchNetwork],
  )

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetwork(): NetworkContextValue {
  const ctx = React.useContext(NetworkContext)
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider')
  return ctx
}
