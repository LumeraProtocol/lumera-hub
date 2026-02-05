// hooks/useTracking.ts
import { useState } from 'react';

import { ActionType } from '@/types/ActionType';
import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';

interface ITracking {
  actionType: ActionType;
  txHash?: string;
  taskID?: string;
  walletAdress?: string;
}

const useTracking = () => {
  const { address } = useSelector((state) => state.wallet);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const trackQualifyingAction = async (option: ITracking) => {
    if (!option?.walletAdress && !address) {
      setError('Please connect wallet.')
      return;
    }
    if (!option?.actionType) {
      setError('Action type is required.')
      return;
    }
    setLoading(true);
    try {
      const { data } = await instance.postExternal('/api/track', {
        wallet_address: option?.walletAdress || address,
        action_type: option.actionType,
        timestamp: Math.floor(Date.now() / 1000),
        tx_hash: option?.txHash,
        task_id: option?.taskID,
      });
      setResult(data);
    } catch (error) {
      setError((error as Error).message);
    }
    setLoading(false);
  }

  return {
    isLoading,
    error,
    result,
    trackQualifyingAction,
  }
}

export default useTracking;
