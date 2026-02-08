import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';

export interface IWallet {
  id: number;
  address: string;
  first_connected: number;
  last_action_timestamp: number;
  last_action_type: string;
  last_tx_hash: string;
}

export const ITEM_PER_PAGE = 20;

const useAction = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchWallets = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/trackings?page=${page}&limit=${ITEM_PER_PAGE}&startDate=${dayjs(startDate)}&endDate=${dayjs(endDate || startDate)}`);
      setWallets(data.items);
      setTotalPages(data.pagination?.totalPages);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWallets();
  }, [startDate, endDate]);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected + 1);
    fetchWallets(selected + 1);
  }

  return {
    isLoading,
    wallets,
    currentPage,
    totalPages,
    pageSize: ITEM_PER_PAGE,
    handlePageClick,
  }
}

export default useAction;
