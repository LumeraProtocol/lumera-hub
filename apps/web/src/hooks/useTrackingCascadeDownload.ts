import { useState } from 'react';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';

const useTrackingCascadeDownload = () => {
  const { address } = useWalletConnect();
  const [isLoading, setLoading] = useState(false);

  const trackingCascadeDownload = async ({ actionID, fileType }: { actionID: string; fileType: string }) => {
    setLoading(true);
    try {
      await instance.postExternal(`/api/admin/tracking-cascade-download`, {
        address,
        action_id: actionID,
        file_type: fileType,
      });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  return {
    isLoading,
    trackingCascadeDownload,
  }
}

export default useTrackingCascadeDownload;
