import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { Coin } from '@/hooks/useAccountInfo';
import { DENOM } from '@/contants/network';
import { formatCommissionRate, formatTokens, formatToken } from '@/utils/format';

let timeout: number | null = null;

const useStats = () => {
  const [isLoading, setLoading] = useState(false);
  const [isLatestBlockLoading, setLatestBlockLoading] = useState(false);
  const [latestBlock, setLatestBlock] = useState({
    height: 0,
    validators: 0,
  });
  const [stats, setStats] = useState({
    supply: '0',
    bondedTokens: '0',
    inflation: '0',
    communityPool: '0',
  });

  const getLatestBlock = async (useLoading = true) => {
    if (useLoading) {
      setLatestBlockLoading(true);
    }
    try {
      const { data } = await instance.get('/cosmos/base/tendermint/v1beta1/blocks/latest');
      setLatestBlock({
        height: data?.block?.header?.height || 0,
        validators: data?.block?.last_commit?.signatures.length || 0,
      })
    } catch (error) {
      console.error(error);
    }
    if (useLoading) {
      setLatestBlockLoading(false);
    }
  }

  const getStats = async () => {
    setLoading(true);
    try {
      const [inflationRes, communityPoolRes, poolRes, supplyRes] = await Promise.all([
        instance.get('/cosmos/mint/v1beta1/inflation'),
        instance.get('/cosmos/distribution/v1beta1/community_pool'),
        instance.get('/cosmos/staking/v1beta1/pool'),
        instance.get('/cosmos/bank/v1beta1/supply/by_denom?denom=ulume'),
      ]);
      const communityPool = communityPoolRes?.data?.pool?.filter((item: Coin) => item.denom === DENOM)
      setStats({
        supply: formatToken({
          amount: supplyRes?.data?.amount?.amount,
          denom: supplyRes?.data?.amount?.denom,
        }, false),
        bondedTokens: formatToken({
          amount: poolRes?.data?.pool?.bonded_tokens,
          denom: DENOM,
        }, false),
        inflation: formatCommissionRate(inflationRes?.data?.inflation || 0),
        communityPool: formatTokens(communityPool || [], false, '0.0a'),
      });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    getStats();
    getLatestBlock();

    timeout = setInterval(() => {
      getLatestBlock(false);
    }, 5000);

    return () => {
      if (timeout) {
        clearInterval(timeout);
      }
    }
  }, []);

  return {
    isLoading,
    stats,
    isLatestBlockLoading,
    latestBlock,
  }
}

export default useStats;
