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
let activeHostIndex = 0;

// A network switch replaces REST_ENDPOINTS with the other chain's hosts; the
// pinned cursor points into the old array, so reset it to try the new primary
// first.
subscribeNetworkChange(() => {
  activeHostIndex = 0;
});

/*
 * A host that has just failed is demoted immediately, before its concurrent
 * siblings finish. Screens fire ten or more reads at once, so pinning only on
 * success meant every one of them queued behind the same dead primary and paid
 * its full timeout — a ten-second blank page even though a healthy fallback
 * was one hop away.
 */
const demote = (index: number) => {
  if (index === activeHostIndex) {
    activeHostIndex = (index + 1) % REST_ENDPOINTS.length;
  }
};

/*
 * A dead host usually hangs rather than refusing, so without a ceiling the
 * request waits on the gateway's own timeout. Ten seconds is longer than any
 * healthy endpoint measured and short enough not to strand the page.
 */
const REQUEST_TIMEOUT_MS = 10000;

/** Which host the hub is currently reading from. Surfaced for diagnostics. */
export const getActiveRestEndpoint = () => REST_ENDPOINTS[activeHostIndex] ?? REST_ENDPOINTS[0];

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
      // Pin whichever host answered so the rest of the session goes straight
      // there.
      activeHostIndex = hostIndex;
      return res;
    } catch (err) {
      if (!isHostFailure(err)) {
        return rejectWith(err);
      }
      demote(hostIndex);
      if (tried + 1 >= REST_ENDPOINTS.length) {
        return rejectWith(err);
      }
      return attempt((hostIndex + 1) % REST_ENDPOINTS.length, tried + 1);
    }
  };

  return attempt(activeHostIndex, 0);
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
