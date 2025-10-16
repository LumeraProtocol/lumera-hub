import { useEffect, useState } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Registry } from '@cosmjs/proto-signing';
import { 
  MsgDelegate, 
} from 'cosmjs-types/cosmos/staking/v1beta1/tx'; // Import MsgDelegate

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { RPC_ENDPOINT, DENOM } from '@/contants/network';

interface UseDepositOptions {
  callback?: () => void;
}

export const RATE_VALUE = 1000000

const useDelegate = (options: UseDepositOptions = {}) => {
    const { address, getOfflineSigner } = useWalletConnect();
    const [isLoading, setLoading] = useState(false);
    const [optionsAdvanced, setOptionsAdvanced] = useState({
        senderAddress: address,
        fees: '2000',
        gas: '200000',
        memo: 'ping.pub',
        amount: '',
        validator: '',
    });
    const [error, setError] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [validators, setValidators] = useState([]);

    const fetchValidator = async () => {
        try {
            const { data } = await instance.get('/cosmos/staking/v1beta1/validators?pagination.limit=500&status=BOND_STATUS_BONDED');
            setValidators(data.validators);
        } catch (e) {
            console.error('API Error:', e);
        }
    }

    useEffect(() => {
        fetchValidator();
    }, [])

    const resetData = () => {
        setShowAdvanced(false);
        setLoading(false);
        setOptionsAdvanced({
            senderAddress: address,
            fees: '2000',
            gas: '200000',
            memo: 'ping.pub',
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
        if (!optionsAdvanced.amount) {
            setError('Please enter amount.');
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
                        ["/cosmos.staking.v1beta1.MsgDelegate", MsgDelegate],
                    ]), 
                }
            );
            const msg = {
                typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
                value: MsgDelegate.fromPartial({
                    delegatorAddress: optionsAdvanced.senderAddress,
                    validatorAddress: optionsAdvanced.validator,
                    amount: {
                        denom: 'lumera',
                        amount: optionsAdvanced.amount,
                    },
                }),
            };
            const fee = {
                amount: [{ denom: DENOM, amount: optionsAdvanced.fees }], // Fee gas
                gas: optionsAdvanced.gas, // Gas limit
            };
            const result = await client.signAndBroadcast(optionsAdvanced.senderAddress, [msg], fee, optionsAdvanced.memo);
            if (result?.transactionHash) {
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

    return {
        error,
        showAdvanced,
        isLoading,
        optionsAdvanced,
        validators,
        handleInputChange,
        handleShowAdvancedChange,
        handleSendClick,
    }
}

export default useDelegate;
