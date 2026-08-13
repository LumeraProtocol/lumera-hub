import { WCWallet } from '@interchain-kit/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IdempotentWCWallet } from './wallet-connect';

describe('IdempotentWCWallet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shares one initialization across concurrent callers', async () => {
    let finishInitialization: (() => void) | undefined;
    const init = vi.spyOn(WCWallet.prototype, 'init').mockImplementation(() => (
      new Promise<void>((resolve) => { finishInitialization = resolve; })
    ));
    const wallet = new IdempotentWCWallet();

    const first = wallet.init();
    const second = wallet.init();

    expect(first).toBe(second);
    expect(init).toHaveBeenCalledOnce();

    finishInitialization?.();
    await Promise.all([first, second]);
  });

  it('allows initialization to be retried after a failure', async () => {
    const init = vi.spyOn(WCWallet.prototype, 'init')
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce();
    const wallet = new IdempotentWCWallet();

    await expect(wallet.init()).rejects.toThrow('temporary failure');
    await expect(wallet.init()).resolves.toBeUndefined();
    expect(init).toHaveBeenCalledTimes(2);
  });
});
