import { describe, expect, it } from 'vitest';
import { netApr, weightedCommission } from './staking-apr';
import type { IValidator } from '@/types/validator';

const v = (tokens: string, rate: string) =>
  ({ tokens, commission: { commission_rates: { rate } } }) as IValidator;

describe('weightedCommission', () => {
  it('weights by stake, not by validator count', () => {
    // 900 at 5% and 100 at 50% is 9.5%, not the flat mean of 27.5%.
    expect(weightedCommission([v('900', '0.05'), v('100', '0.50')])).toBeCloseTo(0.095, 6);
  });

  it('ignores validators with no stake or an unusable rate', () => {
    expect(weightedCommission([v('0', '0.9'), v('100', 'nonsense'), v('100', '0.10')])).toBeCloseTo(
      0.1,
      6,
    );
  });

  it('has no answer without any usable validator', () => {
    expect(weightedCommission([])).toBeNull();
    expect(weightedCommission(null)).toBeNull();
    expect(weightedCommission([v('0', '0.1')])).toBeNull();
  });
});

describe('netApr', () => {
  it('takes commission off the gross figure', () => {
    expect(netApr(100, [v('100', '0.10')])).toBeCloseTo(90, 6);
  });

  it('reproduces the mainnet reading the design shows', () => {
    // 37.0% gross at 9.7% weighted commission is the design's 33.4%.
    expect(netApr(37.0, [v('100', '0.097')])).toBeCloseTo(33.4, 1);
  });

  it('returns the gross figure when commission cannot be established', () => {
    expect(netApr(37, [])).toBe(37);
  });

  it('stays null when there is no gross figure', () => {
    expect(netApr(null, [v('100', '0.1')])).toBeNull();
    expect(netApr(Number.NaN, [v('100', '0.1')])).toBeNull();
  });
});
