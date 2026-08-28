import { Card, SizableText } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { IWallet, IAcquisitionSource } from '@/hooks/admin/useWalletConnect';
import { useSelector } from '@/redux/hooks';

interface IWalletConnect {
  isLoading: boolean;
  walletConnectSummary: IWallet[];
  newWalletConnect: number;
  activatedWallets: number;
  acquisitionSources: IAcquisitionSource[];
}

interface IActivationRateChart {
  isLoading: boolean;
  newWalletConnect: number;
  activatedWallets: number;
}

interface IAcquisitionSourceChart {
  isLoading: boolean;
  acquisitionSources: IAcquisitionSource[];
}

interface IFirstActionTimestampChart {
  isLoading: boolean;
  items: IWallet[];
}

interface ISeriesData {
  value: number;
  name: string;
}

const COLORS = ['#078A8A', '#47C78A'];

export const ActivationRateChart = ({
  isLoading,
  newWalletConnect,
  activatedWallets,
}: IActivationRateChart) => {
  const { startDate, endDate } = useSelector((state) => state.admin);

  const getOption = () => {
    return {
      tooltip: {
        trigger: 'item',
        position: 'right',
        formatter: function (param: any) {
          return `
            <div>
              <div>${param.seriesName}</div>
              <div class="mt-1">
                ${param.marker} <span>${param.name}</span>: <span class="font-bold">${param.value}</span>
              </div>
            </div>
          `;
        }
      },
      color: COLORS,
      series: [
        {
          name: 'Wallet Connections',
          type: 'pie',
          radius: '90%',
          label: {
            show: false,
            position: 'center'
          },
          labelLine: {
            show: false
          },
          data: [
            { value: newWalletConnect, name: 'Total new wallets' },
            { value: activatedWallets, name: 'Activated wallets' }
          ]
        }
      ]
    }
  }

  return (
    <Card elevate size="$4" bordered className='!flex-1 !basis-1/3 !min-w-0 !items-start'>
      <div className='p-5 w-full'>
        <SectionTitle className="mb-5">New wallet connections<span className="text-sm text-lumera-label font-normal">({dayjs(startDate).format('MM/DD/YYYY')} - {dayjs(endDate).format('MM/DD/YYYY')})</span></SectionTitle>
        {isLoading ?
          <div className='min-h-[160px] relative w-full'>
            <AppLoading
              isLoading
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-10'
            />
          </div> :
          <div className='text-sm flex justify-between items-center gap-4'>
            <div className='w-1/2'>
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} />
            </div>
            <div className='w-1/2'>
              <div>
                <div className='flex gap-1 items-center'>
                  <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[0] }}></span>
                  <SizableText className='text-lumera-label !font-bold'>Total new wallets</SizableText>
                </div>
                <div className='text-2xl font-bold'>
                  {newWalletConnect || 0}
                </div>
              </div>
              <div className='mt-4'>
                <div className='flex gap-1 items-center'>
                  <span className='w-3 h-3 rounded-full block' style={{ backgroundColor: COLORS[1] }}></span>
                  <SizableText className='text-lumera-label !font-bold'>Activated wallets</SizableText>
                </div>
                <div className='text-2xl font-bold'>
                  {activatedWallets || 0}
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </Card>
  )
}

export const FirstActionTimestampChart = ({
  isLoading,
  items,
}: IFirstActionTimestampChart) => {
  const { startDate, endDate } = useSelector((state) => state.admin);

  const getOption = () => {
    const buildData: any = {}
    for (const item of items) {
      const date = item.date.split('-');
      buildData[`${date[1]}/${date[2]}/${date[0]}`] = item.total
    }
    const end = dayjs(endDate);
    const start = dayjs(startDate);
    const diff = end.diff(start, 'day');
    const dates: string[] = [];
    const data: number[] = [];
    for (let i = 0; i < diff; i++) {
      const currentDate = dayjs(start).add(i, 'day').format('MM/DD/YYYY');
      dates.push(currentDate);
      data.push(buildData[currentDate] || 0);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: function (params: any) {
          return `
            <div>
              <div>${params[0].name}</div>
              <div class="mt-1">
                ${params[0].marker} <span>${params[0].seriesName}</span>: <span class="font-bold">${params[0].value}</span>
              </div>
            </div>
          `;
        }
      },
      grid: {
        top: 8,
        bottom: 2,
        left: 14,
        right: 14,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          showMinLabel: true,
          showMaxLabel: true,
          interval: Math.floor((data.length - 1) / 2),
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
          data,
          name: 'Total users',
          type: 'bar',
          itemStyle: {
            color: COLORS[1],
          },
        }
      ]
    };
  }

  return (
    <Card elevate size="$4" bordered className='!flex-1 !basis-1/3 !min-w-0 !items-start'>
      <div className='p-5 w-full'>
        <SectionTitle className="mb-5">First qualifying action</SectionTitle>
        {isLoading ?
          <div className='min-h-[160px] relative w-full'>
            <AppLoading
              isLoading
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-10'
            />
          </div> :
          <div className='text-sm'>
            {items?.length ?
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} /> :
              <div className='text-lg flex items-center justify-center w-full h-full min-h-40'>No data</div>
            }
          </div>
        }
      </div>
    </Card>
  )
}

export const AcquisitionSourceChart = ({
  isLoading,
  acquisitionSources,
}: IAcquisitionSourceChart) => {
  const { startDate, endDate } = useSelector((state) => state.admin);

  const getOption = () => {
    const data: ISeriesData[]  = [];
    for (const item of acquisitionSources) {
      data.push({
        value: item.total,
        name: item.refer.length > 0 ? item.refer[0].toUpperCase() + item.refer.substring(1) : item.refer,
      })
    }
    return {
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          name: 'Acquisition source',
          type: 'pie',
          radius: ['90%', '40%'],
          itemStyle: {
            borderRadius: 6,
            borderColor: '#1a212e',
            borderWidth: 1,
          },
          label: {
            show: false,
          },
          labelLine: {
            show: false
          },
          data,
        }
      ]
    }
  }

  return (
    <Card elevate size="$4" bordered className='!flex-1 !basis-1/3 !min-w-0 !items-start'>
      <div className='p-5 w-full'>
        <SectionTitle className="mb-5">Acquisition source<span className="text-sm text-lumera-label font-normal">({dayjs(startDate).format('MM/DD/YYYY')} - {dayjs(endDate).format('MM/DD/YYYY')})</span></SectionTitle>
        {isLoading ?
          <div className='min-h-[160px] relative w-full'>
            <AppLoading
              isLoading
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-10'
            />
          </div> :
          <div className='text-sm'>
            {acquisitionSources?.length ?
              <ReactECharts option={getOption()} className='w-full' style={{ height: '160px' }} /> :
              <div className='text-lg flex items-center justify-center w-full h-full min-h-40'>No data</div>
            }
          </div>
        }
      </div>
    </Card>
  );
}
