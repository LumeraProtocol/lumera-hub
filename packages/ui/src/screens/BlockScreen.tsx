import React, { useMemo } from 'react';
import { Card } from 'tamagui';
import ReactECharts from 'echarts-for-react';

import useBlock from '@/hooks/useBlock';
import { AppLoading } from '@/components/Loading';
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

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0].data;
          if (!data?.block) return 'No data';

          const blockData = data.block; // block gốc
          return `
            <strong>Block #${blockData.block?.header?.height}</strong><br/>
            Transactions: <b>${blockData.block?.data?.txs?.length || 0}</b>
          `;
        },
      },
      grid: {
        left: '1%',
        right: '1%',
        bottom: '1.5%',
        top: '2.5%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: displayBlocks.map((b, i) => (b ? `#${b.block.header.height}` : `Block ${i + 1}`)),
        axisLabel: { show: false },
        axisTick: { show: true },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Transactions',
          type: 'bar',
          data: displayBlocks.map((blockItem) => {
            if (!blockItem) {
              return { value: 0, block: null };
            }
            return {
              value: blockItem.block.data.txs.length,
              block: blockItem,
            };
          }),
          itemStyle: {
            color: '#17c1c3',
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: { color: '#0ea5a7' },
          },
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
  const { isLoading, blocks, validators } = useBlock();

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
        {blocks?.map((item, index) => (
          <Card elevate size="$4" bordered className='p-5' key={`${item?.block?.header?.height}-${index}`}>
            <div>
              <div className='flex justify-between items-center'>
                <div className='text-md font-bold sm:!text-lg'>{item?.block?.header?.height || '-'}</div>
                <div className='text-xs whitespace-nowrap font-medium text-lumera-teal'>
                  {toDay(item?.block?.header?.time, 'from')}
                </div>
              </div>
              <div className='flex justify-between items-center'>
                <div className='mt-2 text-sm truncate'>
                  {validator(item?.block?.header?.proposer_address, validators)}
                </div>
                <div className='text-right mt-1 whitespace-nowrap'>{item?.block?.data?.txs?.length || 0} txs</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
