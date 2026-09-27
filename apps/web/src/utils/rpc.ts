import axios from 'axios';

import { RPC_ENDPOINTS, subscribeNetworkChange } from '@/contants/network';

/*
 * Tendermint RPC failover.
 *
 * The same reasoning as the REST client in `api.ts`: a single configured host
 * is a single point of failure, and `rpc.lumera.io` was returning 504 while
 * this was written. RPC_ENDPOINTS is the configured host followed by
 * independently operated community nodes, all of which serve a permissive CORS
 * header — the binding constraint, since these are called from the browser.
 *
 * Whichever host answers is pinned for the session so a dead primary costs one
 * failed request rather than one per call.
 */

let activeIndex = 0;

// A network switch swaps RPC_ENDPOINTS for the other chain's hosts; the pinned
// cursor points into the old array, so reset it to try the new primary first —
// the same reset api.ts already does for the REST client.
subscribeNetworkChange(() => {
  activeIndex = 0;
});

/*
 * Demote a failing host immediately so concurrent requests skip it rather than
 * each paying its timeout. See the same note in `api.ts`.
 */
const demote = (index: number) => {
  if (index === activeIndex) {
    activeIndex = (index + 1) % RPC_ENDPOINTS.length;
  }
};

/** Which RPC host is currently in use. */
export const getActiveRpcEndpoint = () => RPC_ENDPOINTS[activeIndex] ?? RPC_ENDPOINTS[0];

const isHostFailure = (error: unknown) => {
  if (axios.isCancel(error)) return false;
  const err = error as { response?: { status?: number } };
  if (!err.response) return true;
  const status = err.response.status ?? 0;
  return status >= 500 || status === 429;
};

/**
 * GET a Tendermint RPC path, walking the endpoint list on host failure.
 *
 * `path` starts with a slash, e.g. `/status` or
 * `/block_search?query="block.height > 0"`.
 */
export const rpcGet = async <T = unknown>(path: string, signal?: AbortSignal): Promise<T> => {
  const attempt = async (index: number, tried: number): Promise<T> => {
    const host = RPC_ENDPOINTS[index] ?? RPC_ENDPOINTS[0];
    try {
      const { data } = await axios.get(`${host}${path}`, { signal, timeout: 10000 });
      activeIndex = index;
      return data as T;
    } catch (error) {
      if (!isHostFailure(error)) throw error;
      demote(index);
      if (tried + 1 >= RPC_ENDPOINTS.length) throw error;
      return attempt((index + 1) % RPC_ENDPOINTS.length, tried + 1);
    }
  };
  return attempt(activeIndex, 0);
};
