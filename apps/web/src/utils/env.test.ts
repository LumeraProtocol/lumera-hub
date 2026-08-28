import { describe, expect, it } from 'vitest';

import { parseBooleanEnvironmentValue } from './env';

describe('parseBooleanEnvironmentValue', () => {
  it.each([
    [undefined, false],
    ['', false],
    [' false ', false],
    ['TRUE', true],
  ])('parses %s as %s', (value, expected) => {
    expect(parseBooleanEnvironmentValue(value, 'FLAG')).toBe(expected);
  });

  it('rejects ambiguous values instead of enabling a capability', () => {
    expect(() => parseBooleanEnvironmentValue('1', 'FLAG')).toThrow(
      'FLAG must be either "true" or "false".'
    );
  });
});
