import { Card } from 'tamagui';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { DENOM } from '@/contants/network';
import { formatNumber, formatTokenDisplay } from '@/utils/format';
import { ISummary, ITracking } from '@/hooks/admin/useTracking';

interface ICascadeOverview {
  isLoading: boolean;
  tracking: ISummary | null;
}

export default function CascadeOverview({
  isLoading,
  tracking,
}: ICascadeOverview) {
  const getCascadeDownload = () => {
    let results = {
      image: 0,
      video: 0,
      program: 0,
      archive: 0,
      document: 0,
      other: 0,
    };
    if (tracking?.cascade_download_extra) {
      for (const item of tracking.cascade_download_extra) {
        if (item?.cascade_download_extra) {
          const parseData = JSON.parse(item.cascade_download_extra);
          results = {
            image: results.image + Number(parseData.image),
            video: results.video + Number(parseData.video),
            program: results.program + Number(parseData.program),
            archive: results.archive + Number(parseData.archive),
            document: results.document + Number(parseData.document),
            other: results.other + Number(parseData.other),
          };
        }
      }
    }
    return results;
  }
  const download = getCascadeDownload();
  return (
    <Card elevate size="$4" bordered className='w-2/3 !items-start'>
      <div className='p-5 w-full'>
        <SectionTitle className="mb-5">Cascade Overview</SectionTitle>
        {isLoading ?
          <div className='min-h-[196px] relative w-full'>
            <AppLoading
              isLoading
              hideOverlay
              className="w-10 h-10 !border-2"
              iconWidth={20}
              iconHeight={20}
              containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
            />
          </div> :
          <div className='text-sm'>
            <div className='grid grid-cols-1 gap-x-4 gap-y-2'>
              <span><span>Total spent</span>: <span className='font-bold'>
                {formatTokenDisplay({
                  amount: tracking?.cascade_total_price?.toString() || '0',
                  denom: DENOM,
                })} LUME
              </span></span>
            </div>
            <div className='grid grid-cols-1 gap-x-4 gap-y-2 mt-2'>
              <span><span>Total fee</span>: <span className='font-bold'>
                {formatTokenDisplay({
                  amount: tracking?.cascade_total_fee?.toString() || '0',
                  denom: DENOM,
                })} LUME</span></span>
            </div>
            <div className='grid grid-cols-2 gap-4 mt-2'>
              <div>
                <div>
                  <div>
                    <span>Total uploaded</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_upload || '0', { decimalsLength: 0 })} files
                    </span>
                  </div>
                </div>
                <ul className='grid grid-cols-2 gap-x-3 gap-y-2 mt-2'>
                  <li>
                    <span>Total images</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_image || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total videos</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_video || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total programs</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_program || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total archives</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_archive || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total docs</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_document || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total other</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_other || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <div>
                  <div>
                    <span>Total downloaded</span>: <span className='font-bold'>
                      {formatNumber(tracking?.cascade_download || '0', { decimalsLength: 0 })} files
                    </span>
                  </div>
                </div>
                <ul className='grid grid-cols-2 gap-x-3 gap-y-2 mt-2'>
                  <li>
                    <span>Total images</span>: <span className='font-bold'>
                      {formatNumber(download?.image || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total videos</span>: <span className='font-bold'>
                      {formatNumber(download?.video || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total programs</span>: <span className='font-bold'>
                      {formatNumber(download?.program || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total archives</span>: <span className='font-bold'>
                      {formatNumber(download?.archive || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total docs</span>: <span className='font-bold'>
                      {formatNumber(download?.document || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                  <li>
                    <span>Total other</span>: <span className='font-bold'>
                      {formatNumber(download?.other || '0', { decimalsLength: 0 })} files
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        }
      </div>
    </Card>
  )
}
