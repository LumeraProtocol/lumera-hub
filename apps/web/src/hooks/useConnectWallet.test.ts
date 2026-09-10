// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setWalletConnecting } from '@/redux/wallet-flow.slice';
import { setWalletName } from '@/redux/wallet.slice';

/*
 * These cover the connect logic that used to live inside the wallet picker's
 * Connect button. The picker is gone — the hub's drawer connects the chosen
 * wallet directly — but the logic is the delicate part and still runs, so the
 * coverage moved here with it.
 */

const KEPLR = 'keplr-extension';
const METAMASK = 'metamask';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  evmWallet: {
    connect: vi.fn(),
    provider: { request: vi.fn() } as unknown as object | null,
  },
  keplr: { connect: vi.fn(), disconnect: vi.fn() },
  getAccount: vi.fn(),
  chainWalletState: {
    walletState: 'Connected',
    account: { address: 'lumera1connectedaccount' },
    errorMessage: '',
  } as { walletState: string; account: { address: string } | null; errorMessage: string },
}));

vi.mock('@interchain-kit/react', () => ({
  useChainWallet: () => mocks.keplr,
  useWalletManager: () => ({
    getAccount: mocks.getAccount,
    getChainWalletState: () => mocks.chainWalletState,
  }),
}));

vi.mock('@/redux/hooks', () => ({ useDispatch: () => mocks.dispatch }));
vi.mock('@/app/providers/evm-wallet-provider', () => ({
  useEvmWallet: () => mocks.evmWallet,
}));

const { default: useConnectWallet } = await import('./useConnectWallet');

describe('useConnectWallet', () => {
  beforeEach(() => {
    mocks.dispatch.mockReset();
    mocks.evmWallet.connect.mockReset().mockResolvedValue(undefined);
    mocks.evmWallet.provider = { request: vi.fn() };
    mocks.keplr.connect.mockReset().mockResolvedValue(undefined);
    mocks.keplr.disconnect.mockReset().mockResolvedValue(undefined);
    mocks.getAccount.mockReset().mockResolvedValue({ address: 'lumera1connectedaccount' });
    mocks.chainWalletState = {
      walletState: 'Connected',
      account: { address: 'lumera1connectedaccount' },
      errorMessage: '',
    };
    (globalThis as unknown as { window: { keplr?: object } }).window.keplr = {};
  });

  afterEach(() => vi.clearAllMocks());

  it('arms the in-flight guard before awaiting the extension and releases it after selecting', async () => {
    let finish: () => void = () => undefined;
    mocks.keplr.connect.mockReturnValue(new Promise<void>((r) => { finish = r }));
    const { result } = renderHook(() => useConnectWallet());

    const pending = result.current.connectWallet(KEPLR);
    expect(mocks.dispatch).toHaveBeenCalledWith(setWalletConnecting({ walletName: KEPLR }));
    expect(mocks.dispatch).not.toHaveBeenCalledWith(setWalletName({ walletName: KEPLR }));

    finish();
    await expect(pending).resolves.toBe(true);

    const actions = mocks.dispatch.mock.calls.map(([a]) => a);
    const selected = actions.findIndex(
      (a) => a.type === setWalletName.type && a.payload.walletName === KEPLR,
    );
    const released = actions.findIndex(
      (a) => a.type === setWalletConnecting.type && a.payload.walletName === '',
    );
    // The guard must outlast the selection, or there is a render where it is
    // down while the old wallet is still selected.
    expect(released).toBeGreaterThan(selected);
  });

  it('does not select Keplr when interchain-kit resolves without an account', async () => {
    mocks.getAccount.mockResolvedValue(null);
    const { result } = renderHook(() => useConnectWallet());

    await expect(result.current.connectWallet(KEPLR)).resolves.toBe(false);
    expect(mocks.dispatch).not.toHaveBeenCalledWith(setWalletName({ walletName: KEPLR }));
    // The half-open session is rolled back so a retry starts clean.
    expect(mocks.keplr.disconnect).toHaveBeenCalled();
  });

  it('rejects a connect whose fresh account read fails, despite stale store state', async () => {
    // The store still holds a Connected account from an earlier session.
    mocks.getAccount.mockRejectedValue(new Error('extension locked'));
    const { result } = renderHook(() => useConnectWallet());

    await expect(result.current.connectWallet(KEPLR)).resolves.toBe(false);
    expect(mocks.dispatch).not.toHaveBeenCalledWith(setWalletName({ walletName: KEPLR }));
  });

  it('surfaces the extension issue rather than a generic failure', async () => {
    mocks.chainWalletState = {
      walletState: 'Rejected',
      account: null,
      errorMessage: 'Request rejected',
    };
    const { result } = renderHook(() => useConnectWallet());

    await result.current.connectWallet(KEPLR);
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('reports a missing extension for each wallet', async () => {
    (globalThis as unknown as { window: { keplr?: object } }).window.keplr = undefined;
    mocks.evmWallet.provider = null;
    const { result } = renderHook(() => useConnectWallet());

    await expect(result.current.connectWallet(KEPLR)).resolves.toBe(false);
    await waitFor(() => expect(result.current.error).toMatch(/Keplr was not detected/));

    await expect(result.current.connectWallet(METAMASK)).resolves.toBe(false);
    await waitFor(() => expect(result.current.error).toMatch(/MetaMask was not detected/));
  });

  it('connects MetaMask and selects it', async () => {
    const { result } = renderHook(() => useConnectWallet());

    await expect(result.current.connectWallet(METAMASK)).resolves.toBe(true);
    expect(mocks.evmWallet.connect).toHaveBeenCalled();
    expect(mocks.dispatch).toHaveBeenCalledWith(setWalletName({ walletName: METAMASK }));
  });

  it('does nothing without a wallet name', async () => {
    const { result } = renderHook(() => useConnectWallet());

    await expect(result.current.connectWallet('')).resolves.toBe(false);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
