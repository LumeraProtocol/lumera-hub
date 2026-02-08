import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export interface ICascade {
  upload: number;
  image: number;
  video: number;
  program: number;
  archive: number;
  document: number;
  other: number;
  total_price: number;
  total_fee: number;
}

const useCascade = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [cascade, setCascade] = useState<ICascade>({
    upload: 0,
    image: 0,
    video: 0,
    program: 0,
    archive: 0,
    document: 0,
    other: 0,
    total_price: 0,
    total_fee: 0,
  });

  const fetchStaking = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/summary/cascade?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate || startDate)}`);
      setCascade({
        upload: data?.upload || 0,
        image: data?.image || 0,
        video: data?.video || 0,
        program: data?.program || 0,
        archive: data?.archive || 0,
        document: data?.document || 0,
        other: data?.other || 0,
        total_price: data?.total_price || 0,
        total_fee: data?.total_fee || 0,
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
    cascade,
  }
}

export default useCascade;
