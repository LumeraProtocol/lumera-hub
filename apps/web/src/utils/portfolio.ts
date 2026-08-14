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

export const getAvailableBalances = (accountInfo: AccountInfoData | null) =>
  (accountInfo?.balances || []).reduce((total, coin) => total + toMicroLume(coin), 0);

export const getDelegations = (accountInfo: AccountInfoData | null) =>
  (accountInfo?.delegations || []).reduce((total, item) => total + toMicroLume(item.balance), 0);

export const getRewards = (accountInfo: AccountInfoData | null) =>
  (accountInfo?.rewards || []).reduce(
    (total, item) => total + item.reward.reduce((sum, coin) => sum + toMicroLume(coin), 0),
    0,
  );

export const getUnbonding = (accountInfo: AccountInfoData | null) =>
  (accountInfo?.unbonding || []).reduce(
    (total, item) => total + item.entries.reduce((sum, entry) => sum + Number(entry.balance), 0),
    0,
  );

export const getTotalBalances = (accountInfo: AccountInfoData | null) =>
  getAvailableBalances(accountInfo) + getDelegations(accountInfo);

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
