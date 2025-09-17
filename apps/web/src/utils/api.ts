import axios from 'axios';

import { REST_AI_URL } from '@/contants/network';

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const uploadHeaders = {
  'Content-Type': 'multipart/form-data',
  Accept: 'application/json',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customFetch = (url: string, method: string, body = {}, isUpload = false): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    url: `${REST_AI_URL}${url}`,
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
        if (response.status === 401) {
          return reject({
            statusCode: response.status,
            statusText: response.statusText,
            status: response.data.status,
            message: response.data.message,
          });
        }
        return reject({
          statusCode: response.status,
          statusText: response.statusText,
          status: response.data.status,
          message: response.data.message,
        });
      });
  });
};

export const get = (path: string) => customFetch(path, 'GET');
export const post = (path: string, body: object) => customFetch(path, 'POST', body);
export const put = (path: string, body: object) => customFetch(path, 'PUT', body);
export const remove = (path: string, body: object) => customFetch(path, 'DELETE', body);
export const upload = (path: string, body: object) => customFetch(path, 'post', body, true);
