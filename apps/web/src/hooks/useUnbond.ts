import { useEffect, useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import {
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';

import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, DENOM } from '@/contants/network';


interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
}

export const RATE_VALUE = 1000000;

const useUnbond = (options: UseDepositOptions = {}) => {
    const { address, getOfflineSigner } = useWalletConnect();
    const [isLoading, setLoading] = useState(false);
    const [optionsAdvanced, setOptionsAdvanced] = useState({
      senderAddress: address,
      fees: '2000',
      gas: '200000',
      memo: 'Lumera Hub',
      amount: '',
      validator: '',
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
        fees: '2000',
        gas: '200000',
        memo: options?.customMemo || 'Lumera Hub',
        amount: '',
        validator: '',
      });
    }

    const handleInputChange = (name: string, value: string) => {
      setOptionsAdvanced({
        ...optionsAdvanced,
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
                ["/cosmos.staking.v1beta1.MsgUndelegate", MsgUndelegate],
              ]),
            }
        );
        const msg = {
            typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
            value: MsgUndelegate.fromPartial({
                delegatorAddress: optionsAdvanced.senderAddress,
                validatorAddress: optionsAdvanced.validator,
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
      setError('');
      setOpenModal(true);
      if (validator) {
        setOptionsAdvanced({
          ...optionsAdvanced,
          memo: customMemo || options?.customMemo || 'Lumera Hub',
          validator,
          amount,
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
