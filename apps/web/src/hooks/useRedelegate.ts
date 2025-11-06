import { useEffect, useState } from 'react';
import {
  MsgBeginRedelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { DENOM } from '@/contants/network';
import { GAS_LIMIT, FEE_VALUE } from '@/contants';
import {
  IValidator,
} from '@/types';

interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
}

const useRedelegate = (options: UseDepositOptions = {}) => {
  const { address, getClient } = useWalletConnect();
  const [isLoading, setLoading] = useState(false);
  const [optionsAdvanced, setOptionsAdvanced] = useState({
      senderAddress: address,
      fees: FEE_VALUE,
      gas: GAS_LIMIT,
      memo: 'Lumera Hub',
      amount: '',
      destinationValidator: '',
      sourceValidator: '',
      validatorName: '',
  });
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isOpenModal, setOpenModal] = useState(false);
  const [totalValidators, setTotalValidators] = useState('0');
  const [isFetchValidatorLoading, setFetchValidatorLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [availableAmount, setAvailableAmount] = useState('');

  const fetchValidator = async () => {
    setFetchValidatorLoading(true);
    try {
      const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=1000&status=BOND_STATUS_BONDED&pagination.count_total=true');
      setValidators(data.validators);
      setTotalValidators(data.pagination.total);
    } catch (e) {
      console.error('API Error:', e);
    }
    setFetchValidatorLoading(false);
  }

  useEffect(() => {
    fetchValidator();
  }, []);

  useEffect(() => {
    if (options?.customMemo) {
      setOptionsAdvanced({
        ...optionsAdvanced,
        memo: options?.customMemo,
      });
    }
  }, [options?.customMemo]);

  const resetData = () => {
    setShowAdvanced(false);
    setLoading(false);
    setOptionsAdvanced({
      senderAddress: address,
      fees: FEE_VALUE,
      gas: GAS_LIMIT,
      memo: options?.customMemo || 'Lumera Hub',
      amount: '',
      destinationValidator: '',
      sourceValidator: '',
      validatorName: '',
    });
  }

  const handleInputChange = (name: string, value: string) => {
    let newOptionsAdvanced = optionsAdvanced;
    if (name === 'validator') {
      const item = validators.find((v) => v.operator_address === value);
      if (item) {
        newOptionsAdvanced = {
          ...newOptionsAdvanced,
          memo: `Stake for ${item?.description?.moniker}`,
        }
      }
    }
    if (name === 'destinationValidator') {
      const item = validators.find((v) => v.operator_address === value);
       newOptionsAdvanced = {
          ...newOptionsAdvanced,
          memo: `${newOptionsAdvanced.memo} to ${item?.description?.moniker}`,
        }
    }
    setOptionsAdvanced({
        ...newOptionsAdvanced,
        [name]: value,
    });
  }

  const handleShowAdvancedChange = (status: boolean) => {
      setShowAdvanced(status);
  }

  const handleSendClick = async () => {
    setError('');
    if (!optionsAdvanced.amount) {
      setError('Please enter amount.');
      return
    }
    if (!optionsAdvanced.sourceValidator) {
      setError('Please enter source validator.');
      return
    }
    if (!optionsAdvanced.destinationValidator) {
      setError('Please enter destination validator.');
      return
    }
    if (!optionsAdvanced.senderAddress) {
      setError('Please enter sender.');
      return
    }
    if (!optionsAdvanced.fees) {
      setError('Please enter fee.');
      return
    }
    if (!optionsAdvanced.gas) {
      setError('Please enter gas.');
      return
    }
    setLoading(true);
    try {
      const client = await getClient();
      const msgWithdraw = [{
        typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
        value: {
          delegatorAddress: optionsAdvanced.senderAddress,
          validatorAddress: optionsAdvanced.sourceValidator,
        },
      }];

      let gasLimit = optionsAdvanced.gas;
      const memo = `Claim reward from ${optionsAdvanced.validatorName}`;
      if (optionsAdvanced.gas === GAS_LIMIT) {
        const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, msgWithdraw, memo);
        gasLimit = `${Math.round(gasEstimate * 1.3)}`;
      }

      let estimatedFee = optionsAdvanced.fees;
      if (optionsAdvanced.fees === FEE_VALUE) {
        estimatedFee = `${Math.ceil(Number(gasLimit) * 0.028)}`;// 0.028 ulume/gas
      }
      const fee = {
        amount: [{ denom: DENOM, amount: estimatedFee }],
        gas: gasLimit,
      };
      const result = await client.signAndBroadcast(
        optionsAdvanced.senderAddress,
        msgWithdraw,
        fee,
        memo,
      );

      if (result?.transactionHash) {
        const msg = {
          typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
          value: MsgBeginRedelegate.fromPartial({
            delegatorAddress: optionsAdvanced.senderAddress,
            validatorSrcAddress: optionsAdvanced.sourceValidator,
            validatorDstAddress: optionsAdvanced.destinationValidator,
            amount: {
              denom: DENOM,
              amount: `${Number(optionsAdvanced.amount) * 1000000}`,
            },
          }),
        };
        const memo = optionsAdvanced.memo;
        let gasLimit = optionsAdvanced.gas;
        if (optionsAdvanced.gas === GAS_LIMIT) {
          const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, [msg], memo);
          gasLimit = `${Math.round(gasEstimate * 1.3)}`;
        }
        let estimatedFee = optionsAdvanced.fees;
        if (optionsAdvanced.fees === FEE_VALUE) {
          estimatedFee = `${Math.ceil(Number(gasLimit) * 0.028)}`;// 0.028 ulume/gas
        }
        const fee = {
          amount: [{ denom: DENOM, amount: estimatedFee }], // Fee gas
          gas: gasLimit, // Gas limit
        };
        const result = await client.signAndBroadcast(optionsAdvanced.senderAddress, [msg], fee, memo);
        if (result?.transactionHash) {
          setTransactionHash(result?.transactionHash);
          if (options?.callback) {
            options.callback();
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
    setLoading(false);
  }

  const handleOpenModal = (validator: string, amount: string, customMemo?: string) => {
    setOpenModal(true);
    if (validator) {
      setOptionsAdvanced({
        ...optionsAdvanced,
        memo: customMemo ? `Redelegate from ${customMemo}` : options?.customMemo || 'Lumera Hub',
        sourceValidator: validator,
        amount,
        validatorName: customMemo || options?.customMemo || 'Lumera Hub',
      });
      setAvailableAmount(amount);
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false);
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
    setOpenModal(false);
    resetData();
  }

  return {
    error,
    showAdvanced,
    isLoading,
    optionsAdvanced,
    validators,
    isOpenModal,
    totalValidators,
    isFetchValidatorLoading,
    transactionHash,
    availableAmount,
    handleCloseCongratulationsModal,
    handleInputChange,
    handleShowAdvancedChange,
    handleSendClick,
    handleOpenModal,
    handleCloseModal,
  }
}

export default useRedelegate;
