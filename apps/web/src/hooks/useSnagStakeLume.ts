'use client'

import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';

import * as instance from '@/utils/api';

const useSnagStakeLume = () => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setLoading] = useState(true);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });

  useEffect(() => {
    if (window?.location?.search) {
      verifyTransactions();
    }
  }, [window.location.search])

  const verifyTransactions = async () => {
    setLoading(true);
    setMessage({
      type: '',
      content: '',
    });

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      await instance.postExternal('/api/snag/stake-lume-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
      });
      toast.success("Quest is verified!", {
        position: "bottom-right",
        theme: "dark",
      });
      setMessage({
        type: 'success',
        content: "Quest is verified!",
      });
      router.push('/');
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        content: (error as Error)?.message ||  'An unknown error occurred.',
      });
    }
    setLoading(false);
  }

  return {
    isLoading,
    message,
  }
}

export default useSnagStakeLume;
