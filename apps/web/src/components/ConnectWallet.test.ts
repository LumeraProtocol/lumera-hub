// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ETH_ADDRESS = '0x1111111111111111111111111111111111111111';
const WALLET_ERROR = 'MetaMask is connected to a different Lumera network.';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  reduxWallet: {
    isModalOpen: false,
    preferredWalletName: '',
    walletName: 'metamask',
  },
  walletConnect: {
    address: '',
    bech32Address: '',
    ethAddress: '',
    walletName: 'metamask',
  },
  evmWallet: {
    address: '',
    connect: vi.fn(),
    disconnect: vi.fn(),
    error: 'MetaMask is connected to a different Lumera network.',
    provider: { request: vi.fn() },
  },
  cosmos: {
    address: '',
    close: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    openView: vi.fn(),
    status: 'Disconnected',
  },
}));

vi.mock('@interchain-kit/react', () => ({
  InterchainWalletModal: () => null,
  useChain: () => ({
    address: mocks.cosmos.address,
    disconnect: mocks.cosmos.disconnect,
    openView: mocks.cosmos.openView,
    status: mocks.cosmos.status,
  }),
  useChainWallet: () => ({
    connect: mocks.cosmos.connect,
    disconnect: mocks.cosmos.disconnect,
  }),
  useWalletModal: () => ({ close: mocks.cosmos.close }),
}));
vi.mock('./ConnectWallet.module.css', () => ({
  default: new Proxy({}, {
    get: (_target, property) => String(property),
  }),
}));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => createElement('span', { 'aria-label': alt }),
}));
vi.mock('@/components/AppButton', () => ({
  default: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    createElement('button', { onClick }, children)
  ),
}));
vi.mock('@/redux/hooks', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({
    wallet: mocks.reduxWallet,
  }),
}));
vi.mock('@/app/providers/evm-wallet-provider', () => ({
  useEvmWallet: () => mocks.evmWallet,
}));
vi.mock('@/hooks/useWalletConnect', () => ({
  default: () => mocks.walletConnect,
}));
vi.mock('@/hooks/useTrackingUser', () => ({
  default: () => ({ trackingUser: vi.fn() }),
}));
vi.mock('@/contants/network', () => ({
  CHAIN_NAME: 'lumera-testnet',
  IS_EVM_NETWORK: true,
}));

const { ConnectWallet, WalletModalComponent } = await import('./ConnectWallet');

describe('EVM wallet error placement', () => {
  beforeEach(() => {
    sessionStorage.setItem('start_new_session', 'true');
    Object.defineProperty(window, 'keplr', {
      configurable: true,
      value: {},
    });
    mocks.reduxWallet.isModalOpen = false;
    mocks.reduxWallet.preferredWalletName = '';
    mocks.reduxWallet.walletName = 'metamask';
    mocks.walletConnect.address = '';
    mocks.walletConnect.bech32Address = '';
    mocks.walletConnect.ethAddress = '';
    mocks.walletConnect.walletName = 'metamask';
    mocks.evmWallet.address = '';
    mocks.evmWallet.error = WALLET_ERROR;
    mocks.dispatch.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('keeps a disconnected error out of the header and shows it in the wallet chooser', async () => {
    const { unmount } = render(createElement(ConnectWallet));
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();

    mocks.reduxWallet.isModalOpen = true;
    render(createElement(WalletModalComponent));

    expect((await screen.findByRole('alert')).textContent).toContain(WALLET_ERROR);
  });

  it('shows a connected MetaMask verification error inside the wallet menu', () => {
    mocks.walletConnect.address = ETH_ADDRESS;
    mocks.walletConnect.ethAddress = ETH_ADDRESS;
    mocks.evmWallet.address = ETH_ADDRESS;
    render(createElement(ConnectWallet));

    fireEvent.click(screen.getByRole('button', { name: /metamask/i }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(WALLET_ERROR);
    expect(alert.closest('[role="menu"]')).not.toBeNull();
  });
});
