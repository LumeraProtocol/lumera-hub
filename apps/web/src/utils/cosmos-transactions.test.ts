import { describe, expect, it } from 'vitest';

import {
  assertGovernanceTransactionsAvailable,
  canQueryCosmosAccountData,
  canWalletSignCosmosTransactions,
  GOVERNANCE_TRANSACTION_UNAVAILABLE_MESSAGE,
} from './cosmos-transactions';

describe('assertGovernanceTransactionsAvailable', () => {
  it('allows Cosmos transaction-capable wallets', () => {
    expect(() => assertGovernanceTransactionsAvailable(true)).not.toThrow();
  });

  it('fails closed with the user-facing governance reason', () => {
    expect(() => assertGovernanceTransactionsAvailable(false)).toThrow(
      GOVERNANCE_TRANSACTION_UNAVAILABLE_MESSAGE
    );
  });
});

describe('canWalletSignCosmosTransactions', () => {
  it('keeps Cosmos wallets enabled without EIP-712', () => {
    expect(canWalletSignCosmosTransactions({
      isEvmNetwork: false,
      chainEip712Enabled: false,
      hasEvmCosmosSigner: false,
    })).toBe(true);
  });

  it('requires both chain support and an implemented EVM Cosmos signer', () => {
    expect(canWalletSignCosmosTransactions({
      isEvmNetwork: true,
      chainEip712Enabled: true,
      hasEvmCosmosSigner: false,
    })).toBe(false);
    expect(canWalletSignCosmosTransactions({
      isEvmNetwork: true,
      chainEip712Enabled: true,
      hasEvmCosmosSigner: true,
    })).toBe(true);
  });
});

describe('canQueryCosmosAccountData', () => {
  it('requires a connected Cosmos account', () => {
    expect(canQueryCosmosAccountData({
      address: '',
      isEvmNetwork: false,
    })).toBe(false);
    expect(canQueryCosmosAccountData({
      address: 'lumera1account',
      isEvmNetwork: false,
    })).toBe(true);
  });

  it('never sends an EVM address to Cosmos account endpoints', () => {
    expect(canQueryCosmosAccountData({
      address: '0x1234567890abcdef',
      isEvmNetwork: true,
    })).toBe(false);
  });
});
