// src/types/window.d.ts

import { OfflineSigner } from '@cosmjs/proto-signing';

interface Keplr {
  enable(chainId: string): Promise<void>;
  getOfflineSigner(chainId: string): OfflineSigner;
}

export interface Eip1193Provider {
  isMetaMask?: boolean;
  providers?: Eip1193Provider[];
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    keplr?: Keplr;
    ethereum?: Eip1193Provider;
  }
}

export {};
