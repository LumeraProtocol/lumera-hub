import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { ITracking } from '@/hooks/admin/useTracking';

interface ICascadeChart {
  isLoading: boolean;
  trackings: ITracking[];
}

export default function CascadeChart({
  isLoading,
  trackings,
}: ICascadeChart) {

  const getOption = () => {
    let dates: string[] = [];
    let data: number[] = [];
    for (const item of trackings) {
      const date = item.date.split('-');
      dates.push(`${date[1]}/${date[2]}/${date[0]}`);
      data.push(item.cascade_upload);
    }

    return {
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        top: 8,
        bottom: 2,
        left: 10,
        right: 10,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        splitLine: {
          show: false,
        },
        data: dates,
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
          name: 'Cascade upload',
          type: 'line',
          symbol: 'none',
          itemStyle: {
            color: '#e77975'
          },
          data,
        }
      ]
    };
  }

  return (
    <Card elevate size="$4" bordered className='w-full'>
      <Card.Header padded>
        <SectionTitle className="mb-0">Cascade upload</SectionTitle>
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
