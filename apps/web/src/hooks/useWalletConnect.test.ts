// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ETH_ADDRESS = '0x0123456789abcdef0123456789abcdef01234567';
const BECH32_ADDRESS = 'lumera1qy352euf40x77qfrg4ncn27dauqjx3t83egcev';

const mocks = vi.hoisted(() => ({
  connectWithSigner: vi.fn(),
  getOfflineSigner: vi.fn(),
  reduxWallet: {
    isModalOpen: false,
    walletName: '',
  },
  chainState: {
    address: '',
    chain: { chainId: 'lumera-testnet-2' } as { chainId: string } | null,
    wallet: null as null | { getOfflineSigner: ReturnType<typeof vi.fn> },
  },
  evmWallet: {
    address: '',
    ensureNetwork: vi.fn(),
    provider: { request: vi.fn() },
  },
}));

vi.mock('@interchain-kit/react', () => ({
  useChain: () => mocks.chainState,
}));
vi.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connectWithSigner: mocks.connectWithSigner,
  },
}));
vi.mock('@/app/providers/evm-wallet-provider', () => ({
  useEvmWallet: () => mocks.evmWallet,
}));
vi.mock('@/redux/hooks', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({
    wallet: mocks.reduxWallet,
  }),
}));
vi.mock('@/contants/network', () => ({
  CHAIN_NAME: 'lumera-testnet',
  COSMOS_EIP712_ENABLED: false,
  EVM_NATIVE_DECIMALS: 18,
  EVM_RPC_ENDPOINT: 'https://evm.example.test',
  IS_EVM_NETWORK: true,
  RPC_ENDPOINT: 'https://cosmos.example.test',
}));

const { KEPLR_WALLET_NAME, METAMASK_WALLET_NAME } = await import('@/utils/wallet-selection');
const { default: useWalletConnect } = await import('./useWalletConnect');

describe('useWalletConnect EVM profile selection', () => {
  beforeEach(() => {
    mocks.reduxWallet.isModalOpen = false;
    mocks.reduxWallet.walletName = '';
    mocks.chainState.address = '';
    mocks.chainState.chain = { chainId: 'lumera-testnet-2' };
    mocks.chainState.wallet = { getOfflineSigner: mocks.getOfflineSigner };
    mocks.evmWallet.address = '';
    mocks.connectWithSigner.mockReset();
    mocks.getOfflineSigner.mockReset();
  });

  it('uses MetaMask address formats and fails Cosmos signing closed', async () => {
    mocks.reduxWallet.walletName = METAMASK_WALLET_NAME;
    mocks.evmWallet.address = ETH_ADDRESS;
    const { result } = renderHook(() => useWalletConnect());

    expect(result.current).toMatchObject({
      address: ETH_ADDRESS,
      bech32Address: BECH32_ADDRESS,
      ethAddress: ETH_ADDRESS,
      isConnected: true,
      isEvm: true,
      walletMode: 'evm',
      canSignCosmosTransactions: false,
    });
    await expect(result.current.getClient()).rejects.toThrow(
      'Cosmos transactions are temporarily unavailable with MetaMask',
    );
    await expect(result.current.getOfflineSigner()).rejects.toThrow(
      'Cosmos signing is unavailable while using MetaMask',
    );
    expect(mocks.getOfflineSigner).not.toHaveBeenCalled();
    expect(mocks.connectWithSigner).not.toHaveBeenCalled();
  });

  it('keeps Keplr on the Cosmos signer path while exposing both address forms', async () => {
    const signer = { kind: 'offline-signer' };
    const client = { kind: 'signing-client' };
    mocks.reduxWallet.walletName = KEPLR_WALLET_NAME;
    mocks.chainState.address = BECH32_ADDRESS;
    mocks.getOfflineSigner.mockResolvedValue(signer);
    mocks.connectWithSigner.mockResolvedValue(client);
    const { result } = renderHook(() => useWalletConnect());

    expect(result.current).toMatchObject({
      address: BECH32_ADDRESS,
      bech32Address: BECH32_ADDRESS,
      ethAddress: ETH_ADDRESS,
      isConnected: true,
      isEvm: false,
      walletMode: 'cosmos',
      canSignCosmosTransactions: true,
    });
    await expect(result.current.getOfflineSigner()).resolves.toBe(signer);
    await expect(result.current.getClient()).resolves.toBe(client);
    expect(mocks.connectWithSigner).toHaveBeenCalledWith(
      'https://cosmos.example.test',
      signer,
    );
  });

  it('ignores cached provider addresses until a wallet is explicitly selected', async () => {
    mocks.chainState.address = BECH32_ADDRESS;
    mocks.evmWallet.address = ETH_ADDRESS;
    const { result } = renderHook(() => useWalletConnect());

    expect(result.current.address).toBe('');
    expect(result.current.walletMode).toBe('none');
    expect(result.current.isConnected).toBe(false);
    await act(async () => {
      await expect(result.current.getClient()).rejects.toThrow('Please connect wallet');
    });
  });
});
