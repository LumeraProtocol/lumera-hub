// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  chainProviderProps: [] as Array<{ chains: unknown[]; assetLists: unknown[] }>,
}))

vi.mock('@interchain-kit/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const ProviderPresent = React.createContext(false)
  const manager = {
    currentWalletName: '',
    getChainWalletState: vi.fn(() => undefined),
    setCurrentChainName: vi.fn(),
    setCurrentWalletName: vi.fn(),
    updateChainWalletState: vi.fn(),
  }

  return {
    ChainProvider: ({
      children,
      chains,
      assetLists,
    }: {
      children: ReactNode
      chains: unknown[]
      assetLists: unknown[]
    }) => {
      mocks.chainProviderProps.push({ chains, assetLists })
      return React.createElement(
        ProviderPresent.Provider,
        { value: true },
        children,
      )
    },
    useWalletManager: () => {
      if (!React.useContext(ProviderPresent)) {
        throw new Error(
          'useInterChainWalletContext must be used within a InterChainProvider',
        )
      }
      return manager
    },
  }
})

vi.mock('@interchain-kit/core', () => ({
  WalletState: { Disconnected: 'Disconnected' },
}))
vi.mock('@interchain-kit/keplr-extension', () => ({
  keplrWallet: { name: 'keplr' },
}))
vi.mock('@interchain-ui/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    ThemeProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    OverlaysManager: () => null,
  }
})
vi.mock('react-helmet-async', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    HelmetProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})
vi.mock('@/app/providers/RegistryContext', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    RegistryProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})
vi.mock('@/app/providers/evm-wallet-provider', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    EvmWalletProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})
vi.mock('@/redux/hooks', () => ({ useSelector: () => '' }))
vi.mock('@/store', () => ({ default: {}, persistor: {} }))
vi.mock('@/contants/network', () => ({
  CHAIN_NAME: 'lumera-testnet',
  IS_EVM_NETWORK: true,
}))
vi.mock('@/utils/helpers', () => ({
  getChains: () => ({
    chains: [{ chainName: 'lumera-testnet', chainId: 'lumera-testnet-2' }],
    assetLists: [{ chainName: 'lumera-testnet', assets: [] }],
  }),
}))
vi.mock('@/utils/wallet-selection', () => ({
  KEPLR_WALLET_NAME: 'keplr-extension',
  METAMASK_WALLET_NAME: 'metamask',
  suppressPersistedKeplrConnection: vi.fn(),
}))

const { useWalletManager } = await import('@interchain-kit/react')
const { WalletRuntimeProviders } = await import('./wallet-provider')

const ChainConsumer = () => {
  useWalletManager()
  return createElement('span', null, 'provider ready')
}

describe('WalletRuntimeProviders', () => {
  it('wraps the first child render in ChainProvider', () => {
    mocks.chainProviderProps.length = 0

    render(
      createElement(WalletRuntimeProviders, null, createElement(ChainConsumer)),
    )

    expect(screen.getByText('provider ready')).toBeDefined()
    expect(mocks.chainProviderProps).toEqual([
      {
        chains: [{ chainName: 'lumera-testnet', chainId: 'lumera-testnet-2' }],
        assetLists: [{ chainName: 'lumera-testnet', assets: [] }],
      },
    ])
  })
})
