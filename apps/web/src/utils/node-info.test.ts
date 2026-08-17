import { describe, expect, it } from 'vitest';

import { parseNodeInfo } from './node-info';

describe('parseNodeInfo', () => {
  it('extracts the network and v-prefixed app version', () => {
    expect(parseNodeInfo({
      default_node_info: { network: 'lumera-testnet-2' },
      application_version: { version: '1.20.2-rc1' },
    })).toEqual({
      network: 'lumera-testnet-2',
      appVersion: 'v1.20.2-rc1',
    });
  });

  it('keeps an existing v prefix', () => {
    expect(parseNodeInfo({
      default_node_info: { network: 'lumera-mainnet-1' },
      application_version: { version: 'v2.0.0' },
    })).toEqual({
      network: 'lumera-mainnet-1',
      appVersion: 'v2.0.0',
    });
  });

  it('returns empty fields when data is missing', () => {
    expect(parseNodeInfo({})).toEqual({ network: '', appVersion: '' });
    expect(parseNodeInfo({
      default_node_info: { network: 'lumera-testnet-2' },
    })).toEqual({ network: 'lumera-testnet-2', appVersion: '' });
  });
});
