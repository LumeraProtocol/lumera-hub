/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

import { IBlockResponse } from '@/types';
import { IValidator } from '@/types/validator';
import * as instance from '@/utils/api';
import { TSupernodeAvatar } from '@/hooks/useSupernodes';

const API_URL = '/cosmos/base/tendermint/v1beta1/blocks/latest';
const maxBlocks = 50;

const useBlock = () => {
  const [isLoading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<IBlockResponse[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isValidatorsFetching, setValidatorsFetching] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLatestBlock = useCallback(async (useLoading = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    if (useLoading) {
      setLoading(true);
    }

    try {
      const response = await instance.getWithSignal(API_URL);

      const newBlock = response.data;
      setBlocks((prev) => {
        const exists = prev.some(b => b.block_id?.hash === newBlock.block_id?.hash);

        if (exists) {
          return prev;
        }

        const updated = [newBlock, ...prev];

        return updated.slice(0, maxBlocks);
      });

      setError(null);
    } catch (err: any) {
      if (axios.isCancel(err)) return;

      console.error('Failed to fetch latest block:', err);
      setError(err?.response?.data || err?.message || 'Unknown error');
    } finally {
      if (useLoading) {
        setLoading(false);
      }
    }
  }, []);

  const fetchAvatar = async (identity: string) => {
    if (!identity) {
      return;
    }
    try {
      const cache = localStorage.getItem('supernode-avatars');
      let parseCache: TSupernodeAvatar = {};
      if (cache) {
        parseCache = JSON.parse(cache);
        if (parseCache[identity]) {
          return;
        }
      }
      const { data } = await instance.getExternal(`https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`);
      const url = data?.them?.[0]?.pictures?.primary?.url;
      if (url) {
        const parseUrl = url.split('/');
        parseCache[identity] = parseUrl[parseUrl.length - 1];
        localStorage.setItem('supernode-avatars', JSON.stringify(parseCache));
      }
    } catch (error) {
      console.error(error);
    }
  }

  const fetchValidatorsAvatar = useCallback(async (items: IValidator[]) => {
    try {
      for (const item of items) {
        await fetchAvatar(item.description.identity);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchValidators = useCallback(async () => {
    setValidatorsFetching(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      setValidators(data.validators);
      fetchValidatorsAvatar(data.validators);
    } catch (error) {
      console.error('Failed to fetch validators:', error);
    }
    setValidatorsFetching(false);
  }, [fetchValidatorsAvatar]);

  useEffect(() => {
    fetchLatestBlock(true);

    intervalRef.current = setInterval(fetchLatestBlock, 6000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLatestBlock]);

  useEffect(() => {
    fetchValidators();
  }, [fetchValidators]);

  const logo = (identity?: string) => {
    if (!identity) {
      return '';
    }
    try {
      const cache = localStorage.getItem('supernode-avatars');
      if (cache) {
        const parseCache = JSON.parse(cache);
        if (!parseCache[identity]) {
          fetchAvatar(identity);
          return '';
        }
        const url = parseCache[identity] || '';
        return url.startsWith('http')
          ? url
          : `https://s3.amazonaws.com/keybase_processed_uploads/${url}`;
      }
    } catch (err) {
      console.error(err);
    }
    return '';
  };

  return {
    isLoading,
    blocks,
    error,
    validators,
    isValidatorsFetching,
    logo,
  }
}

export default useBlock;
