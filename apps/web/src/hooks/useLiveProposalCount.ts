import { useEffect, useState } from 'react';

import * as instance from '@/utils/api';

/**
 * How many proposals are open for voting right now.
 *
 * Read with `count_total` and a single row rather than by listing proposals
 * and filtering, so the sidebar badge costs one small request no matter how
 * long the chain's governance history gets.
 */
const useLiveProposalCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        // Quiet: a background badge poll whose failure is already handled below
        // (the count stays as-is) must not raise the app-wide error toast.
        const { data } = await instance.getQuiet(
          '/cosmos/gov/v1/proposals?proposal_status=PROPOSAL_STATUS_VOTING_PERIOD&pagination.count_total=true&pagination.limit=1',
        );
        if (cancelled) return;
        const total = Number(data?.pagination?.total);
        setCount(Number.isFinite(total) ? total : 0);
      } catch {
        // No badge is better than a wrong one.
      }
    };

    void read();
    const timer = setInterval(() => {
      if (!document.hidden) void read();
    }, 120000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return count;
};

export default useLiveProposalCount;
