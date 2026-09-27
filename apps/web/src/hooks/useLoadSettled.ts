'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * True once a fetch keyed to `key` has run to completion at least once.
 *
 * useAccountInfo starts with empty arrays and `loading` false, so "holds
 * nothing" and "has not been read yet" look the same on the first render. This
 * tells them apart by waiting for loading to go up and come back down, and
 * starts over whenever the key — the address — changes.
 */
const useLoadSettled = (loading: boolean, key: string) => {
  const [settled, setSettled] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    seen.current = false;
    setSettled(false);
  }, [key]);

  useEffect(() => {
    if (loading) seen.current = true;
    else if (seen.current) setSettled(true);
  }, [loading]);

  return settled;
};

export default useLoadSettled;
