import { useState } from 'react';

import * as instance from '@/utils/api';

/**
 * 'tracked' — the server committed the connect. 'permanent-failure' — the
 * server deterministically rejected the payload (non-retryable 4xx), so
 * re-sending the same payload can only fail the same way. 'transient-failure'
 * — network trouble, rate limiting, or a server error worth retrying later.
 */
export type TrackingOutcome = 'tracked' | 'permanent-failure' | 'transient-failure';

const RETRYABLE_CLIENT_STATUSES = new Set([408, 425, 429]);

export const isPermanentTrackingFailure = (statusCode: unknown) =>
  typeof statusCode === 'number'
  && statusCode >= 400
  && statusCode < 500
  && !RETRYABLE_CLIENT_STATUSES.has(statusCode);

const useTrackingUser = () => {
  const [isLoading, setLoading] = useState(false);

  const trackingUser = async ({ address }: { address: string }): Promise<TrackingOutcome> => {
    setLoading(true);
    try {
      const referrer = sessionStorage.getItem('acquisitionSource');
      const referralCode = sessionStorage.getItem('referral_code');
      await instance.postExternal(`/api/admin/trackings/save-wallet-connect`, {
        address,
        acquisitionSource: referralCode ? 'referralCode' : referrer || 'Direct',
        referralCode,
      });
      return 'tracked';
    } catch (error) {
      // Tracking is best-effort. Next intercepts console.error in development,
      // so warn with the original details without opening its error overlay.
      console.warn('Wallet connection tracking failed:', error);
      const statusCode = (error as { statusCode?: number })?.statusCode;
      const isPermanent = isPermanentTrackingFailure(statusCode);
      return isPermanent ? 'permanent-failure' : 'transient-failure';
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
