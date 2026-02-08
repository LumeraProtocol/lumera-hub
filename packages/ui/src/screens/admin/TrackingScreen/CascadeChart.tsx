import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import useChartCascade from '@/hooks/admin/useChartCascade';

export default function CascadeChart() {
  const { isLoading, cascades } = useChartCascade();

  const getOption = () => {
    let dates: string[] = [];
    let data: number[] = [];
    for (const item of cascades) {
      const date = item.date.split('-');
      dates.push(`${date[1]}/${date[2]}/${date[0]}`);
      data.push(item.upload);
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
          name: 'Cascade Store',
          type: 'line',
          symbol: 'none',
          sampling: 'lttb',
          itemStyle: {
            color: '#e77975'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: '#e77975'
              },
              {
                offset: 1,
                color: '#F5F5FA'
              }
            ])
          },
          data,
        }
      ]
    };
  }

  return (
    <Card elevate size="$4" bordered className='w-full'>
      <Card.Header padded>
        <SectionTitle className="mb-0">Cascade</SectionTitle>
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
            {cascades?.length ?
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} /> :
              <div className='text-lg flex items-center justify-center w-full h-full min-h-40'>No data</div>
            }
          </>
        }
      </div>
    </Card>
  );
}
