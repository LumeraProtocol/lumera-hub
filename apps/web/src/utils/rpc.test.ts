import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENDPOINTS = [
  'https://primary.example',
  'https://second.example',
  'https://third.example',
];

vi.mock('@/contants/network', () => ({
  RPC_ENDPOINTS: ENDPOINTS,
}));

const get = vi.fn();
vi.mock('axios', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    isCancel: () => false,
  },
}));

describe('rpcGet failover', () => {
  beforeEach(() => {
    vi.resetModules();
    get.mockReset();
  });

  it('walks to the next host when the primary returns a 5xx', async () => {
    get
      .mockRejectedValueOnce({ response: { status: 504 } })
      .mockResolvedValueOnce({ data: { result: 'ok' } });

    const { rpcGet } = await import('./rpc');
    await expect(rpcGet('/status')).resolves.toEqual({ result: 'ok' });

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0][0]).toBe('https://primary.example/status');
    expect(get.mock.calls[1][0]).toBe('https://second.example/status');
  });

  it('walks on a transport error with no response, which is what CORS and DNS look like', async () => {
    get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { ok: true } });

    const { rpcGet } = await import('./rpc');
    await expect(rpcGet('/status')).resolves.toEqual({ ok: true });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('pins the host that answered so later calls skip the dead one', async () => {
    get
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({ data: { n: 1 } })
      .mockResolvedValueOnce({ data: { n: 2 } });

    const { rpcGet, getActiveRpcEndpoint } = await import('./rpc');
    await rpcGet('/status');
    expect(getActiveRpcEndpoint()).toBe('https://second.example');

    await rpcGet('/status');
    // Third call goes straight to the pinned host, not back to the primary.
    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls[2][0]).toBe('https://second.example/status');
  });

  it('does not retry a 4xx, which is a request problem rather than a host problem', async () => {
    get.mockRejectedValue({ response: { status: 400 } });

    const { rpcGet } = await import('./rpc');
    await expect(rpcGet('/bad')).rejects.toMatchObject({ response: { status: 400 } });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('gives up once every host has been tried', async () => {
    get.mockRejectedValue({ response: { status: 503 } });

    const { rpcGet } = await import('./rpc');
    await expect(rpcGet('/status')).rejects.toMatchObject({ response: { status: 503 } });
    expect(get).toHaveBeenCalledTimes(ENDPOINTS.length);
  });
});
