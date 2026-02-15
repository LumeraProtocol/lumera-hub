import { useEffect, useState } from 'react';
import {
  MsgDelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { DENOM } from '@/contants/network';
import { extractValidNumber } from '@/utils/helpers';
import { GAS_LIMIT, FEE_VALUE, GAS_RATIO, FEE_RATIO, RATE_VALUE } from '@/contants';
import {
  IValidator,
} from '@/types';
import useTrackingHubTransaction from '@/hooks/useTrackingHubTransaction';

interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
  availableAmount?: string;
}

const useDelegate = (options: UseDepositOptions = {}) => {
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
  });
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validators, setValidators] = useState<IValidator[]>([]);
  const [isOpenModal, setOpenModal] = useState(false);
  const [totalValidators, setTotalValidators] = useState('0');
  const [isFetchValidatorLoading, setFetchValidatorLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [selectedModal, setSelectedModal] = useState('');

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
      validator: '',
    });
    setOpenModal(false);
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
    setOptionsAdvanced({
      ...newOptionsAdvanced,
      [name]: name === 'amount' ? extractValidNumber(value) : value,
    });
  }

  const handleShowAdvancedChange = (status: boolean) => {
    setShowAdvanced(status);
  }

  const handleSendClick = async () => {
    setError('');
    setTransactionHash('');
    if (!optionsAdvanced?.amount || Number(optionsAdvanced.amount) <= 0) {
      setError('Please enter amount.');
      return
    }
    if (options?.availableAmount && Number(optionsAdvanced.amount) > Number(options.availableAmount)) {
      setError('Amount cannot exceed the available balance.');
      return
    }
    if (!optionsAdvanced.validator) {
      setError('Please enter validator.');
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
      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: MsgDelegate.fromPartial({
          delegatorAddress: optionsAdvanced.senderAddress,
          validatorAddress: optionsAdvanced.validator,
          amount: {
            denom: DENOM,
            amount: `${Number(optionsAdvanced.amount) * RATE_VALUE}`,
          },
        }),
      };
      let gasLimit = optionsAdvanced.gas
      if (optionsAdvanced.gas === GAS_LIMIT) {
        const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, [msg], optionsAdvanced.memo);
        gasLimit = `${Math.floor(gasEstimate * GAS_RATIO)}`;
      }
      let estimatedFee = optionsAdvanced.fees;
      if (optionsAdvanced.fees === FEE_VALUE) {
        estimatedFee = `${Math.ceil(Number(gasLimit) * FEE_RATIO)}`;// 0.028 ulume/gas
      }
      const fee = {
        amount: [{ denom: DENOM, amount: estimatedFee }],
        gas: gasLimit, // Gas limit
      };
      const result = await client.signAndBroadcast(optionsAdvanced.senderAddress, [msg], fee, optionsAdvanced.memo);
      if (result?.transactionHash) {
        setTransactionHash(result.transactionHash);
        // resetData();
        if (options?.callback) {
          options.callback();
        }
        await trackingHubTransaction({
          hash: result.transactionHash,
          creator: address,
          message_type: 'cosmos.staking.v1beta1.MsgDelegate',
          price: Number(optionsAdvanced.amount) * RATE_VALUE,
        });
      }
    } catch (error) {
      setError((error as Error)?.message ||  'An unknown error occurred.');
    }
    setLoading(false);
  }

  const handleOpenModal = (validator: string, customMemo?: string) => {
    setOpenModal(true);
    if (validator) {
      setOptionsAdvanced({
        ...optionsAdvanced,
        memo: customMemo || options?.customMemo || 'Lumera Hub',
        validator,
      });
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false);
    setTransactionHash('');
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
    resetData();
  }

  const handleStakingButtonClick = (amount: string) => {
    setError('');
    setSelectedModal('validator');
    setOptionsAdvanced({
      ...optionsAdvanced,
      amount,
    });
  }

  const handleSelectValidator = (validator: string) => {
    setError('');
    setSelectedModal('stake');
    setOptionsAdvanced({
      ...optionsAdvanced,
      validator,
    });
  }

  const handleCloseContinueToStakingModal = () => {
    setSelectedModal('');
    resetData();
    setTransactionHash('');
  }

  const handleStakingAmountChange = (amount: string) => {
    setOptionsAdvanced({
      ...optionsAdvanced,
      amount: extractValidNumber(amount),
    });
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
    selectedModal,
    handleStakingAmountChange,
    handleCloseContinueToStakingModal,
    handleSelectValidator,
    handleStakingButtonClick,
    handleCloseCongratulationsModal,
    handleInputChange,
    handleShowAdvancedChange,
    handleSendClick,
    handleOpenModal,
    handleCloseModal,
  }
}

export default useDelegate;
