/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import axios from 'axios';
import { REST_ENDPOINTS } from '@/contants/network';
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
  signal?: AbortSignal
): Promise<any> => {

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
    store.dispatch(setError({
      message: response?.data?.error || response.statusText,
      status: response.status,
    }));

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
      const res = await axios.request({ ...options, url: `${host}${url}` });
      // Pin whichever host answered so the rest of the session skips the
      // dead ones instead of paying the timeout again on every request.
      activeHostIndex = hostIndex;
      return res;
    } catch (err) {
      const canRetry = tried + 1 < REST_ENDPOINTS.length && isHostFailure(err);
      if (!canRetry) {
        return rejectWith(err);
      }
      return attempt((hostIndex + 1) % REST_ENDPOINTS.length, tried + 1);
    }
  };

  return attempt(activeHostIndex, 0);
};

export const getExternal = (path: string) => customFetch(path, 'GET', {}, false, true);
export const postExternal = (path: string, body: object) => customFetch(path, 'POST', body, false, true);
export const removeExternal = (path: string, body: object) => customFetch(path, 'DELETE', body, false, true);
export const get = (path: string) => customFetch(path, 'GET');
export const post = (path: string, body: object) => customFetch(path, 'POST', body);
export const put = (path: string, body: object) => customFetch(path, 'PUT', body);
export const remove = (path: string, body: object) => customFetch(path, 'DELETE', body);
export const upload = (path: string, body: object) => customFetch(path, 'POST', body, true);
export const getWithSignal = (path: string, signal?: AbortSignal) =>
  customFetch(path, 'GET', {}, false, false, signal);
