import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  describeAccountInfoGaps,
  fetchAccountInfo,
  fetchBaseAccount,
  fetchEvmAccountInfo,
  getTotalRewards,
} from './useAccountInfo';

describe('fetchAccountInfo', () => {
  it('queries balances and staking data for the given address', async () => {
    const delegation = {
      delegation: {
        delegator_address: 'lumera1account',
        validator_address: 'lumeravaloper1validator',
        shares: '2500000.000000000000000000',
      },
      balance: { denom: 'ulume', amount: '2500000' },
    };
    const reward = {
      validator_address: 'lumeravaloper1validator',
      reward: [{ denom: 'ulume', amount: '125000.5' }],
    };
    const rewardTotal = [{ denom: 'ulume', amount: '124999.75' }];
    const get = vi.fn()
      .mockResolvedValueOnce({ data: { balances: [{ denom: 'ulume', amount: '7000000' }] } })
      .mockResolvedValueOnce({ data: { delegation_responses: [delegation] } })
      .mockResolvedValueOnce({ data: { rewards: [reward], total: rewardTotal } })
      .mockResolvedValueOnce({ data: { unbonding_responses: [] } });

    const accountInfo = await fetchAccountInfo('lumera1account', { get });

    expect(get.mock.calls.map(([path]) => path)).toEqual([
      '/cosmos/bank/v1beta1/balances/lumera1account',
      '/cosmos/staking/v1beta1/delegations/lumera1account',
      '/cosmos/distribution/v1beta1/delegators/lumera1account/rewards',
      '/cosmos/staking/v1beta1/delegators/lumera1account/unbonding_delegations',
    ]);
    expect(accountInfo).toEqual({
      balances: [{ denom: 'ulume', amount: '7000000' }],
      delegations: [delegation],
      rewards: [reward],
      rewardTotal,
      unbonding: [],
      unavailable: [],
    });
  });

  it('defaults missing response collections to empty arrays', async () => {
    const get = vi.fn().mockResolvedValue({ data: {} });

    const accountInfo = await fetchAccountInfo('lumera1account', { get });

    expect(accountInfo).toEqual({
      balances: [],
      delegations: [],
      rewards: [],
      rewardTotal: [],
      unbonding: [],
      // Empty responses are not failures: nothing must be reported as unavailable.
      unavailable: [],
    });
  });
});

describe('one failing endpoint', () => {
  const delegation = {
    delegation: {
      delegator_address: 'lumera1account',
      validator_address: 'lumeravaloper1validator',
      shares: '2500000.000000000000000000',
    },
    balance: { denom: 'ulume', amount: '2500000' },
  };
  const unbonding = {
    delegator_address: 'lumera1account',
    validator_address: 'lumeravaloper1validator',
    entries: [{
      balance: '750000',
      completion_time: '2026-09-01T00:00:00Z',
      creation_height: '1',
      initial_balance: '750000',
      unbonding_id: '1',
      unbonding_on_hold_ref_count: '0',
    }],
  };
  const reward = {
    validator_address: 'lumeravaloper1validator',
    reward: [{ denom: 'ulume', amount: '125000.5' }],
  };
  const balances = [{ denom: 'ulume', amount: '7000000' }];

  // A slice failing is logged, not swallowed; keep the run readable.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const respondExcept = (failingPath: string) => vi.fn(async (path: string) => {
    if (path.includes(failingPath)) {
      throw new Error(`${failingPath} is down`);
    }
    if (path.includes('/bank/')) return { data: { balances } };
    if (path.includes('/staking/v1beta1/delegations/')) {
      return { data: { delegation_responses: [delegation] } };
    }
    if (path.includes('/rewards')) {
      return { data: { rewards: [reward], total: [{ denom: 'ulume', amount: '124999.75' }] } };
    }
    if (path.includes('/unbonding_delegations')) {
      return { data: { unbonding_responses: [unbonding] } };
    }
    throw new Error(`unexpected path ${path}`);
  });

  it('keeps balances, delegations and unbonding when the rewards endpoint fails', async () => {
    const get = respondExcept('/rewards');

    const accountInfo = await fetchAccountInfo('lumera1account', { get });

    expect(accountInfo.balances).toEqual(balances);
    expect(accountInfo.delegations).toEqual([delegation]);
    expect(accountInfo.unbonding).toEqual([unbonding]);
    expect(accountInfo.rewards).toEqual([]);
    expect(accountInfo.rewardTotal).toEqual([]);
    expect(accountInfo.unavailable).toEqual(['rewards']);
    expect(console.error).toHaveBeenCalledWith('API Error:', expect.any(Error));
  });

  it('keeps the staking slices when the balances endpoint fails', async () => {
    const get = respondExcept('/bank/');

    const accountInfo = await fetchAccountInfo('lumera1account', { get });

    expect(accountInfo.balances).toEqual([]);
    expect(accountInfo.delegations).toEqual([delegation]);
    expect(accountInfo.rewards).toEqual([reward]);
    expect(accountInfo.unbonding).toEqual([unbonding]);
    expect(accountInfo.unavailable).toEqual(['balances']);
  });

  it('keeps the other slices when the delegations endpoint fails', async () => {
    const accountInfo = await fetchAccountInfo('lumera1account', {
      get: respondExcept('/staking/v1beta1/delegations/'),
    });

    expect(accountInfo.delegations).toEqual([]);
    expect(accountInfo.balances).toEqual(balances);
    expect(accountInfo.rewards).toEqual([reward]);
    expect(accountInfo.unbonding).toEqual([unbonding]);
    expect(accountInfo.unavailable).toEqual(['delegations']);
  });

  it('keeps the other slices when the unbonding endpoint fails', async () => {
    const accountInfo = await fetchAccountInfo('lumera1account', {
      get: respondExcept('/unbonding_delegations'),
    });

    expect(accountInfo.unbonding).toEqual([]);
    expect(accountInfo.balances).toEqual(balances);
    expect(accountInfo.delegations).toEqual([delegation]);
    expect(accountInfo.rewards).toEqual([reward]);
    expect(accountInfo.unavailable).toEqual(['unbonding']);
  });

  it('keeps the EVM balance when a staking endpoint fails', async () => {
    const accountInfo = await fetchEvmAccountInfo({
      ethAddress: '0x0123456789012345678901234567890123456789',
      bech32Address: 'lumera1account',
      getBalance: vi.fn().mockResolvedValue('0xde0b6b3a7640000'),
      get: respondExcept('/rewards'),
    });

    expect(accountInfo.balances).toEqual([{ denom: 'ulume', amount: '1000000' }]);
    expect(accountInfo.delegations).toEqual([delegation]);
    expect(accountInfo.unbonding).toEqual([unbonding]);
    expect(accountInfo.rewards).toEqual([]);
    expect(accountInfo.unavailable).toEqual(['rewards']);
  });

  it('reports nothing as unavailable when every endpoint answers', async () => {
    const accountInfo = await fetchAccountInfo('lumera1account', { get: respondExcept('none') });

    expect(accountInfo.unavailable).toEqual([]);
    expect(describeAccountInfoGaps(accountInfo)).toBe('');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('reports nothing as unavailable on the EVM happy path', async () => {
    const accountInfo = await fetchEvmAccountInfo({
      ethAddress: '0x0123456789012345678901234567890123456789',
      bech32Address: 'lumera1account',
      getBalance: vi.fn().mockResolvedValue('0xde0b6b3a7640000'),
      get: respondExcept('none'),
    });

    expect(accountInfo.unavailable).toEqual([]);
    expect(describeAccountInfoGaps(accountInfo)).toBe('');
  });

  it('names every failed slice in read order when several endpoints fail', async () => {
    const get = vi.fn(async (path: string) => {
      if (path.includes('/bank/') || path.includes('/rewards')) {
        throw new Error('down');
      }
      if (path.includes('/staking/v1beta1/delegations/')) {
        return { data: { delegation_responses: [delegation] } };
      }
      return { data: { unbonding_responses: [unbonding] } };
    });

    const accountInfo = await fetchAccountInfo('lumera1account', { get });

    expect(accountInfo.unavailable).toEqual(['balances', 'rewards']);
    expect(accountInfo.delegations).toEqual([delegation]);
  });

  it('keeps the EVM staking slices when the EVM balance query fails', async () => {
    const accountInfo = await fetchEvmAccountInfo({
      ethAddress: '0x0123456789012345678901234567890123456789',
      bech32Address: 'lumera1account',
      getBalance: vi.fn().mockRejectedValue(new Error('evm rpc down')),
      get: respondExcept('none'),
    });

    // No balance rather than a confident zero.
    expect(accountInfo.balances).toEqual([]);
    expect(accountInfo.delegations).toEqual([delegation]);
    expect(accountInfo.rewards).toEqual([reward]);
    expect(accountInfo.unbonding).toEqual([unbonding]);
    expect(accountInfo.unavailable).toEqual(['balances']);
  });
});

describe('fetchBaseAccount', () => {
  it('reads the on-chain account record for the given address', async () => {
    const account = {
      '@type': '/cosmos.auth.v1beta1.BaseAccount',
      address: 'lumera1account',
      pub_key: { '@type': '/cosmos.crypto.secp256k1.PubKey', key: 'Aabb' },
      account_number: '12',
      sequence: '3',
    };
    const get = vi.fn().mockResolvedValue({ data: { account } });

    expect(await fetchBaseAccount('lumera1account', { get })).toEqual(account);
    expect(get).toHaveBeenCalledWith('/cosmos/auth/v1beta1/accounts/lumera1account');
  });

  it('reports an account that has never appeared on chain as null', async () => {
    const get = vi.fn().mockResolvedValue({ data: {} });

    expect(await fetchBaseAccount('lumera1account', { get })).toBeNull();
  });
});

describe('fetchEvmAccountInfo', () => {
  it('combines the EVM balance with staking data queried by Bech32 address', async () => {
    const getBalance = vi.fn().mockResolvedValue('0xde0b6b3a7640000');
    const delegation = {
      delegation: {
        delegator_address: 'lumera1account',
        validator_address: 'lumeravaloper1validator',
        shares: '2500000.000000000000000000',
      },
      balance: { denom: 'ulume', amount: '2500000' },
    };
    const reward = {
      validator_address: 'lumeravaloper1validator',
      reward: [{ denom: 'ulume', amount: '125000.5' }],
    };
    const rewardTotal = [{ denom: 'ulume', amount: '124999.75' }];
    const unbonding = {
      delegator_address: 'lumera1account',
      validator_address: 'lumeravaloper1validator',
      entries: [],
    };
    const get = vi.fn()
      .mockResolvedValueOnce({ data: { delegation_responses: [delegation] } })
      .mockResolvedValueOnce({ data: { rewards: [reward], total: rewardTotal } })
      .mockResolvedValueOnce({ data: { unbonding_responses: [unbonding] } });

    const accountInfo = await fetchEvmAccountInfo({
      ethAddress: '0x0123456789012345678901234567890123456789',
      bech32Address: 'lumera1account',
      getBalance,
      get,
    });

    expect(getBalance).toHaveBeenCalledWith('0x0123456789012345678901234567890123456789');
    expect(get.mock.calls.map(([path]) => path)).toEqual([
      '/cosmos/staking/v1beta1/delegations/lumera1account',
      '/cosmos/distribution/v1beta1/delegators/lumera1account/rewards',
      '/cosmos/staking/v1beta1/delegators/lumera1account/unbonding_delegations',
    ]);
    expect(accountInfo).toEqual({
      balances: [{ denom: 'ulume', amount: '1000000' }],
      delegations: [delegation],
      rewards: [reward],
      rewardTotal,
      unbonding: [unbonding],
      unavailable: [],
    });
  });

  it('does not query the EVM address through Cosmos staking endpoints', async () => {
    const get = vi.fn();

    await expect(fetchEvmAccountInfo({
      ethAddress: '0x0123456789012345678901234567890123456789',
      bech32Address: '',
      getBalance: vi.fn(),
      get,
    })).rejects.toThrow('Cannot query staking data without a Bech32 address.');

    expect(get).not.toHaveBeenCalled();
  });

  it('uses the chain-provided aggregate for claimable rewards', () => {
    expect(getTotalRewards({
      balances: [],
      delegations: [],
      rewards: [{
        validator_address: 'lumeravaloper1validator',
        reward: [{ denom: 'ulume', amount: '125000.5' }],
      }],
      rewardTotal: [{ denom: 'ulume', amount: '124999.75' }],
      unbonding: [],
    })).toBe(124999.75);
  });

  it('falls back to validator rewards when an aggregate is absent or empty', () => {
    expect(getTotalRewards({
      balances: [],
      delegations: [],
      rewards: [{
        validator_address: 'lumeravaloper1validator',
        reward: [{ denom: 'ulume', amount: '125000.5' }],
      }],
      rewardTotal: [],
      unbonding: [],
    })).toBe(125000.5);
  });
});

describe('describeAccountInfoGaps', () => {
  const accountInfo = {
    balances: [],
    delegations: [],
    rewards: [],
    unbonding: [],
  };

  it('says nothing when every figure loaded', () => {
    expect(describeAccountInfoGaps({ ...accountInfo, unavailable: [] })).toBe('');
  });

  it('says nothing for an account that was never loaded', () => {
    expect(describeAccountInfoGaps(null)).toBe('');
    expect(describeAccountInfoGaps(accountInfo)).toBe('');
  });

  it('names the balance so a failed query cannot read as a zero balance', () => {
    expect(describeAccountInfoGaps({ ...accountInfo, unavailable: ['balances'] })).toBe(
      'Could not load your available balance. The amounts shown may be incomplete.',
    );
  });

  it('lists several missing figures in one notice', () => {
    expect(describeAccountInfoGaps({
      ...accountInfo,
      unavailable: ['balances', 'rewards', 'unbonding'],
    })).toBe(
      'Could not load your available balance, your rewards and your unstaking total.'
      + ' The amounts shown may be incomplete.',
    );
  });
});
