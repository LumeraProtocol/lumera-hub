import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { IBlock } from '@/types';
import { IValidator } from '@/types/validator';

const useLatestBlocks = () => {
  const params = useParams();
  const [isFetchValidatorLoading, setFetchValidatorLoading] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isFetchBlockLoading, setFetchBlockLoading] = useState(false);
  const [blocks, setBlocks] = useState<IBlock[]>([]);
  const [error, setError] = useState('');

  const fetchLatestBlock = async () => {
    if (!params?.validator) {
      return;
    }
    setFetchBlockLoading(true);
    try {
      const { data } = await instance.get('/cosmos/base/tendermint/v1beta1/blocks/latest');
      if (data?.block) {
        const newBlocks = blocks;
        const item = newBlocks.find((block) => block.header.height === data.block.header.height)
        if (!item) {
          newBlocks.push(data.block);
          setBlocks([...newBlocks.sort((a, b) => Number(b.header.height) - Number(a.header.height))].slice(0, 100));
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setFetchBlockLoading(false);
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

  useEffect(() => {
    fetchLatestBlock();
    if (params?.validator) {
      fetchValidators();

    }
    // Auto-refresh every 6 seconds
    const interval = setInterval(fetchLatestBlock, 6000);
    return () => {
      if (interval) {
        clearInterval(interval)
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
