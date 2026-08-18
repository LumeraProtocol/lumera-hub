import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAccountActivityApi,
  fetchAccountActivity,
  fetchConnectedStaking,
  type AccountActivityApi,
  type CascadeAction,
} from './account-activity';
import type { ITransaction } from '@/hooks/useTransaction';
import type { IValidator } from '@/types/validator';
import type { IActionDetail } from '@/types';
import type { DelegationResponse } from '@/hooks/useAccountInfo';

const ACCOUNT = 'lumera1self';

const transaction = (txhash: string) => ({ txhash } as unknown as ITransaction);

const validator = (operatorAddress: string) => (
  { operator_address: operatorAddress } as unknown as IValidator
);

const cascadeAction = (id: string): CascadeAction => (
  { id, creator: ACCOUNT } as unknown as CascadeAction
);

const delegation = (validatorAddress: string, amount: string): DelegationResponse => ({
  delegation: {
    delegator_address: ACCOUNT,
    validator_address: validatorAddress,
    shares: amount,
  },
  balance: { denom: 'ulume', amount },
});

const stubApi = (overrides: Partial<AccountActivityApi> = {}): AccountActivityApi => ({
  transactions: vi.fn().mockResolvedValue([]),
  validators: vi.fn().mockResolvedValue([]),
  cascade: vi.fn().mockResolvedValue([]),
  action: vi.fn().mockResolvedValue(null),
  delegations: vi.fn().mockResolvedValue([]),
  balances: vi.fn().mockResolvedValue([]),
  ...overrides,
});

// The failure paths log through console.error by design; keep the run readable.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchAccountActivity', () => {
  it('separates sent from received transactions by the direction each was queried with', async () => {
    const transactions = vi.fn(async (_address: string, direction: string) => (
      direction === 'received' ? [transaction('B')] : [transaction('A')]
    ));
    const api = stubApi({ transactions });

    const activity = await fetchAccountActivity(ACCOUNT, { api });

    expect(transactions.mock.calls).toEqual([
      [ACCOUNT, 'sent'],
      [ACCOUNT, 'received'],
    ]);
    expect(activity.sentTransactions.map((tx) => tx.txhash)).toEqual(['A']);
    expect(activity.receivedTransactions.map((tx) => tx.txhash)).toEqual(['B']);
  });

  it('returns empty collections rather than throwing when a source fails', async () => {
    const api = stubApi({
      transactions: vi.fn().mockRejectedValue(new Error('upstream down')),
      validators: vi.fn().mockResolvedValue([validator('lumeravaloper1a')]),
    });

    const activity = await fetchAccountActivity(ACCOUNT, { api });

    expect(activity.sentTransactions).toEqual([]);
    expect(activity.receivedTransactions).toEqual([]);
    expect(activity.cascadeHistory).toEqual([]);
    // An unrelated failure must not blank the sections that did load.
    expect(activity.validators.map((item) => item.operator_address)).toEqual(['lumeravaloper1a']);
  });

  it('keeps a failing cascade source from blanking the transaction sections', async () => {
    const api = stubApi({
      transactions: vi.fn().mockResolvedValue([transaction('A')]),
      cascade: vi.fn().mockRejectedValue(new Error('snscope down')),
    });

    const activity = await fetchAccountActivity(ACCOUNT, { api });

    expect(activity.cascadeHistory).toEqual([]);
    expect(activity.sentTransactions.map((tx) => tx.txhash)).toEqual(['A']);
  });

  it('queries nothing and reports empty collections without an address', async () => {
    const api = stubApi();

    const activity = await fetchAccountActivity('', { api });

    expect(api.transactions).not.toHaveBeenCalled();
    expect(api.validators).not.toHaveBeenCalled();
    expect(api.cascade).not.toHaveBeenCalled();
    expect(activity).toEqual({
      validators: [],
      sentTransactions: [],
      receivedTransactions: [],
      cascadeHistory: [],
      connectedStaking: { validatorAddresses: [], stakedBalances: {}, availableBalance: 0 },
    });
  });

  it('annotates each cascade file with the fee of its register transaction', async () => {
    const action = {
      id: 'action-1',
      transactions: [
        { tx_type: 'finalize', tx_fee: '9000000', tx_fee_denom: 'ulume' },
        { tx_type: 'register', tx_fee: '2500000', tx_fee_denom: 'ulume' },
      ],
    } as unknown as IActionDetail;
    const api = stubApi({
      cascade: vi.fn().mockResolvedValue([cascadeAction('action-1'), cascadeAction('action-2')]),
      action: vi.fn(async (actionId: string) => actionId === 'action-1' ? action : null),
    });

    const activity = await fetchAccountActivity(ACCOUNT, { api });

    expect(api.cascade).toHaveBeenCalledWith(ACCOUNT);
    expect(activity.cascadeHistory.map((file) => [file.id, file.fee])).toEqual([
      ['action-1', '2.5 LUME'],
      ['action-2', '0 LUME'],
    ]);
  });

  it('reports every slice, including one that failed, to the caller', async () => {
    const onSlice = {
      validators: vi.fn(),
      sentTransactions: vi.fn(),
      receivedTransactions: vi.fn(),
      cascadeHistory: vi.fn(),
    };
    const api = stubApi({
      validators: vi.fn().mockResolvedValue([validator('lumeravaloper1a')]),
      transactions: vi.fn().mockResolvedValue([transaction('A')]),
      cascade: vi.fn().mockRejectedValue(new Error('snscope down')),
    });

    await fetchAccountActivity(ACCOUNT, { api, onSlice });

    expect(onSlice.validators).toHaveBeenCalledWith([validator('lumeravaloper1a')]);
    expect(onSlice.sentTransactions).toHaveBeenCalledWith([transaction('A')]);
    expect(onSlice.receivedTransactions).toHaveBeenCalledWith([transaction('A')]);
    expect(onSlice.cascadeHistory).toHaveBeenCalledWith([]);
  });

  it('reports a fast slice before the aggregate call resolves, so sections render progressively', async () => {
    let releaseCascade = () => {};
    const cascadePending = new Promise<void>((resolve) => { releaseCascade = resolve; });
    let markValidatorsReported = () => {};
    const validatorsReported = new Promise<void>((resolve) => { markValidatorsReported = resolve; });

    const api = stubApi({
      validators: vi.fn().mockResolvedValue([validator('lumeravaloper1a')]),
      // The slow source the account page must not wait on.
      cascade: vi.fn(async () => {
        await cascadePending;
        return [];
      }),
    });

    let aggregateSettled = false;
    const reportedValidators: IValidator[][] = [];
    const pending = fetchAccountActivity(ACCOUNT, {
      api,
      onSlice: {
        validators: (items) => {
          reportedValidators.push(items);
          markValidatorsReported();
        },
      },
    }).then((activity) => {
      aggregateSettled = true;
      return activity;
    });

    // Bounded so losing progressiveness fails with a message rather than a timeout.
    await Promise.race([
      validatorsReported,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('validators slice was never reported while Cascade was still in flight')),
        1000,
      )),
    ]);
    expect(reportedValidators[0].map((item) => item.operator_address)).toEqual(['lumeravaloper1a']);
    // The validators section is already renderable while Cascade is still in flight.
    expect(aggregateSettled).toBe(false);

    releaseCascade();
    await pending;
    expect(aggregateSettled).toBe(true);
  });

  it('resolves the connected wallet staking state when a connected address is given', async () => {
    const api = stubApi({
      delegations: vi.fn().mockResolvedValue([delegation('lumeravaloper1a', '2500000')]),
      balances: vi.fn().mockResolvedValue([{ denom: 'ulume', amount: '7000000' }]),
    });

    const activity = await fetchAccountActivity(ACCOUNT, {
      api,
      connectedAddress: 'lumera1connected',
    });

    expect(api.delegations).toHaveBeenCalledWith('lumera1connected');
    expect(api.balances).toHaveBeenCalledWith('lumera1connected');
    expect(activity.connectedStaking).toEqual({
      validatorAddresses: ['lumeravaloper1a'],
      stakedBalances: { lumeravaloper1a: '2500000' },
      availableBalance: 7,
    });
  });
});

describe('fetchConnectedStaking', () => {
  it('maps delegations to validator addresses and staked balances', async () => {
    const api = stubApi({
      delegations: vi.fn().mockResolvedValue([
        delegation('lumeravaloper1a', '2500000'),
        delegation('lumeravaloper1b', '1250000'),
      ]),
      balances: vi.fn().mockResolvedValue([
        { denom: 'ulume', amount: '1500000' },
        { denom: 'ulume', amount: '500000' },
      ]),
    });

    expect(await fetchConnectedStaking('lumera1connected', { api })).toEqual({
      validatorAddresses: ['lumeravaloper1a', 'lumeravaloper1b'],
      stakedBalances: {
        lumeravaloper1a: '2500000',
        lumeravaloper1b: '1250000',
      },
      availableBalance: 2,
    });
  });

  it('returns an empty staking state without querying when no wallet is connected', async () => {
    const api = stubApi();

    expect(await fetchConnectedStaking('', { api })).toEqual({
      validatorAddresses: [],
      stakedBalances: {},
      availableBalance: 0,
    });
    expect(api.delegations).not.toHaveBeenCalled();
    expect(api.balances).not.toHaveBeenCalled();
  });

  it('keeps a failing balance query from hiding the staked validator set', async () => {
    const api = stubApi({
      delegations: vi.fn().mockResolvedValue([delegation('lumeravaloper1a', '2500000')]),
      balances: vi.fn().mockRejectedValue(new Error('upstream down')),
    });

    expect(await fetchConnectedStaking('lumera1connected', { api })).toEqual({
      validatorAddresses: ['lumeravaloper1a'],
      stakedBalances: { lumeravaloper1a: '2500000' },
      availableBalance: 0,
    });
  });
});

describe('createAccountActivityApi', () => {
  it('queries the account transaction history paths the account page has always used', async () => {
    const get = vi.fn().mockResolvedValue({ data: { tx_responses: [transaction('A')] } });
    const api = createAccountActivityApi({ get });

    expect(await api.transactions(ACCOUNT, 'sent')).toEqual([transaction('A')]);
    expect(await api.transactions(ACCOUNT, 'received')).toEqual([transaction('A')]);

    expect(get.mock.calls.map(([path]) => path)).toEqual([
      '/cosmos/tx/v1beta1/txs?query=message.sender=%27lumera1self%27&pagination.limit=20&pagination.offset=0',
      '/cosmos/tx/v1beta1/txs?&pagination.reverse=true&query=coin_received.receiver=%27lumera1self%27&pagination.limit=5&pagination.limit=20&pagination.count_total=true',
    ]);
  });

  it('merges bonded and unbonded validators into a single set', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({ data: { validators: [validator('lumeravaloper1bonded')] } })
      .mockResolvedValueOnce({ data: { validators: [validator('lumeravaloper1unbonded')] } });
    const api = createAccountActivityApi({ get });

    const validators = await api.validators();

    expect(get.mock.calls.map(([path]) => path)).toEqual([
      '/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true',
      '/cosmos/staking/v1beta1/validators?pagination.limit=300&status=BOND_STATUS_UNBONDED',
    ]);
    expect(validators.map((item) => item.operator_address)).toEqual([
      'lumeravaloper1bonded',
      'lumeravaloper1unbonded',
    ]);
  });

  it('reads cascade history and action detail from the SNScope service', async () => {
    const getExternal = vi.fn()
      .mockResolvedValueOnce({ data: { items: [cascadeAction('action-1')] } })
      .mockResolvedValueOnce({ data: { id: 'action-1' } });
    const api = createAccountActivityApi({ getExternal });

    expect(await api.cascade(ACCOUNT)).toEqual([cascadeAction('action-1')]);
    expect(await api.action('action-1')).toEqual({ id: 'action-1' });
    expect(await api.action('')).toBeNull();

    expect(getExternal.mock.calls.map(([path]) => path)).toEqual([
      expect.stringContaining('/v1/actions?type=ACTION_TYPE_CASCADE&limit=50&creator=lumera1self'),
      expect.stringContaining('/v1/actions/action-1'),
    ]);
  });

  it('returns an empty collection when a Cosmos response omits its payload', async () => {
    const get = vi.fn().mockResolvedValue({ data: {} });
    const api = createAccountActivityApi({ get });

    expect(await api.transactions(ACCOUNT, 'sent')).toEqual([]);
    expect(await api.delegations(ACCOUNT)).toEqual([]);
    expect(await api.balances(ACCOUNT)).toEqual([]);
  });
});
