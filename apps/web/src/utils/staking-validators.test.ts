import { describe, expect, it, vi } from 'vitest';

import {
  BONDED_VALIDATORS_PATH,
  fetchBondedValidators,
} from './staking-validators';

describe('fetchBondedValidators', () => {
  it('loads public bonded-validator data without requiring wallet context', async () => {
    const response = {
      validators: [{ operator_address: 'lumeravaloper1active', jailed: false }],
      pagination: { total: '1' },
    };
    const request = vi.fn().mockResolvedValue({ data: response });

    await expect(fetchBondedValidators(request)).resolves.toBe(response);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(BONDED_VALIDATORS_PATH);
  });
});
