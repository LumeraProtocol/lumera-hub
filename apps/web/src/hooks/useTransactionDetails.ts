import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';
import { Coin } from '@/types';

type TSignerInfos = {
  public_key: {
    type_url: string;
    value: string;
  };
  mode_info: {
    single: {
      mode: string;
    };
    multi: {
      bitarray: {
        extra_bits_stored: number;
        elems: string;
      };
      mode_infos: string[];
    };
  };
  sequence: string;
}

type TMessage = {
  type_url: string;
  value: string;
}

type TAttribute = {
  key: string;
  value: string;
  index?: boolean;
}

type TEvent = {
  type: string;
  attributes: TAttribute[];
}

type TLog = {
  msg_index: number;
  log: string;
  events: TEvent[]
}

type TxMessages = {
  '@type': string;
  delegator_address: string;
  validator_address: string;
  validator_dst_address?: string;
  validator_src_address?: string;
  amount: {
    amount: string;
    denom: string;
  };
}

export interface ITransaction {
  tx: {
    auth_info: {
      signer_infos: TSignerInfos[];
      fee: {
        amount: Coin[];
        gas_limit: string;
        payer: string;
        granter: string;
      };
      tip: {
        amount: Coin[];
        tipper: string;
      };
    };
    body: {
      messages: TxMessages[];
      memo: string;
      timeout_height: string;
      extension_options: TMessage[];
      non_critical_extension_options: TMessage[];
    };
    signatures: string[];
  };
  tx_response: {
    height: string;
    txhash: string;
    codespace: string;
    code: number;
    data: string;
    raw_log: string;
    logs: TLog[];
    info: string;
    gas_wanted: string;
    gas_used: string;
    tx: {
      type_url: string;
      value: string;
    };
    timestamp: string;
    events: TEvent[];
  };
}

const useTransactionDetails = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<ITransaction | null>(null);
  const [error, setError] = useState('');

  const fetchTransaction = async (hash: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await instance.get(`/cosmos/tx/v1beta1/txs/${hash}`);
      setTransaction(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.hash) {
      fetchTransaction(params.hash as string);
    }
  }, [params?.hash]);


  return {
    isLoading,
    transaction,
    error,
  }

}

export default useTransactionDetails;
