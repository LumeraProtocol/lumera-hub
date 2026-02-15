import { Card } from 'tamagui';

import SectionTitle from '@/components/SectionTitle';
import { AppLoading } from '@/components/Loading';
import { DENOM } from '@/contants/network';
import { formatTokenDisplay } from '@/utils/format';
import { ISummary, ITracking } from '@/hooks/admin/useTracking';

interface IStakingOverview {
  isLoading: boolean;
  tracking: ISummary | null;
}

export default function StakingOverview({
  isLoading,
  tracking,
}: IStakingOverview) {
  return (
    <Card elevate size="$4" bordered className='!flex-1 !basis-1/3 !min-w-0 !items-start'>
      <div className='p-5 w-full'>
        <SectionTitle className="mb-5">Staking overview</SectionTitle>
        {isLoading ?
          <div className='min-h-[188px] relative w-full'>
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
  )
}
