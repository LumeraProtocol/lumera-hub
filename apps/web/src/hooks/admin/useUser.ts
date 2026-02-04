import { useState, useEffect } from 'react';
// import { toast } from 'react-toastify';

import * as instance from '@/utils/api';

export interface IUser {
  id: number;
  email: string;
  fullName: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export const ITEM_PER_PAGE = 20;

const useUser = () => {
  const [isLoading, setLoading] = useState(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');

  const fetchUsers = async (page = 1, val = '') => {
    setLoading(true);
    try {
      const param = val ? `&search=${val}` : '';
      const { data } = await instance.getExternal(`/api/admin/users?page=${page}&limit=${ITEM_PER_PAGE}${param}`);
      setUsers(data.items);
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
    fetchUsers();
  }, []);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected + 1);
    fetchUsers(selected + 1);
  }

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    fetchUsers(1, value);
  }

  return {
    isLoading,
    users,
    currentPage,
    totalPages,
    keyword,
    pageSize: ITEM_PER_PAGE,
    handlePageClick,
    handleSearchChange,
  }
}

export default useUser;
