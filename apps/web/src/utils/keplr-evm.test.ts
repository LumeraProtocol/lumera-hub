import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contants/network', () => ({
  CHAIN_ID: 'lumera-testnet-2',
  DENOM: 'ulume',
  EVM_CHAIN_ID: 76857769,
  NETWORK_LABEL: 'Testnet',
  REST_AI_URL: 'https://lcd-testnet.lumeraprotocol.com',
  RPC_ENDPOINT: 'https://rpc-testnet.lumeraprotocol.com',
}));

const { addLumeraEvmToKeplr, canAddLumeraEvmToKeplr, isMissingChainError, keplrChainState, keplrUsesEvmKey, lumeraEvmChainInfo } =
  await import('./keplr-evm');

const OLD = 'lumera1j5hzy4mq76rv5hwhnc4qvnvgnqx2kz6tzv5wtj'; // pre-migration (coin type 118)
const NEW = 'lumera1j62yl8f48tdcu3v6rwfypzcntcyng2l6xkqrw9'; // migrated (coin type 60)

describe('lumeraEvmChainInfo', () => {
  it('asks Keplr for the EVM key path and cosmos/evm key handling', () => {
    const info = lumeraEvmChainInfo();
    expect(info).toMatchObject({
      chainId: 'lumera-testnet-2',
      chainName: 'Lumera Testnet',
      bip44: { coinType: 60 },
      currencies: [{ coinDenom: 'LUME', coinMinimalDenom: 'ulume', coinDecimals: 6 }],
    });
    expect(info.features).toEqual(['eth-address-gen', 'eth-key-sign', 'eth-secp256k1-cosmos']);
    expect(info.bech32Config.bech32PrefixValAddr).toBe('lumeravaloper');
  });
});

describe('addLumeraEvmToKeplr', () => {
  const keplrWith = (key: { algo: string; bech32Address: string }) => ({
    experimentalSuggestChain: vi.fn(async () => undefined),
    enable: vi.fn(async () => undefined),
    getKey: vi.fn(async () => key),
  });

  it('reports the migrated address once Keplr signs with the EVM key', async () => {
    const keplr = keplrWith({ algo: 'ethsecp256k1', bech32Address: NEW });
    await expect(addLumeraEvmToKeplr(keplr)).resolves.toEqual({ status: 'applied', address: NEW });
    expect(keplr.experimentalSuggestChain).toHaveBeenCalledWith(expect.objectContaining({ bip44: { coinType: 60 } }));
    expect(keplr.enable).toHaveBeenCalledWith('lumera-testnet-2');
  });

  it('notices when Keplr kept its existing Cosmos-key settings', async () => {
    const keplr = keplrWith({ algo: 'secp256k1', bech32Address: OLD });
    await expect(addLumeraEvmToKeplr(keplr)).resolves.toEqual({ status: 'kept-existing', address: OLD });
  });

  it('needs Keplr', async () => {
    await expect(addLumeraEvmToKeplr(undefined)).rejects.toThrow(/Keplr was not detected/);
    expect(canAddLumeraEvmToKeplr({})).toBe(false);
    expect(canAddLumeraEvmToKeplr({ keplr: { experimentalSuggestChain: () => undefined } })).toBe(true);
  });

  it('recognises both spellings of the EVM key algorithm', () => {
    expect(keplrUsesEvmKey({ algo: 'ethsecp256k1' })).toBe(true);
    expect(keplrUsesEvmKey({ algo: 'eth_secp256k1' })).toBe(true);
    expect(keplrUsesEvmKey({ algo: 'secp256k1' })).toBe(false);
    expect(keplrUsesEvmKey(undefined)).toBe(false);
  });
});

describe('keplrChainState', () => {
  const keplrWhere = (getKey: () => Promise<unknown>) => ({ getKey: vi.fn(getKey) }) as never;

  it('notices the reader removed the chain in Keplr', async () => {
    // The exact error Keplr 0.13.52 gives for a chain it does not have.
    const removed = keplrWhere(async () => {
      throw new Error('There is no modular chain info for lumera-testnet-2');
    });
    await expect(keplrChainState(removed)).resolves.toBe('removed');
    expect(isMissingChainError(new Error('There is no chain info for x'))).toBe(true);
  });

  it('tells EVM settings from the old Cosmos ones', async () => {
    await expect(keplrChainState(keplrWhere(async () => ({ algo: 'ethsecp256k1', bech32Address: NEW })))).resolves.toBe('evm');
    await expect(keplrChainState(keplrWhere(async () => ({ algo: 'secp256k1', bech32Address: OLD })))).resolves.toBe('cosmos');
  });

  it('does not mistake a locked or refusing Keplr for a removed chain', async () => {
    await expect(keplrChainState(keplrWhere(async () => { throw new Error('Request rejected'); }))).resolves.toBe('unknown');
    await expect(keplrChainState(undefined)).resolves.toBe('unknown');
  });
});
