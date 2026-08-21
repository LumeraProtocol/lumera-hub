// @vitest-environment jsdom
import { createElement, StrictMode, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isConnectTracked } from '@/utils/wallet-connect-marker';

const ETH_ADDRESS = '0x1111111111111111111111111111111111111111';
const OTHER_ETH_ADDRESS = '0x2222222222222222222222222222222222222222';
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
    openConnectView: vi.fn(),
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
    walletState: {
      walletState: 'Connected',
      account: { address: 'lumera1connectedaccount' },
      errorMessage: '',
    } as {
      walletState: string;
      account: { address: string } | null;
      errorMessage: string;
    },
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
  useWalletManager: () => ({
    getChainWalletState: () => mocks.cosmos.walletState,
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
    mocks.trackingUser.mockResolvedValue('tracked');
    mocks.cosmos.connect.mockReset();
    mocks.cosmos.connect.mockResolvedValue(undefined);
    mocks.cosmos.walletState = {
      walletState: 'Connected',
      account: { address: 'lumera1connectedaccount' },
      errorMessage: '',
    };
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('keeps a provider error visible in the header when the wallet lost its address', async () => {
    // A network switch in MetaMask clears the address and records an error.
    // The header must explain the disconnect instead of showing only a plain
    // Connect button — the account-menu error is unreachable with no address.
    const { unmount } = render(createElement(ConnectWallet));
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeDefined();
    const headerAlert = screen.getByRole('alert');
    expect(headerAlert.textContent).toContain(WALLET_ERROR);
    unmount();

    // The chooser dialog still only reports failures caused by its own
    // explicit Connect action.
    mocks.reduxWallet.isModalOpen = true;
    render(createElement(WalletModalComponent));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows no header alert while the provider is quietly disconnected', () => {
    mocks.evmWallet.error = '';
    render(createElement(ConnectWallet));

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

  it('opens Switch wallet with Keplr as the explicit target', () => {
    mocks.walletConnect.address = ETH_ADDRESS;
    mocks.walletConnect.ethAddress = ETH_ADDRESS;
    mocks.walletConnect.openConnectView.mockReset();
    render(createElement(ConnectWallet));

    fireEvent.click(screen.getByRole('button', { name: /metamask/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /switch wallet/i }));

    expect(mocks.walletConnect.openConnectView).toHaveBeenCalledWith(
      'keplr-extension',
    );
  });

  it('publishes a manually selected Keplr target before connecting', async () => {
    mocks.reduxWallet.isModalOpen = true;
    render(createElement(WalletModalComponent));

    fireEvent.click(await screen.findByRole('button', { name: /keplr/i }));
    expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          status: true,
          preferredWalletName: 'keplr-extension',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));
    await waitFor(() => expect(mocks.cosmos.connect).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { walletName: 'keplr-extension' },
      }),
    ));
  });

  it('does not select Keplr when interchain-kit resolves without an account', async () => {
    mocks.reduxWallet.isModalOpen = true;
    mocks.cosmos.walletState = {
      walletState: 'Disconnected',
      account: null,
      errorMessage: 'Keplr account access was rejected.',
    };
    render(createElement(WalletModalComponent));

    fireEvent.click(await screen.findByRole('button', { name: /keplr/i }));
    mocks.dispatch.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Keplr account access was rejected.',
    );
    expect(mocks.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { walletName: 'keplr-extension' },
      }),
    );
  });

  it('records the tracked address only after wallet tracking succeeds', async () => {
    mocks.evmWallet.address = ETH_ADDRESS;
    render(createElement(WalletModalComponent));

    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledWith({ address: ETH_ADDRESS }));
    await waitFor(() => expect(isConnectTracked(sessionStorage, ETH_ADDRESS)).toBe(true));
  });

  it('deduplicates an in-flight tracking request during Strict Mode effect replay', async () => {
    let finishTracking: (outcome: string) => void = () => undefined;
    mocks.trackingUser.mockReturnValue(new Promise<string>((resolve) => {
      finishTracking = resolve;
    }));
    mocks.evmWallet.address = ETH_ADDRESS;

    render(createElement(StrictMode, null, createElement(WalletModalComponent)));

    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledOnce());
    finishTracking('tracked');
    await waitFor(() => expect(isConnectTracked(sessionStorage, ETH_ADDRESS)).toBe(true));
  });

  it('retries a legacy tracking marker after a transient failure', async () => {
    sessionStorage.setItem('new_connect', 'true');
    mocks.evmWallet.address = ETH_ADDRESS;
    mocks.trackingUser.mockResolvedValue('transient-failure');
    render(createElement(WalletModalComponent));

    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledWith({ address: ETH_ADDRESS }));
    expect(isConnectTracked(sessionStorage, ETH_ADDRESS)).toBe(false);
  });

  it('stops re-sending a payload the server deterministically rejected', async () => {
    mocks.evmWallet.address = ETH_ADDRESS;
    mocks.trackingUser.mockResolvedValue('permanent-failure');
    const { unmount } = render(createElement(WalletModalComponent));

    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledOnce());
    await waitFor(() => expect(isConnectTracked(sessionStorage, ETH_ADDRESS)).toBe(true));
    unmount();

    // A remount (route change, reconnect) must not fire the same failing
    // request again for the whole session.
    render(createElement(WalletModalComponent));
    await Promise.resolve();
    expect(mocks.trackingUser).toHaveBeenCalledOnce();
  });

  it('records a commit for the requested address even if the active address changed mid-request', async () => {
    let finishTracking: (outcome: string) => void = () => undefined;
    mocks.trackingUser.mockReturnValue(new Promise<string>((resolve) => {
      finishTracking = resolve;
    }));
    mocks.evmWallet.address = ETH_ADDRESS;
    const { rerender } = render(createElement(WalletModalComponent));
    await waitFor(() => expect(mocks.trackingUser).toHaveBeenCalledWith({ address: ETH_ADDRESS }));

    // The user switches to another account while the request is in flight.
    mocks.evmWallet.address = OTHER_ETH_ADDRESS;
    mocks.trackingUser.mockResolvedValue('tracked');
    rerender(createElement(WalletModalComponent));

    // The server committed the connect for the first address; switching back
    // to it must not double-count the connect.
    finishTracking('tracked');
    await waitFor(() => expect(isConnectTracked(sessionStorage, ETH_ADDRESS)).toBe(true));
  });
});
