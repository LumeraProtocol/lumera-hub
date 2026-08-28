import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export type TCascadeDownload = {
  cascade_download_extra: string | null;
}

export interface ITracking {
  date: string;
  total: number;
  delegate: number;
  delegate_lume: number;
  redelegate: number;
  redelegate_lume: number;
  unstaking: number;
  unstaking_lume: number;
  claim: number;
  claim_lume: number;
  cascade_upload: number;
  cascade_image: number;
  cascade_video: number;
  cascade_program: number;
  cascade_archive: number;
  cascade_document: number;
  cascade_other: number;
  cascade_total_price: number;
  cascade_total_fee: number;
  total_address: number;
  new_address: number;
  total_transaction: number;
  transaction_extra: string;
  cascade_download: number;
  cascade_download_extra: TCascadeDownload[];
}

export interface ISummary {
  delegate: number;
  delegate_lume: number;
  redelegate: number;
  redelegate_lume: number;
  unstaking: number;
  unstaking_lume: number;
  cascade_upload: number;
  cascade_image: number;
  cascade_video: number;
  cascade_program: number;
  cascade_archive: number;
  cascade_document: number;
  cascade_other: number;
  cascade_total_price: number;
  cascade_total_fee: number;
  total_address: number;
  cascade_download: number;
  cascade_download_extra: TCascadeDownload[];
}

const useTracking = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [trackings, setTrackings] = useState<ITracking[]>([]);
  const [isSummaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<ISummary | null>(null);

  const fetchTrachkingForChart = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/trackings/get-transactions?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate)}`);
      setTrackings(data.items);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  const fetchTrackingSumrary = async () => {
    setSummaryLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/trackings/get-summary?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate)}`);
      setSummary(data.item);
    } catch (error) {
      console.error(error)
    }
    setSummaryLoading(false);
  }

  useEffect(() => {
    fetchTrachkingForChart();
    fetchTrackingSumrary();
  }, [startDate, endDate]);

  return {
    isLoading,
    trackings,
    isSummaryLoading,
    summary,
  }
}

export default useTracking;
