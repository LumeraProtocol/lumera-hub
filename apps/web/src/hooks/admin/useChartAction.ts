import { useState, useEffect } from 'react';

import * as instance from '@/utils/api';
import { useSelector } from '@/redux/hooks';
import { convertDateToTracking } from '@/utils/format';

export interface IAction {
  date: string;
  total: number;
}

const useChartAction = () => {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const [isLoading, setLoading] = useState(false);
  const [activities, setActivities] = useState<IAction[]>([]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data } = await instance.getExternal(`/api/admin/chart/action?startDate=${convertDateToTracking(startDate)}&endDate=${convertDateToTracking(endDate || startDate)}`);
      setActivities(data.items);
    } catch (error) {
      console.error(error)
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchActivities();
  }, [startDate, endDate]);
  return {
    isLoading,
    activities,
  }
}

export default useChartAction;
