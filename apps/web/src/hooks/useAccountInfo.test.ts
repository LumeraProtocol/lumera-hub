import { describe, expect, it, vi } from 'vitest';

import {
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
    });
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
});
