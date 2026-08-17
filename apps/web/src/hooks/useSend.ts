import { useEffect, useState } from 'react';
import {
  MsgSend,
} from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import useWalletConnect from '@/hooks/useWalletConnect';
import { DENOM, EVM_CHAIN_ID } from '@/contants/network';
import { GAS_LIMIT, FEE_VALUE, GAS_RATIO, FEE_RATIO, RATE_VALUE } from '@/contants';
import { Coin } from '@/hooks/useAccountInfo';
import { extractValidNumber } from '@/utils/helpers';
import {
  evmBalanceToMicroLume,
  getEvmBalance,
  assertEvmAccountForChain,
  normalizeEvmRecipientAddress,
  parseEvmAmount,
} from '@/utils/evm';
import useTrackingHubTransaction from '@/hooks/useTrackingHubTransaction';

interface UseDepositOptions {
  callback?: (transactionHash?: string) => void;
  customMemo?: string;
}

const useSend = (options: UseDepositOptions = {}) => {
    const { trackingHubTransaction } = useTrackingHubTransaction();
    const {
      address,
      getClient,
      isConnected,
      isEvm,
      evmProvider,
      ensureEvmNetwork,
    } = useWalletConnect();
    const [isLoading, setLoading] = useState(false);
    const [optionsAdvanced, setOptionsAdvanced] = useState({
        senderAddress: address,
        fees: FEE_VALUE,
        gas: GAS_LIMIT,
        memo: '',
        amount: '',
        recipient: '',
        balances: '',
    });
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [balances, setBalances] = useState<Coin[]>([]);
    const [selectedDenom, setSelectedDenom] = useState<string>('ulume');
    const [transactionHash, setTransactionHash] = useState('');

    useEffect(() => {
      if (!isConnected || !address) {
        setBalances([]);
        return;
      }
      void queryBalances();
    }, [address, isConnected, isEvm]);

    useEffect(() => {
      setOptionsAdvanced((current) => ({
        ...current,
        senderAddress: address,
      }));
    }, [address]);

    useEffect(() => {
      if (options?.customMemo) {
        setOptionsAdvanced({
          ...optionsAdvanced,
          memo: options?.customMemo,
        })
      }
    }, [options?.customMemo]);

    const resetData = () => {
      setShowAdvanced(false);
      setLoading(false);
      setOptionsAdvanced({
        senderAddress: address,
        fees: FEE_VALUE,
        gas: GAS_LIMIT,
        memo: options?.customMemo || '',
        amount: '',
        recipient: '',
        balances: '',
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
      if (!optionsAdvanced.amount) {
          setError('Please enter amount.');
          return
      }
      if (!optionsAdvanced.recipient) {
          setError('Please enter recipient.');
          return
      }
      if (!optionsAdvanced.senderAddress) {
          setError('Please enter sender.');
          return
      }
      if (!isEvm && !optionsAdvanced.fees) {
          setError('Please enter fee.');
          return
      }
      if (!isEvm && !optionsAdvanced.gas) {
          setError('Please enter gas.');
          return
      }
      setLoading(true);
      try {
        if (isEvm) {
          const recipient = normalizeEvmRecipientAddress(optionsAdvanced.recipient);
          if (!evmProvider) {
            throw new Error('No EVM wallet was detected.');
          }
          if (!EVM_CHAIN_ID) {
            throw new Error('The active network does not define an EVM chain ID.');
          }

          await ensureEvmNetwork();
          const activeAddress = await assertEvmAccountForChain(
            evmProvider,
            address,
            EVM_CHAIN_ID
          );
          const transactionHash = await evmProvider.request<string>({
            method: 'eth_sendTransaction',
            params: [{
              from: activeAddress,
              to: recipient,
              value: parseEvmAmount(optionsAdvanced.amount),
            }],
          });
          setTransactionHash(transactionHash);
          resetData();
          options.callback?.(transactionHash);
          return;
        }

        const client = await getClient();
        const msg = {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: MsgSend.fromPartial({
            fromAddress: address,
            toAddress: optionsAdvanced.recipient,
            amount: [{
              denom: DENOM,
              amount: `${Number(optionsAdvanced.amount) * RATE_VALUE}`,
            }],
          }),
        };
        let gasLimit = optionsAdvanced.gas
        if (optionsAdvanced.gas === GAS_LIMIT) {
          const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, [msg], optionsAdvanced.memo);
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
        const result = await client.signAndBroadcast(optionsAdvanced.senderAddress, [msg], fee, optionsAdvanced.memo);
        if (result?.transactionHash) {
          setTransactionHash(result?.transactionHash);
          resetData();
          if (options?.callback) {
            options.callback(result.transactionHash);
          }
          await trackingHubTransaction({
            hash: result.transactionHash,
            creator: address,
            message_type: 'cosmos.bank.v1beta1.MsgSend',
            price: Number(optionsAdvanced.amount) * RATE_VALUE,
          });
        }
      } catch (error) {
          setError((error instanceof Error && error.message) || 'An unknown error occurred.');
      }
      setLoading(false);
    }

    const queryBalances = async (): Promise<void> => {
      try {
        if (isEvm) {
          const balance = await getEvmBalance(address);
          setBalances([{ denom: DENOM, amount: evmBalanceToMicroLume(balance) }]);
          setSelectedDenom(DENOM);
          return;
        }

        const client = await getClient();
        if (!client) {
          return
        }
        const allBalances = await client.getAllBalances(address);
        setBalances(allBalances.filter(b => parseInt(b.amount) > 0));
        if (allBalances.length > 0) {
          setSelectedDenom(allBalances[0].denom);
        }
      } catch {
        // console.error('Query balances error:', err);
        // noop
      }
    };

    const handleCloseCongratulationsModal = () => {
        setTransactionHash('');
        resetData();
    }

    return {
        error,
        showAdvanced,
        isLoading,
        optionsAdvanced,
        balances,
        selectedDenom,
        transactionHash,
        handleInputChange,
        handleShowAdvancedChange,
        handleSendClick,
        handleCloseCongratulationsModal,
    }
}

export default useSend;
