/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';

let cachedModule: any = null;

export function useLumeraClientWrapper() {
  const [module, setModule] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadSDK = async () => {
      if (cachedModule) {
        setModule(cachedModule);
        return;
      }

      try {
        const importedModule = await import('react-lumera-sdk');
        cachedModule = importedModule;
        setModule(importedModule);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    loadSDK();
  }, []);

  const isLoaded = !!module && !error;

  return { module, isLoaded, error };
}
