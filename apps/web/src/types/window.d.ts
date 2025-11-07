// src/types/window.d.ts

import { OfflineSigner } from '@cosmjs/proto-signing';

interface Keplr {
  enable(chainId: string): Promise<void>;
  getOfflineSigner(chainId: string): OfflineSigner;
}

interface Leap {
  enable(chainId: string): Promise<void>;
  getOfflineSigner(chainId: string): OfflineSigner;
}

declare global {
  interface Window {
    keplr?: Keplr;
    leap?: Leap;
  }
}

export {};