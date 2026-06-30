/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

import { IBlockResponse } from '@/types';
import { IValidator } from '@/types/validator';
import * as instance from '@/utils/api';

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


  const fetchValidators = useCallback(async () => {
    setValidatorsFetching(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      setValidators(data.validators);
    } catch (error) {
      console.error('Failed to fetch validators:', error);
    }
    setValidatorsFetching(false);
  }, []);

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

  return {
    isLoading,
    blocks,
    error,
    validators,
    isValidatorsFetching,
  }
}

export default useBlock;
