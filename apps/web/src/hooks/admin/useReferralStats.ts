import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import * as instance from '@/utils/api';

interface ISnagUser {
  lumeraAddress: string;
  snagAddress: number;
  created_at: string;
}

type TRefer = {
  lumeraAddress: string;
  referAddress: string;
  claim: number;
  claimCascade: number;
}

interface ISnagUserRefer {
  [key: string]: TRefer[];
}

interface ISnagUserReferResponse {
  lumeraAddress: string;
  referAddress: string;
}

export const ITEM_PER_PAGE = 20;

const useReferralStats = () => {
  const [isLoading, setLoading] = useState(false);
  const [snagUser, setSnagUser] = useState<ISnagUser[]>([]);
  const [refers, setRefers] = useState<ISnagUserRefer>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isClaimLoading, setClaimLoading] = useState(false);
  const [maxRefer, setMaxRefer] = useState(10);

  const fetchReferralStats = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/referral-stats?page=${page}&limit=${ITEM_PER_PAGE}`);
      setSnagUser(data.items);
      setMaxRefer(data.maxRefer);
      setTotalPages(data.pagination?.totalPages);
      const refers: ISnagUserReferResponse[] = data.refers;
      if (refers?.length) {
        for (const item of data.items) {
          const currentRefers = refers.filter((r) => r.referAddress === item.lumeraAddress);
          if (currentRefers.length) {
            setRefers((prev) => ({
              ...prev,
              [item.lumeraAddress]: currentRefers,
            }))
          }
        }
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReferralStats(1);
  }, []);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected + 1);
    fetchReferralStats(selected + 1);
  }

  const handleClaim = async (userAddress: string, type: string) => {
    setClaimLoading(true);
    try {
      const { data } = await instance.postExternal('/api/snag/claim-refer', {
        userAddress,
        type,
      });
      if (data?.status) {
        fetchReferralStats();
      }
    } catch (error) {
      console.error(error);
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setClaimLoading(false);
  }

  return {
    isLoading,
    snagUser,
    currentPage,
    totalPages,
    pageSize: ITEM_PER_PAGE,
    refers,
    maxRefer,
    isClaimLoading,
    handleClaim,
    handlePageClick,
  }
}

export default useReferralStats;
