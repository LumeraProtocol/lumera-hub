import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import useChartUser from '@/hooks/admin/useChartUser';

export default function UsersChart() {
  const { isLoading, users } = useChartUser();

  const getOption = () => {
    const dates: string[] = [];
    const newUsers: number[] = [];
    const totalUsers: number[] = [];
    for (const user of users) {
      const date = user.date.split('-');
      dates.push(`${date[1]}/${date[2]}/${date[0]}`);
      newUsers.push(user.new_address);
      totalUsers.push(user.total_address);
    }

    return {
      grid: {
        top: 8,
        bottom: 2,
        left: 10,
        right: 10,
        containLabel: false,
      },
      colors: ['#078A8A'],
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: dates
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
          name: "New",
          data: newUsers,
          type: 'line',
          itemStyle: {
            color: '#47C78A',
          },
        },
        {
          name: "Total",
          data: totalUsers,
          type: 'line',
          itemStyle: {
            color: '#e77975',
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
            {users?.length ?
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} /> :
              <div className='text-lg flex items-center justify-center w-full h-full min-h-40'>No data</div>
            }
          </>
        }
      </div>
    </Card>
  );
}
