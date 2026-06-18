'use client'

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';
import { TRefer } from '@/types';

const useSnagReferralLink = (type = '') => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const { address } = useWalletConnect();
  const [referLinkInfo, setReferLinkInfo] = useState({
    referCode: '',
    point: '50',
    maxRefer: '10',
    totalClaim: 0,
  });
  const [refers, setRefers] = useState<TRefer[]>([]);
  const [isClaimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
    if (location?.search || address) {
      generateReferLink();
    }
  }, [location.search, address]);

  const generateReferLink = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const { data } = await instance.postExternal('/api/snag/refer-link', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        lumeraAddress: address,
        type,
      });
      if (data?.status) {
        setReferLinkInfo({
          referCode: data.referCode,
          point: data.point,
          maxRefer: data.maxRefer,
          totalClaim: data.totalClaim,
        });
        setRefers(data.refers)
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  const handleCopyReferLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Copied to clipboard.', {
      position: "bottom-right",
      theme: "dark",
    })
  }

  const handleClaim = async (userAddress: string, type: string) => {
    setClaimLoading(true);
    try {
      const { data } = await instance.postExternal('/api/snag/claim-refer', {
        userAddress,
        type,
      });
      if (data?.status) {
        generateReferLink();
      }
      toast.success('Reward claimed successfully!', {
        position: "bottom-right",
        theme: "dark",
      });
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
    referLinkInfo,
    address,
    refers,
    isClaimLoading,
    handleCopyReferLink,
    handleClaim,
  }
}

export default useSnagReferralLink;
