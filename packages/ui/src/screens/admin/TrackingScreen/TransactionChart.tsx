import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { ITracking } from '@/hooks/admin/useTracking';

interface ITransactionChart {
  isLoading: boolean;
  trackings: ITracking[];
}

export default function TransactionChart({
  isLoading,
  trackings,
}: ITransactionChart) {
  const getOption = () => {
    let dates: string[] = [];
    let data: number[] = [];
    for (const item of trackings) {
      const date = item.date.split('-');
      dates.push(`${date[1]}/${date[2]}/${date[0]}`);
      data.push(item.total_transaction);
    }
    return {
      tooltip: {
        trigger: 'axis',
        formatter: function (params: any) {
          const param = params[0];
          const tracking = trackings[param.dataIndex];
          let html = '';
          if (tracking && tracking?.transaction_extra) {
            const parseTransactions = JSON.parse(tracking.transaction_extra);
            html += '<ul class="mt-1 pl-2 list-inside list-disc">';
            for (const item of parseTransactions) {
              const messageType = item.message_type.split('.');
              html += `
                <li class="flex justify-between gap-4">
                  <span>${messageType[messageType.length - 1]}:</span>
                  <span class="font-bold">${item.total}</span>
                </li>`;
            }
            html += '</ul>';
          }
          return `
            <div>
              <div class="text-sm">${param.axisValue}</div>
              <div class="text-sm mt-1">${param.marker} <span>Total transactions</span>: <span class="font-bold">${param.value}</span></div>
              ${html}
            </div>`;
        }
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
          name: 'Transactions',
          type: 'line',
          itemStyle: {
            color: '#47C78A'
          },
          data: data
        }
      ]
    };
  }

  return (
    <Card elevate size="$4" bordered className='w-full'>
      <Card.Header padded>
        <SectionTitle className="mb-0">Transactions</SectionTitle>
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
