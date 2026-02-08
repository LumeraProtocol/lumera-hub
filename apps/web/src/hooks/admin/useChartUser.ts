import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export interface IUser {
  date: string;
  total_address: number;
  new_address: number;
}

const useChartUser = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const fetchStaking = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/chart/user?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate || startDate)}`);
      setUsers(data.items);
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
    users,
  }
}

export default useChartUser;
