import { useEffect, useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import {
  MsgBeginRedelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, DENOM } from '@/contants/network';
import {
  IValidator,
} from '@/types';

interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
}

export const RATE_VALUE = 1000000;

const useRedelegate = (options: UseDepositOptions = {}) => {
  const { address, getOfflineSigner } = useWalletConnect();
  const [isLoading, setLoading] = useState(false);
  const [optionsAdvanced, setOptionsAdvanced] = useState({
      senderAddress: address,
      fees: '2000',
      gas: '300000',
      memo: 'Lumera Hub',
      amount: '',
      destinationValidator: '',
      sourceValidator: '',
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
      fees: '2000',
      gas: '300000',
      memo: options?.customMemo || 'Lumera Hub',
      amount: '',
      destinationValidator: '',
      sourceValidator: '',
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
      const offlineSigner = await getOfflineSigner();
      if (!offlineSigner) {
        setError('Please connect wallet before using');
        return;
      }
      const client = await SigningStargateClient.connectWithSigner(
        RPC_ENDPOINT,
        offlineSigner,
        {
          registry: new Registry([
            ["/cosmos.staking.v1beta1.MsgBeginRedelegate", MsgBeginRedelegate],
          ]),
        }
      );
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
      const fee = {
        amount: [{ denom: DENOM, amount: optionsAdvanced.fees }], // Fee gas
        gas: optionsAdvanced.gas, // Gas limit
      };
      const result = await client.signAndBroadcast(optionsAdvanced.senderAddress, [msg], fee, optionsAdvanced.memo);
      if (result?.transactionHash) {
        setTransactionHash(result?.transactionHash);
        resetData();
        if (options?.callback) {
          options.callback();
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
        memo: customMemo || options?.customMemo || 'Lumera Hub',
        sourceValidator: validator,
        amount,
      });
      setAvailableAmount(amount);
    }
  }

  const handleCloseModal = () => {
    setOpenModal(false);
  }

  const handleCloseCongratulationsModal = () => {
    setTransactionHash('');
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
