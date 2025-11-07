import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';

const useBlockDetails = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [block, setBlock] = useState(null);
  const [error, setError] = useState('');

  const fetchBlockDetails = async (height: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await instance.get(`/cosmos/base/tendermint/v1beta1/blocks/${height}`);
      setBlock(data.votes);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (params?.height) {
      fetchBlockDetails(params.height as string);
    }
  }, [params?.height]);

  return {
    isLoading,
    block,
    error,
  }
}

export default useBlockDetails;
