import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';

export interface IData {
  hash: string;
  week: string;
  year: string;
  start_date: string;
  end_date: string;
}

export interface IDetail {
  id: number;
  week_hash: string;
  week: string;
  year: string;
  total_activation: number;
}

const useRetentionRate = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [items, setItems] = useState<IData[]>([]);
  const [details, setDetails] = useState<IDetail[]>([]);

  const fetcData = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/trackings/get-retention-rate?startDate=${dayjs(startDate).format('YYYY-MM-DD')}&endDate=${dayjs(endDate || startDate).format('YYYY-MM-DD')}`);
      setItems(data.items);
      setDetails(data.details);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetcData();
  }, [startDate, endDate]);

  return {
    isLoading,
    items,
    details,
  }
}

export default useRetentionRate;
