interface TransactionHistoryAddressOptions {
  address: string;
  bech32Address: string;
  isEvm: boolean;
}

interface IndexedTransactionStatus {
  code: number;
  events?: unknown;
}

interface IndexedTransactionEvents {
  events?: Array<{
    type: string;
    attributes?: Array<{ key: string; value: string }>;
  }>;
}

export type TxHistoryDirection = 'sent' | 'received';

interface TxHistoryPathOptions {
  address: string;
  direction?: TxHistoryDirection;
  limit: number;
  offset: number;
}

export const buildTxHistoryPath = ({
  address,
  direction = 'sent',
  limit,
  offset,
}: TxHistoryPathOptions) => {
  const event = direction === 'received' ? 'transfer.recipient' : 'message.sender';
  return `/cosmos/tx/v1beta1/txs?query=${event}=%27${address}%27&pagination.limit=${limit}&pagination.offset=${offset}&order_by=ORDER_BY_DESC`;
};

export const getTransactionHistoryAddress = ({
  address,
  bech32Address,
  isEvm,
}: TransactionHistoryAddressOptions) => isEvm ? bech32Address : address;

export const isTransactionSuccessful = (transaction: IndexedTransactionStatus) => (
  transaction.code === 0
);

export const hasEthereumTransactionHash = (
  transactions: IndexedTransactionEvents[],
  transactionHash: string,
) => {
  const normalizedHash = transactionHash.toLowerCase();
  return transactions.some((transaction) => transaction.events?.some((event) => (
    event.type === 'ethereum_tx'
    && event.attributes?.some(({ key, value }) => (
      key === 'ethereumTxHash' && value.toLowerCase() === normalizedHash
    ))
  )));
};
