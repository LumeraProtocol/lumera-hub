import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';

/**
 * Records a download for the hub's own analytics.
 *
 * Best-effort and not awaited, like the transaction tracker beside it: the
 * file has already been retrieved by the time this runs, so nothing the user
 * is waiting for should depend on it. The endpoint needs a database, so a
 * deployment without one answers 500 every time — quiet, and warned rather
 * than console.error'd, because Next renders console.error as its error
 * overlay.
 */
const useTrackingCascadeDownload = () => {
  const { address } = useWalletConnect();

  const trackingCascadeDownload = async ({
    actionID,
    fileType,
  }: {
    actionID: string;
    fileType: string;
  }) => {
    void instance
      .postExternalQuiet('/api/admin/trackings/save-cascade-download', {
        address,
        action_id: actionID,
        file_type: fileType,
      })
      .catch((error) => {
        console.warn('Cascade download tracking failed:', error);
      });
  };

  return {
    isLoading: false,
    trackingCascadeDownload,
  }
}

export default useTrackingCascadeDownload;
