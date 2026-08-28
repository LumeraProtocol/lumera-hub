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

interface TransactionMessage {
  '@type'?: string;
  typeUrl?: string;
  from_address?: string;
  fromAddress?: string;
  to_address?: string;
  toAddress?: string;
  sender?: string;
  receiver?: string;
  inputs?: Array<{ address?: string }>;
  outputs?: Array<{ address?: string }>;
}

interface DirectionalTransaction extends IndexedTransactionEvents {
  tx: {
    body: {
      messages?: TransactionMessage[];
    };
  };
}

interface TransactionAddresses {
  bech32Address?: string;
  ethAddress?: string;
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

const normalizeAddress = (address?: string) => address?.trim().toLowerCase() ?? '';

const getMessageName = (message: TransactionMessage) => {
  const messageType = message['@type'] || message.typeUrl || 'unknown';
  return messageType
    .substring(messageType.lastIndexOf('.') + 1)
    .replace('Msg', '');
};

const getEventAttribute = (
  event: NonNullable<IndexedTransactionEvents['events']>[number],
  key: string,
) => event.attributes?.find((attribute) => attribute.key === key)?.value;

const isEventForMessage = (
  event: NonNullable<IndexedTransactionEvents['events']>[number],
  messageIndex: number,
  messageCount: number,
) => {
  const indexedMessage = getEventAttribute(event, 'msg_index');
  return indexedMessage === String(messageIndex)
    || (indexedMessage === undefined && messageCount === 1);
};

const getEthereumDirection = (
  transaction: DirectionalTransaction,
  messageIndex: number,
  messageCount: number,
  bech32Address: string,
  ethAddress: string,
) => {
  if (!bech32Address && !ethAddress) return undefined;

  const events = transaction.events ?? [];
  const ethereumSenderEvent = events.find((event) => (
    event.type === 'message'
    && getEventAttribute(event, 'module') === 'evm'
    && isEventForMessage(event, messageIndex, messageCount)
  ));
  const cosmosSenderEvent = events.find((event) => (
    event.type === 'message'
    && getEventAttribute(event, 'action')?.endsWith('.MsgEthereumTx')
    && isEventForMessage(event, messageIndex, messageCount)
  ));
  const recipientEvent = events.find((event) => (
    event.type === 'ethereum_tx'
    && getEventAttribute(event, 'recipient') !== undefined
    && isEventForMessage(event, messageIndex, messageCount)
  ));
  const ethereumSender = ethereumSenderEvent
    ? normalizeAddress(getEventAttribute(ethereumSenderEvent, 'sender'))
    : '';
  const cosmosSender = cosmosSenderEvent
    ? normalizeAddress(getEventAttribute(cosmosSenderEvent, 'sender'))
    : '';
  const recipient = recipientEvent
    ? normalizeAddress(getEventAttribute(recipientEvent, 'recipient'))
    : '';
  const isSender = (Boolean(ethAddress) && ethereumSender === ethAddress)
    || (Boolean(bech32Address) && cosmosSender === bech32Address);
  const isRecipient = Boolean(ethAddress) && recipient === ethAddress;

  if (isSender && isRecipient) return 'EthereumTx Self';
  if (isSender) return 'EthereumTx Send';
  if (isRecipient) return 'EthereumTx Recv';
  return undefined;
};

const getCosmosDirection = (message: TransactionMessage, bech32Address: string) => {
  if (!bech32Address) return undefined;

  const messageName = getMessageName(message);
  let isSender = false;
  let isRecipient = false;

  if (messageName === 'Send') {
    isSender = normalizeAddress(message.from_address ?? message.fromAddress) === bech32Address;
    isRecipient = normalizeAddress(message.to_address ?? message.toAddress) === bech32Address;
  } else if (messageName === 'MultiSend') {
    isSender = message.inputs?.some(({ address }) => normalizeAddress(address) === bech32Address) ?? false;
    isRecipient = message.outputs?.some(({ address }) => normalizeAddress(address) === bech32Address) ?? false;
  } else if (messageName === 'Transfer') {
    isSender = normalizeAddress(message.sender) === bech32Address;
    isRecipient = normalizeAddress(message.receiver) === bech32Address;
  } else {
    return undefined;
  }

  if (isSender && isRecipient) return 'Self Transfer';
  if (isSender) return 'Send';
  if (isRecipient) return 'Recv';
  return undefined;
};

const summarizeTypes = (types: string[]) => {
  const counts = new Map<string, number>();
  types.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1));
  return [...counts].map(([type, count]) => count > 1 ? `${type}×${count}` : type).join(', ');
};

const TRANSACTION_TYPE_PRIORITY = [
  'Failed',
  'EthereumTx Send',
  'EthereumTx Recv',
  'EthereumTx Self',
  'Send',
  'Recv',
  'Self Transfer',
  'Vote',
  'SubmitProposal',
  'Deposit',
  'BeginRedelegate',
  'Undelegate',
  'Delegate',
  'WithdrawDelegatorReward',
  'MultiSend',
  'Transfer',
  'EthereumTx',
] as const;

export const getPrimaryTransactionType = (transactionType: string) => {
  const transactionTypes = transactionType
    .split(',')
    .map((type) => type.trim().replace(/×\d+$/, ''));
  return TRANSACTION_TYPE_PRIORITY.find((type) => transactionTypes.includes(type))
    ?? transactionTypes[0]
    ?? 'unknown';
};

export const getTransactionDisplayType = (
  transaction: DirectionalTransaction,
  { bech32Address, ethAddress }: TransactionAddresses,
) => {
  const messages = transaction.tx.body.messages ?? [];
  const normalizedBech32Address = normalizeAddress(bech32Address);
  const normalizedEthAddress = normalizeAddress(ethAddress);

  return summarizeTypes(messages.map((message, messageIndex) => {
    const messageName = getMessageName(message);
    if (messageName === 'EthereumTx') {
      return getEthereumDirection(
        transaction,
        messageIndex,
        messages.length,
        normalizedBech32Address,
        normalizedEthAddress,
      ) ?? messageName;
    }

    return getCosmosDirection(message, normalizedBech32Address) ?? messageName;
  }));
};
