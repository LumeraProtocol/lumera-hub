import { describe, expect, it, vi, beforeEach } from 'vitest';

/*
 * The quest service is off by default, and the API client must refuse to call
 * it rather than let each route answer 500. Those routes fire from ordinary
 * flows — a wallet connect, a delegation, a Cascade upload — so a failure
 * there used to surface as "Internal server error" over work that succeeded.
 */

const mockRequest = vi.fn();

vi.mock('axios', () => ({
  default: {
    request: (...args: unknown[]) => mockRequest(...args),
    isCancel: () => false,
  },
}));

describe('the quest-service gate', () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ data: {} });
  });

  it('refuses a quest call without reaching the network', async () => {
    vi.doMock('@/contants/network', async (orig) => ({
      ...(await orig<Record<string, unknown>>()),
      SNAG_ENABLED: false,
    }));
    const api = await import('./api');

    await expect(api.postExternal('/api/snag/delegate-verify', {})).rejects.toMatchObject({
      statusCode: 501,
      snagDisabled: true,
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('lets every other route through', async () => {
    vi.doMock('@/contants/network', async (orig) => ({
      ...(await orig<Record<string, unknown>>()),
      SNAG_ENABLED: false,
    }));
    const api = await import('./api');

    // A non-admin path: the /admin branch reads localStorage, which this
    // node-environment test has no business standing up.
    await api.postExternal('/api/supernode', {}).catch(() => undefined);
    expect(mockRequest).toHaveBeenCalled();
  });

  it('calls the quest service once it is switched on', async () => {
    vi.doMock('@/contants/network', async (orig) => ({
      ...(await orig<Record<string, unknown>>()),
      SNAG_ENABLED: true,
    }));
    const api = await import('./api');

    await api.postExternal('/api/snag/delegate-verify', {}).catch(() => undefined);
    expect(mockRequest).toHaveBeenCalled();
  });
});
