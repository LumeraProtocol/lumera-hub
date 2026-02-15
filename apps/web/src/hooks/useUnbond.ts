import { useEffect, useState } from 'react';
import {
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import useWalletConnect from '@/hooks/useWalletConnect';
import { DENOM } from '@/contants/network';
import { extractValidNumber } from '@/utils/helpers';
import { GAS_LIMIT, FEE_VALUE, GAS_RATIO, FEE_RATIO, RATE_VALUE } from '@/contants';
import useTrackingHubTransaction from '@/hooks/useTrackingHubTransaction';

interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
}

const useUnbond = (options: UseDepositOptions = {}) => {
  const { trackingHubTransaction } = useTrackingHubTransaction();
  const { address, getClient } = useWalletConnect();
  const [isLoading, setLoading] = useState(false);
  const [optionsAdvanced, setOptionsAdvanced] = useState({
    senderAddress: address,
    fees: FEE_VALUE,
    gas: GAS_LIMIT,
    memo: 'Lumera Hub',
    amount: '',
    validator: '',
    validatorName: '',
  });
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isOpenModal, setOpenModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [availableAmount, setAvailableAmount] = useState('');

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
      validator: '',
      validatorName: '',
    });
  }

  const handleInputChange = (name: string, value: string) => {
    setOptionsAdvanced({
      ...optionsAdvanced,
      [name]: name === 'amount' ? extractValidNumber(value) : value,
    });
  }

  const handleShowAdvancedChange = (status: boolean) => {
    setShowAdvanced(status);
  }

  const handleSendClick = async () => {
    setError('');
    setTransactionHash('');
    if (!optionsAdvanced.amount) {
      setError('Please enter amount.');
      return
    }
    if (Number(optionsAdvanced.amount) <= 0) {
      setError('Amount must not be less than 0.');
      return
    }
    if (availableAmount && Number(optionsAdvanced.amount) > Number(availableAmount)) {
      setError('Amount cannot exceed the available balance.');
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
          validatorAddress: optionsAdvanced.validator,
        },
      }];

      let gasLimit = optionsAdvanced.gas;
      const memo = `Claim reward from ${optionsAdvanced.validatorName}`;
      if (optionsAdvanced.gas === GAS_LIMIT) {
        const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, msgWithdraw, memo);
        gasLimit = `${Math.ceil(gasEstimate * GAS_RATIO)}`;
      }

      let estimatedFee = optionsAdvanced.fees;
      if (optionsAdvanced.fees === FEE_VALUE) {
        estimatedFee = `${Math.ceil(Number(gasLimit) * FEE_RATIO)}`;// 0.028 ulume/gas
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
      const hash = result?.transactionHash;
      if (result?.transactionHash) {
        await trackingHubTransaction({
          hash,
          creator: address,
          message_type: 'cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
          price: 0,
        });
        const msg = {
          typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
          value: MsgUndelegate.fromPartial({
            delegatorAddress: optionsAdvanced.senderAddress,
            validatorAddress: optionsAdvanced.validator,
            amount: {
              denom: DENOM,
              amount: `${Number(optionsAdvanced.amount) * RATE_VALUE}`,
            },
          }),
        };
        const memo = optionsAdvanced.memo;
        let gasLimit = optionsAdvanced.gas
        if (optionsAdvanced.gas === GAS_LIMIT) {
          const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, [msg], memo);
          gasLimit = `${Math.ceil(gasEstimate * GAS_RATIO)}`;
        }
        let estimatedFee = optionsAdvanced.fees;
        if (optionsAdvanced.fees === FEE_VALUE) {
          estimatedFee = `${Math.ceil(Number(gasLimit) * FEE_RATIO)}`;// 0.028 ulume/gas
        }
        const fee = {
          amount: [{ denom: DENOM, amount: estimatedFee }], // Fee gas
          gas: gasLimit, // Gas limit
        };

        const result = await client.signAndBroadcast(optionsAdvanced.senderAddress, [msg], fee, memo);
        if (result?.transactionHash) {
          setTransactionHash(result.transactionHash);
          await trackingHubTransaction({
            hash: result.transactionHash,
            creator: address,
            message_type: 'cosmos.staking.v1beta1.MsgUndelegate',
            price: Number(optionsAdvanced.amount) * RATE_VALUE,
          });
          if (options?.callback) {
              options.callback();
          }
        }
      }


    } catch (error) {
      setError((error as Error)?.message ||  'An unknown error occurred.');
    }
    setLoading(false);
  }

  const handleOpenModal = (validator: string, amount: string, customMemo?: string) => {
    setError('');
    setOpenModal(true);
    if (validator) {
      setOptionsAdvanced({
        ...optionsAdvanced,
        memo: customMemo ? `Unbond for the ${customMemo}` : options?.customMemo || 'Lumera Hub',
        validator,
        amount,
        validatorName: customMemo || options?.customMemo || 'Lumera Hub',
      });
      setAvailableAmount(amount);
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false);
    setOptionsAdvanced({
      ...optionsAdvanced,
      amount: '',
    });
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
    isOpenModal,
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

export default useUnbond;
