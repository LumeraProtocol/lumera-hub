/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';

export interface IQuest {
  id: string,
  name: string,
  description: string,
  config: string,
  amount: number,
}

export interface IResponse {
  id: number,
  loyaltyRuleId: string,
  status: string,
  content: string,
}

const useSnagTextInput = (callBack?: () => void) => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    content: '',
  });
  const [content, setContent] = useState('');
  const [quest, setQuest] = useState<IQuest | null>(null);
  const [response, setResponse] = useState<IResponse | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const getQuest = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      if (!walletAddress || !params?.loyaltyRuleID) {
        setLoading(false);
        return;
      }
      const { data } = await instance.postExternal('/api/snag/get-quest', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
      });
      setQuest(data.loyaltyRule);
      setResponse(data.response);
       const config = data?.loyaltyRule?.config ? JSON.parse(data?.loyaltyRule.config) : null;
      if (data?.response?.content && config && Number(config.textInput.maximumRewardClaims) <= 1) {
        setContent(data.response.content);
      }
    } catch (error: any) {
      console.error(error);
      setMessage({
        type: error?.type || 'error',
        content: (error as Error)?.message ||  'An unknown error occurred.',
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (window.location.search) {
      getQuest();
    }
  }, [window.location.search]);

  const verifyTextInput = async () => {
    setLoading(true);
    setMessage({
      type: '',
      content: '',
    });
    if (!content) {
      setMessage({
        type: 'error',
        content: 'Content is required.',
      });
      return;
    }
    if (!recaptchaToken) {
      setMessage({
        type: 'error',
        content: 'Please verify the reCAPTCHA.',
      });
      return;
    }
    if (!content) {
      setMessage({
        type: 'error',
        content: 'Content is required.',
      });
      return;
    }
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      await instance.postExternal('/api/snag/text-input-verify', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
        content,
        recaptchaToken,
      });
      setMessage({
        type: 'success',
        content: "Our moderator will review your submission, and you’ll get your rewards once it’s approved.",
      });
      getQuest();
      if (callBack) {
        callBack();
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        content: (error as Error)?.message ||  'An unknown error occurred.',
      });
    }
    setLoading(false);
  }

  const handleRecaptchaChange = (value: string | null) => {
    setRecaptchaToken(value);
    setIsVerified(!!value);
  };

  return {
    isLoading,
    message,
    content,
    quest,
    response,
    isVerified,
    setContent,
    verifyTextInput,
    setIsVerified,
    handleRecaptchaChange,
  }
}

export default useSnagTextInput;
