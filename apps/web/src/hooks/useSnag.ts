'use client'

import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { useChain } from '@interchain-kit/react';
import { useRouter } from 'next/navigation';

import * as instance from '@/utils/api';
import { CHAIN_NAME } from '@/contants/network';

const useSnag = () => {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
    const { address, status } = useChain(CHAIN_NAME);
  const [isClick, setClick] = useState(false);

  const saveWalletConnect = async () => {
    if (!isClick) {
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const walletAddress = params.get('walletAddress');
      if (walletAddress) {
        await instance.postExternal('/api/snag/save-user', {
          lumeraAddress: address,
          snagAddress: walletAddress,
        });
        toast.success("Wallet connected!", {
          position: "bottom-right",
          theme: "dark",
        });
        router.push('/');
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

  useEffect(() => {
    const btn = document.querySelector('#connectWallet');
    btn?.addEventListener('click', () => {
      setClick(true);
    });
    if (address && status === 'Connected') {
      saveWalletConnect();
    }
  }, [address, status]);

  return {
    isLoading,
  }
}

export default useSnag;
