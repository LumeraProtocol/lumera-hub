'use client'

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';

import * as instance from '@/utils/api';

const useSnagReferralLink = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [referLink, setReferLink] = useState('');

  useEffect(() => {
    if (window?.location?.search) {
      generateReferLink();
    }
  }, [window.location.search])

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
        setReferLink(data.referLink);
      }
    } catch (error) {
      console.error(error);
      toast.error((error as Error)?.message ||  'An unknown error occurred.', {
        position: "bottom-right",
        theme: "dark",
      });
    }
    setLoading(false);
  }

  const handleCopyReferLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast('Copied to clipboard.', {
      position: "bottom-right",
      theme: "dark",
    })
  }

  return {
    isLoading,
    referLink,
    handleCopyReferLink,
  }
}

export default useSnagReferralLink;
