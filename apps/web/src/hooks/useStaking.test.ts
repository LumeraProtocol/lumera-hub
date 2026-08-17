// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STAKING_AUTO_REFRESH_INTERVAL_MS,
  STAKING_REFRESH_RETRY_DELAY_MS,
} from '@/utils/staking-overview-cache';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/utils/api', () => ({
  get,
  getExternal: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('@/redux/hooks', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (select: (state: unknown) => unknown) => select({
    app: {
      activeView: 'dashboard',
      currentPath: '/',
      viewTitle: '',
      currentTab: 'active',
      validatorTab: 'all',
      subTab: 'delegations',
    },
  }),
}));

import useStaking from './useStaking';

const PUBLIC_REQUESTS_PER_REFRESH = 10;

const publicOverviewResponse = (path: string) => {
  if (path.includes('BOND_STATUS_UNBONDING')) return { data: { validators: [] } };
  if (path.includes('BOND_STATUS_UNBONDED')) return { data: { validators: [] } };
  if (path.includes('/staking/v1beta1/validators')) {
    return { data: { validators: [], pagination: { total: '0' } } };
  }
  if (path.includes('/staking/v1beta1/params')) {
    return { data: { params: { bond_denom: 'ulume', unbonding_time: '1814400s', max_validators: 100 } } };
  }
  if (path.includes('/slashing/v1beta1/params')) {
    return {
      data: {
        params: {
          signed_blocks_window: '100',
          min_signed_per_window: '0.05',
          downtime_jail_duration: '600s',
          slash_fraction_double_sign: '0.05',
          slash_fraction_downtime: '0.01',
        },
      },
    };
  }
  if (path.includes('signing_infos')) return { data: { info: [] } };
  if (path.includes('/mint/v1beta1/inflation')) return { data: { inflation: '0.1' } };
  if (path.includes('/staking/v1beta1/pool')) return { data: { pool: { bonded_tokens: '1000000' } } };
  if (path.includes('/bank/v1beta1/supply')) {
    return { data: { supply: [{ denom: 'ulume', amount: '5000000' }] } };
  }
  if (path.includes('/distribution/v1beta1/params')) {
    return { data: { params: { community_tax: '0.02' } } };
  }
  throw new Error(`unexpected request path: ${path}`);
};

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

// Node exposes a `localStorage` global that stays undefined without
// `--localstorage-file`, and vitest's jsdom environment will not shadow an
// existing globalThis key — so `window.localStorage` needs stubbing here.
const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  } as Storage;
};

describe('useStaking auto-refresh recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
    get.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-arms the auto-refresh timer after a failed refresh', async () => {
    get.mockRejectedValue(new Error('LCD unavailable'));

    renderHook(() => useStaking());
    await advance(0);

    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);

    // Waits out the retry floor instead of tight-looping against the LCD.
    await advance(STAKING_REFRESH_RETRY_DELAY_MS - 1);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);

    await advance(1);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH * 2);
  });

  it('keeps retrying while refreshes keep failing', async () => {
    get.mockRejectedValue(new Error('LCD unavailable'));

    renderHook(() => useStaking());
    await advance(0);

    for (let attempt = 2; attempt <= 4; attempt += 1) {
      await advance(STAKING_REFRESH_RETRY_DELAY_MS);
      expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH * attempt);
    }
  });

  it('returns to the long refresh cadence once a refresh succeeds', async () => {
    get.mockRejectedValue(new Error('LCD unavailable'));

    renderHook(() => useStaking());
    await advance(0);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);

    get.mockReset();
    get.mockImplementation(async (path: string) => publicOverviewResponse(path));

    await advance(STAKING_REFRESH_RETRY_DELAY_MS);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);

    // A successful refresh clears the attempt counter, so the retry floor lifts.
    await advance(STAKING_REFRESH_RETRY_DELAY_MS);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);

    await advance(STAKING_AUTO_REFRESH_INTERVAL_MS);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH * 2);
  });

  it('refreshes normally when browser storage access is blocked', async () => {
    Object.defineProperty(window, 'localStorage', {
      get: () => { throw new DOMException('Access denied', 'SecurityError'); },
      configurable: true,
    });
    get.mockImplementation(async (path: string) => publicOverviewResponse(path));

    const { result } = renderHook(() => useStaking());
    await advance(0);

    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);
    expect(result.current.error).toBe('');
    expect(result.current.isLoading).toBe(false);

    await advance(STAKING_REFRESH_RETRY_DELAY_MS);
    expect(get).toHaveBeenCalledTimes(PUBLIC_REQUESTS_PER_REFRESH);
  });
});
