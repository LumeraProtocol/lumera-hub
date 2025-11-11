import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

import * as instance from '@/utils/api';
import { IBlock } from '@/types';
import { IValidator } from '@/types/validator';
import { RPC_ENDPOINT } from '@/contants/network';

type TBlock = {
  block: IBlock
}

function mergeArraysById(currentBlock: IBlock[], newBlock: IBlock[]) {
  const map = new Map(newBlock.map(item => [item.header.height, item]));

  currentBlock.forEach(item => {
    if (!map.has(item.header.height)) {
      map.set(item.header.height, item);
    }
  });

  return Array.from(map.values());
}

const useLatestBlocks = () => {
  const intervalRef = useRef<number | null>(null);
  const params = useParams();
  const [isFetchValidatorLoading, setFetchValidatorLoading] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isFetchBlockLoading, setFetchBlockLoading] = useState(false);
  const [blocks, setBlocks] = useState<IBlock[]>([]);
  const [error, setError] = useState('');

  const fetchLatestBlock = async () => {
    try {
      const { data } = await instance.get('/cosmos/base/tendermint/v1beta1/blocks/latest');
      if (data?.block) {
        setBlocks(prev => [...mergeArraysById(prev, [data?.block]).sort((a, b) => Number(b.header.height) - Number(a.header.height))].slice(0, 100));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  }

  const fetchValidators = async () => {
    setFetchValidatorLoading(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=1000');
      setValidators(data.validators);
    } catch (error) {
      console.error(error);
    }
    setFetchValidatorLoading(false);
  }

  const fetchBlocks = async () => {
    setFetchBlockLoading(true);
    try {
      const { data: { result } } = await axios.get(`${RPC_ENDPOINT}/block_search?query="block.height > 0"&page=1&per_page=100&order_by="desc"`);
      setBlocks(result.blocks.map((item: TBlock) => item.block))

      intervalRef.current = setInterval(() => fetchLatestBlock(), 6000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setFetchBlockLoading(false);
  }

  useEffect(() => {
    if (params?.validator) {
      fetchValidators();
      fetchBlocks();
    }
    return () => {
      if (intervalRef?.current) {
        clearInterval(intervalRef.current)
      }
    };
  }, [params?.validator]);

  return {
    isFetchBlockLoading,
    blocks,
    error,
    isFetchValidatorLoading,
    validators,
  }
}

export default useLatestBlocks;
