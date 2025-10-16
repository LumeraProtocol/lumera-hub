import { useEffect, useState } from 'react';
import axios from 'axios';

import { REST_AI_URL } from '@/contants/network';
import { Coin } from '@/hooks/useAccountInfo';
import useWalletConnect from '@/hooks/useWalletConnect';

export type TMessage = {
    '@type': string;
    delegator_address: string;
    validator_address: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amount: any;
}

export type TOption = {
    '@type': string;
}

export type TSignerInfos = {
    public_key: {
        '@type': string;
        key: string;
    };
    mode_info: {
        single: {
            mode: string;
        };
    };
    sequence: string;
}

export type TAttribute = {
    key: string;
    value: string;
    index: boolean;
}

export type TFee = {
    amount: Coin[];
    gas_limit: string;
    payer: string;
    granter: string;
}

type TEvent = {
    type: string;
    attributes: TAttribute[];
}

type TEventAttribute = {
    key: string;
    value: string;
}

export type TLogEvent = {
    attributes: TEventAttribute[];
    type: string;
}

export type TLog = {
    events: TLogEvent[];
    log: string;
    msg_index: number;
}

export interface IRecentActivity {
    code: number;
    codespace: string;
    height: string;
    txhash: string;
    data: string;
    raw_log: string;
    info: string;
    logs: TLog[];
    gas_wanted: string;
    gas_used: string;
    timestamp: string;
    events: TEvent[];
    tx: {
        '@type': string;
        body: {
            messages: TMessage[],
            memo: string;
            timeout_height: string;
            extension_options: TOption[];
            non_critical_extension_options: TOption[];
        },
        auth_info: {
            signer_infos: TSignerInfos[];
            fee: TFee;
            tip: {
                amount: Coin[],
                tipper: string
            }
        };
        signatures: string;
    };
}

const useRecentActivity = () => {
    const { address } = useWalletConnect();
    const [recentActivity, setRecentActivity] = useState<IRecentActivity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!address) {
            setRecentActivity([]);
            setLoading(false);
            setError(null);
            return;
        }
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data } = await axios.get(`${REST_AI_URL}/cosmos/tx/v1beta1/txs?pagination.limit=5&order_by=ORDER_BY_DESC&query=message.sender%3D'${address}'`);
                setRecentActivity(data.tx_responses)
            } catch (e) {
                console.error('API Error:', e);
                if (e instanceof Error) {
                setError(e);
                } else {
                setError(new Error('An unknown error occurred.'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [address])

    return {
        recentActivity,
        loading,
        error,
    }
}

export default useRecentActivity;