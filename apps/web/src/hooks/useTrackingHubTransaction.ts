import * as instance from '@/utils/api';

interface IPayload {
  hash: string;
  message_type: string;
  creator: string;
  price: number;
}

/**
 * Records a signed transaction for the hub's own analytics.
 *
 * Best-effort, and deliberately not awaited. Every call site sits between a
 * broadcast and the next step of a multi-message flow — a redelegation
 * withdraws rewards, records, then redelegates — so awaiting telemetry there
 * makes the user's transaction wait on an analytics endpoint. It returns
 * immediately and reports in the background; the ten `await`s at the call
 * sites are harmless no-ops.
 *
 * The endpoint needs a database, so a deployment without one answers 500 on
 * every signature. That must stay invisible: the transaction succeeded. The
 * request is quiet, so no global toast, and the failure is warned rather than
 * console.error'd, because Next turns console.error into its error overlay —
 * which is how a redelegation that worked ended up showing an error dialog.
 */
const useTrackingHubTransaction = () => {
  const trackingHubTransaction = async ({ hash, message_type, creator, price }: IPayload) => {
    void instance
      .postExternalQuiet('/api/admin/trackings/save-hub-transaction', {
        hash,
        message_type,
        creator,
        price,
      })
      .catch((error) => {
        console.warn('Hub transaction tracking failed:', error);
      });
  };

  return {
    isLoading: false,
    trackingHubTransaction,
  };
};

export default useTrackingHubTransaction;
