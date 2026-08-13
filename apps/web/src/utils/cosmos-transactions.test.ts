import { describe, expect, it } from 'vitest';

import {
  assertGovernanceTransactionsAvailable,
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
