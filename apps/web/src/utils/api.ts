/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import axios from 'axios';

import { REST_AI_URL } from '@/contants/network';
import store from '@/store';
import { setError } from '@/redux/error.slice';

let headers: any = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const uploadHeaders = {
  'Content-Type': 'multipart/form-data',
  Accept: 'application/json',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customFetch = (url: string, method: string, body = {}, isUpload = false, isExternal = false): any => {
  if (isExternal && url.indexOf('/admin') !== -1) {
    const token = localStorage.getItem('adminUser');
    if (token) {
      headers = {
        ...headers,
        authorization: `Bearer ${token}`,
      }
    }
  }
  const options: any = {
    url: `${!isExternal ? REST_AI_URL : ''}${url}`,
    method,
    headers: isUpload ? uploadHeaders : headers,
  };

  if (method === 'GET' && body) {
    options.params = body;
  } else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    options.data = JSON.stringify(body);
  }
  return new Promise((resolve, reject) => {
    axios
      .request(options)
      .then((res) => resolve(res))
      .catch(({ response }) => {
        if (!response) {
          return reject({
            status: 'unknown',
            message: 'unknown error',
          });
        }
        switch (response.status) {
          case 500:
          case 429:
          case 408:
          case 405:
          case 404:
          case 403:
          case 401:
            store.dispatch(setError({
              message: response?.data?.error || response.statusText,
              status: response.status,
            }));
            return reject({
              statusCode: response.status,
              statusText: response.statusText,
              status: response.data.status,
              message: response?.data?.error || response.data.message,
              type: response?.data?.type || response?.data?.type,
            });
          default:
            return reject({
              statusCode: response.status,
              statusText: response.statusText,
              status: response.data.status,
              message: response?.data?.error || response.data.message,
              type: response?.data?.type || response?.data?.type,
            });
        }
      });
  });
};

export const getExternal = (path: string) => customFetch(path, 'GET', {}, false, true);
export const postExternal = (path: string, body: object) => customFetch(path, 'POST', body, false, true);
export const removeExternal = (path: string, body: object) => customFetch(path, 'DELETE', body, false, true);
export const get = (path: string) => customFetch(path, 'GET');
export const post = (path: string, body: object) => customFetch(path, 'POST', body);
export const put = (path: string, body: object) => customFetch(path, 'PUT', body);
export const remove = (path: string, body: object) => customFetch(path, 'DELETE', body);
export const upload = (path: string, body: object) => customFetch(path, 'POST', body, true);
