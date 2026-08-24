import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'
import * as instance from '@/utils/api'
import { useSelector } from '@/redux/hooks'

dayjs.extend(updateLocale)

dayjs.updateLocale('en', {
  weekStart: 1,
})

export interface IData {
  hash: string
  week: string
  year: string
  start_date: string
  end_date: string
}

export interface IDetail {
  id: number
  week_hash: string
  week: string
  year: string
  total_activation: number
}

const useRetentionRate = () => {
  const { startDate, endDate } = useSelector((state) => state.admin)
  const [isLoading, setLoading] = useState(false)
  const [items, setItems] = useState<IData[]>([])
  const [details, setDetails] = useState<IDetail[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await instance.getExternal(
        `/api/admin/trackings/get-retention-rate?startDate=${dayjs(startDate).startOf('week').format('YYYY-MM-DD')}&endDate=${dayjs(
          endDate || startDate,
        )
          .endOf('week')
          .format('YYYY-MM-DD')}`,
      )
      setItems(data.items)
      setDetails(data.details)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [endDate, startDate])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    isLoading,
    items,
    details,
  }
}

export default useRetentionRate
