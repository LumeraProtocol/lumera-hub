import {
  EVM_NATIVE_DECIMALS,
  EVM_RPC_ENDPOINT,
} from '@/contants/network';
import { fromBech32, fromHex, toBech32, toHex } from '@cosmjs/encoding';
import type { Eip1193Provider } from '@/types/window';

interface EvmRpcResponse<T> {
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface EvmBlockIdentity {
  hash?: string | null;
}

type EvmRpcRequester = <T>(method: string, params?: unknown[]) => Promise<T>;

interface EvmRpcIdentityOptions {
  requestRpc?: EvmRpcRequester;
  rpcEndpoint?: string;
  maxBlockDrift?: number;
}

interface EvmWalletNetworkOptions extends EvmRpcIdentityOptions {
  chainId: number;
  chainName: string;
  rpcEndpoint: string;
  suggestProfileOnMismatch?: boolean;
}

export class EvmNetworkMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvmNetworkMismatchError';
  }
}

export class EvmAccountNotConnectedError extends Error {
  constructor() {
    super('No EVM wallet account is connected.');
    this.name = 'EvmAccountNotConnectedError';
  }
}

export const getEvmConnectionErrorMessage = (
  error: unknown,
  networkName: string,
) => {
  const message = error instanceof Error ? error.message : 'Unable to connect EVM wallet.';
  if (
    /failed to fetch|network request failed|could not fetch chain id|rpc request failed with status (?:429|5\d\d)/i
      .test(message)
  ) {
    return `${networkName} is temporarily unavailable. Your wallet is fine—please try again in a few minutes.`;
  }
  return message;
};

export const getMetaMaskProvider = (provider?: Eip1193Provider | null) => {
  if (!provider) return null;
  if (provider.providers?.length) {
    return provider.providers.find((candidate) => candidate.isMetaMask)
      || (provider.isMetaMask ? provider : null);
  }
  return provider.isMetaMask ? provider : null;
};

export const isEvmAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

export const isEvmTransactionHash = (value: unknown): value is string => (
  typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)
);

export const evmAddressToCosmosAddress = (address: string, prefix = 'lumera') => {
  if (!isEvmAddress(address)) {
    throw new Error('Cannot convert an invalid EVM address.');
  }
  return toBech32(prefix, fromHex(address.slice(2)));
};

export const cosmosAddressToEvmAddress = (address: string) => {
  let decoded: ReturnType<typeof fromBech32>;
  try {
    decoded = fromBech32(address);
  } catch {
    throw new Error('Cannot convert an invalid Bech32 address.');
  }
  if (decoded.data.length !== 20) {
    throw new Error('Cannot convert a Bech32 address that is not 20 bytes.');
  }
  return `0x${toHex(decoded.data)}`;
};

export const normalizeEvmRecipientAddress = (address: string, prefix = 'lumera') => {
  const normalized = address.trim();
  if (isEvmAddress(normalized)) {
    return normalized;
  }

  try {
    const decoded = fromBech32(normalized);
    if (decoded.prefix !== prefix || decoded.data.length !== 20) {
      throw new Error('Invalid account address.');
    }
    return `0x${toHex(decoded.data)}`;
  } catch {
    throw new Error(`Enter a valid ${prefix} Bech32 or EVM recipient address.`);
  }
};

export const getEvmAddressFormats = (address: string, isEvmNetwork: boolean) => {
  if (!address) {
    return { bech32Address: '', ethAddress: '' };
  }
  if (!isEvmNetwork) {
    return { bech32Address: address, ethAddress: '' };
  }
  if (isEvmAddress(address)) {
    return {
      bech32Address: evmAddressToCosmosAddress(address),
      ethAddress: address,
    };
  }
  return {
    bech32Address: address,
    ethAddress: cosmosAddressToEvmAddress(address),
  };
};

export const toHexChainId = (chainId: number) => `0x${chainId.toString(16)}`;

export const getEvmAccountForChain = async (
  provider: Eip1193Provider,
  expectedChainId: number
) => {
  const [accounts, chainId] = await Promise.all([
    provider.request<string[]>({ method: 'eth_accounts' }),
    provider.request<string>({ method: 'eth_chainId' }),
  ]);

  const account = accounts[0] || '';
  if (!isEvmAddress(account)) {
    throw new EvmAccountNotConnectedError();
  }

  if (chainId.toLowerCase() !== toHexChainId(expectedChainId).toLowerCase()) {
    throw new Error('The wallet is connected to a different network.');
  }

  return account;
};

export const assertEvmAccountForChain = async (
  provider: Eip1193Provider,
  expectedAddress: string,
  expectedChainId: number
) => {
  const account = await getEvmAccountForChain(provider, expectedChainId);
  if (account.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error('The active wallet account changed. Please retry the transaction.');
  }
  return account;
};

export const parseEvmAmount = (value: string, decimals = EVM_NATIVE_DECIMALS) => {
  if (!Number.isSafeInteger(decimals) || decimals < 0) {
    throw new Error('Token decimals must be a non-negative integer.');
  }
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Enter a valid amount.');
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`);
  }

  const units = BigInt(whole) * (BigInt(10) ** BigInt(decimals))
    + BigInt(fraction.padEnd(decimals, '0') || '0');

  if (units <= BigInt(0)) {
    throw new Error('Amount must be greater than zero.');
  }

  return `0x${units.toString(16)}`;
};

export const evmBalanceToMicroLume = (balance: string) => {
  if (!/^0x[0-9a-fA-F]+$/.test(balance)) {
    throw new Error('EVM RPC returned an invalid balance.');
  }
  const wei = BigInt(balance);
  const microLumeDivisor = BigInt(10) ** BigInt(EVM_NATIVE_DECIMALS - 6);
  return (wei / microLumeDivisor).toString();
};

export const requestEvmRpc = async <T>(method: string, params: unknown[] = []): Promise<T> => {
  if (!EVM_RPC_ENDPOINT) {
    throw new Error('The active network does not define an EVM RPC endpoint.');
  }

  const response = await fetch(EVM_RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`EVM RPC request failed with status ${response.status}.`);
  }

  const payload = await response.json() as EvmRpcResponse<T>;
  if (payload.error) {
    throw new Error(payload.error.message);
  }
  if (payload.result === undefined) {
    throw new Error(`EVM RPC method ${method} returned no result.`);
  }

  return payload.result;
};

const parseRpcBlockNumber = (value: string) => {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error('EVM RPC returned an invalid block number.');
  }
  return Number.parseInt(value, 16);
};

export const assertEvmProviderMatchesRpc = async (
  provider: Eip1193Provider,
  {
    requestRpc = requestEvmRpc,
    rpcEndpoint = EVM_RPC_ENDPOINT || 'the configured network RPC',
    maxBlockDrift = 100,
  }: EvmRpcIdentityOptions = {},
) => {
  const networkMismatch = () => new EvmNetworkMismatchError(
    `MetaMask is connected to a different Lumera network. In MetaMask, set the RPC URL to ${rpcEndpoint}.`,
  );
  const [providerBlockValue, configuredBlockValue] = await Promise.all([
    provider.request<string>({ method: 'eth_blockNumber' }),
    requestRpc<string>('eth_blockNumber'),
  ]);
  const providerBlock = parseRpcBlockNumber(providerBlockValue);
  const configuredBlock = parseRpcBlockNumber(configuredBlockValue);

  if (Math.abs(providerBlock - configuredBlock) > maxBlockDrift) {
    throw networkMismatch();
  }

  const comparisonBlock = Math.max(0, Math.min(providerBlock, configuredBlock) - 12);
  const blockTag = `0x${comparisonBlock.toString(16)}`;
  const [providerIdentity, configuredIdentity] = await Promise.all([
    provider.request<EvmBlockIdentity>({ method: 'eth_getBlockByNumber', params: [blockTag, false] }),
    requestRpc<EvmBlockIdentity>('eth_getBlockByNumber', [blockTag, false]),
  ]);

  if (
    !providerIdentity?.hash
    || !configuredIdentity?.hash
    || providerIdentity.hash.toLowerCase() !== configuredIdentity.hash.toLowerCase()
  ) {
    throw networkMismatch();
  }
};

const isUnrecognizedChainError = (error: unknown) => {
  const providerError = error as { code?: number; data?: { originalError?: { code?: number } } };
  return providerError.code === 4902 || providerError.data?.originalError?.code === 4902;
};

export const ensureEvmWalletNetwork = async (
  provider: Eip1193Provider,
  {
    chainId,
    chainName,
    rpcEndpoint,
    suggestProfileOnMismatch = false,
    requestRpc,
    maxBlockDrift,
  }: EvmWalletNetworkOptions,
) => {
  const expectedChainId = toHexChainId(chainId);
  const addProfile = () => provider.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: expectedChainId,
      chainName,
      nativeCurrency: {
        name: 'LUME',
        symbol: 'LUME',
        decimals: EVM_NATIVE_DECIMALS,
      },
      rpcUrls: [rpcEndpoint],
    }],
  });
  const switchProfile = () => provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: expectedChainId }],
  });

  const currentChainId = await provider.request<string>({ method: 'eth_chainId' });
  if (currentChainId.toLowerCase() !== expectedChainId.toLowerCase()) {
    try {
      await switchProfile();
    } catch (switchError) {
      if (!isUnrecognizedChainError(switchError)) throw switchError;
      await addProfile();
      await switchProfile();
    }
  }

  const activeChainId = await provider.request<string>({ method: 'eth_chainId' });
  if (activeChainId.toLowerCase() !== expectedChainId.toLowerCase()) {
    throw new Error(`Wallet did not switch to ${chainName}.`);
  }

  const verifyIdentity = () => assertEvmProviderMatchesRpc(provider, {
    requestRpc,
    rpcEndpoint,
    maxBlockDrift,
  });

  try {
    await verifyIdentity();
  } catch (identityError) {
    if (!(identityError instanceof EvmNetworkMismatchError) || !suggestProfileOnMismatch) {
      throw identityError;
    }

    try {
      await addProfile();
      await switchProfile();
    } catch (profileError) {
      const detail = profileError instanceof Error ? ` ${profileError.message}` : '';
      throw new Error(
        `MetaMask could not configure ${chainName}. Remove or update the conflicting Lumera network, then add ${chainName} with RPC URL ${rpcEndpoint}.${detail}`,
      );
    }
    await verifyIdentity();
  }
};

export const getEvmBalance = async (address: string) => {
  if (!isEvmAddress(address)) {
    throw new Error('Cannot query the balance of an invalid EVM address.');
  }
  const balance = await requestEvmRpc<string>('eth_getBalance', [address, 'latest']);
  if (typeof balance !== 'string' || !/^0x[0-9a-fA-F]+$/.test(balance)) {
    throw new Error('EVM RPC returned an invalid balance.');
  }
  return balance;
};
