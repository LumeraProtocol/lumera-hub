import { describe, expect, it } from 'vitest';

import { getCountdownTimeLeft, getCountdownUnitLabel, type CountdownUnit } from './countdown';

describe('getCountdownUnitLabel', () => {
  it.each<CountdownUnit>(['day', 'hour', 'minute', 'second'])(
    'uses the singular form for one %s',
    (unit) => {
      expect(getCountdownUnitLabel(1, unit)).toBe(unit);
    },
  );

  it.each<CountdownUnit>(['day', 'hour', 'minute', 'second'])(
    'uses the plural form for zero and values above one: %s',
    (unit) => {
      expect(getCountdownUnitLabel(0, unit)).toBe(`${unit}s`);
      expect(getCountdownUnitLabel(2, unit)).toBe(`${unit}s`);
    },
  );
});

describe('getCountdownTimeLeft', () => {
  it('calculates the remaining voting time', () => {
    const now = Date.UTC(2026, 7, 13, 18, 0, 0);
    const target = new Date(now + (((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1000);

    expect(getCountdownTimeLeft(target, now)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it('stays at zero after voting has ended', () => {
    const now = Date.UTC(2026, 7, 13, 18, 0, 0);

    expect(getCountdownTimeLeft(new Date(now - 1), now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
