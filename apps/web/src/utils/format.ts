import numeral from 'numeral';

import { CHAIN_NAME } from '@/contants/network';
import { getChains } from '@/utils/helpers';

export const formatNumber = (
  total: number | string,
  options: { decimalsLength?: number; currency?: string; divideToAmount?: boolean } = {
    decimalsLength: 2,
    currency: 'en-US',
    divideToAmount: false,
  },
  prefix = '',
) => {
  const totalToNumber = Number(total);
  const value = options.divideToAmount ? totalToNumber / 100000000 : totalToNumber;
  const valueString = value.toLocaleString(options.currency, {
    minimumFractionDigits: options.decimalsLength,
    maximumFractionDigits: options.decimalsLength,
  });
  return `${prefix}${valueString}`;
};

export const formatAddress = (address: string, length = 20, endLength = -6): string => {
  return `${address.substr(0, length)}...${address.substr(endLength)}`;
};

const findGlobalAssetConfig = (denom: string) => {
  const { assetLists } = getChains();
  const lumeraAssets = assetLists.find(({chainName})=> chainName === CHAIN_NAME);

  if (lumeraAssets) {
    const conf = lumeraAssets.assets.find(a => a.base === denom)
    if(conf) {
      return conf
    }
  }
  return undefined
}

export const formatToken = (
  token?: { denom: string; amount: string },
  withDenom = true,
  fmt = '0,0.[0]',
) => {
  if (token && token.amount && token?.denom) {
    let amount = Number(token.amount);
    let denom = token.denom;
    const conf = findGlobalAssetConfig(token.denom);
    if (conf) {
      let unit = { exponent: 0, denom: '' };
      // find the max exponent for display
      conf.denomUnits.forEach((x) => {
        if (x.exponent >= unit.exponent) {
          unit = x;
        }
      });
      if (unit && unit.exponent > 0) {
        amount = amount / Math.pow(10, unit.exponent || 6);
        denom = unit.denom.toUpperCase();
      }
    }
    if(amount < 0.000001) {
      return `0${withDenom ? ' ' + denom.substring(0, 10) : ''}`;
    }
    if(amount < 0.01) {
      fmt = '0.[000000]';
    }
    return `${numeral(amount).format(fmt)}${
      withDenom ? ' ' + denom.substring(0, 10) : ''
    }`;
  }
  return '-';
}

export const formatCommissionRate = (rate?: string) => {
  if (!rate) return '-';
  return numeral(rate).format('0.[00]%');
}

export const percent = (decimal?: string | number) => {
  return decimal ? numeral(decimal).format('0.[00]%') : '-';
}

export const formatTokens = (
    tokens?: { denom: string; amount: string }[],
    withDenom = true,
    fmt = '0.[000000]'
  ) => {
  if (!tokens) return '';
  return tokens.map((x) => formatToken(x, withDenom, fmt)).join(', ');
}

/**
 * Formats a token value for display purposes in the UI.
 * Unlike the base `formatToken` function, which uses a fixed format,
 * this function adaptively adjusts decimal precision based on the token value magnitude
 * for better readability (e.g., fewer decimals for large values like 1,000,000 TOKEN → "1M TOKEN",
 * more for small values like 0.000001 TOKEN → "0.000001 TOKEN").
 * It supports optional denom display and custom format strings (e.g., via numeral.js).
 *
 * @param token - The token object with denom and amount. If omitted, returns empty string.
 * @param withDenom - Whether to include the denom in the output (default: false).
 * @param fmt - The format string for number formatting (default: '0,0.[000000]' for up to 6 decimals).
 * @returns The formatted string for display, e.g., "1,234.56" or "1,234.56 ust".
 */
export const formatTokenDisplay = (
  token?: { denom: string; amount: string },
  withDenom = false,
  fmt = '0,0.[000000]',
) => {
  if (!token) {
    return '--';
  }

  const tokens = formatToken({
    amount: token.amount,
    denom: token.denom,
  }, false, fmt);
  const value = Number(tokens.replaceAll(',', ''));

  let result = tokens;
  if (value > 10000000) {
    result = formatToken({
      amount: token.amount,
      denom: token.denom,
    }, withDenom, '0,0.[0]');
  } else if (value > 1000000) {
    result = formatToken({
      amount: token.amount,
      denom: token.denom,
    }, withDenom, '0,0.[00]');
  } else if (value > 100000) {
    result = formatToken({
      amount: token.amount,
      denom: token.denom,
    }, withDenom, '0,0.[000]');
  } else if (value > 10000) {
    result = formatToken({
      amount: token.amount,
      denom: token.denom,
    }, withDenom, '0,0.[000]');
  } else if (value > 1000) {
    result = formatToken({
      amount: token.amount,
      denom: token.denom,
    }, withDenom, '0,0.[0000]');
  } else if (value > 100) {
    result = formatToken({
      amount: token.amount,
      denom: token.denom,
    }, withDenom, '0,0.[00000]');
  }

  return result;
}
