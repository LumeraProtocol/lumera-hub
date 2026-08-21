import { useMemo, useRef } from 'react';

/**
 * Shared stale-async guard for data hooks.
 *
 * `begin()` starts a new request generation and supersedes all earlier ones;
 * a settling request calls `isCurrent(token)` before touching state so a
 * slower, older response can never overwrite a newer one. `invalidate()`
 * cancels every outstanding generation — call it from effect cleanup so
 * unmounts and dependency changes drop in-flight responses.
 *
 * The returned object is referentially stable, so it is safe to list in
 * dependency arrays.
 */
const useLatestRequest = () => {
  const sequenceRef = useRef(0);

  return useMemo(() => ({
    begin: () => {
      sequenceRef.current += 1;
      return sequenceRef.current;
    },
    isCurrent: (token: number) => token === sequenceRef.current,
    invalidate: () => {
      sequenceRef.current += 1;
    },
  }), []);
};

export default useLatestRequest;
