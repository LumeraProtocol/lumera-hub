/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from "react";
import { useParams } from 'next/navigation';

import * as instance from '@/utils/api';

export interface IReviewResponse {
  id: number,
  loyaltyRuleId: string,
  status: string,
  content: string,
  created_at: string,
}

const useSnagReview = () => {
  const params = useParams();
  const [isLoading, setLoading] = useState(false);
  const [responses, setResponses] = useState<IReviewResponse[]>([]);

  const getResponses = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const walletAddress = urlParams.get('walletAddress');
      if (!walletAddress || !params?.loyaltyRuleID) {
        setLoading(false);
        return;
      }
      const { data } = await instance.postExternal('/api/snag/get-review-quests', {
        snagAddress: walletAddress,
        loyaltyRuleID: params?.loyaltyRuleID || '',
      });
      setResponses(data.responses);
    } catch (error: any) {
      console.error(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (window.location.search) {
      getResponses();
    }
  }, [window.location.search]);

  return {
    isLoading,
    responses,
    getResponses,
  }
}

export default useSnagReview;
