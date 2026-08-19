import { useCallback, useState, useEffect, useRef } from 'react';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { TLog, TLogEvent, TMessage, TOption, TSignerInfos, TFee } from '@/hooks/useRecentActivity';
import { Coin } from '@/hooks/useAccountInfo';
import {
  buildTxHistoryPath,
  getTransactionHistoryAddress,
  TxHistoryDirection,
} from '@/utils/transaction-history';

const LIMIT = 20;

export interface ITransaction {
    code: number;
    codespace: string;
    data: string;
    events: TLogEvent[];
    gas_used: string;
    gas_wanted: string;
    height: string;
    info: string;
    logs: TLog,
    raw_log: string;
    timestamp: string;
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
    txhash: string;
}

interface UseTransactionOptions {
    address?: string;
    direction?: TxHistoryDirection;
}

const useTransaction = ({ address: addressOverride, direction }: UseTransactionOptions = {}) => {
    const { address, bech32Address, isEvm } = useWalletConnect();
    const transactionAddress = addressOverride
        ?? getTransactionHistoryAddress({ address, bech32Address, isEvm });
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [transactions, setTransactions] = useState<ITransaction[]>([]);
    const [totalTransactions, setTotalTransactions] = useState(0);
    const requestSequence = useRef(0);

    const fetchTransactions = useCallback(async (offset = 0, showLoading = true) => {
        const requestId = requestSequence.current + 1;
        requestSequence.current = requestId;
        if (!transactionAddress) {
            setTransactions([]);
            setTotalTransactions(0);
            setError('');
            setLoading(false);
            return [];
        }
        if (showLoading) {
            setLoading(true);
        }
        setError('');
    
        try {
            const { data } = await instance.get(buildTxHistoryPath({
                address: transactionAddress,
                direction,
                limit: LIMIT,
                offset,
            }));
            if (requestId !== requestSequence.current) return [];
            setTotalTransactions(Math.ceil(Number(data.total) / LIMIT));
            setTransactions(data.tx_responses || []);
            return data.tx_responses || [];
        } catch (e) {
            if (requestId !== requestSequence.current) return [];
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            return [];
        } finally {
            if (requestId === requestSequence.current) {
                setLoading(false);
            }
        }
    }, [transactionAddress, direction]);

    useEffect(() => {
        if (transactionAddress) {
            void fetchTransactions();
        } else {
            requestSequence.current += 1;
            setTransactions([]);
            setTotalTransactions(0);
            setError('');
            setLoading(false);
        }
        return () => {
            requestSequence.current += 1;
        };
    }, [fetchTransactions, transactionAddress]);

    const handlePageClick = ({ selected }: { selected: number }) => {
        const offset = selected * LIMIT;
        fetchTransactions(offset);
    }

    const refreshTransactions = useCallback(
        () => fetchTransactions(0, false),
        [fetchTransactions],
    );

    return {
        isLoading,
        error,
        transactions,
        totalTransactions,
        handlePageClick,
        refreshTransactions,
    }
}

export default useTransaction;
