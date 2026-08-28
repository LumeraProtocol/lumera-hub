import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { ITracking } from '@/hooks/admin/useTracking';

interface IUsersChart {
  isLoading: boolean;
  trackings: ITracking[];
}

export default function UsersChart({
  isLoading,
  trackings,
}: IUsersChart) {

  const getOption = () => {
    const dates: string[] = [];
    const totalUsers: number[] = [];
    for (let i = 0; i < trackings.length; i++) {
      const user = trackings[i];
      const date = user.date.split('-');
      dates.push(`${date[1]}/${date[2]}/${date[0]}`);
      totalUsers.push(user.total_address || trackings[i - 1]?.total_address);
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
    <Card elevate size="$4" bordered className='w-full'>
      <Card.Header padded>
        <SectionTitle className="mb-0">Users</SectionTitle>
      </Card.Header>
      <div className='p-5'>
        {isLoading ?
          <div className='min-h-40 relative w-full'>
            <AppLoading
              isLoading
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
          </div> :
          <>
            {trackings?.length ?
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} /> :
              <div className='text-lg flex items-center justify-center w-full h-full min-h-40'>No data</div>
            }
          </>
        }
      </div>
    </Card>
  );
}
