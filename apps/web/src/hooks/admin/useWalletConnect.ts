import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';

export interface IWallet {
  date: string;
  total:number;
}

export interface IAcquisitionSource {
  refer: string;
  total: number;
}

const useWalletConnect = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isWalletConnectSummaryLoading, setWalletConnectSummaryLoading] = useState(false);
  const [walletConnectSummary, setWalletConnectSummary] = useState<IWallet[]>([]);
  const [acquisitionSources, setAcquisitionSources] = useState<IAcquisitionSource[]>([]);
  const [newWalletConnect, setNewWalletConnect] = useState(0);
  const [activatedWallets, setActivatedWallets] = useState(0);

  const fetchTrachkingForChart = async () => {
    setWalletConnectSummaryLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/trackings/get-wallet-connect?startDate=${dayjs(startDate).toISOString()}&endDate=${dayjs(endDate).toISOString()}`);
      setWalletConnectSummary(data.items);
      setNewWalletConnect(data.totalNewAddress);
      setActivatedWallets(data.activatedWallets);
      setAcquisitionSources(data.acquisitionSources);
    } catch (error) {
      console.error(error)
    }
    setWalletConnectSummaryLoading(false);
  }

  useEffect(() => {
    fetchTrachkingForChart();
  }, [startDate, endDate]);

  return {
    isWalletConnectSummaryLoading,
    newWalletConnect,
    activatedWallets,
    walletConnectSummary,
    acquisitionSources,
  }
}

export default useWalletConnect;
