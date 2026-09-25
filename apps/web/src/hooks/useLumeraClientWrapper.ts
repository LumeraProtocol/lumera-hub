/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from 'react';

let cachedModule: any = null;
let inFlight: Promise<any> | null = null;

/**
 * Loads the Lumera SDK on demand.
 *
 * The SDK is roughly ten megabytes of JavaScript and WASM. Cascade used to
 * block its entire page on that download, so every visitor — including one
 * with no wallet, who cannot use the drive at all — waited half a minute
 * looking at "Downloading the Lumera SDK…" before seeing a single figure.
 *
 * Nothing on the page needs it except uploading and downloading files. Passing
 * `enabled: false` renders everything else immediately and defers the download
 * until it is actually going to be used.
 *
 * The module is cached across mounts, and concurrent callers share one import
 * rather than each starting their own.
 */
export function useLumeraClientWrapper(enabled = true) {
  const [module, setModule] = useState<any>(cachedModule);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (cachedModule) {
      setModule(cachedModule);
      return cachedModule;
    }
    if (typeof window === 'undefined') return null;
    setLoading(true);
    try {
      inFlight ??= import('sdk-js-react');
      const imported = await inFlight;
      cachedModule = imported;
      // Clear any error from a previous failed attempt, or a later success is
      // reported with isLoaded:false and the Cascade UI stays gated on sdkError.
      setError(null);
      setModule(imported);
      return imported;
    } catch (err) {
      inFlight = null;
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || cachedModule) return;
    void load();
  }, [enabled, load]);

  return {
    module,
    isLoaded: !!module && !error,
    isLoading,
    error,
    /** Start the download now, for an action that is about to need it. */
    load,
  };
}
