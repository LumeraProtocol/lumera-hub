'use client'

import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';

import * as instance from '@/utils/api';

const useSnagStake = () => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setLoading] = useState(true);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  })

  const verifyStaked = async () => {
    setLoading(true);
    setMessage({
      type: '',
      content: '',
    });
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      await instance.postExternal('/api/snag/stake-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || ''
      });
      toast.success("Quest is verified!", {
        position: "bottom-right",
        theme: "dark",
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

  useEffect(() => {
    verifyStaked();
  }, []);

  return {
    isLoading,
    message,
  }
}

export default useSnagStake;
