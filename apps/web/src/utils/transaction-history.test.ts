import { describe, expect, it } from 'vitest';

import {
  buildTxHistoryPath,
  getTransactionHistoryAddress,
  getTransactionDisplayType,
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

  it('classifies Ethereum sends from the indexed EVM sender', () => {
    expect(getTransactionDisplayType({
      tx: {
        body: {
          messages: [{ '@type': '/cosmos.evm.vm.v1.MsgEthereumTx' }],
        },
      },
      events: [
        {
          type: 'transfer',
          attributes: [
            { key: 'sender', value: 'lumera1fee' },
            { key: 'recipient', value: 'lumera1account' },
          ],
        },
        {
          type: 'ethereum_tx',
          attributes: [
            { key: 'recipient', value: '0x2222222222222222222222222222222222222222' },
            { key: 'msg_index', value: '0' },
          ],
        },
        {
          type: 'message',
          attributes: [
            { key: 'module', value: 'evm' },
            { key: 'sender', value: '0x1111111111111111111111111111111111111111' },
            { key: 'msg_index', value: '0' },
          ],
        },
      ],
    }, {
      bech32Address: 'lumera1account',
      ethAddress: '0x1111111111111111111111111111111111111111',
    })).toBe('EthereumTx Send');
  });

  it('classifies Ethereum receipts case-insensitively', () => {
    expect(getTransactionDisplayType({
      tx: {
        body: {
          messages: [{ '@type': '/cosmos.evm.vm.v1.MsgEthereumTx' }],
        },
      },
      events: [
        {
          type: 'ethereum_tx',
          attributes: [
            { key: 'recipient', value: '0xAABBccDDeeFF0011223344556677889900AAbbCC' },
            { key: 'msg_index', value: '0' },
          ],
        },
        {
          type: 'message',
          attributes: [
            { key: 'module', value: 'evm' },
            { key: 'sender', value: '0x2222222222222222222222222222222222222222' },
            { key: 'msg_index', value: '0' },
          ],
        },
      ],
    }, {
      ethAddress: '0xaabbccddeeff0011223344556677889900aabbcc',
    })).toBe('EthereumTx Recv');
  });

  it('classifies Ethereum sends from the indexed Cosmos sender fallback', () => {
    expect(getTransactionDisplayType({
      tx: {
        body: {
          messages: [{ '@type': '/cosmos.evm.vm.v1.MsgEthereumTx' }],
        },
      },
      events: [{
        type: 'message',
        attributes: [
          { key: 'action', value: '/cosmos.evm.vm.v1.MsgEthereumTx' },
          { key: 'sender', value: 'lumera1account' },
          { key: 'msg_index', value: '0' },
        ],
      }],
    }, {
      bech32Address: 'lumera1account',
    })).toBe('EthereumTx Send');
  });

  it('matches Ethereum directions by message index', () => {
    expect(getTransactionDisplayType({
      tx: {
        body: {
          messages: [
            { '@type': '/cosmos.evm.vm.v1.MsgEthereumTx' },
            { '@type': '/cosmos.evm.vm.v1.MsgEthereumTx' },
          ],
        },
      },
      events: [
        {
          type: 'ethereum_tx',
          attributes: [
            { key: 'recipient', value: '0x2222222222222222222222222222222222222222' },
            { key: 'msg_index', value: '0' },
          ],
        },
        {
          type: 'message',
          attributes: [
            { key: 'module', value: 'evm' },
            { key: 'sender', value: '0x1111111111111111111111111111111111111111' },
            { key: 'msg_index', value: '0' },
          ],
        },
        {
          type: 'ethereum_tx',
          attributes: [
            { key: 'recipient', value: '0x1111111111111111111111111111111111111111' },
            { key: 'msg_index', value: '1' },
          ],
        },
        {
          type: 'message',
          attributes: [
            { key: 'module', value: 'evm' },
            { key: 'sender', value: '0x3333333333333333333333333333333333333333' },
            { key: 'msg_index', value: '1' },
          ],
        },
      ],
    }, {
      ethAddress: '0x1111111111111111111111111111111111111111',
    })).toBe('EthereumTx Send, EthereumTx Recv');
  });

  it('classifies Cosmos bank sends and receipts from message addresses', () => {
    const transaction = (fromAddress: string, toAddress: string) => ({
      tx: {
        body: {
          messages: [{
            '@type': '/cosmos.bank.v1beta1.MsgSend',
            from_address: fromAddress,
            to_address: toAddress,
          }],
        },
      },
    });

    expect(getTransactionDisplayType(
      transaction('lumera1account', 'lumera1other'),
      { bech32Address: 'lumera1account' },
    )).toBe('Send');
    expect(getTransactionDisplayType(
      transaction('lumera1other', 'lumera1account'),
      { bech32Address: 'lumera1account' },
    )).toBe('Recv');
    expect(getTransactionDisplayType(
      transaction('lumera1account', 'lumera1account'),
      { bech32Address: 'lumera1account' },
    )).toBe('Self Transfer');
  });

  it('classifies Cosmos multisend and IBC transfer directions', () => {
    expect(getTransactionDisplayType({
      tx: {
        body: {
          messages: [
            {
              '@type': '/cosmos.bank.v1beta1.MsgMultiSend',
              inputs: [{ address: 'lumera1other' }],
              outputs: [{ address: 'lumera1account' }],
            },
            {
              '@type': '/ibc.applications.transfer.v1.MsgTransfer',
              sender: 'lumera1account',
              receiver: 'remote1recipient',
            },
          ],
        },
      },
    }, {
      bech32Address: 'lumera1account',
    })).toBe('Recv, Send');
  });

  it('preserves the original message type when direction data is unavailable', () => {
    expect(getTransactionDisplayType({
      tx: {
        body: {
          messages: [
            { '@type': '/cosmos.evm.vm.v1.MsgEthereumTx' },
            { '@type': '/cosmos.staking.v1beta1.MsgDelegate' },
          ],
        },
      },
      events: [],
    }, {
      ethAddress: '0x1111111111111111111111111111111111111111',
    })).toBe('EthereumTx, Delegate');
  });

});
