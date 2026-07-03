import React, { useMemo } from 'react';
import { Card, Tooltip } from 'tamagui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { CircleUser } from 'lucide-react';

import useBlock from '@/hooks/useBlock';
import { AppLoading } from '@/components/Loading';
import AppLink from '@/components/AppLink';
import { validator, toDay } from '@/utils/helpers';
import { IBlockResponse } from '@/types';

interface IBlockTxsChart {
  blocks: IBlockResponse[];
  height?: number;
}

const BlockTxsChart = ({ blocks, height = 280 }: IBlockTxsChart) => {
  const option = useMemo(() => {
    const displayBlocks = [...blocks].slice(0, 50);
    while (displayBlocks.length < 50) {
      displayBlocks.push(null as any);
    }

    const seriesData = displayBlocks.map((blockItem) => {
      if (!blockItem) {
        return { value: 0, block: null };
      }
      return {
        value: blockItem.block.data.txs.length,
        block: blockItem,
      };
    });
    const maxTx = Math.max(...seriesData.map(item => item?.value || 0));
    const yInterval = maxTx <= 4 ? 1 : Math.ceil(maxTx / 5);
    const max = maxTx > 4 ? Math.ceil(maxTx * 1.1) : 4;

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0].data;
          if (!data?.block) return 'No data';
          const blockData = data.block;
          return `
            <strong>Block #${blockData.block?.header?.height}</strong><br/>
            Transactions: <b>${blockData.block?.data?.txs?.length || 0}</b>
          `;
        },
      },
      grid: {
        top: '15%',
        left: '2%',
        right: '1%',
        bottom: '2.5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: displayBlocks.map((b, i) => (b ? `#${b.block.header.height}` : `Block ${i + 1}`)),
        axisLabel: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        name: "Transactions",
        minInterval: 1,
        interval: yInterval,
        max,
        axisLabel: {
          formatter: function (value: string) {
            if (Number.isInteger(value)) {
              return value;
            }
            return '';
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
            width: 1,
            type: 'dashed'
          }
        },
      },
      series: [
        {
          name: 'Transactions',
          type: 'bar',
          data: seriesData,
          barWidth: '65%',
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: '#078A8A' },
                  { offset: 1, color: '#47C78A' }
              ]),
            }
        },
      ],
    };
  }, [blocks]);

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export const BlockScreen = () => {
  const { isLoading, blocks, validators, logo } = useBlock();

  return (
    <div className="relative">
      <AppLoading
        isLoading={isLoading}
        className="w-10 h-10 !border-2"
        iconWidth={20}
        iconHeight={20}
        containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
      />
      <Card elevate size="$4" bordered className='w-full p-5 relative'>
        <div>
          <BlockTxsChart blocks={blocks} height={180} />
        </div>
      </Card>
      <div className="mt-5 grid grid-cols-1 tiny:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {blocks?.map((item, index) => {
          const { name, identity } = validator(item?.block?.header?.proposer_address, validators);
          return (
            <Card
              elevate
              size="$4"
              bordered
              className='p-4 overflow-hidden'
              key={`${item?.block?.header?.height}-${index}`}
            >
              <div className="space-y-2">
                <div className='flex justify-between items-start gap-1'>
                  <div className='text-md font-bold sm:!text-lg'>
                    {item?.block?.header?.height ?
                      <AppLink href={`/blocks/${item?.block?.header?.height}`}>{item?.block?.header?.height}</AppLink> : '-'
                    }
                  </div>
                </div>
                <div className='flex justify-start items-center gap-2 text-sm'>
                  <span>{toDay(item?.block?.header?.time, 'from')}</span>
                  <span>-</span>
                  <span>{item?.block?.data?.txs?.length || 0} txs</span>
                </div>
                <div className='flex justify-start items-center gap-2 text-sm'>
                  <div className="flex gap-1 items-center min-w-0">
                    {identity ?
                      <img
                        src={logo(identity)}
                        alt="avatar"
                        className='w-4 h-4 rounded-full flex-shrink-0'
                      /> :
                      <CircleUser className="w-4 h-4 flex-shrink-0"/>
                    }
                    <div className="truncate font-medium min-w-0">
                      {name}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
