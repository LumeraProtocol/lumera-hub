import { useState, useEffect } from 'react';
// import { toast } from 'react-toastify';

import * as instance from '@/utils/api';
import { RESPONSE_STATUS } from '@/contants/snag';

export interface IUserResponse {
  id: number;
  name: string;
  amount: number;
  config: string;
  lumeraAddress: string;
  snagAddress: string;
  content: string;
  loyaltyRuleId: string;
  userId: string;
  status: string;
  claims: string;
  created_at: string;
}

export const ITEM_PER_PAGE = 20;

const useSnagUserResponse = () => {
  const [isLoading, setLoading] = useState(false);
  const [userResponses, setUserResponses] = useState<IUserResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState(RESPONSE_STATUS[1].value);
  const [isActionLoading, setActionLoading] = useState(false);

  const fetchUserResponses = async (page = 1, inputKeyword = '', inputStatus = '') => {
    setLoading(true);
    try {
      const search = inputKeyword ? `&search=${inputKeyword}` : '';
      const statusFilter = inputStatus ? `&status=${inputStatus}` : '';
      const { data } = await instance.getExternal(`/api/admin/snag-user-responses?page=${page}&limit=${ITEM_PER_PAGE}${search}${statusFilter}`);
      setUserResponses(data.items);
      console.log('data.items', data.items)
      setTotalPages(data.pagination?.totalPages);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUserResponses(1, '', status);
  }, []);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected + 1);
    fetchUserResponses(selected + 1);
  }

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    fetchUserResponses(1, value, status);
  }

  const handleStatusChange = (value: string) => {
    setStatus(value);
    fetchUserResponses(1, keyword, value);
  }

  const handleResponseAction = async (id: number, userId: string, loyaltyRuleId: string, type: string) => {
    setActionLoading(true);
    const adminUserId = localStorage.getItem('adminUserId');
    try {
      await instance.postExternal('/api/admin/snag-user-response-action', {
        id,
        userId,
        loyaltyRuleId,
        type,
        adminUserId: Number(adminUserId),
      });
      fetchUserResponses(currentPage, keyword, status);
    } catch (error) {
      console.error(error)
    }
    setActionLoading(false);
  }

  return {
    isLoading,
    userResponses,
    currentPage,
    totalPages,
    keyword,
    status,
    pageSize: ITEM_PER_PAGE,
    isActionLoading,
    handlePageClick,
    handleSearchChange,
    handleStatusChange,
    handleResponseAction,
  }
}

export default useSnagUserResponse;
