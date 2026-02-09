import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export interface IWallet {
  total: number;
  new: number;
}

const useWallet = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<IWallet>({
    total: 0,
    new: 0,
  });

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/summary/wallet?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate)}`);
      setWallets({
        total: data?.total || 0,
        new: data?.new || 0,
      });
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWallets();
  }, [startDate, endDate]);
  return {
    isLoading,
    wallets,
  }
}

export default useWallet;
