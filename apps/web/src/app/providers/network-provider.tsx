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
 *
 * A build locked to one network — the per-network servers behind
 * hub.lumera.io and hub.testnet.lumera.io — cannot flip in place. When such a
 * build is being served from its own canonical host, the switch is still
 * offered, and choosing the other network navigates to that network's host.
 */

import React from 'react'

import {
  AVAILABLE_NETWORKS,
  NETWORK_PROFILES,
  NETWORK_SWITCH_ENABLED,
  SITE_URL,
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
  /**
   * Whether a switch is offered: in place on an unlocked build, or across
   * domains on a locked build served from its canonical host.
   */
  canSwitch: boolean
  networks: NetworkProfile[]
  switchNetwork: (profile: NetworkProfile) => void
}

const NetworkContext = React.createContext<NetworkContextValue | null>(null)

const originOf = (url: string | undefined): string => {
  if (!url) return ''
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

/*
 * Sections that exist on every network. A switch keeps the reader in the same
 * section; a detail page (a proposal, a transaction, a stored file) is keyed to
 * one chain and has no counterpart on the other, so it falls back to the
 * section it belongs to, or to the dashboard.
 */
const SHARED_SECTIONS = new Set(['wallet', 'staking', 'governance', 'cascade', 'chat', 'blocks', 'search'])

export const crossSitePath = (pathname: string): string => {
  const section = pathname.split('/').filter(Boolean)[0] ?? ''
  return SHARED_SECTIONS.has(section) ? `/${section}` : '/'
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  // Seed from the module, which has already read the stored choice on the
  // client, so the first render matches the active bindings.
  const [profile, setProfile] = React.useState<NetworkProfile>(getNetworkProfile)

  // Only known after mount: whether this locked build is being served from its
  // own canonical host, where cross-domain switching makes sense. A private or
  // local deployment locked to a custom node is left without a switch.
  const [onCanonicalHost, setOnCanonicalHost] = React.useState(false)
  React.useEffect(() => {
    if (NETWORK_SWITCH_ENABLED) return
    setOnCanonicalHost(window.location.origin === originOf(SITE_URL))
  }, [])

  const switchNetwork = React.useCallback((next: NetworkProfile) => {
    if (!NETWORK_SWITCH_ENABLED) {
      // Locked build: the other network lives on its own host.
      const target = originOf(NETWORK_PROFILES[next]?.siteUrl)
      if (target && target !== window.location.origin) {
        window.location.assign(`${target}${crossSitePath(window.location.pathname)}`)
      }
      return
    }

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
      canSwitch: NETWORK_SWITCH_ENABLED || onCanonicalHost,
      networks: AVAILABLE_NETWORKS,
      switchNetwork,
    }),
    [onCanonicalHost, profile, switchNetwork],
  )

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
}

export function useNetwork(): NetworkContextValue {
  const ctx = React.useContext(NetworkContext)
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider')
  return ctx
}
