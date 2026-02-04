import { useState, useEffect } from 'react';
// import { toast } from 'react-toastify';

import * as instance from '@/utils/api';

export interface IWallet {
  id: number;
  address: string;
  first_connected: number;
  last_action_timestamp: number;
}

export const ITEM_PER_PAGE = 20;

const useWallet = () => {
  const [isLoading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<IWallet[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');

  const fetchWallets = async (page = 1, val = '') => {
    setLoading(true);
    try {
      const param = val ? `&search=${val}` : '';
      const { data } = await instance.getExternal(`/api/admin/wallets?page=${page}&limit=${ITEM_PER_PAGE}${param}`);
      setWallets(data.items);
      setTotalPages(data.pagination?.totalPages);
    } catch (error) {
      console.error(error)
      // toast.error((error as Error)?.message ||  'An unknown error occurred.', {
      //   position: "bottom-right",
      //   theme: "dark",
      // });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWallets();
  }, []);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected + 1);
    fetchWallets(selected + 1);
  }

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    fetchWallets(1, value);
  }

  return {
    isLoading,
    wallets,
    currentPage,
    totalPages,
    keyword,
    pageSize: ITEM_PER_PAGE,
    handlePageClick,
    handleSearchChange,
  }
}

export default useWallet;
