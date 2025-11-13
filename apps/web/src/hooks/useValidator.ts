import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

import * as instance from '@/utils/api';
import { IValidator } from '@/types/validator';
import { RPC_ENDPOINT } from '@/contants/network';

export const LIMIT = 20;

const useValidator = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validator, setValidator] = useState<IValidator | null>(null);
  const [validatorAddress, setValidatorAddress] = useState('');
  const [slashingParams, setSlashingParams] = useState({
    signed_blocks_window: "0",
    min_signed_per_window: "0",
    downtime_jail_duration: "0s",
    slash_fraction_double_sign: "0",
    slash_fraction_downtime: "0"
  });
  const [signingInfos, setSigningInfos] = useState([]);
  const [isFetchParamsLoading, setFetchParamsLoading] = useState(false);
  const [isFetchValidatorsLoading, setFetchValidatorsLoading] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isFetchDelegatorsLoading, setFetchDelegatorsLoading] = useState(false);
  const [delegators , setDelegators] = useState([]);
  const [totalDelegators, setTotalDelegators] = useState(0);

  const fetchDelegators  = async (validator: string, page = 1) => {
    setFetchDelegatorsLoading(true);
    try {
      const { data: { result } } = await axios.get(`${RPC_ENDPOINT}/tx_search?query="delegate.validator = %27${validator}%27"&page=${page}&per_page=${LIMIT}&order_by="desc"`);
      setDelegators(result.txs);
      setTotalDelegators(Number(result.total_count));
    } catch (error) {
      console.error(error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setFetchDelegatorsLoading(false);
  }

  const fetchValidators = async () => {
    setFetchValidatorsLoading(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      setValidators(data.validators);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setFetchValidatorsLoading(false);
  }

  const fetchParams = async () => {
    setFetchParamsLoading(true);
    try {
      const [slashingParamsRes, signingInfosRes] = await Promise.all([
        instance.get('/cosmos/slashing/v1beta1/params'),
        instance.get('/cosmos/slashing/v1beta1/signing_infos?pagination.limit=300'),
      ]);
      setSlashingParams(slashingParamsRes.data.params);
      setSigningInfos(signingInfosRes.data.info);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setFetchParamsLoading(false);
  }

  const fetchValidator = async (validatorAddress: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await instance.get(`/cosmos/staking/v1beta1/validators/${validatorAddress}`);
      setValidator(data.validator);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.validator) {
      fetchValidator(params.validator as string);
      setValidatorAddress(params.validator as string);
      fetchDelegators(params.validator as string);
      fetchParams();
      fetchValidators();
    }
  }, [params?.validator]);

  const handlePageClick = ({ selected }: { selected: number }) => {
    fetchDelegators(params.validator as string, selected + 1);
  }

  return {
    isLoading,
    error,
    validator,
    validatorAddress,
    signingInfos,
    slashingParams,
    isFetchParamsLoading,
    isFetchValidatorsLoading,
    validators,
    isFetchDelegatorsLoading,
    delegators,
    totalDelegators,
    handlePageClick,
  }
}

export default useValidator;
