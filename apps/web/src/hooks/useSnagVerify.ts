'use client'

import { useState } from "react";
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';

import * as instance from '@/utils/api';

const useSnagVerify = () => {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });
  const [txHash, setTxhash] = useState('');

  const verifyClaimTokens = async () => {
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
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      await instance.postExternal('/api/snag/claim-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
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

  const verifyDelegateTokens = async () => {
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
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      await instance.postExternal('/api/snag/delegate-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
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

  const verifyRedelegateTokens = async () => {
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
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      await instance.postExternal('/api/snag/redelegate-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
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

  const verifySendTokens = async () => {
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
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      await instance.postExternal('/api/snag/send-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
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

  const verifyFirstTimeDelegation  = async () => {
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
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      await instance.postExternal('/api/snag/first-time-delegation-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
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

  const verifyClaimRewards = async () => {
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
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      const parseTxHash = txHash.split('/');
      await instance.postExternal('/api/snag/claim-rewards-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        txHash: parseTxHash[parseTxHash.length - 1],
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

  return {
    isLoading,
    message,
    txHash,
    setTxhash,
    verifyClaimTokens,
    verifyDelegateTokens,
    verifyRedelegateTokens,
    verifySendTokens,
    verifyFirstTimeDelegation,
    verifyClaimRewards,
  }
}

export default useSnagVerify;
