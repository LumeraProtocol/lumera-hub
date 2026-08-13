import { describe, expect, it, vi } from 'vitest';

import {
  getStakingOverviewCacheKey,
  getStakingAutoRefreshDelay,
  getStakingRefreshProgress,
  readStakingOverviewCache,
  writeStakingOverviewCache,
  type StakingOverviewCache,
} from './staking-overview-cache';

const cache: StakingOverviewCache = {
  version: 1,
  updatedAt: 1_786_640_000_000,
  activeValidators: [],
  inactiveValidators: [],
  activeValidatorTotal: '0',
  params: {
    bond_denom: 'ulume',
    historical_entries: 0,
    max_entries: 7,
    max_validators: 100,
    min_commission_rate: '0.05',
    unbonding_time: '1814400s',
  },
  slashingParams: {
    signed_blocks_window: '10000',
    min_signed_per_window: '0.5',
    downtime_jail_duration: '600s',
    slash_fraction_double_sign: '0.05',
    slash_fraction_downtime: '0.0001',
  },
  signingInfos: [],
  apr: 12.5,
  bondedTokens: 123,
};

describe('staking overview cache', () => {
  it('uses a chain-specific versioned key', () => {
    expect(getStakingOverviewCacheKey('lumera-testnet-2'))
      .toBe('lumera-hub:staking-overview:lumera-testnet-2:v1');
  });

  it('round-trips a valid cache entry', () => {
    let serialized = '';
    const storage = {
      getItem: vi.fn(() => serialized || null),
      setItem: vi.fn((_key: string, value: string) => { serialized = value; }),
    };

    writeStakingOverviewCache(storage, 'lumera-testnet-2', cache);

    expect(storage.setItem).toHaveBeenCalledWith(
      getStakingOverviewCacheKey('lumera-testnet-2'),
      JSON.stringify(cache),
    );
    expect(readStakingOverviewCache(storage, 'lumera-testnet-2')).toEqual(cache);
  });

  it('ignores malformed and incompatible entries', () => {
    expect(readStakingOverviewCache({ getItem: () => 'not-json' }, 'chain')).toBeNull();
    expect(readStakingOverviewCache({ getItem: () => '{"version":2}' }, 'chain')).toBeNull();
  });

  it('does not fail when storage rejects a write', () => {
    expect(() => writeStakingOverviewCache({
      setItem: () => { throw new Error('quota exceeded'); },
    }, 'chain', cache)).not.toThrow();
  });

  it('reports bounded refresh progress as a percentage', () => {
    expect(getStakingRefreshProgress(0, 10)).toBe(0);
    expect(getStakingRefreshProgress(3, 10)).toBe(30);
    expect(getStakingRefreshProgress(10, 10)).toBe(100);
    expect(getStakingRefreshProgress(11, 10)).toBe(100);
    expect(getStakingRefreshProgress(1, 0)).toBe(0);
  });

  it('waits until cached data is stale before refreshing automatically', () => {
    const now = 1_786_640_000_000;
    const fiveMinutes = 5 * 60 * 1000;

    expect(getStakingAutoRefreshDelay(now, now, fiveMinutes)).toBe(fiveMinutes);
    expect(getStakingAutoRefreshDelay(now - 60_000, now, fiveMinutes))
      .toBe(fiveMinutes - 60_000);
    expect(getStakingAutoRefreshDelay(now - fiveMinutes, now, fiveMinutes)).toBe(0);
    expect(getStakingAutoRefreshDelay(null, now, fiveMinutes)).toBe(0);
  });
});
