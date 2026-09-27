/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import axios from 'axios';
import { REST_ENDPOINTS , SNAG_ENABLED, subscribeNetworkChange } from '@/contants/network';
import store from '@/store';
import { setError } from '@/redux/error.slice';

/*
 * REST host failover.
 *
 * The hub used to read from one LCD. When that host was unhealthy — and
 * `lcd.lumera.io` was returning 504 for the whole of one afternoon — every
 * screen went blank, because a chain explorer with no chain to read has
 * nothing to fall back on.
 *
 * REST_ENDPOINTS is the configured host followed by independently operated
 * community nodes. A request tries the current host and, on a transport error
 * or a 5xx, walks to the next one and pins it for the rest of the session. A
 * 4xx is not a host problem, so it is returned as-is rather than retried
 * against every node in turn.
 */
/*
 * A host that fails is sidelined for a short cooldown rather than pinned away
 * for the whole session. The old code demoted the failed host and pinned the
 * fallback permanently, so a single slow query that tripped the 10s timeout
 * (e.g. the account count in useNetworkStats) exiled an otherwise-healthy
 * primary until the next reload. With a cooldown, requests prefer the first
 * host not currently cooling down — the configured primary whenever it is
 * healthy — and return to it automatically once the cooldown lapses.
 *
 * The failed host is sidelined immediately, before its concurrent siblings
 * finish, so a burst of reads against a genuinely dead primary still fails over
 * fast rather than each paying the full timeout.
 */
const HOST_COOLDOWN_MS = 30000;
const cooldownUntil: number[] = [];

const isCoolingDown = (index: number) => (cooldownUntil[index] ?? 0) > Date.now();
const sideline = (index: number) => {
  cooldownUntil[index] = Date.now() + HOST_COOLDOWN_MS;
};

// The most-preferred host not currently cooling down: the configured primary
// (index 0) whenever it is healthy, else the first available fallback.
const preferredHostIndex = () => {
  for (let i = 0; i < REST_ENDPOINTS.length; i += 1) {
    if (!isCoolingDown(i)) return i;
  }
  return 0; // every host is cooling down — try the primary again anyway
};

// A network switch replaces REST_ENDPOINTS with the other chain's hosts, so the
// cooldowns recorded against the old array no longer apply.
subscribeNetworkChange(() => {
  cooldownUntil.length = 0;
});

/*
 * A dead host usually hangs rather than refusing, so without a ceiling the
 * request waits on the gateway's own timeout. Ten seconds is longer than any
 * healthy endpoint measured and short enough not to strand the page.
 */
const REQUEST_TIMEOUT_MS = 10000;

/** Which host the hub is currently reading from. Surfaced for diagnostics. */
export const getActiveRestEndpoint = () =>
  REST_ENDPOINTS[preferredHostIndex()] ?? REST_ENDPOINTS[0];

const isHostFailure = (error: unknown) => {
  if (axios.isCancel(error)) return false;
  const err = error as { response?: { status?: number }; code?: string };
  // No response at all: DNS, TLS, CORS rejection, timeout.
  if (!err.response) return true;
  const status = err.response.status ?? 0;
  return status >= 500 || status === 429 || status === 0;
};

let headers: any = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const uploadHeaders = {
  'Content-Type': 'multipart/form-data',
  Accept: 'application/json',
};

const customFetch = (
  url: string,
  method: string,
  body = {},
  isUpload = false,
  isExternal = false,
  signal?: AbortSignal,
  /*
   * Skip the global error toast. A caller that renders its own explanation for
   * a failure should not also raise a red banner over the whole app — Foundry
   * saying "the quest service is not reachable" does not need to be
   * accompanied by "Internal server error".
   */
  quiet = false,
): Promise<any> => {
  /*
   * The quest service is off, so do not call it.
   *
   * These routes need SNAG credentials, and without them every one answers
   * 500. They are invoked from ordinary flows rather than from Foundry alone,
   * so leaving them to fail put "Internal server error" in front of people
   * whose wallet had just connected or whose upload had just completed.
   * Refusing here means no request, no 500 and no toast, and callers already
   * treat a rejection as "not verified".
   */
  if (!SNAG_ENABLED && url.startsWith('/api/snag/')) {
    return Promise.reject({
      statusCode: 501,
      message: 'The quest service is not configured on this deployment.',
      snagDisabled: true,
    });
  }

  if (isExternal && url.indexOf('/admin') !== -1) {
    const token = localStorage.getItem('adminUser');
    if (token) {
      headers = {
        ...headers,
        authorization: `Bearer ${token}`,
      };
    }
  }

  const options: any = {
    url,
    method,
    headers: isUpload ? uploadHeaders : headers,
    signal,
  };

  if (method === 'GET' && body) {
    options.params = body;
  } else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    options.data = JSON.stringify(body);
  }

  const rejectWith = (err: any) => {
    if (axios.isCancel(err)) {
      throw err;
    }

    if (!err.response) {
      throw {
        status: 'unknown',
        message: 'unknown error',
      };
    }

    const { response } = err;
    if (!quiet) {
      store.dispatch(setError({
        message: response?.data?.error || response.statusText,
        status: response.status,
      }));
    }

    throw {
      statusCode: response.status,
      statusText: response.statusText,
      message: response?.data?.error || response.data?.message,
      type: response?.data?.type,
    };
  };

  // Calls to the app's own /api routes have one host and no failover.
  if (isExternal) {
    return axios.request(options).catch(rejectWith);
  }

  const attempt = async (hostIndex: number, tried: number): Promise<any> => {
    const host = REST_ENDPOINTS[hostIndex] ?? REST_ENDPOINTS[0];
    try {
      const res = await axios.request({
        ...options,
        url: `${host}${url}`,
        timeout: options.timeout ?? REQUEST_TIMEOUT_MS,
      });
      // It answered — clear any cooldown so it is preferred again.
      cooldownUntil[hostIndex] = 0;
      return res;
    } catch (err) {
      if (!isHostFailure(err)) {
        return rejectWith(err);
      }
      // Sideline this host briefly, then walk to the next one that is not itself
      // cooling down.
      sideline(hostIndex);
      if (tried + 1 >= REST_ENDPOINTS.length) {
        return rejectWith(err);
      }
      let next = (hostIndex + 1) % REST_ENDPOINTS.length;
      for (let hops = 0; hops < REST_ENDPOINTS.length && isCoolingDown(next); hops += 1) {
        next = (next + 1) % REST_ENDPOINTS.length;
      }
      return attempt(next, tried + 1);
    }
  };

  return attempt(preferredHostIndex(), 0);
};

export const getExternal = (path: string) => customFetch(path, 'GET', {}, false, true);
/** As getExternal, but the caller handles the failure and shows no global toast. */
export const getExternalQuiet = (path: string) =>
  customFetch(path, 'GET', {}, false, true, undefined, true);
export const postExternal = (path: string, body: object) => customFetch(path, 'POST', body, false, true);
/** As postExternal, but the caller handles the failure and shows no global toast. */
export const postExternalQuiet = (path: string, body: object) =>
  customFetch(path, 'POST', body, false, true, undefined, true);
export const removeExternal = (path: string, body: object) => customFetch(path, 'DELETE', body, false, true);
export const get = (path: string) => customFetch(path, 'GET');
/** A chain read whose failure the caller explains itself, so no global error toast. */
export const getQuiet = (path: string) => customFetch(path, 'GET', {}, false, false, undefined, true);
export const post = (path: string, body: object) => customFetch(path, 'POST', body);
export const put = (path: string, body: object) => customFetch(path, 'PUT', body);
export const remove = (path: string, body: object) => customFetch(path, 'DELETE', body);
export const upload = (path: string, body: object) => customFetch(path, 'POST', body, true);
export const getWithSignal = (path: string, signal?: AbortSignal) =>
  customFetch(path, 'GET', {}, false, false, signal);
