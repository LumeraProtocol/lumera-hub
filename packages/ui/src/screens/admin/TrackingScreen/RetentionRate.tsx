import { Card } from 'tamagui';
import {
  MoveDown,
  MoveRight,
} from 'lucide-react';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import useRetentionRate, { IData, IDetail } from '@/hooks/admin/useRetentionRate';

export default function RetentionRate() {
  const {
    isLoading,
    items,
    details,
  } = useRetentionRate();

  const getDate = (date: string) => {
    const perDate = date.split('-');
    return `${perDate[1]}/${perDate[2]}/${perDate[0]}`;
  }
  const getData = (item: IData, index: number) => {
    const selectedItems = details.filter((d) => d.week_hash === item.hash && d.week >= item.week && d.year >= item.year);
    const firstItem = details.find((d) => d.week_hash === item.hash && d.week === item.week && d.year === item.year);
    if (!selectedItems?.length || !firstItem) {
      return '0%';
    }
    const nextWeek = selectedItems[index + 1];
    if (nextWeek) {
      const totalActivation = firstItem.total_activation;
      return `${(nextWeek.total_activation / totalActivation * 100).toFixed(0)}%`;
    }
    return '0%';
  }

  return (
    <div className="space-y-8">
      <Card elevate size="$4" bordered className='w-full'>
        <Card.Header padded>
          <SectionTitle className="mb-0">Retention Rate</SectionTitle>
        </Card.Header>
        <div className='p-5 pt-0'>
          {isLoading ?
            <div className='min-h-[200px] relative'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <>
              <table className='w-full border-separate border-spacing-y-2 text-sm'>
                <thead className='hidden md:table-header-group text-gray-400'>
                  <tr>
                    <th align='left' className='px-2 py-3'>
                      <div className='flex gap-2'>
                        <span className='inline-flex gap-1 items-center'>
                          Cohort
                          <MoveDown className='w-3 h-3' />
                        </span>
                        <span className='inline-flex gap-1 items-center'>
                          Elapsed
                          <MoveRight className='w-3 h-3' />
                        </span>
                      </div>
                    </th>
                    {Array.from({ length: 13 }, (_, index) => (
                      <th align='left' className='px-2 py-3' key={index}>{index}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items?.map((tx) => (
                    <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg' key={tx.hash}>
                      <th align='left' className='px-2 py-3'>
                        {getDate(tx.start_date)} - {getDate(tx.end_date)}
                      </th>
                      <th align='left' className='px-2 py-3'>100%</th>
                      {Array.from({ length: 12 }, (_, index) => (
                        <th align='left' className='px-2 py-3' key={index}>
                          {getData(tx, index)}
                        </th>
                      ))}
                    </tr>
                  ))}
                  {!items.length ?
                    <tr className='bg-gray-900/40 hover:bg-gray-800/60 rounded-lg'>
                      <td className='px-2 py-3' colSpan={14}>
                        <div className='w-full text-xl'>No data</div>
                      </td>
                    </tr> : null
                  }
                </tbody>
              </table>
            </>
          }
        </div>
      </Card>
    </div>
  )
}
