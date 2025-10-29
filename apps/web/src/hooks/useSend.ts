import { useEffect, useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import {
  MsgSend,
} from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, DENOM } from '@/contants/network';
import { GAS_LIMIT } from '@/contants';
import { Coin } from '@/hooks/useAccountInfo';

interface UseDepositOptions {
  callback?: () => void;
  customMemo?: string;
}

const useSend = (options: UseDepositOptions = {}) => {
    const { address, getOfflineSigner, isConnected } = useWalletConnect();
    const [isLoading, setLoading] = useState(false);
    const [optionsAdvanced, setOptionsAdvanced] = useState({
        senderAddress: address,
        fees: '2000',
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
        if (isConnected) {
            queryBalances();
        }
    }, [isConnected]);

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
        fees: '2000',
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
        if (!optionsAdvanced.recipient) {
            setError('Please enter recipient.');
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
                        ["/cosmos.bank.v1beta1.MsgSend", MsgSend],
                    ]),
                }
            );
            const msg = {
                typeUrl: '/cosmos.bank.v1beta1.MsgSend',
                value: MsgSend.fromPartial({
                    fromAddress: address,
                    toAddress: optionsAdvanced.recipient,
                    amount: [{
                        denom: DENOM,
                        amount: `${Number(optionsAdvanced.amount) * 1000000}`,
                    }],
                }),
            };
            let gasLimit = optionsAdvanced.gas
            if (optionsAdvanced.gas === GAS_LIMIT) {
              const gasEstimate = await client.simulate(optionsAdvanced.senderAddress, [msg], optionsAdvanced.memo);
              gasLimit = `${Math.round(gasEstimate * 1.3)}`;
            }
            const fee = {
                amount: [{ denom: DENOM, amount: optionsAdvanced.fees }], // Fee gas
                gas: gasLimit, // Gas limit
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

    const queryBalances = async (): Promise<void> => {
        try {
             const offlineSigner = await getOfflineSigner();
            if (!offlineSigner) {
                return;
            }
            const client = await SigningStargateClient.connectWithSigner(
                RPC_ENDPOINT,
                offlineSigner,
            );
            const allBalances = await client.getAllBalances(address);
            setBalances(allBalances.filter(b => parseInt(b.amount) > 0));
            if (allBalances.length > 0) {
                setSelectedDenom(allBalances[0].denom);
            }
        } catch (err) {
            console.error('Query balances error:', err);
        }
    };

    const handleCloseCongratulationsModal = () => {
        setTransactionHash('');
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
