import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { useChain } from '@interchain-kit/react';
import { useRouter } from 'next/navigation';

import * as instance from '@/utils/api';
import { CHAIN_NAME } from '@/contants/network';

const useSnag = () => {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const { address } = useChain(CHAIN_NAME);

  const saveWalletConnect = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const walletAddress = params.get('walletAddress');
      await instance.postExternal('/api/snag/save-user', {
        lumeraAddress: address,
        snagAddress: walletAddress,
      });
      toast.success("Wallet connected!", {
        position: "bottom-right",
        theme: "dark",
      });
      router.push('/');
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
    if (address) {
      saveWalletConnect();
    }
  }, [address]);

  return {
    isLoading,
  }
}

export default useSnag;
