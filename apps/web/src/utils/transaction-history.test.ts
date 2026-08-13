import { describe, expect, it } from 'vitest';

import {
  getTransactionHistoryAddress,
  isTransactionSuccessful,
} from './transaction-history';

describe('transaction history', () => {
  it('queries the equivalent Bech32 account in MetaMask mode', () => {
    expect(getTransactionHistoryAddress({
      address: '0x0123456789012345678901234567890123456789',
      bech32Address: 'lumera1account',
      isEvm: true,
    })).toBe('lumera1account');

    expect(getTransactionHistoryAddress({
      address: 'lumera1account',
      bech32Address: 'lumera1account',
      isEvm: false,
    })).toBe('lumera1account');
  });

  it('uses the indexed Cosmos result as the Wallet transaction status', () => {
    expect(isTransactionSuccessful({
      code: 0,
      events: [{
        type: 'ethereum_tx',
        attributes: [{ key: 'ethereumTxFailed', value: 'execution reverted' }],
      }],
    })).toBe(true);
    expect(isTransactionSuccessful({ code: 5 })).toBe(false);
  });

});
