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
      return true;
    } catch (error) {
      // Tracking is best-effort. Next intercepts console.error in development,
      // so warn with the original details without opening its error overlay.
      console.warn('Wallet connection tracking failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    isLoading,
    trackingUser,
  }
}

export default useTrackingUser;
