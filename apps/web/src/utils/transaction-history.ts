interface TransactionHistoryAddressOptions {
  address: string;
  bech32Address: string;
  isEvm: boolean;
}

interface IndexedTransactionStatus {
  code: number;
  events?: unknown;
}

export const getTransactionHistoryAddress = ({
  address,
  bech32Address,
  isEvm,
}: TransactionHistoryAddressOptions) => isEvm ? bech32Address : address;

export const isTransactionSuccessful = (transaction: IndexedTransactionStatus) => (
  transaction.code === 0
);
