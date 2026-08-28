import { useState } from 'react';

import * as instance from '@/utils/api';

interface IPayload {
  hash: string;
  message_type: string;
  creator: string;
  price: number;
}

const useTrackingHubTransaction = () => {
  const [isLoading, setLoading] = useState(false);

  const trackingHubTransaction = async ({ hash, message_type, creator, price }: IPayload) => {
    setLoading(true);
    try {
      await instance.postExternal(`/api/admin/trackings/save-hub-transaction`, {
        hash,
        message_type,
        creator,
        price,
      });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  return {
    isLoading,
    trackingHubTransaction,
  }
}

export default useTrackingHubTransaction;
