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
    let data1: number[] = [];
    let data2: number[] = [];
    for (const item of trackings) {
      const date = item.date.split('-');
      dates.push(`${date[1]}/${date[2]}/${date[0]}`);
      data1.push(item.cascade_upload);
      data2.push(item.cascade_download);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: function (params: any) {
          let uploadHtml = '';
          let downloadHtml = '';
          params.forEach((param: any, index: number) => {
            const tracking = trackings[param.dataIndex];
            if (index === 0) {
              uploadHtml += `
                <div class="text-sm mt-1">${param.marker} <span>${param.seriesName}</span>: <span class="font-bold">${param.value}</span></div>
                <ul class="mt-1 pl-3 list-inside list-disc">
                  <li class="flex justify-between gap-6">
                    <span>- Total images:</span>
                    <span class="font-bold">${tracking.cascade_image} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total videos:</span>
                    <span class="font-bold">${tracking.cascade_video} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total programs:</span>
                    <span class="font-bold">${tracking.cascade_program} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total archives:</span>
                    <span class="font-bold">${tracking.cascade_archive} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total docs:</span>
                    <span class="font-bold">${tracking.cascade_document} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total other:</span>
                    <span class="font-bold">${tracking.cascade_other} files</span>
                  </li>
                </ul>
              `;
            } else {
               const download = tracking?.cascade_download_extra ? JSON.parse(tracking.cascade_download_extra) : null;
              downloadHtml += `
                <div class="text-sm mt-1">${param.marker} <span>${param.seriesName}</span>: <span class="font-bold">${param.value}</span></div>
                <ul class="mt-1 pl-3 list-inside list-disc">
                  <li class="flex justify-between gap-6">
                    <span>- Total images:</span>
                    <span class="font-bold">${download?.image || 0} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total videos:</span>
                    <span class="font-bold">${download?.video || 0} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total programs:</span>
                    <span class="font-bold">${download?.program || 0} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total archives:</span>
                    <span class="font-bold">${download?.archive || 0} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total docs:</span>
                    <span class="font-bold">${download?.document || 0} files</span>
                  </li>
                  <li class="flex justify-between gap-6">
                    <span>- Total other:</span>
                    <span class="font-bold">${download?.other || 0} files</span>
                  </li>
                </ul>
              `;
            }
          });

          return `
            <div>
              <div class="text-sm">${params[0].name}</div>
              <div class="flex items-start gap-6">
                <div class="border-r border-gray-200 pr-6">
                  ${uploadHtml}
                </div>
                <div>
                  ${downloadHtml}
                </div>
              </div>
            </div>
          `;
        },
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
            color: '#47C78A'
          },
          data: data1,
        },
        {
          name: 'Cascade download',
          type: 'line',
          symbol: 'none',
          itemStyle: {
            color: '#e77975'
          },
          data: data2,
        }
      ]
    };
  }

  return (
    <Card elevate size="$4" bordered className='w-full'>
      <Card.Header padded>
        <SectionTitle className="mb-0">Cascade upload & download</SectionTitle>
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
