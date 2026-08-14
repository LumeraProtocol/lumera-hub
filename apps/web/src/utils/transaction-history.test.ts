import { describe, expect, it } from 'vitest';

import {
  buildTxHistoryPath,
  getTransactionHistoryAddress,
  hasEthereumTransactionHash,
  isTransactionSuccessful,
} from './transaction-history';

describe('buildTxHistoryPath', () => {
  it('builds a sender query by default', () => {
    expect(buildTxHistoryPath({ address: 'lumera1account', limit: 20, offset: 0 })).toBe(
      "/cosmos/tx/v1beta1/txs?query=message.sender=%27lumera1account%27&pagination.limit=20&pagination.offset=0&order_by=ORDER_BY_DESC",
    );
  });

  it('builds a recipient query for received transactions', () => {
    expect(buildTxHistoryPath({
      address: 'lumera1account',
      direction: 'received',
      limit: 20,
      offset: 40,
    })).toBe(
      "/cosmos/tx/v1beta1/txs?query=transfer.recipient=%27lumera1account%27&pagination.limit=20&pagination.offset=40&order_by=ORDER_BY_DESC",
    );
  });
});

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

  it('finds a submitted Ethereum hash in indexed transaction events', () => {
    const transactions = [{
      events: [{
        type: 'ethereum_tx',
        attributes: [
          { key: 'txGasUsed', value: '21000' },
          { key: 'ethereumTxHash', value: '0xAbCd' },
        ],
      }],
    }];

    expect(hasEthereumTransactionHash(transactions, '0xabcd')).toBe(true);
    expect(hasEthereumTransactionHash(transactions, '0x1234')).toBe(false);
  });

});
