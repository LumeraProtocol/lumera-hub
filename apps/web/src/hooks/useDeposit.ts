import { useState, useEffect } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import {
  MsgDeposit,
} from 'cosmjs-types/cosmos/gov/v1/tx';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, DENOM } from '@/contants/network';
import { RATE_VALUE, GAS_LIMIT } from '@/contants';

interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
}

const useDeposit = (options: UseDepositOptions = {}) => {
    const { address, getOfflineSigner } = useWalletConnect();
    const [isLoading, setLoading] = useState(false);
    const [depositAdvanced, setDepositAdvanced] = useState({
        senderAddress: address,
        fees: '2000',
        gas: GAS_LIMIT,
        memo: 'Lumera Hub',
        depositAmount: '',
    });
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [proposalId, setProposalId] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [availableAmount, setAvailableAmount] = useState(0);
    const [transactionHash, setTransactionHash] = useState('');

    const fetchData = async () => {
        try {
          const { data } = await instance.get(`/cosmos/bank/v1beta1/balances/${address}`);
          let total = 0;
          for (const item of data.balances) {
            if (item.denom === 'ulume') {
                total += Number(item.amount)
            }
          }
          setAvailableAmount(Number((total / RATE_VALUE).toFixed(6)));
        } catch (e) {
          console.error('API Error:', e);
        }
    };

    useEffect(() => {
        if (address) {
            fetchData();
        }
    }, [address]);

    useEffect(() => {
      if (options?.customMemo) {
        setDepositAdvanced({
          ...depositAdvanced,
          memo: options?.customMemo,
        });
      }
    }, [options?.customMemo]);

    const resetData = () => {
        setShowAdvanced(false);
        setModalOpen(false);
        setLoading(false);
        setDepositAdvanced({
            senderAddress: address,
            fees: '2000',
            gas: GAS_LIMIT,
            memo: options?.customMemo || 'Lumera Hub',
            depositAmount: '',
        });
    }

    useEffect(() => {
        if (!isModalOpen) {
            resetData();
        }
    }, [isModalOpen])

    const handleDepositChange = (name: string, value: string) => {
      setDepositAdvanced({
        ...depositAdvanced,
        [name]: value,
      });
    }

    const handleShowAdvancedChange = (status: boolean) => {
        setShowAdvanced(status);
    }

    const handleSendClick = async () => {
      setError('');
      if (!depositAdvanced.depositAmount) {
          setError('Please enter amount.');
          return
      }
      if (!depositAdvanced.senderAddress) {
          setError('Please enter sender.');
          return
      }
      if (!depositAdvanced.fees) {
          setError('Please enter fee.');
          return
      }
      if (!depositAdvanced.gas) {
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
                      ["/cosmos.gov.v1.MsgDeposit", MsgDeposit],
                  ]),
              }
          );
          const msg = {
            typeUrl: '/cosmos.gov.v1.MsgDeposit',
            value: MsgDeposit.fromPartial({
                proposalId: BigInt(proposalId),
                depositor: address,
                amount: [{
                    denom: DENOM,
                    amount: `${Number(depositAdvanced.depositAmount) * 1000000}`,
                }],
            }),
          };
          let gasLimit = depositAdvanced.gas
          if (depositAdvanced.gas === GAS_LIMIT) {
            const gasEstimate = await client.simulate(depositAdvanced.senderAddress, [msg], depositAdvanced.memo);
            gasLimit = `${Math.round(gasEstimate * 1.3)}`;
          }
          const fee = {
              amount: [{ denom: DENOM, amount: depositAdvanced.fees }], // Fee gas
              gas: gasLimit, // Gas limit
          };
          const result = await client.signAndBroadcast(depositAdvanced.senderAddress, [msg], fee, depositAdvanced.memo);
          if (result?.transactionHash) {
            setTransactionHash(result.transactionHash);
            // resetData();
            if (options?.callback) {
                options.callback();
            }
          }
      } catch (error) {
          setError(error instanceof Error ? error.message : 'An unknown error occurred.');
      }
      setLoading(false);
    }

    const handleCloseCongratulationsModal = () => {
      resetData();
      setTransactionHash('');
    }

    return {
        address,
        error,
        showAdvanced,
        isLoading,
        depositAdvanced,
        isModalOpen,
        availableAmount,
        transactionHash,
        setModalOpen,
        handleDepositChange,
        handleShowAdvancedChange,
        handleSendClick,
        setProposalId,
        handleCloseCongratulationsModal,
    }
}

export default useDeposit;
