import { useEffect, useRef, useState } from 'react';

import * as instance from '@/utils/api';

/**
 * The chain head, polled for the shell's network panel.
 *
 * `useLatestBlocks` looks like the hook for this but only fetches when a
 * `validator` route param is present, so it is empty everywhere except the
 * validator detail page. The shell needs a height on every route.
 */
const useChainHead = (intervalMs = 6000) => {
  const [height, setHeight] = useState(0);
  const [reachable, setReachable] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        // Quiet: this is a 6s reachability poll, so a down host must only flip
        // `reachable`, not spam the app-wide error toast on every tick.
        const { data } = await instance.getQuiet('/cosmos/base/tendermint/v1beta1/blocks/latest');
        if (cancelled) return;
        const next = Number(data?.block?.header?.height) || 0;
        if (next) setHeight(next);
        setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
    };

    read();
    timer.current = setInterval(read, intervalMs);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [intervalMs]);

  return { height, reachable };
};

export default useChainHead;
