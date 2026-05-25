'use client'

import { useState } from "react";
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';

import * as instance from '@/utils/api';

const useSnagUptime = () => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });
  const [address, setAddress] = useState('');

  const verifySupernode = async () => {
    setLoading(true);
    setMessage({
      type: '',
      content: '',
    });
    if (!address) {
      setMessage({
        type: 'error',
        content: 'The Supernode address is required.',
      });
      return;
    }
    if (address.length < 20 || address.length > 70) {
      setMessage({
        type: 'error',
        content: 'The Supernode address is invalid.',
      });
      return;
    }
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      await instance.postExternal('/api/snag/uptime-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        address,
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
    address,
    setAddress,
    verifySupernode,
  }
}

export default useSnagUptime;
