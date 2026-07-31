import {
  EVM_NATIVE_DECIMALS,
  EVM_RPC_ENDPOINT,
} from '@/contants/network';

interface EvmRpcResponse<T> {
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export const isEvmAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

export const toHexChainId = (chainId: number) => `0x${chainId.toString(16)}`;

export const parseEvmAmount = (value: string, decimals = EVM_NATIVE_DECIMALS) => {
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

export const getEvmBalance = (address: string) =>
  requestEvmRpc<string>('eth_getBalance', [address, 'latest']);
