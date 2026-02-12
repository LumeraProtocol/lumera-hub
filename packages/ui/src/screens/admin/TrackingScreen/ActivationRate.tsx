import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { ITracking } from '@/hooks/admin/useTracking';

interface IActivationRate {
  isLoading: boolean;
  trackings: ITracking[];
}

export default function ActivationRate({
  isLoading,
  trackings,
}: IActivationRate) {
  const getOption = () => {
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
        formatter: function (params: any) {
          console.log('params', params)
          return `
            <div>
              <div class="text-sm">${params[0].name}</div>
              <div class="text-sm mt-1">
                ${params[0].marker} <span>${params[0].seriesName}</span>: <span class="font-bold">${params[0].value}%</span>
              </div>
            </div>
          `;
        }
      },
      xAxis: {
        type: 'category',
        data: ['12/20/2025', '12/21/2025', '12/22/2025', '12/23/2025', '12/24/2025', '12/25/2025', '12/26/2025'],
        boundaryGap: false,
        splitLine: {
          show: false,
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
          name: "Activation Rate",
          data: [5.2, 80, 56, 47, 59, 64, 28],
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
    <div className='w-full flex gap-5 justify-between'>
      <Card elevate size="$4" bordered className='w-2/3 !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Wallet Connect Rate</SectionTitle>
          {isLoading ?
            <div className='min-h-[20px] relative w-full'>
              <AppLoading
                isLoading
                className="w-7 h-7 !border-2"
                iconWidth={12}
                iconHeight={12}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-7 h-7 z-50'
              />
            </div> :
            <div className='text-sm'>
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} />
            </div>
          }
        </div>
      </Card>
      <div className='w-1/3'>
        <Card elevate size="$4" bordered className='w-full !items-start !h-full'>
          <div className='p-5 w-full'>
            <SectionTitle className="mb-5">Wallet Connect Overview</SectionTitle>
            {isLoading ?
              <div className='min-h-[20px] relative w-full'>
                <AppLoading
                  isLoading
                  className="w-7 h-7 !border-2"
                  iconWidth={12}
                  iconHeight={12}
                  containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-7 h-7 z-50'
                />
              </div> :
              <div className='text-sm'>
                <div>
                  <span>New wallet connections</span>: <span className='font-bold'>
                    50
                  </span>
                </div>
                <div className='mt-1'>
                  <span>Activation Rate</span>: <span className='font-bold'>
                    20%
                  </span>
                </div>
                <div className='mt-1'>
                  <span>Retention Rate</span>: <span className='font-bold'>
                    20%
                  </span>
                </div>
              </div>
            }
          </div>
        </Card>
      </div>
    </div>
  )
}
