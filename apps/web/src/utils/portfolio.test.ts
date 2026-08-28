import { describe, expect, it } from 'vitest';

import {
  formatPortfolioAmount,
  getPortfolioData,
  getAvailableBalances,
  getDelegations,
  getRewards,
  getUnbonding,
  getTotalBalances,
} from './portfolio';
import type { AccountInfoData } from '@/hooks/useAccountInfo';

const unbondingEntry = (balance: string) => ({
  balance,
  completion_time: '2026-08-21T00:00:00Z',
  creation_height: '100',
  initial_balance: balance,
  unbonding_id: '1',
  unbonding_on_hold_ref_count: '0',
});

const ACCOUNT_INFO: AccountInfoData = {
  balances: [
    { denom: 'ulume', amount: '5000000' },
    { denom: 'lume', amount: '2' },
    { denom: 'ibc/other', amount: '999' },
  ],
  delegations: [{
    delegation: {
      delegator_address: 'lumera1account',
      validator_address: 'lumeravaloper1validator',
      shares: '3000000.000000000000000000',
    },
    balance: { denom: 'ulume', amount: '3000000' },
  }],
  rewards: [{
    validator_address: 'lumeravaloper1validator',
    reward: [
      { denom: 'ulume', amount: '250000' },
      { denom: 'ibc/other', amount: '999' },
    ],
  }],
  unbonding: [{
    delegator_address: 'lumera1account',
    validator_address: 'lumeravaloper1validator',
    entries: [unbondingEntry('100000'), unbondingEntry('50000')],
  }],
};

describe('balance aggregation helpers', () => {
  it('sums available balances in micro denom, converting display denom', () => {
    expect(getAvailableBalances(ACCOUNT_INFO)).toBe(7000000);
  });

  it('sums delegated balances', () => {
    expect(getDelegations(ACCOUNT_INFO)).toBe(3000000);
  });

  it('sums rewards across validators, ignoring foreign denoms', () => {
    expect(getRewards(ACCOUNT_INFO)).toBe(250000);
  });

  it('sums unbonding entries', () => {
    expect(getUnbonding(ACCOUNT_INFO)).toBe(150000);
  });

  it('totals available plus delegated balances', () => {
    expect(getTotalBalances(ACCOUNT_INFO)).toBe(10000000);
  });

  it('returns zero for null account info', () => {
    expect(getAvailableBalances(null)).toBe(0);
    expect(getDelegations(null)).toBe(0);
    expect(getRewards(null)).toBe(0);
    expect(getUnbonding(null)).toBe(0);
    expect(getTotalBalances(null)).toBe(0);
  });
});

describe('getPortfolioData', () => {
  it('returns raw numeric LUME amounts suitable for chart values', () => {
    const result = getPortfolioData({
      balances: [
        { denom: 'ulume', amount: '152539032533' },
        { denom: 'other', amount: '999999999999' },
      ],
      delegations: [{
        delegation: {
          delegator_address: 'lumera1account',
          validator_address: 'lumeravaloper1validator',
          shares: '10001000000.000000000000000000',
        },
        balance: { denom: 'ulume', amount: '9971027013' },
      }],
      rewards: [],
      unbonding: [],
    });

    expect(result).toEqual({
      stacked: 9971027013,
      liquid: 152539032533,
    });
    expect(Number.isFinite(result.stacked)).toBe(true);
    expect(Number.isFinite(result.liquid)).toBe(true);
  });

  it('normalizes display-denom balances and ignores unrelated tokens', () => {
    const result = getPortfolioData({
      balances: [
        { denom: 'lume', amount: '1.5' },
        { denom: 'ibc/token', amount: '4000000' },
      ],
      delegations: [],
      rewards: [],
      unbonding: [],
    });

    expect(result).toEqual({ stacked: 0, liquid: 1500000 });
  });
});

describe('formatPortfolioAmount', () => {
  it('converts micro-denom chart values to display LUME', () => {
    expect(formatPortfolioAmount(2500000)).toBe('2.5');
    expect(formatPortfolioAmount(1500000)).toBe('1.5');
  });

  it('does not render a micro-denom total as a raw integer', () => {
    expect(formatPortfolioAmount(152539032533)).not.toBe('152539032533');
  });

  it('formats a zero total', () => {
    expect(formatPortfolioAmount(0)).toBe('0');
  });
});
