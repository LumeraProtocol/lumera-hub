import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export interface ICascade {
  date: string;
  upload: number;
}

const useChartCascade = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [cascades, setCascades] = useState<ICascade[]>([]);

  const fetchStaking = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/chart/cascade?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate || startDate)}`);
      setCascades(data.items);
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
    cascades,
  }
}

export default useChartCascade;
