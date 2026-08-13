import { WCWallet } from '@interchain-kit/core';

type WalletConnectOptions = ConstructorParameters<typeof WCWallet>[1];

export class IdempotentWCWallet extends WCWallet {
  private initialization: Promise<void> | null = null;

  override init(): Promise<void> {
    if (!this.initialization) {
      this.initialization = super.init().catch((error) => {
        this.initialization = null;
        throw error;
      });
    }

    return this.initialization;
  }
}

type WalletConnectGlobal = typeof globalThis & {
  __lumeraHubWalletConnect?: IdempotentWCWallet;
};

export const getWalletConnectWallet = (
  options: WalletConnectOptions,
): IdempotentWCWallet => {
  const globalState = globalThis as WalletConnectGlobal;
  if (!globalState.__lumeraHubWalletConnect) {
    globalState.__lumeraHubWalletConnect = new IdempotentWCWallet(undefined, options);
  }

  return globalState.__lumeraHubWalletConnect;
};
