'use client'

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';

import * as instance from '@/utils/api';
import useWalletConnect from '@/hooks/useWalletConnect';

const useSnagReferralLink = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const { address } = useWalletConnect();
  const [referLinkInfo, setReferLinkInfo] = useState({
    referCode: '',
    point: '50',
    maxRefer: '10',
  });

  useEffect(() => {
    if (location?.search) {
      generateReferLink();
    }
  }, [location.search])

  const generateReferLink = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const { data } = await instance.postExternal('/api/snag/refer-link', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
      });
      if (data?.status) {
        setReferLinkInfo(data);
      }
    } catch (error) {
      console.error(error);
      // toast.error((error as Error)?.message ||  'An unknown error occurred.', {
      //   position: "bottom-right",
      //   theme: "dark",
      // });
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

  return {
    isLoading,
    referLinkInfo,
    address,
    handleCopyReferLink,
  }
}

export default useSnagReferralLink;
