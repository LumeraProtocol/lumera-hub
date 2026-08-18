import numeral from 'numeral';

import * as instance from '@/utils/api';
import { RATE_VALUE } from '@/contants';
import { DENOM, SNSCOPE_URL } from '@/contants/network';
import { formatTokenDisplay } from '@/utils/format';
import type { IActionDetail } from '@/types';
import type { IValidator } from '@/types/validator';
import type { ITransaction } from '@/hooks/useTransaction';
import type { Coin, DelegationResponse } from '@/hooks/useAccountInfo';
import type { TxHistoryDirection } from '@/utils/transaction-history';

/** A Cascade action as SNScope returns it, before the register fee is resolved. */
export interface CascadeAction {
  block_height: number;
  creator: string;
  decoded: {
    data_hash: string;
    file_name: string;
    rq_ids_ic: number;
    rq_ids_ids: string[];
    rq_ids_max: number;
    signatures: string;
    public?: boolean;
  };
  finalize_tx_id: string;
  finalize_tx_time: string;
  id: string;
  mime_type: string;
  price: {
    amount: string;
    denom: string;
  };
  register_tx_id: string;
  register_tx_time: string;
  size: number;
  state: string;
  type: string;
}

/** A Cascade action annotated with the fee the account paid to register it. */
export interface CascadeFile extends CascadeAction {
  fee: string;
}

/** Staking state of the *connected* wallet, used to enable the action buttons. */
export interface ConnectedStaking {
  /** Validators the connected wallet already stakes with. */
  validatorAddresses: string[];
  /** Staked amount per validator address, in micro-denom. */
  stakedBalances: Record<string, string>;
  /** Native LUME bank balance of the connected wallet, in display LUME. */
  availableBalance: number;
}

export interface AccountActivity {
  validators: IValidator[];
  sentTransactions: ITransaction[];
  receivedTransactions: ITransaction[];
  cascadeHistory: CascadeFile[];
  connectedStaking: ConnectedStaking;
}

/**
 * Every remote source the account activity sections read from, injected so the
 * composition above can be tested without a network.
 */
export interface AccountActivityApi {
  transactions: (address: string, direction: TxHistoryDirection) => Promise<ITransaction[]>;
  validators: () => Promise<IValidator[]>;
  cascade: (address: string) => Promise<CascadeAction[]>;
  action: (actionId: string) => Promise<IActionDetail | null>;
  delegations: (address: string) => Promise<DelegationResponse[]>;
  balances: (address: string) => Promise<Coin[]>;
}

interface AccountActivityApiOptions {
  get?: (path: string) => Promise<{ data: unknown }>;
  getExternal?: (path: string) => Promise<{ data: unknown }>;
}

const TRANSACTIONS_LIMIT = 20;

/**
 * The account page has always read its two transaction lists from
 * `message.sender` and `coin_received.receiver`, i.e. the direction is decided
 * by the indexed event rather than by re-classifying a merged list. These paths
 * are reproduced verbatim: `buildTxHistoryPath` in `transaction-history.ts`
 * adds `order_by=ORDER_BY_DESC`, which — combined with a page size of 20 —
 * would change *which* transactions the page shows.
 */
const buildAccountTxPath = (address: string, direction: TxHistoryDirection) => (
  direction === 'received'
    ? `/cosmos/tx/v1beta1/txs?&pagination.reverse=true&query=coin_received.receiver=%27${address}%27&pagination.limit=5&pagination.limit=${TRANSACTIONS_LIMIT}&pagination.count_total=true`
    : `/cosmos/tx/v1beta1/txs?query=message.sender=%27${address}%27&pagination.limit=${TRANSACTIONS_LIMIT}&pagination.offset=0`
);

export const createAccountActivityApi = ({
  get = instance.get,
  getExternal = instance.getExternal,
}: AccountActivityApiOptions = {}): AccountActivityApi => ({
  transactions: async (address, direction) => {
    const { data } = await get(buildAccountTxPath(address, direction));
    return (data as { tx_responses?: ITransaction[] }).tx_responses || [];
  },
  validators: async () => {
    const [bondedRes, unbondedRes] = await Promise.all([
      get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true'),
      get('/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_UNBONDED'),
    ]);
    return [
      ...((bondedRes.data as { validators?: IValidator[] }).validators || []),
      ...((unbondedRes.data as { validators?: IValidator[] }).validators || []),
    ];
  },
  cascade: async (address) => {
    const { data } = await getExternal(
      `${SNSCOPE_URL}/v1/actions?type=ACTION_TYPE_CASCADE&limit=50&creator=${address}`,
    );
    return (data as { items?: CascadeAction[] }).items || [];
  },
  action: async (actionId) => {
    if (!actionId) {
      return null;
    }
    try {
      const { data } = await getExternal(`${SNSCOPE_URL}/v1/actions/${actionId}`);
      return data as IActionDetail;
    } catch {
      return null;
    }
  },
  delegations: async (address) => {
    const { data } = await get(`/cosmos/staking/v1beta1/delegations/${address}`);
    return (data as { delegation_responses?: DelegationResponse[] }).delegation_responses || [];
  },
  balances: async (address) => {
    const { data } = await get(`/cosmos/bank/v1beta1/balances/${address}`);
    return (data as { balances?: Coin[] }).balances || [];
  },
});

export const EMPTY_CONNECTED_STAKING: ConnectedStaking = {
  validatorAddresses: [],
  stakedBalances: {},
  availableBalance: 0,
};

/**
 * Runs one activity source, reporting its result to `notify` and degrading to
 * `fallback` when the source fails, so a single outage cannot blank the page.
 */
const loadSlice = async <T>(
  load: () => Promise<T>,
  fallback: T,
  notify?: (value: T) => void,
): Promise<T> => {
  try {
    const value = await load();
    notify?.(value);
    return value;
  } catch (e) {
    console.error('API Error:', e);
    notify?.(fallback);
    return fallback;
  }
};

const loadCascadeHistory = async (
  address: string,
  api: AccountActivityApi,
): Promise<CascadeFile[]> => {
  const actions = await api.cascade(address);
  const files: CascadeFile[] = [];
  // Resolved one at a time, as the page has always done, to avoid bursting the
  // SNScope action endpoint with one request per file.
  for (const action of actions) {
    files.push({ ...action, fee: await getCascadeFee(api, action.id) });
  }
  return files;
};

const getCascadeFee = async (api: AccountActivityApi, actionId: string) => {
  const action = await api.action(actionId);
  const registerTransaction = action?.transactions?.find((tx) => tx.tx_type === 'register');
  if (!registerTransaction) {
    return '0 LUME';
  }
  return `${formatTokenDisplay({
    amount: registerTransaction.tx_fee,
    denom: registerTransaction.tx_fee_denom,
  })} LUME`;
};

interface FetchConnectedStakingOptions {
  api?: AccountActivityApi;
}

/**
 * Staking state of the connected wallet. Read separately from the browsed
 * account so reconnecting a wallet does not refetch the whole page.
 */
export const fetchConnectedStaking = async (
  connectedAddress: string,
  { api = createAccountActivityApi() }: FetchConnectedStakingOptions = {},
): Promise<ConnectedStaking> => {
  if (!connectedAddress) {
    return EMPTY_CONNECTED_STAKING;
  }

  const [delegations, availableBalance] = await Promise.all([
    loadSlice(() => api.delegations(connectedAddress), [] as DelegationResponse[]),
    loadSlice(async () => {
      const balances = await api.balances(connectedAddress);
      const total = balances.reduce(
        (sum, balance) => balance.denom === DENOM ? sum + Number(balance.amount) : sum,
        0,
      );
      return Number(numeral(total / RATE_VALUE).format('0.[000000]'));
    }, 0),
  ]);

  const stakedBalances: Record<string, string> = {};
  for (const item of delegations) {
    stakedBalances[item.delegation.validator_address] = item.balance.amount;
  }

  return {
    validatorAddresses: delegations.map((item) => item.delegation.validator_address),
    stakedBalances,
    availableBalance,
  };
};

/** Per-section callbacks, invoked as each source settles. */
export interface AccountActivitySliceHandlers {
  validators?: (validators: IValidator[]) => void;
  sentTransactions?: (transactions: ITransaction[]) => void;
  receivedTransactions?: (transactions: ITransaction[]) => void;
  cascadeHistory?: (cascadeHistory: CascadeFile[]) => void;
  connectedStaking?: (connectedStaking: ConnectedStaking) => void;
}

interface FetchAccountActivityOptions {
  api?: AccountActivityApi;
  /** Connected wallet address, when the caller wants staking state in one call. */
  connectedAddress?: string;
  onSlice?: AccountActivitySliceHandlers;
}

const EMPTY_ACTIVITY: AccountActivity = {
  validators: [],
  sentTransactions: [],
  receivedTransactions: [],
  cascadeHistory: [],
  connectedStaking: EMPTY_CONNECTED_STAKING,
};

/**
 * Validators, sent/received transactions, Cascade history and (optionally) the
 * connected wallet's staking state for one account. Each source is independent:
 * a failure yields empty data for that section only.
 */
export const fetchAccountActivity = async (
  address: string,
  { api = createAccountActivityApi(), connectedAddress = '', onSlice }: FetchAccountActivityOptions = {},
): Promise<AccountActivity> => {
  if (!address) {
    return { ...EMPTY_ACTIVITY };
  }

  const [
    validators,
    sentTransactions,
    receivedTransactions,
    cascadeHistory,
    connectedStaking,
  ] = await Promise.all([
    loadSlice(() => api.validators(), [] as IValidator[], onSlice?.validators),
    loadSlice(() => api.transactions(address, 'sent'), [] as ITransaction[], onSlice?.sentTransactions),
    loadSlice(() => api.transactions(address, 'received'), [] as ITransaction[], onSlice?.receivedTransactions),
    loadSlice(() => loadCascadeHistory(address, api), [] as CascadeFile[], onSlice?.cascadeHistory),
    loadSlice(
      () => fetchConnectedStaking(connectedAddress, { api }),
      EMPTY_CONNECTED_STAKING,
      onSlice?.connectedStaking,
    ),
  ]);

  return { validators, sentTransactions, receivedTransactions, cascadeHistory, connectedStaking };
};
