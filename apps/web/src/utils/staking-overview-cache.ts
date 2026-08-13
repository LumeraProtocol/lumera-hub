import type { TSigningInfos } from '@/types';
import type { IValidator } from '@/types/validator';

export interface StakingParams {
  bond_denom: string;
  historical_entries: number;
  max_entries: number;
  max_validators: number;
  min_commission_rate: string;
  unbonding_time: string;
}

export interface SlashingParams {
  signed_blocks_window: string;
  min_signed_per_window: string;
  downtime_jail_duration: string;
  slash_fraction_double_sign: string;
  slash_fraction_downtime: string;
}

export interface StakingOverviewCache {
  version: 1;
  updatedAt: number;
  activeValidators: IValidator[];
  inactiveValidators: IValidator[];
  activeValidatorTotal: string;
  params: StakingParams;
  slashingParams: SlashingParams;
  signingInfos: TSigningInfos[];
  apr: number;
  bondedTokens: number;
}

interface CacheStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const getStakingOverviewCacheKey = (chainId: string) =>
  `lumera-hub:staking-overview:${chainId}:v1`;

export const getStakingRefreshProgress = (completed: number, total: number): number => {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
};

export const isStakingOverviewCache = (value: unknown): value is StakingOverviewCache => {
  if (!value || typeof value !== 'object') return false;

  const cache = value as Partial<StakingOverviewCache>;
  return cache.version === 1
    && typeof cache.updatedAt === 'number'
    && Number.isFinite(cache.updatedAt)
    && Array.isArray(cache.activeValidators)
    && Array.isArray(cache.inactiveValidators)
    && typeof cache.activeValidatorTotal === 'string'
    && Boolean(cache.params && typeof cache.params.bond_denom === 'string')
    && Boolean(cache.slashingParams && typeof cache.slashingParams.signed_blocks_window === 'string')
    && Array.isArray(cache.signingInfos)
    && typeof cache.apr === 'number'
    && Number.isFinite(cache.apr)
    && typeof cache.bondedTokens === 'number'
    && Number.isFinite(cache.bondedTokens);
};

export const readStakingOverviewCache = (
  storage: Pick<CacheStorage, 'getItem'>,
  chainId: string,
): StakingOverviewCache | null => {
  try {
    const serialized = storage.getItem(getStakingOverviewCacheKey(chainId));
    if (!serialized) return null;

    const parsed: unknown = JSON.parse(serialized);
    return isStakingOverviewCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeStakingOverviewCache = (
  storage: Pick<CacheStorage, 'setItem'>,
  chainId: string,
  cache: StakingOverviewCache,
) => {
  try {
    storage.setItem(getStakingOverviewCacheKey(chainId), JSON.stringify(cache));
  } catch {
    // Rendering fresh data should still succeed when browser storage is unavailable or full.
  }
};
