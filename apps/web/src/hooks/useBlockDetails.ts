import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { IValidator } from '@/types/validator';

const useBlockDetails = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [block, setBlock] = useState(null);
  const [error, setError] = useState('');
   const [validators, setValidators] = useState<IValidator[]>([]);
   const [isValidatorsLoading, setValidatorsLoading] = useState(false);

  const fetchValidators = async () => {
    setValidatorsLoading(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      setValidators(data.validators);
    } catch (e) {
      console.error('API Error:', e);
    }
    setValidatorsLoading(false);
  }

  const fetchBlockDetails = async (height: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await instance.get(`/cosmos/base/tendermint/v1beta1/blocks/${height}`);
      setBlock(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setLoading(false);
  }

  useEffect(() => {
    if (params?.height) {
      fetchBlockDetails(params.height as string);
      fetchValidators();
    }
  }, [params?.height]);

  return {
    isLoading,
    block,
    error,
    validators,
    isValidatorsLoading,
  }
}

export default useBlockDetails;
