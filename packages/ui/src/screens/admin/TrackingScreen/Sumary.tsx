import { Card } from 'tamagui';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { DENOM } from '@/contants/network';
import { formatNumber, formatTokenDisplay } from '@/utils/format';
import { ITracking } from '@/hooks/admin/useTracking';

interface ISumary {
  isLoading: boolean;
  trackings: ITracking[];
}

export default function Sumary({
  isLoading,
  trackings,
}: ISumary) {
  const lastestTracking = trackings[trackings.length - 1];

  return (
    <div className='grid grid-cols-3 gap-3'>
      <Card elevate size="$4" bordered className='w-full !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Cascade overview</SectionTitle>
          {isLoading ?
            <div className='min-h-[240px] relative w-full'>
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
                <span><span>Total price</span>: <span className='font-bold'>
                  {formatTokenDisplay({
                    amount: lastestTracking?.cascade_total_price?.toString() || '0',
                    denom: DENOM,
                  })} LUME
                </span></span>
              </div>
              <div className='grid grid-cols-1 gap-x-4 gap-y-2 mt-2'>
                <span><span>Total fee</span>: <span className='font-bold'>
                  {formatTokenDisplay({
                    amount: lastestTracking?.cascade_total_fee?.toString() || '0',
                    denom: DENOM,
                  })} LUME</span></span>
              </div>
              <div className='mt-2'>
                <div>
                  <span>Upload</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_upload || '0', { decimalsLength: 0 })} files
                  </span>
                </div>
              </div>
              <ul className='grid grid-cols-2 gap-x-4 gap-y-2 mt-2'>
                <li>
                  <span>Images</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_image || '0', { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Videos</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_video || '0', { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Programs</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_program || '0', { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Archives</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_archive || '0', { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Docs</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_document || '0', { decimalsLength: 0 })} files
                  </span>
                </li>
                <li>
                  <span>Other</span>: <span className='font-bold'>
                    {formatNumber(lastestTracking?.cascade_other || '0', { decimalsLength: 0 })} files
                  </span>
                </li>
              </ul>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Staking overview</SectionTitle>
          {isLoading ?
            <div className='min-h-[240px] relative w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='text-sm'>
              <div>
                <span>Delegate</span>: <span className='font-bold'>
                  {lastestTracking?.delegate_lume ?
                    <>
                      {formatTokenDisplay({
                        amount: lastestTracking?.delegate_lume.toString(),
                        denom: DENOM,
                      })} LUME <span className="font-normal">({formatNumber(lastestTracking?.delegate, { decimalsLength: 0 })} transactions)</span>
                    </> :
                    <>0</>
                  }
                </span>
              </div>
              <div className='mt-1'>
                <span>Redelegate</span>: <span className='font-bold'>
                  {lastestTracking?.redelegate_lume ?
                    <>
                      {formatTokenDisplay({
                        amount: lastestTracking?.redelegate_lume.toString(),
                        denom: DENOM,
                      })} LUME <span className="font-normal">({formatNumber(lastestTracking?.redelegate || 0, { decimalsLength: 0 })} transactions)</span>
                    </> :
                    <>0</>
                  }
                </span>
              </div>
              <div className='mt-1'>
                <span>Unstaking</span>: <span className='font-bold'>
                  {lastestTracking?.unstaking_lume ?
                    <>
                      {formatTokenDisplay({
                        amount: lastestTracking.unstaking_lume.toString(),
                        denom: DENOM,
                      })} LUME <span className="font-normal">({formatNumber(lastestTracking?.unstaking || 0, { decimalsLength: 0 })} transactions)</span>
                    </> :
                    <>0</>
                  }
                </span>
              </div>
            </div>
          }
        </div>
      </Card>
      <Card elevate size="$4" bordered className='w-full !items-start'>
        <div className='p-5 w-full'>
          <SectionTitle className="mb-5">Wallet overview</SectionTitle>
           {isLoading ?
            <div className='min-h-[240px] relative w-full'>
              <AppLoading
                isLoading
                className="w-10 h-10 !border-2"
                iconWidth={20}
                iconHeight={20}
                containerClassName='absolute top-1/2 left-1/2 -translate-1/2 w-10 h-10 z-50'
              />
            </div> :
            <div className='text-sm'>
              <div>
                <span>Total address</span>: <span className='font-bold'>

                  {formatNumber(lastestTracking?.total_address || 0, { decimalsLength: 0 })}
                </span>
              </div>
              <div className='mt-1'>
                <span>New address</span>: <span className='font-bold'>
                  {formatNumber(lastestTracking?.new_address || 0, { decimalsLength: 0 })}
                </span>
              </div>
            </div>
          }
        </div>
      </Card>
    </div>
  );
}
