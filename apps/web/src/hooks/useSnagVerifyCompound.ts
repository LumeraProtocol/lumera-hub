'use client'

import { useState } from "react";
import { toast } from 'react-toastify';
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';

const useSnagVerifyCompound = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });
  const [txHash, setTxhash] = useState('');
  const [claimTxHash, setClaimTxhash] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const verifyClaimCompound = async () => {
    setLoading(true);
    setMessage({
      type: '',
      content: '',
    });
    if (!txHash) {
      setMessage({
        type: 'error',
        content: 'The transaction link is required.',
      });
      return;
    }
    if (!claimTxHash) {
      setMessage({
        type: 'error',
        content: 'The transaction link is required.',
      });
      return;
    }
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      const parseClaimTxHash = claimTxHash.split('/');
      await instance.postExternal('/api/snag/compound-rewards-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
        claimTxHash: parseClaimTxHash[parseClaimTxHash.length - 1],
      });
      toast.success("Quest is verified!", {
        position: "bottom-right",
        theme: "dark",
      });
      setMessage({
        type: 'success',
        content: "Quest is verified!",
      });
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
    txHash,
    claimTxHash,
    isVerified,
    setIsVerified,
    setClaimTxhash,
    setTxhash,
    verifyClaimCompound,
  }
}

export default useSnagVerifyCompound;
