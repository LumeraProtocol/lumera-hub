import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearTrackedConnects,
  isConnectTracked,
  markConnectTracked,
} from './wallet-connect-marker';

const ADDRESS_A = '0x1111111111111111111111111111111111111111';
const ADDRESS_B = '0x2222222222222222222222222222222222222222';

const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
};

describe('wallet connect tracking marker', () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('reports untracked addresses on a fresh session', () => {
    expect(isConnectTracked(storage, ADDRESS_A)).toBe(false);
  });

  it('remembers every tracked address, not only the most recent one', () => {
    markConnectTracked(storage, ADDRESS_A);
    markConnectTracked(storage, ADDRESS_B);

    expect(isConnectTracked(storage, ADDRESS_A)).toBe(true);
    expect(isConnectTracked(storage, ADDRESS_B)).toBe(true);
  });

  it('treats differently-cased EVM addresses as the same wallet', () => {
    const checksummed = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
    const lowercase = checksummed.toLowerCase();

    markConnectTracked(storage, checksummed);
    markConnectTracked(storage, lowercase);

    expect(isConnectTracked(storage, lowercase)).toBe(true);
    expect(JSON.parse(storage.getItem('new_connect') || '[]')).toEqual([lowercase]);
  });

  it('clears all tracked addresses on disconnect', () => {
    markConnectTracked(storage, ADDRESS_A);
    clearTrackedConnects(storage);

    expect(isConnectTracked(storage, ADDRESS_A)).toBe(false);
  });

  it('migrates a legacy single-address marker value', () => {
    storage.setItem('new_connect', ADDRESS_A);

    expect(isConnectTracked(storage, ADDRESS_A)).toBe(true);
    expect(isConnectTracked(storage, ADDRESS_B)).toBe(false);
  });

  it('treats the legacy boolean marker value as tracking nothing specific', () => {
    storage.setItem('new_connect', 'true');

    expect(isConnectTracked(storage, ADDRESS_A)).toBe(false);
  });

  it('keeps earlier addresses when marking through a legacy value', () => {
    storage.setItem('new_connect', ADDRESS_A);
    markConnectTracked(storage, ADDRESS_B);

    expect(isConnectTracked(storage, ADDRESS_A)).toBe(true);
    expect(isConnectTracked(storage, ADDRESS_B)).toBe(true);
  });
});
