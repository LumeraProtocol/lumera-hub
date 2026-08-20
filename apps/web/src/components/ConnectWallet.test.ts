// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  trackingUser: vi.fn(),
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
  default: () => ({ trackingUser: mocks.trackingUser }),
}));
vi.mock('@/contants/network', () => ({
  CHAIN_NAME: 'lumera-testnet',
  IS_EVM_NETWORK: true,
}));

const { ConnectWallet, WalletModalComponent } = await import('./ConnectWallet');

describe('EVM wallet error placement', () => {
  beforeEach(() => {
    sessionStorage.clear();
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
    mocks.evmWallet.connect.mockReset();
    mocks.evmWallet.connect.mockResolvedValue(undefined);
    mocks.dispatch.mockClear();
    mocks.trackingUser.mockReset();
    mocks.trackingUser.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('does not show a passive provider error before a connection attempt', async () => {
    const { unmount } = render(createElement(ConnectWallet));
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();

    mocks.reduxWallet.isModalOpen = true;
    render(createElement(WalletModalComponent));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a MetaMask error after the user attempts to connect', async () => {
    mocks.reduxWallet.isModalOpen = true;
    mocks.evmWallet.connect.mockRejectedValue(new Error(WALLET_ERROR));
    render(createElement(WalletModalComponent));

    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));

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

  it('records the tracked address only after wallet tracking succeeds', async () => {
    mocks.evmWallet.address = ETH_ADDRESS;
    render(createElement(WalletModalComponent));

    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledWith({ address: ETH_ADDRESS }));
    await waitFor(() => expect(sessionStorage.getItem('new_connect')).toBe(ETH_ADDRESS));
  });

  it('retries a legacy tracking marker without replacing it after a failed request', async () => {
    sessionStorage.setItem('new_connect', 'true');
    mocks.evmWallet.address = ETH_ADDRESS;
    mocks.trackingUser.mockResolvedValue(false);
    render(createElement(WalletModalComponent));

    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledWith({ address: ETH_ADDRESS }));
    expect(sessionStorage.getItem('new_connect')).toBe('true');
  });
});
