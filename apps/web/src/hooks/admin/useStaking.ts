import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export interface IStaking {
  delegate: number;
  redelegate: number;
  unstaking: number;
}

const useStaking = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [staking, setStaking] = useState<IStaking>({
    delegate: 0,
    redelegate: 0,
    unstaking: 0,
  });

  const fetchStaking = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/summary/staking?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate || startDate)}`);
      setStaking({
        delegate: data?.delegate || 0,
        redelegate: data?.redelegate || 0,
        unstaking: data?.unstaking || 0,
      });
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStaking();
  }, [startDate, endDate]);
  return {
    isLoading,
    staking,
  }
}

export default useStaking;
