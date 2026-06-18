import { useState } from 'react';

import * as instance from '@/utils/api';

const useTrackingUser = () => {
  const [isLoading, setLoading] = useState(false);

  const trackingUser = async ({ address }: { address: string }) => {
    setLoading(true);
    try {
      const referrer = sessionStorage.getItem('acquisitionSource');
      const referralCode = sessionStorage.getItem('referral_code');
      await instance.postExternal(`/api/admin/trackings/save-wallet-connect`, {
        address,
        acquisitionSource: referralCode ? 'referralCode' : referrer || 'Direct',
        referralCode,
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
