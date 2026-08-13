import { describe, expect, it } from 'vitest';

import { getPortfolioData } from './portfolio';

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
