import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

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
}

const useTracking = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [trackings, setTrackings] = useState<ITracking[]>([]);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/tracking-info?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate)}`);
      setTrackings(data.items);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWallets();
  }, [startDate, endDate]);
  return {
    isLoading,
    trackings,
  }
}

export default useTracking;
