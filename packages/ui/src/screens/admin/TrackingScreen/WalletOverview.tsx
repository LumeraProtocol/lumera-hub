import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { formatNumber } from '@/utils/format';
import { ISummary, ITracking } from '@/hooks/admin/useTracking';
import { useSelector } from '@/redux/hooks';

interface IWalletOverview {
  isLoading: boolean;
  tracking: ISummary | null;
  trackings: ITracking[];
}

export default function WalletOverview({
  isLoading,
  tracking,
  trackings,
}: IWalletOverview) {
  const { startDate, endDate } = useSelector((state) => state.admin);
  const newTrackings = trackings.filter((t) => t.total_address > 0);

  const getOption = () => {
    const dates: string[] = [];
    const totalUsers: number[] = [];
    const end = dayjs(endDate);
    const start = dayjs(startDate);
    const diff = end.diff(start, 'day');

    for (let i = 0; i < diff; i++) {
      const currentDate = dayjs(start).add(i, 'day').format('YYYY-MM-DD');
      dates.push(dayjs(start).add(i, 'day').format('MM/DD/YYYY'));
      const user = trackings.find((t) => t.date === currentDate);
      if (user) {
        totalUsers.push(user.total_address || trackings[i - 1]?.total_address);
      } else {
        totalUsers.push(0);
      }
    }

    return {
      grid: {
        top: 8,
        bottom: 2,
        left: 14,
        right: 14,
      },
      colors: ['#078A8A'],
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        splitLine: {
          show: false,
        },
        axisLabel: {
          showMinLabel: true,
          showMaxLabel: true,
          interval: Math.floor((totalUsers.length - 1) / 2),
        },
      },
      yAxis: {
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#2a323f',
          },
        },
      },
      series: [
        {
          name: "Total users",
          data: totalUsers,
          type: 'line',
          itemStyle: {
            color: '#47C78A'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: '#47C78A'
              },
              {
                offset: 1,
                color: '#F5F5FA'
              }
            ])
          },
        }
      ]
    };
  }

  return (
    <Card elevate size="$4" bordered className='!flex-1 !basis-1/3 !min-w-0 !items-start'>
      <div className='p-5 w-full'>
        <SectionTitle className="mb-5">Wallet Overview</SectionTitle>
        {isLoading ?
          <div className='min-h-[188px] relative w-full'>
            <AppLoading
              isLoading
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
          </div> :
          <div className='text-sm'>
            <div>
              <span>Total Wallets</span>: <span className='font-bold'>
                {formatNumber(tracking?.total_address || newTrackings[newTrackings.length - 1]?.total_address || 0, { decimalsLength: 0 })}
              </span>
            </div>
             {trackings?.length ?
              <div className="mt-2">
                <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} />
              </div>: null
              }
          </div>
        }
      </div>
    </Card>
  );
}
