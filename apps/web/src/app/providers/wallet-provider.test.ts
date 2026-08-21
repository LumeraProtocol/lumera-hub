// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  chainProviderProps: [] as Array<{ chains: unknown[]; assetLists: unknown[] }>,
  manager: {
    currentWalletName: '',
    getChainWalletState: vi.fn(() => undefined as unknown),
    setCurrentChainName: vi.fn(),
    setCurrentWalletName: vi.fn(),
    updateChainWalletState: vi.fn(),
  },
  reduxWallet: {
    isModalOpen: false,
    preferredWalletName: '',
    walletName: '',
  },
  walletFlow: {
    connectingWalletName: '',
  },
}))

vi.mock('@interchain-kit/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const ProviderPresent = React.createContext(false)
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
      return mocks.manager
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
vi.mock('@/redux/hooks', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({
    wallet: mocks.reduxWallet,
    walletFlow: mocks.walletFlow,
  }),
}))
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
const { suppressPersistedKeplrConnection } = await import('@/utils/wallet-selection')
const { WalletRuntimeProviders } = await import('./wallet-provider')

const ChainConsumer = () => {
  useWalletManager()
  return createElement('span', null, 'provider ready')
}

const setLiveKeplrManagerState = () => {
  mocks.manager.currentWalletName = 'keplr-extension'
  mocks.manager.getChainWalletState.mockReturnValue({
    walletState: 'Connected',
    account: { address: 'lumera1account' },
  })
}

describe('WalletRuntimeProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.chainProviderProps.length = 0
    mocks.manager.currentWalletName = ''
    mocks.manager.getChainWalletState.mockReturnValue(undefined)
    Object.assign(mocks.reduxWallet, {
      isModalOpen: false,
      preferredWalletName: '',
      walletName: '',
    })
    mocks.walletFlow.connectingWalletName = ''
  })

  it('wraps the first child render in ChainProvider', () => {
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

  it('does not tear down Keplr while a Keplr connect attempt is in flight', () => {
    mocks.reduxWallet.walletName = 'metamask'
    mocks.walletFlow.connectingWalletName = 'keplr-extension'
    setLiveKeplrManagerState()

    render(
      createElement(WalletRuntimeProviders, null, createElement(ChainConsumer)),
    )

    expect(mocks.manager.updateChainWalletState).not.toHaveBeenCalled()
    expect(mocks.manager.setCurrentWalletName).not.toHaveBeenCalled()
    // The persisted-storage scrub is one half of the same teardown and must
    // pause with it, or a Strict Mode remount mid-approval erases the freshly
    // persisted Keplr session.
    expect(suppressPersistedKeplrConnection).not.toHaveBeenCalled()
  })

  it('still suppresses stale Keplr state while MetaMask remains selected', () => {
    mocks.reduxWallet.walletName = 'metamask'
    setLiveKeplrManagerState()

    render(
      createElement(WalletRuntimeProviders, null, createElement(ChainConsumer)),
    )

    expect(mocks.manager.updateChainWalletState).toHaveBeenCalledWith(
      'keplr-extension',
      'lumera-testnet',
      expect.objectContaining({
        walletState: 'Disconnected',
        account: undefined,
      }),
    )
    expect(mocks.manager.setCurrentWalletName).toHaveBeenCalledWith('')
    expect(suppressPersistedKeplrConnection).toHaveBeenCalled()
  })

  it('tears down stale Keplr state rehydrated with a persisted open modal', () => {
    // isModalOpen and preferredWalletName live in the persisted wallet slice,
    // so a reload mid-switch rehydrates them. With no connect attempt actually
    // in flight, that persisted UI state must not suspend the synchronizer —
    // otherwise a reload latches the suspension for the whole session.
    mocks.reduxWallet.walletName = 'metamask'
    mocks.reduxWallet.isModalOpen = true
    mocks.reduxWallet.preferredWalletName = 'keplr-extension'
    setLiveKeplrManagerState()

    render(
      createElement(WalletRuntimeProviders, null, createElement(ChainConsumer)),
    )

    expect(mocks.manager.updateChainWalletState).toHaveBeenCalledWith(
      'keplr-extension',
      'lumera-testnet',
      expect.objectContaining({ walletState: 'Disconnected' }),
    )
  })
})
