// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useLatestRequest from './useLatestRequest';

describe('useLatestRequest', () => {
  it('treats the most recently begun request as current', () => {
    const { result } = renderHook(() => useLatestRequest());

    const first = result.current.begin();
    expect(result.current.isCurrent(first)).toBe(true);

    const second = result.current.begin();
    expect(result.current.isCurrent(first)).toBe(false);
    expect(result.current.isCurrent(second)).toBe(true);
  });

  it('invalidates every outstanding request', () => {
    const { result } = renderHook(() => useLatestRequest());

    const token = result.current.begin();
    result.current.invalidate();

    expect(result.current.isCurrent(token)).toBe(false);
  });

  it('keeps a stable identity across re-renders so it is safe in dependency arrays', () => {
    const { result, rerender } = renderHook(() => useLatestRequest());
    const firstIdentity = result.current;

    rerender();

    expect(result.current).toBe(firstIdentity);
  });
});
