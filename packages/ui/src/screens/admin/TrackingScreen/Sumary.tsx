import { Card } from 'tamagui';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { DENOM } from '@/contants/network';
import { formatNumber, formatTokenDisplay } from '@/utils/format';
import { ISummary } from '@/hooks/admin/useTracking';

interface ISumary {
  isLoading: boolean;
  tracking: ISummary | null;
}

export default function Sumary({
  isLoading,
  tracking,
}: ISumary) {
  const download = tracking?.cascade_download_extra ? JSON.parse(tracking.cascade_download_extra) : null;
  return (
    <div className='flex gap-5'>
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
      <div className='w-1/3 flex flex-col items-stretch'>
        <Card elevate size="$4" bordered className='w-full !items-start'>
          <div className='p-5 w-full'>
            <SectionTitle className="mb-5">Staking overview</SectionTitle>
            {isLoading ?
              <div className='min-h-[86px] relative w-full'>
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
                  <span>Total Delegate</span>: <span className='font-bold'>
                    {tracking?.delegate_lume ?
                      <>
                        {formatTokenDisplay({
                          amount: tracking?.delegate_lume.toString(),
                          denom: DENOM,
                        })} LUME
                      </> :
                      <>0 LUME</>
                    }
                  </span>
                </div>
                <div className='mt-1'>
                  <span>Total Redegate</span>: <span className='font-bold'>
                    {tracking?.redelegate_lume ?
                      <>
                        {formatTokenDisplay({
                          amount: tracking?.redelegate_lume.toString(),
                          denom: DENOM,
                        })} LUME
                      </> :
                      <>0 LUME</>
                    }
                  </span>
                </div>
                <div className='mt-1'>
                  <span>Total Unstaking</span>: <span className='font-bold'>
                    {tracking?.unstaking_lume ?
                      <>
                        {formatTokenDisplay({
                          amount: tracking.unstaking_lume.toString(),
                          denom: DENOM,
                        })} LUME
                      </> :
                      <>0 LUME</>
                    }
                  </span>
                </div>
              </div>
            }
          </div>
        </Card>
        <Card elevate size="$4" bordered className='w-full !items-start mt-5'>
          <div className='p-5 w-full'>
            <SectionTitle className="mb-5">Wallet Overview</SectionTitle>
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
                  <span>Total Wallets</span>: <span className='font-bold'>
                    {formatNumber(tracking?.total_address || 0, { decimalsLength: 0 })}
                  </span>
                </div>
              </div>
            }
          </div>
        </Card>
      </div>
    </div>
  );
}
