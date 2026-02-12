import { useState } from 'react';

import * as instance from '@/utils/api';

const useTrackingUser = () => {
  const [isLoading, setLoading] = useState(false);

  const trackingUser = async ({ address }: { address: string }) => {
    setLoading(true);
    try {
      await instance.postExternal(`/api/admin/tracking-hub-user-connect`, {
        address,
      });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  return {
    isLoading,
    trackingUser,
  }
}

export default useTrackingUser;
