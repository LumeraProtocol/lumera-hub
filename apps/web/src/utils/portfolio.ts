import { RATE_VALUE } from '@/contants';
import { DENOM } from '@/contants/network';
import type { AccountInfoData, Coin } from '@/hooks/useAccountInfo';

const toMicroLume = (coin: Coin) => {
  if (coin.denom === DENOM) {
    return Number(coin.amount);
  }
  if (coin.denom === 'lume') {
    return Number(coin.amount) * RATE_VALUE;
  }
  return 0;
};

export const getPortfolioData = (accountInfo: AccountInfoData | null) => {
  if (!accountInfo) {
    return { stacked: 0, liquid: 0 };
  }

  return {
    stacked: accountInfo.delegations.reduce(
      (total, item) => total + toMicroLume(item.balance),
      0,
    ),
    liquid: accountInfo.balances.reduce(
      (total, balance) => total + toMicroLume(balance),
      0,
    ),
  };
};
